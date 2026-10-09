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
  anonymizedIdentity,
  buildCustomers,
  deletionProblem,
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

  /** Contas sem pedido; as excluídas entram já anonimizadas. */
  private readonly accounts = computed(() =>
    REGISTERED_MOCK.map((account) => {
      const deletion = this.directory.deletionOf(account.email);
      return deletion
        ? { ...account, ...anonymizedIdentity(deletion.customerId), phone: '', city: '—' }
        : account;
    }),
  );

  readonly customers = computed(() => buildCustomers(this.orders.orders(), this.accounts()));

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

  // ----- Senha (cliente não consegue entrar) -----

  /**
   * Por que esta conta não pode receber link de senha por aqui (null = pode).
   * Conta da equipe só com `team:manage`; a própria conta usa "Esqueci minha senha".
   */
  passwordProblem(customer: AdminCustomer): string | null {
    if (customer.anonymized) return 'Cadastro excluído.';
    if (this.directory.isGoogleOnly(customer.email))
      return 'Entra com Google: não tem senha na loja. Oriente a usar "Continuar com Google".';
    if (this.isSelf(customer)) return 'Para a sua conta, use "Esqueci minha senha" no login.';
    if (!this.auth.can('customers:edit')) return 'Sem permissão para esta ação.';
    if (this.isStaff(customer) && !this.auth.can('team:manage'))
      return 'Conta da equipe: só o super admin redefine a senha.';
    return null;
  }

  /** Caminho normal: o e-mail com o link vai para o endereço cadastrado. */
  sendResetEmail(customer: AdminCustomer): boolean {
    if (this.passwordProblem(customer)) return false;
    this.auth.requestPasswordReset(customer.email);
    const status = this.directory.sendResetEmail(customer.email);
    this.record('Enviou link de redefinição de senha por e-mail', customer, [
      { field: 'Envio do e-mail', before: '', after: status.ok ? 'Enviado' : 'Falhou' },
    ]);
    return status.ok;
  }

  /**
   * Plano B (e-mail não chega): gera o link para repassar pelo WhatsApp do
   * telefone cadastrado. O token NUNCA vai para a auditoria.
   */
  issueResetLink(customer: AdminCustomer): { url: string; expiresAt: Date } | null {
    if (this.passwordProblem(customer)) return null;
    const { token, expiresAt } = this.auth.issueResetLink(customer.email);
    this.record('Gerou link de redefinição de senha', customer, [
      { field: 'Validade', before: '', after: `30 minutos (uso único)` },
    ]);
    const origin = globalThis.location?.origin ?? '';
    return { url: `${origin}/redefinir-senha?token=${token}`, expiresAt };
  }

  // ----- Exclusão (LGPD) -----

  deletionProblem(customer: AdminCustomer): string | null {
    if (!this.auth.can('team:manage')) return 'Só o super admin exclui cadastros.';
    return deletionProblem({
      self: this.isSelf(customer),
      staff: this.isStaff(customer),
      anonymized: customer.anonymized,
      orders: customer.orders,
    });
  }

  /**
   * Anonimiza o cadastro: nome/e-mail/telefone/CPF/endereços somem, pedidos
   * ficam. Irreversível. Fase 2: `POST /admin/customers/{id}/anonymize` (só
   * `team:manage`), que também encerra as sessões e apaga os tokens.
   */
  deleteCustomer(customer: AdminCustomer, reason: string): boolean {
    if (this.deletionProblem(customer)) return false;
    const deletion = {
      customerId: customer.id,
      reason: reason.trim(),
      by: this.userName(),
      at: new Date(),
    };
    this.orders.anonymizeCustomer(customer.email, anonymizedIdentity(customer.id));
    this.directory.markDeleted(customer.email, deletion);
    // Auditoria sem dado pessoal: só o código e o motivo.
    this.audit.record({
      by: deletion.by,
      action: 'Excluiu cadastro (LGPD)',
      entity: 'Cliente',
      entityId: String(customer.id),
      changes: [{ field: 'Motivo', before: '', after: deletion.reason }],
    });
    return true;
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
