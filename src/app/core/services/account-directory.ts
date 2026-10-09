import { Injectable, signal } from '@angular/core';
import { Role } from '../config/permissions';
import {
  EMAIL_FAILS_MOCK,
  GOOGLE_MOCK_EMAILS,
  IN_HANDS_MOCK_EMAILS,
  STAFF_MOCK,
} from '../data/customers-mock';

/** Bloqueio de uma conta: motivo, quem e quando (o cliente não vê o motivo). */
export interface AccountBlock {
  reason: string;
  by: string;
  at: Date;
}

/** Cadastro excluído a pedido (LGPD): só o código, quem e quando — sem dado pessoal. */
export interface AccountDeletion {
  customerId: number;
  reason: string;
  by: string;
  at: Date;
}

/** Último e-mail de redefinição de senha (o back registra o retorno do provedor). */
export interface EmailStatus {
  ok: boolean;
  at: Date;
}

/**
 * Situação das contas que o backoffice controla — perfis da equipe, entrega
 * em mãos liberada e bloqueio. Mock em memória: o login da loja e o
 * backoffice leem daqui, então liberar/bloquear vale no próximo login.
 * Fase 2 (B4/B7): colunas da tabela `customer` (+ `customer_role`); o back
 * confere a cada requisição (conta bloqueada perde a sessão na hora).
 */
@Injectable({ providedIn: 'root' })
export class AccountDirectory {
  private readonly staff = signal<Readonly<Record<string, readonly Role[]>>>(STAFF_MOCK);
  private readonly inHands = signal<ReadonlySet<string>>(new Set(IN_HANDS_MOCK_EMAILS));
  private readonly blocks = signal<Readonly<Record<string, AccountBlock>>>({});
  private readonly deletions = signal<Readonly<Record<string, AccountDeletion>>>({});
  private readonly resetEmails = signal<Readonly<Record<string, EmailStatus>>>({});
  private readonly googleOnly = new Set(GOOGLE_MOCK_EMAILS);

  /** Perfis da conta (todo cadastro tem `ROLE_CUSTOMER`). */
  rolesOf(email: string): Role[] {
    return ['ROLE_CUSTOMER', ...(this.staff()[email] ?? [])];
  }

  /** Perfis além de cliente (vazio = não é da equipe). */
  staffRolesOf(email: string): readonly Role[] {
    return this.staff()[email] ?? [];
  }

  /**
   * Dá, troca (`role`) ou tira (`null`) o acesso ao backoffice. Vale no
   * próximo login da pessoa (no back real, tirar derruba a sessão na hora).
   */
  setStaffRole(email: string, role: Role | null): void {
    this.staff.update((all) => {
      const next = { ...all };
      if (role) next[email] = [role];
      else delete next[email];
      return next;
    });
  }

  canReceiveInHands(email: string): boolean {
    return this.inHands().has(email);
  }

  /** Libera (ou tira) a entrega em mãos para o próximo pedido. */
  setInHands(email: string, allowed: boolean): void {
    this.inHands.update((set) => {
      const next = new Set(set);
      if (allowed) next.add(email);
      else next.delete(email);
      return next;
    });
  }

  /** Conta criada com Google: não tem senha na loja. */
  isGoogleOnly(email: string): boolean {
    return this.googleOnly.has(email);
  }

  resetEmailOf(email: string): EmailStatus | undefined {
    return this.resetEmails()[email];
  }

  /**
   * "Envia" o e-mail de redefinição (mock: falha para `EMAIL_FAILS_MOCK`).
   * Fase 2: entra numa fila com novas tentativas; o status vem do provedor.
   */
  sendResetEmail(email: string): EmailStatus {
    const status = { ok: !EMAIL_FAILS_MOCK.includes(email), at: new Date() };
    this.resetEmails.update((all) => ({ ...all, [email]: status }));
    return status;
  }

  deletionOf(email: string): AccountDeletion | undefined {
    return this.deletions()[email];
  }

  /** Registro da exclusão pelo código do cliente (a ficha não tem mais o e-mail). */
  deletionById(customerId: number): AccountDeletion | undefined {
    return Object.values(this.deletions()).find((d) => d.customerId === customerId);
  }

  /**
   * Marca a conta como excluída (no back a conta deixa de existir; aqui o
   * e-mail fica só para o mock recusar o login). Some perfil, bloqueio,
   * entrega em mãos e status de e-mail.
   */
  markDeleted(email: string, deletion: AccountDeletion): void {
    this.deletions.update((all) => ({ ...all, [email]: deletion }));
    this.setStaffRole(email, null);
    this.setInHands(email, false);
    this.unblock(email);
    this.resetEmails.update((all) => {
      const next = { ...all };
      delete next[email];
      return next;
    });
  }

  /** E-mail de conta excluída pode criar um cadastro novo, do zero. */
  forgetDeletion(email: string): void {
    this.deletions.update((all) => {
      const next = { ...all };
      delete next[email];
      return next;
    });
  }

  blockOf(email: string): AccountBlock | undefined {
    return this.blocks()[email];
  }

  block(email: string, reason: string, by: string): void {
    this.blocks.update((all) => ({ ...all, [email]: { reason, by, at: new Date() } }));
  }

  unblock(email: string): void {
    this.blocks.update((all) => {
      const next = { ...all };
      delete next[email];
      return next;
    });
  }
}
