import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';
import { onlyDigits } from '../../../core/utils/br-format';
import { PURCHASES_MOCK, SUPPLIERS_MOCK } from '../data/purchases-mock';
import { AdminAudit } from './admin-audit';
import { AdminStockStore } from './admin-stock-store';
import { entryTotal, PurchaseEntry, PurchaseItem, Supplier, SupplierDraft } from './purchase-rules';

/**
 * Fornecedores e entradas de mercadoria (mock em memória). Receber uma
 * entrada soma no estoque e atualiza o custo médio (`AdminStockStore`).
 * Fase 2 (B7): `GET/POST /admin/suppliers`, `POST /admin/purchases` e
 * `POST /admin/purchases/{id}/receive` (transação: itens + saldo + movimento).
 */
@Injectable({ providedIn: 'root' })
export class AdminPurchaseStore {
  private readonly stock = inject(AdminStockStore);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  private readonly supplierState = signal<readonly Supplier[]>(SUPPLIERS_MOCK);
  private readonly entryState = signal<readonly PurchaseEntry[]>(PURCHASES_MOCK);
  readonly suppliers = this.supplierState.asReadonly();
  /** Mais recentes primeiro. */
  readonly entries = computed(() =>
    [...this.entryState()].sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id),
  );
  readonly pendingCount = computed(
    () => this.entryState().filter((entry) => entry.status === 'pedido').length,
  );

  supplier(id: number | null | undefined): Supplier | undefined {
    return this.supplierState().find((item) => item.id === id);
  }

  supplierName(id: number): string {
    return this.supplier(id)?.tradeName || this.supplier(id)?.legalName || '—';
  }

  entry(id: number): PurchaseEntry | undefined {
    return this.entryState().find((item) => item.id === id);
  }

  entriesOf(supplierId: number): PurchaseEntry[] {
    return this.entries().filter((entry) => entry.supplierId === supplierId);
  }

  /** Total recebido de um fornecedor no ano corrente. */
  yearTotal(supplierId: number, year = new Date().getFullYear()): number {
    return this.entriesOf(supplierId)
      .filter((entry) => entry.status === 'recebido' && entry.date.getFullYear() === year)
      .reduce((sum, entry) => sum + entryTotal(entry.items), 0);
  }

  /** Compras recebidas de um SKU (comparativo de fornecedores no detalhe do estoque). */
  purchasesOf(sku: string) {
    return this.entries()
      .filter((entry) => entry.status === 'recebido')
      .flatMap((entry) =>
        entry.items
          .filter((item) => item.sku === sku)
          .map((item) => ({ entry, item, supplier: this.supplierName(entry.supplierId) })),
      );
  }

  cnpjsExcept(id: number | null): string[] {
    return this.supplierState()
      .filter((item) => item.id !== id)
      .map((item) => item.cnpj);
  }

  /** Cria (id `null`) ou atualiza um fornecedor; devolve o id. */
  saveSupplier(id: number | null, draft: SupplierDraft): number {
    const supplier: Supplier = {
      ...draft,
      id: id ?? Math.max(0, ...this.supplierState().map((item) => item.id)) + 1,
      legalName: draft.legalName.trim(),
      tradeName: draft.tradeName.trim(),
      cnpj: onlyDigits(draft.cnpj),
      whatsapp: onlyDigits(draft.whatsapp),
      email: draft.email.trim(),
      contact: draft.contact.trim(),
      notes: draft.notes.trim(),
      leadTimeDays: `${draft.leadTimeDays ?? ''}`.trim() === '' ? null : Number(draft.leadTimeDays),
    };
    this.supplierState.update((list) =>
      id == null ? [...list, supplier] : list.map((item) => (item.id === id ? supplier : item)),
    );
    this.audit.record({
      by: this.userName(),
      action: id == null ? 'Cadastrou fornecedor' : 'Editou fornecedor',
      entity: 'Fornecedor',
      entityId: supplier.tradeName || supplier.legalName,
      changes: [],
    });
    return supplier.id;
  }

  /** Registra a entrada; `receiveNow` já soma no estoque. Devolve o id. */
  createEntry(
    data: { supplierId: number; invoice: string; date: Date; items: readonly PurchaseItem[] },
    receiveNow: boolean,
  ): number {
    const entry: PurchaseEntry = {
      ...data,
      id: Math.max(0, ...this.entryState().map((item) => item.id)) + 1,
      invoice: data.invoice.trim(),
      status: 'pedido',
      createdBy: this.userName(),
    };
    this.entryState.update((list) => [...list, entry]);
    this.audit.record({
      by: this.userName(),
      action: 'Registrou entrada de mercadoria',
      entity: 'Entrada',
      entityId: `NF ${entry.invoice}`,
      changes: [],
    });
    if (receiveNow) this.receive(entry.id);
    return entry.id;
  }

  /** "Pedido ao fornecedor" → "Recebido": soma no estoque (uma vez só). */
  receive(id: number): void {
    const entry = this.entry(id);
    if (!entry || entry.status === 'recebido') return;
    const received: PurchaseEntry = {
      ...entry,
      status: 'recebido',
      receivedAt: new Date(),
      receivedBy: this.userName(),
    };
    this.entryState.update((list) => list.map((item) => (item.id === id ? received : item)));
    this.stock.receive(received, this.supplierName(entry.supplierId));
    this.audit.record({
      by: this.userName(),
      action: 'Recebeu entrada de mercadoria',
      entity: 'Entrada',
      entityId: `NF ${entry.invoice}`,
      changes: entry.items.map((item) => ({
        field: `Estoque ${item.sku}`,
        before: '—',
        after: `+${item.quantity}`,
      })),
    });
  }

  /** Renomeou a marca: os fornecedores que a vendem acompanham. */
  renameBrand(from: string, to: string): void {
    this.supplierState.update((list) =>
      list.map((s) => ({ ...s, brands: s.brands.map((b) => (b === from ? to : b)) })),
    );
  }

  /** Quantos fornecedores vendem a marca. */
  supplierCount(brand: string): number {
    return this.supplierState().filter((s) => s.brands.includes(brand)).length;
  }

  private userName(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }
}
