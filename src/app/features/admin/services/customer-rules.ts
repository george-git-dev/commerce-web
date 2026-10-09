import { Role } from '../../../core/config/permissions';
import { AdminOrder, AdminOrderAddress } from '../data/admin-orders-mock';

/**
 * Clientes do backoffice em funções puras. No mock saem dos pedidos (+ contas
 * sem pedido); na Fase 2 vêm de `GET /admin/customers` (paginado, busca no
 * back) e `GET /admin/customers/{id}` — o CPF e o telefone chegam mascarados
 * para quem não tem `customers:sensitive` (o front também mascara).
 */

/** Conta cadastrada que ainda não comprou (aparece na lista mesmo assim). */
export interface RegisteredAccount {
  name: string;
  email: string;
  city: string;
  phone: string;
  createdAt: Date;
}

export interface AdminCustomer {
  /** Código interno (vai no endereço da tela; nunca e-mail ou CPF). */
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  /** FICTÍCIO no mock (gerado e válido), para a tela de mascarar/mostrar. */
  cpf: string;
  /** Endereços já usados em pedidos (sem repetir). */
  addresses: AdminOrderAddress[];
  /** Mais recente primeiro. */
  orders: AdminOrder[];
  /** Pedidos não cancelados. */
  orderCount: number;
  cancelledCount: number;
  totalSpent: number;
  averageTicket: number;
  since: Date;
  lastOrderAt: Date | null;
}

export type CustomerFilter =
  'todos' | 'recentes' | 'sem-compra' | 'bloqueados' | 'em-maos' | 'equipe';

export const CUSTOMER_FILTER_LABELS: Record<CustomerFilter, string> = {
  todos: 'Todos',
  recentes: 'Compraram nos últimos 90 dias',
  'sem-compra': 'Sem compra',
  bloqueados: 'Bloqueados',
  'em-maos': 'Entrega em mãos liberada',
  equipe: 'Equipe (acesso ao backoffice)',
};

/**
 * Perfis que o super admin dá pela tela. Super admin NÃO: é configurado
 * direto no back/banco (conta de admin roubada não vira dona da loja).
 */
export const GRANTABLE_ROLES = ['ROLE_VIEWER', 'ROLE_ADMIN'] as const satisfies readonly Role[];
export type GrantableRole = (typeof GRANTABLE_ROLES)[number];

/** O que cada perfil pode fazer (texto curto para a ficha). */
export const ROLE_HINTS: Record<GrantableRole | 'none', string> = {
  none: 'Só compra na loja. Sem acesso ao backoffice.',
  ROLE_VIEWER: 'Vê o backoffice, sem alterar nada nem ver dados sensíveis.',
  ROLE_ADMIN: 'Opera a loja inteira, menos a equipe.',
};

export interface AccessContext {
  self: boolean;
  blocked: boolean;
  roles: readonly Role[];
}

/** Por que não dá para mudar o acesso desta conta (null = pode). */
export function accessChangeProblem(ctx: AccessContext): string | null {
  if (ctx.self) return 'Você não pode mudar o próprio acesso.';
  if (ctx.roles.includes('ROLE_SUPER_ADMIN'))
    return 'Super admin só é alterado direto no sistema, não por esta tela.';
  if (ctx.blocked) return 'Conta bloqueada: desbloqueie antes de dar acesso.';
  return null;
}

export type CustomerSort = 'ultima-compra' | 'total' | 'nome';

export const CUSTOMER_SORT_LABELS: Record<CustomerSort, string> = {
  'ultima-compra': 'Última compra',
  total: 'Total gasto',
  nome: 'Nome',
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** CPF fictício e VÁLIDO a partir de um número (mesmo cliente, mesmo CPF). */
export function fakeCpf(seed: number): string {
  const base = String(100_000_000 + ((seed * 7_654_321) % 899_999_999)).slice(0, 9);
  const digits = base.split('').map(Number);
  for (const size of [9, 10]) {
    const sum = digits.slice(0, size).reduce((acc, d, i) => acc + d * (size + 1 - i), 0);
    const check = (sum * 10) % 11;
    digits.push(check === 10 ? 0 : check);
  }
  return digits.join('');
}

const addressKey = (a: AdminOrderAddress) => `${a.cep}|${a.street}|${a.number}`;

/**
 * Junta pedidos por e-mail num cliente. Código = ordem de cadastro (primeira
 * compra ou cadastro), então é estável entre cargas do mock.
 */
export function buildCustomers(
  orders: readonly AdminOrder[],
  accounts: readonly RegisteredAccount[] = [],
): AdminCustomer[] {
  const byEmail = new Map<string, AdminOrder[]>();
  for (const order of orders) {
    const list = byEmail.get(order.customer.email);
    if (list) list.push(order);
    else byEmail.set(order.customer.email, [order]);
  }
  const drafts: Omit<AdminCustomer, 'id' | 'cpf'>[] = [];
  for (const [email, list] of byEmail) {
    const sorted = [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const valid = sorted.filter((order) => order.status !== 'cancelado');
    const total = round2(valid.reduce((sum, order) => sum + order.total, 0));
    const addresses = new Map<string, AdminOrderAddress>();
    for (const order of sorted)
      if (order.address) addresses.set(addressKey(order.address), order.address);
    const latest = sorted[0];
    drafts.push({
      name: latest.customer.name,
      email,
      phone: latest.customer.phone,
      city: latest.customer.city,
      addresses: [...addresses.values()],
      orders: sorted,
      orderCount: valid.length,
      cancelledCount: sorted.length - valid.length,
      totalSpent: total,
      averageTicket: valid.length ? round2(total / valid.length) : 0,
      since: sorted.at(-1)!.createdAt,
      lastOrderAt: latest.createdAt,
    });
  }
  for (const account of accounts) {
    if (byEmail.has(account.email)) continue;
    drafts.push({
      name: account.name,
      email: account.email,
      phone: account.phone,
      city: account.city,
      addresses: [],
      orders: [],
      orderCount: 0,
      cancelledCount: 0,
      totalSpent: 0,
      averageTicket: 0,
      since: account.createdAt,
      lastOrderAt: null,
    });
  }
  return drafts
    .sort((a, b) => a.since.getTime() - b.since.getTime() || a.email.localeCompare(b.email))
    .map((draft, index) => ({ ...draft, id: 1001 + index, cpf: fakeCpf(1001 + index) }));
}

/** Busca: nome, e-mail ou telefone (só dígitos, a partir de 4). Sem acento/maiúscula. */
export function matchesCustomer(customer: AdminCustomer, term: string): boolean {
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  const query = normalize(term.trim());
  if (!query) return true;
  const digits = query.replace(/\D/g, '');
  if (digits.length >= 4 && customer.phone.replace(/\D/g, '').includes(digits)) return true;
  return normalize(`${customer.name} ${customer.email}`).includes(query);
}

/** Ordena a lista (sem compra vai para o fim em "Última compra"). */
export function sortCustomers(list: readonly AdminCustomer[], sort: CustomerSort): AdminCustomer[] {
  const copy = [...list];
  if (sort === 'nome') return copy.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (sort === 'total') return copy.sort((a, b) => b.totalSpent - a.totalSpent || a.id - b.id);
  return copy.sort(
    (a, b) => (b.lastOrderAt?.getTime() ?? -1) - (a.lastOrderAt?.getTime() ?? -1) || a.id - b.id,
  );
}

/** Motivo do bloqueio: obrigatório, curto e só texto. */
export function blockReasonProblem(reason: string): string | null {
  const text = reason.trim();
  if (text.length < 5) return 'Explique o motivo (mínimo 5 letras).';
  if (text.length > 200) return 'Motivo com no máximo 200 caracteres.';
  return null;
}
