import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';
import { downloadCsv } from '../../../core/utils/csv';
import { AdminAudit, AuditEntry } from '../services/admin-audit';
import { AdminOrderStore } from '../services/admin-order-store';
import {
  areaOf,
  AUDIT_AREAS,
  AUDIT_PERIOD_LABELS,
  AuditArea,
  auditCsv,
  auditLink,
  AuditPeriod,
  AuditSort,
  AuditSortColumn,
  changeText,
  matchesAudit,
  sortAudit,
} from '../services/audit-rules';
import { ListMemory } from '../services/list-memory';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

function createState() {
  const period = signal<AuditPeriod>('30');
  const area = signal<AuditArea | 'todas'>('todas');
  const by = signal('todos');
  const search = signal('');
  const sort = signal<AuditSort>({ column: 'data', desc: true });
  const paging = new Paging(
    () => `${period()}|${area()}|${by()}|${search()}|${sort().column}|${sort().desc}`,
  );
  return { period, area, by, search, sort, paging };
}

/** Colunas da tabela; as com `sort` ordenam pelo título. */
const COLUMNS: readonly { label: string; sort?: AuditSortColumn }[] = [
  { label: 'Data e hora', sort: 'data' },
  { label: 'Quem', sort: 'quem' },
  { label: 'Perfil na hora' },
  { label: 'Área', sort: 'area' },
  { label: 'Ação', sort: 'acao' },
  { label: 'Item' },
  { label: 'Alteração' },
  { label: 'Origem' },
];

/**
 * `/admin/auditoria` — tabela (rola de lado no celular, data fixa à esquerda):
 * quem fez o quê, quando, com que perfil e de onde; clicar na linha abre o
 * antes → depois completo. Só leitura. Exportar CSV só para o super admin
 * (leva nomes e IPs da equipe) e a exportação também é auditada. Fase 2:
 * `GET /admin/audit?from=&to=&entity=&by=&q=&page=` (tabela só de inclusão).
 */
@Component({
  selector: 'app-admin-audit-page',
  imports: [DatePipe, MatButtonModule, MatIconModule, RouterLink, Pager],
  templateUrl: './admin-audit-page.html',
  styleUrl: './admin-audit-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAuditPage {
  private readonly audit = inject(AdminAudit);
  private readonly auth = inject(AuthService);
  protected readonly canExport = this.auth.can('team:manage');
  // Garante o histórico do mock mesmo abrindo esta tela direto.
  private readonly orders = inject(AdminOrderStore);
  private readonly state = inject(ListMemory).get('auditoria', createState);

  protected readonly periods = Object.entries(AUDIT_PERIOD_LABELS) as [AuditPeriod, string][];
  protected readonly areas = Object.entries(AUDIT_AREAS).map(
    ([id, area]) => [id, area.label] as [AuditArea, string],
  );
  protected readonly link = auditLink;
  protected readonly areaOf = areaOf;
  protected readonly changeText = changeText;
  protected readonly columns = COLUMNS;
  /** Linha aberta (detalhe do antes → depois). */
  protected readonly open = signal<AuditEntry | null>(null);

  protected readonly period = this.state.period;
  protected readonly area = this.state.area;
  protected readonly by = this.state.by;
  protected readonly search = this.state.search;
  protected readonly sort = this.state.sort;
  protected readonly paging = this.state.paging;

  /** Pessoas que aparecem no registro (para o filtro). */
  protected readonly people = computed(() =>
    [...new Set(this.audit.entries().map((entry) => entry.by))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
  );

  protected readonly filtered = computed(() => {
    const now = new Date();
    const filter = {
      period: this.period(),
      area: this.area(),
      by: this.by(),
      search: this.search(),
    };
    return sortAudit(
      this.audit.entries().filter((entry) => matchesAudit(entry, filter, now)),
      this.sort(),
    );
  });

  protected readonly page = computed(() => this.paging.of(this.filtered()));

  protected sortBy(column: AuditSortColumn): void {
    const current = this.sort();
    // Data começa da mais recente; texto começa de A a Z.
    this.sort.set({
      column,
      desc: current.column === column ? !current.desc : column === 'data',
    });
  }

  protected ariaSort(column?: AuditSortColumn): 'ascending' | 'descending' | null {
    const { column: active, desc } = this.sort();
    return column && active === column ? (desc ? 'descending' : 'ascending') : null;
  }

  /** Clique na linha abre/fecha o detalhe (clique no link do item só navega). */
  protected toggle(entry: AuditEntry, event?: Event): void {
    if ((event?.target as HTMLElement | undefined)?.closest('a')) return;
    this.open.update((current) => (current === entry ? null : entry));
  }

  /** Baixa o que está filtrado como CSV (abre no Excel) e registra a exportação. */
  protected exportCsv(): void {
    if (!this.canExport) return;
    const list = this.filtered();
    downloadCsv('auditoria', auditCsv(list));
    this.audit.record({
      by: this.auth.user()?.name ?? 'Equipe',
      action: 'Exportou auditoria (CSV)',
      entity: 'Auditoria',
      entityId: `${list.length} registros`,
      changes: [],
    });
  }
}
