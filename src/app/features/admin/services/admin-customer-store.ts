import { computed, inject, Injectable } from '@angular/core';
import { ROLE_LABELS } from '../../../core/config/permissions';
import { AccountDirectory } from '../../../core/services/account-directory';
import { AuthService } from '../../../core/services/auth-service';
import { REGISTERED_MOCK } from '../data/admin-customers-mock';
import { AdminAudit } from './admin-audit';
import { AdminOrderStore } from './admin-order-store';
import {
  accessChangeProblem,
  AdminCustomer,
  buildCustomers,
  GrantableRole,
} from './customer-rules';

/**
 * Clientes do backoffice (mock: montados a partir dos pedidos). Ações —
 * bloquear e liberar entrega em mãos — gravam no `AccountDirectory` (vale no
 * próximo login da loja) e na auditoria. Fase 2 (B7):
 * `GET /admin/customers`, `PATCH /admin/customers/{id}/block|unblock`,
 * `POST /admin/customers/{id}/in-hands` — sempre com `customers:edit` no back;
 * `PUT /admin/customers/{id}/role` só com `team:manage` (e o back recusa
 * super admin, a própria conta e conta bloqueada).
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

  /** Conta da equipe não é bloqueada: tire o acesso ao backoffice antes. */
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

  /** Por que não dá para mudar o acesso (null = pode). */
  accessProblem(customer: AdminCustomer): string | null {
    return accessChangeProblem({
      self: this.isSelf(customer),
      blocked: !!this.directory.blockOf(customer.email),
      roles: this.directory.staffRolesOf(customer.email),
    });
  }

  /** Dá, troca ou tira (`null`) o acesso ao backoffice. Só `team:manage`. */
  setAccess(customer: AdminCustomer, role: GrantableRole | null): void {
    if (!this.auth.can('team:manage') || this.accessProblem(customer)) return;
    const before = this.directory.staffRolesOf(customer.email)[0];
    if ((before ?? null) === role) return;
    this.directory.setStaffRole(customer.email, role);
    const label = (r: typeof before | null) => (r ? ROLE_LABELS[r] : 'Cliente (sem acesso)');
    this.record(
      !before
        ? 'Deu acesso ao backoffice'
        : role
          ? 'Trocou perfil da equipe'
          : 'Tirou acesso ao backoffice',
      customer,
      [{ field: 'Perfil', before: label(before), after: label(role) }],
    );
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
