import { isValidCnpj, isValidPhone, onlyDigits } from '../../../core/utils/br-format';

/** Fornecedor (empresa): CNPJ e contato comercial — não é dado pessoal de cliente. */
export interface Supplier {
  id: number;
  legalName: string;
  tradeName: string;
  /** Só dígitos. */
  cnpj: string;
  contact: string;
  /** Só dígitos (DDD + número). */
  whatsapp: string;
  email: string;
  /** Prazo médio de entrega, em dias. */
  leadTimeDays: number | null;
  brands: readonly string[];
  active: boolean;
  notes: string;
}

export type SupplierDraft = Omit<Supplier, 'id' | 'leadTimeDays'> & {
  leadTimeDays: number | string | null;
};

export type EntryStatus = 'pedido' | 'recebido';

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  pedido: 'Pedido ao fornecedor',
  recebido: 'Recebido',
};

export interface PurchaseItem {
  sku: string;
  quantity: number;
  /** Custo unitário pago ao fornecedor. */
  unitCost: number;
}

/** Entrada de mercadoria (compra): fornecedor, nota e itens com custo. */
export interface PurchaseEntry {
  id: number;
  supplierId: number;
  /** Número da nota do fornecedor. */
  invoice: string;
  /** Data da nota. */
  date: Date;
  items: readonly PurchaseItem[];
  status: EntryStatus;
  createdBy: string;
  receivedAt?: Date;
  receivedBy?: string;
}

export interface EntryDraft {
  supplierId: number | null;
  invoice: string;
  /** `aaaa-mm-dd` (campo de data). */
  date: string;
  items: readonly {
    sku: string;
    quantity: number | string | null;
    unitCost: number | string | null;
  }[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const filled = (value: unknown) => value != null && `${value}`.trim() !== '';

/** O que impede salvar o fornecedor. `otherCnpjs` = dos outros cadastros. */
export function supplierProblems(d: SupplierDraft, otherCnpjs: readonly string[]): string[] {
  const problems: string[] = [];
  const add = (missing: boolean, message: string) => missing && problems.push(message);
  const cnpj = onlyDigits(d.cnpj);
  add(d.legalName.trim().length < 3, 'Informe a razão social.');
  add(!isValidCnpj(cnpj), 'Informe um CNPJ válido.');
  add(isValidCnpj(cnpj) && otherCnpjs.includes(cnpj), 'Já existe um fornecedor com este CNPJ.');
  add(filled(d.whatsapp) && !isValidPhone(d.whatsapp), 'WhatsApp inválido (DDD + número).');
  add(filled(d.email) && !EMAIL.test(d.email.trim()), 'E-mail inválido.');
  const days = Number(d.leadTimeDays);
  add(
    filled(d.leadTimeDays) && (!Number.isInteger(days) || days < 0),
    'Prazo de entrega: dias inteiros, zero ou mais.',
  );
  return problems;
}

/** O que impede registrar a entrada. `today` = `aaaa-mm-dd` de hoje. */
export function entryProblems(d: EntryDraft, today: string): string[] {
  const problems: string[] = [];
  const add = (missing: boolean, message: string) => missing && problems.push(message);
  add(d.supplierId == null, 'Escolha o fornecedor.');
  add(!d.invoice.trim(), 'Informe o número da nota.');
  add(!/^\d{4}-\d{2}-\d{2}$/.test(d.date), 'Informe a data da nota.');
  add(d.date > today, 'A data da nota não pode ser no futuro.');
  add(!d.items.length, 'Adicione pelo menos um item.');
  add(
    d.items.some((item) => !item.sku),
    'Escolha o produto de cada item.',
  );
  const skus = d.items.map((item) => item.sku).filter(Boolean);
  add(new Set(skus).size !== skus.length, 'Há itens repetidos — junte numa linha só.');
  add(
    d.items.some((item) => {
      const qty = Number(item.quantity);
      return !filled(item.quantity) || !Number.isInteger(qty) || qty <= 0;
    }),
    'Quantidade de cada item: inteiro maior que zero.',
  );
  add(
    d.items.some((item) => !filled(item.unitCost) || !(Number(item.unitCost) > 0)),
    'Custo unitário de cada item: maior que zero.',
  );
  return problems;
}

export function entryTotal(items: readonly PurchaseItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
}

/**
 * Custo médio ponderado depois de uma compra. Sem custo anterior (saldo de
 * antes sem custo conhecido), vale o custo da compra.
 */
export function averageCost(
  stockBefore: number,
  avgBefore: number | undefined,
  quantity: number,
  unitCost: number,
): number {
  if (avgBefore == null || stockBefore <= 0) return unitCost;
  return (stockBefore * avgBefore + quantity * unitCost) / (stockBefore + quantity);
}
