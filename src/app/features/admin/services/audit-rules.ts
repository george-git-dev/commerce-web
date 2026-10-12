import { toCsv } from '../../../core/utils/csv';
import { AuditEntry } from './admin-audit';

/** Áreas do filtro: cada uma junta as entidades que a auditoria registra. */
export const AUDIT_AREAS = {
  pedidos: { label: 'Pedidos', entities: ['Pedido'] },
  produtos: { label: 'Produtos e promoções', entities: ['Produto', 'Marca', 'Promoção', 'Cupom'] },
  estoque: { label: 'Estoque e compras', entities: ['Estoque', 'Entrada', 'Fornecedor'] },
  clientes: { label: 'Clientes e equipe', entities: ['Cliente'] },
  avaliacoes: { label: 'Avaliações', entities: ['Avaliação'] },
  afiliados: { label: 'Afiliados', entities: ['Afiliado', 'Pagamento de afiliado'] },
  vitrine: { label: 'Vitrine e configurações', entities: ['Banner', 'Aviso', 'Configurações'] },
} as const;

export type AuditArea = keyof typeof AUDIT_AREAS;
export type AuditPeriod = 'hoje' | '7' | '30' | 'tudo';

export const AUDIT_PERIOD_LABELS: Record<AuditPeriod, string> = {
  hoje: 'Hoje',
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
  tudo: 'Tudo',
};

export interface AuditFilter {
  period: AuditPeriod;
  area: AuditArea | 'todas';
  by: string;
  search: string;
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Início do período (meia-noite de hoje para "Hoje"). */
export function periodStart(period: AuditPeriod, now: Date): number {
  if (period === 'tudo') return 0;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period !== 'hoje') start.setDate(start.getDate() - Number(period) + 1);
  return start.getTime();
}

export function matchesAudit(entry: AuditEntry, filter: AuditFilter, now: Date): boolean {
  if (entry.at.getTime() < periodStart(filter.period, now)) return false;
  if (filter.area !== 'todas') {
    const entities: readonly string[] = AUDIT_AREAS[filter.area].entities;
    if (!entities.includes(entry.entity)) return false;
  }
  if (filter.by !== 'todos' && entry.by !== filter.by) return false;
  const term = normalize(filter.search.trim());
  return !term || normalize(`${entry.action} ${entry.entity} ${entry.entityId}`).includes(term);
}

/**
 * Para onde o registro leva: o link gravado, ou derivado da entidade quando o
 * código já é o da tela (pedido, SKU, cliente, banner). Item excluído: sem link.
 */
export function auditLink(entry: AuditEntry): string | null {
  if (entry.link) return entry.link;
  const id = encodeURIComponent(entry.entityId);
  switch (entry.entity) {
    case 'Pedido':
      return `/admin/pedidos/${id}`;
    case 'Estoque':
      return `/admin/estoque/${id}`;
    case 'Cliente':
      return `/admin/clientes/${id}`;
    case 'Banner':
      return entry.action.startsWith('Excluiu') ? null : `/admin/vitrine/banners/${id}`;
    case 'Aviso':
      return '/admin/vitrine/avisos';
    case 'Avaliação':
      return '/admin/aprovacoes';
    case 'Afiliado':
      return '/admin/aprovacoes/afiliados';
    case 'Pagamento de afiliado':
      return '/admin/afiliados';
    case 'Configurações':
      return '/admin/vitrine/configuracoes';
    case 'Relatório':
      return '/admin/relatorios';
    default:
      return null;
  }
}

/** Nome da área de uma entidade ("Pedido" → "Pedidos"). */
export function areaOf(entity: string): string {
  const area = Object.values(AUDIT_AREAS).find((item) =>
    (item.entities as readonly string[]).includes(entity),
  );
  return area?.label ?? entity;
}

/** Colunas ordenáveis da tabela. */
export type AuditSortColumn = 'data' | 'quem' | 'area' | 'acao';

export interface AuditSort {
  column: AuditSortColumn;
  desc: boolean;
}

const SORT_VALUE: Record<AuditSortColumn, (entry: AuditEntry) => string | number> = {
  data: (entry) => entry.at.getTime(),
  quem: (entry) => entry.by,
  area: (entry) => areaOf(entry.entity),
  acao: (entry) => entry.action,
};

/** Empate: o mais recente primeiro. */
export function sortAudit(list: readonly AuditEntry[], sort: AuditSort): AuditEntry[] {
  const value = SORT_VALUE[sort.column];
  const dir = sort.desc ? -1 : 1;
  return [...list].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const diff =
      typeof va === 'number' ? va - (vb as number) : va.localeCompare(vb as string, 'pt-BR');
    return diff * dir || b.at.getTime() - a.at.getTime();
  });
}

/** "Status: Pago → Em separação" (só o texto de uma mudança). */
export function changeText(change: AuditEntry['changes'][number]): string {
  const before = change.before && change.before !== '—' ? `${change.before} → ` : '';
  return `${change.field}: ${before}${change.after || '(removido)'}`;
}

/** Registros como CSV (ver `toCsv`: Excel em português, sem fórmula). */
export function auditCsv(list: readonly AuditEntry[]): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const when = (d: Date) =>
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const header = [
    'Data e hora',
    'Quem',
    'Perfil na hora',
    'Área',
    'Ação',
    'Item',
    'Alterações',
    'IP',
    'Dispositivo',
  ];
  return toCsv(
    header,
    list.map((entry) => [
      when(entry.at),
      entry.by,
      entry.role,
      areaOf(entry.entity),
      entry.action,
      `${entry.entity} ${entry.entityId}`,
      entry.changes.map(changeText).join(' | '),
      entry.origin.ip,
      entry.origin.device,
    ]),
  );
}
