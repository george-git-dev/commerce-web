import { computed, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth-service';
import { maskEmail } from '../../../core/utils/br-format';
import { downloadCsv } from '../../../core/utils/csv';
import { AdminAudit } from './admin-audit';
import { AdminCustomerStore } from './admin-customer-store';
import { AdminOrderStore } from './admin-order-store';
import { AdminPurchaseStore } from './admin-purchase-store';
import { AdminStockStore } from './admin-stock-store';
import {
  customersReport,
  lastSaleBySku,
  paymentsReport,
  productsReport,
  purchasesReport,
  REPORT_GROUPS,
  REPORT_PERIOD_LABELS,
  reportCsv,
  ReportId,
  ReportPeriod,
  reportRange,
  REPORTS,
  ReportTable,
  salesReport,
  stockReport,
} from './report-rules';

export type JobStatus = 'fila' | 'gerando' | 'pronto' | 'falhou';

/** O que foi pedido (vai no `POST /admin/reports`). */
export interface ReportRequest {
  report: ReportId;
  period: ReportPeriod;
  from?: Date;
  to?: Date;
  group?: string;
}

export interface ReportJob {
  id: number;
  request: ReportRequest;
  title: string;
  /** "01/10/2026 a 10/10/2026 · Por dia" ou "Posição de hoje". */
  detail: string;
  requestedBy: string;
  requestedAt: Date;
  status: JobStatus;
  rows?: number;
  /** Disponível para baixar até (no back: o arquivo some do S3 depois disso). */
  expiresAt?: Date;
  error?: string;
}

/** Pedidos em andamento por pessoa (no back, o mesmo limite). */
export const MAX_PENDING = 3;
const EXPIRY_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, '0');
const day = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

/**
 * Relatórios ASSÍNCRONOS: pedir → fila → gerando → pronto para baixar. Nada é
 * montado ao abrir a tela. Mock: o "worker" é um timer de 2–4 s e o CSV fica
 * em memória (some no F5). Fase 2: `POST /admin/reports` (202 + id), worker
 * (@Async/fila → SQS) gera em streaming para o S3 privado, `GET /admin/reports`
 * lista os da pessoa e o download é URL pré-assinada; arquivo expira em 7 dias.
 */
@Injectable({ providedIn: 'root' })
export class ReportJobs {
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);
  private readonly snackBar = inject(MatSnackBar);
  private readonly orders = inject(AdminOrderStore);
  private readonly stock = inject(AdminStockStore);
  private readonly purchases = inject(AdminPurchaseStore);
  private readonly customers = inject(AdminCustomerStore);

  private readonly jobs = signal<readonly ReportJob[]>([]);
  /** CSV pronto de cada job (no back: o arquivo no S3). */
  private readonly files = new Map<number, string>();
  private nextId = 1;

  /** Só os pedidos de quem está logado, mais recentes primeiro. */
  readonly mine = computed(() => {
    const email = this.auth.user()?.email;
    return this.jobs().filter((job) => job.requestedBy === email);
  });
  readonly pending = computed(
    () => this.mine().filter((job) => job.status === 'fila' || job.status === 'gerando').length,
  );

  /** Pede um relatório. Devolve o erro (limite) ou null. */
  request(request: ReportRequest): string | null {
    const email = this.auth.user()?.email;
    if (!email || !this.auth.can('reports:view')) return 'Sem permissão para gerar relatórios.';
    if (this.pending() >= MAX_PENDING) {
      return `Você já tem ${MAX_PENDING} relatórios sendo gerados. Espere um terminar.`;
    }
    const info = REPORTS[request.report];
    const range = reportRange(request.period, new Date(), request.from, request.to);
    const groupLabel = REPORT_GROUPS[request.report]?.find(([id]) => id === request.group)?.[1];
    const detail = info.usesPeriod
      ? [
          `${day(range.start)} a ${day(range.end)}`,
          request.period !== 'personalizado' ? `(${REPORT_PERIOD_LABELS[request.period]})` : '',
          groupLabel ? `· ${groupLabel}` : '',
        ]
          .filter(Boolean)
          .join(' ')
      : 'Posição de hoje';
    const job: ReportJob = {
      id: this.nextId++,
      request,
      title: info.label,
      detail,
      requestedBy: email,
      requestedAt: new Date(),
      status: 'fila',
    };
    this.jobs.update((list) => [job, ...list]);
    this.audit.record({
      by: this.who(),
      action: 'Pediu relatório',
      entity: 'Relatório',
      entityId: info.label,
      changes: [{ field: 'Filtros', before: '', after: detail }],
      link: '/admin/relatorios',
    });
    this.run(job.id);
    return null;
  }

  /** Gera de novo um que falhou (mesmos filtros). */
  retry(job: ReportJob): string | null {
    this.jobs.update((list) => list.filter((item) => item.id !== job.id));
    return this.request(job.request);
  }

  download(job: ReportJob): void {
    const csv = this.files.get(job.id);
    if (!csv || job.status !== 'pronto' || (job.expiresAt && job.expiresAt < new Date())) return;
    downloadCsv(`relatorio-${job.request.report}`, csv);
    this.audit.record({
      by: this.who(),
      action: 'Baixou relatório (CSV)',
      entity: 'Relatório',
      entityId: job.title,
      changes: [{ field: 'Filtros', before: '', after: job.detail }],
      link: '/admin/relatorios',
    });
  }

  /** "Worker" do mock: fila → gerando → pronto (ou falhou). */
  private run(id: number): void {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    void (async () => {
      await wait(800);
      this.patch(id, { status: 'gerando' });
      await wait(1200 + Math.random() * 2000);
      const job = this.jobs().find((item) => item.id === id);
      if (!job) return;
      try {
        const table = this.build(job.request);
        this.files.set(id, reportCsv(table));
        this.patch(id, {
          status: 'pronto',
          rows: table.rows.length,
          expiresAt: new Date(Date.now() + EXPIRY_DAYS * 86_400_000),
        });
        this.snackBar.open(`Relatório pronto: ${job.title}.`, 'Fechar', { duration: 4000 });
      } catch {
        this.patch(id, { status: 'falhou', error: 'Não foi possível gerar. Tente de novo.' });
      }
    })();
  }

  /** Monta a tabela (no back: a consulta agregada do tipo pedido). */
  private build(request: ReportRequest): ReportTable {
    const orders = this.orders.orders();
    const range = reportRange(request.period, new Date(), request.from, request.to);
    switch (request.report) {
      case 'vendas':
        return salesReport(orders, range, request.group === 'mes' ? 'mes' : 'dia');
      case 'produtos':
        return productsReport(orders, range, (sku) => this.stock.costBySku()[sku]);
      case 'estoque':
        return stockReport(this.stock.rows(), lastSaleBySku(orders), new Date());
      case 'compras':
        return purchasesReport(
          this.purchases.entries(),
          this.purchases.suppliers(),
          range,
          request.group === 'nota' ? 'nota' : 'fornecedor',
        );
      case 'pagamentos':
        return paymentsReport(orders, range);
      default: {
        const sensitive = this.auth.can('customers:sensitive');
        return customersReport(orders, this.customers.customers(), range, (email) =>
          sensitive ? email : maskEmail(email),
        );
      }
    }
  }

  private patch(id: number, changes: Partial<ReportJob>): void {
    this.jobs.update((list) => list.map((job) => (job.id === id ? { ...job, ...changes } : job)));
  }

  private who(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }
}
