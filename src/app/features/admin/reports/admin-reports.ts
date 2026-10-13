import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { customRangeProblem, MIN_DAY, parseDay } from '../services/admin-metrics';
import { ListMemory } from '../services/list-memory';
import { JobStatus, MAX_PENDING, ReportJob, ReportJobs } from '../services/report-jobs';
import {
  REPORT_GROUPS,
  REPORT_PERIOD_LABELS,
  ReportId,
  ReportPeriod,
  REPORTS,
} from '../services/report-rules';

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function createState() {
  const today = new Date();
  return {
    report: signal<ReportId>('vendas'),
    period: signal<ReportPeriod>('mes'),
    from: signal(isoDay(new Date(today.getFullYear(), today.getMonth(), 1))),
    to: signal(isoDay(today)),
    groups: signal<Record<string, string>>({ vendas: 'dia', compras: 'fornecedor' }),
  };
}

const STATUS: Record<JobStatus, { label: string; icon: string }> = {
  fila: { label: 'Na fila', icon: 'schedule' },
  gerando: { label: 'Gerando…', icon: 'autorenew' },
  pronto: { label: 'Pronto', icon: 'check_circle' },
  falhou: { label: 'Falhou', icon: 'error' },
};

/**
 * `/admin/relatorios` — pede o relatório (tipo, período, agrupamento) e baixa
 * o CSV quando fica pronto. Nada é carregado ao abrir a tela; a lista "Meus
 * relatórios" mostra a situação de cada pedido.
 */
@Component({
  selector: 'app-admin-reports',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReports {
  protected readonly jobs = inject(ReportJobs);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state = inject(ListMemory).get('relatorios', createState);

  protected readonly reports = Object.entries(REPORTS) as [ReportId, (typeof REPORTS)[ReportId]][];
  protected readonly periods = Object.entries(REPORT_PERIOD_LABELS) as [ReportPeriod, string][];
  protected readonly status = STATUS;
  protected readonly maxPending = MAX_PENDING;
  protected readonly minDay = MIN_DAY;
  protected readonly today = isoDay(new Date());

  protected readonly report = this.state.report;
  protected readonly period = this.state.period;
  protected readonly from = this.state.from;
  protected readonly to = this.state.to;

  protected readonly info = computed(() => REPORTS[this.report()]);
  protected readonly groupOptions = computed(() => REPORT_GROUPS[this.report()] ?? null);
  protected readonly group = computed(() => this.state.groups()[this.report()] ?? '');
  protected readonly rangeProblem = computed(() =>
    this.info().usesPeriod && this.period() === 'personalizado'
      ? customRangeProblem(this.from(), this.to(), this.today)
      : null,
  );
  protected readonly error = signal('');

  protected setGroup(value: string): void {
    this.state.groups.update((all) => ({ ...all, [this.report()]: value }));
  }

  protected generate(): void {
    if (this.rangeProblem()) return;
    const problem = this.jobs.request({
      report: this.report(),
      period: this.period(),
      from: parseDay(this.from()) ?? undefined,
      to: parseDay(this.to()) ?? undefined,
      group: this.group() || undefined,
    });
    this.error.set(problem ?? '');
    if (!problem) {
      this.snackBar.open('Relatório pedido. Avisamos quando ficar pronto.', 'Fechar', {
        duration: 3000,
      });
    }
  }

  protected retry(job: ReportJob): void {
    this.error.set(this.jobs.retry(job) ?? '');
  }
}
