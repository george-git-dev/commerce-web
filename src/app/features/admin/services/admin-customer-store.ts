import { computed, inject, Injectable } from '@angular/core';
import { AccountDirectory } from '../../../core/services/account-directory';
import { AuthService } from '../../../core/services/auth-service';
import { REGISTERED_MOCK } from '../data/admin-customers-mock';
import { AdminAudit } from './admin-audit';
import { AdminOrderStore } from './admin-order-store';
import { AdminCustomer, buildCustomers } from './customer-rules';

/**
 * Clientes do backoffice (mock: montados a partir dos pedidos). Ações —
 * bloquear e liberar entrega em mãos — gravam no `AccountDirectory` (vale no
 * próximo login da loja) e na auditoria. Fase 2 (B7):
 * `GET /admin/customers`, `PATCH /admin/customers/{id}/block|unblock`,
 * `POST /admin/customers/{id}/in-hands` — sempre com `customers:edit` no back.
 */
@Injectable({ providedIn: 'root' })
export class AdminCustomerStore {
  private readonly orders = inject(AdminOrderStore);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);
  readonly directory = inject(AccountDirectory);

  readonly customers = computed(() => buildCustomers(this.orders.orders(), REGISTERED_MOCK));

  find(id: number | null): AdminCustomer | undefined {
    return id == null ? undefined : this.customers().find((customer) => customer.id === id);
  }

  /** Conta da equipe não é bloqueada aqui: tire o acesso em Equipe antes. */
  isStaff(customer: AdminCustomer): boolean {
    return this.directory.staffRolesOf(customer.email).length > 0;
  }

  block(customer: AdminCustomer, reason: string): void {
    if (this.isStaff(customer) || this.isSelf(customer)) return;
    this.directory.block(customer.email, reason.trim(), this.userName());
    this.record('Bloqueou cliente', customer, [
      { field: 'Situação', before: 'Ativo', after: 'Bloqueado' },
      { field: 'Motivo', before: '', after: reason.trim() },
    ]);
  }

  unblock(customer: AdminCustomer): void {
    const block = this.directory.blockOf(customer.email);
    if (!block) return;
    this.directory.unblock(customer.email);
    this.record('Desbloqueou cliente', customer, [
      { field: 'Situação', before: 'Bloqueado', after: 'Ativo' },
    ]);
  }

  setInHands(customer: AdminCustomer, allowed: boolean): void {
    this.directory.setInHands(customer.email, allowed);
    this.record(allowed ? 'Liberou entrega em mãos' : 'Cancelou entrega em mãos', customer, [
      {
        field: 'Entrega em mãos (próximo pedido)',
        before: allowed ? 'Não' : 'Sim',
        after: allowed ? 'Sim' : 'Não',
      },
    ]);
  }

  isSelf(customer: AdminCustomer): boolean {
    return this.auth.user()?.email === customer.email;
  }

  private userName(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }

  private record(
    action: string,
    customer: AdminCustomer,
    changes: { field: string; before: string; after: string }[],
  ): void {
    this.audit.record({
      by: this.userName(),
      action,
      entity: 'Cliente',
      entityId: String(customer.id),
      changes,
    });
  }
}
