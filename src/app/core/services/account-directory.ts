import { Injectable, signal } from '@angular/core';
import { Role } from '../config/permissions';
import { IN_HANDS_MOCK_EMAILS, STAFF_MOCK } from '../data/customers-mock';

/** Bloqueio de uma conta: motivo, quem e quando (o cliente não vê o motivo). */
export interface AccountBlock {
  reason: string;
  by: string;
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

  /** Perfis da conta (todo cadastro tem `ROLE_CUSTOMER`). */
  rolesOf(email: string): Role[] {
    return ['ROLE_CUSTOMER', ...(this.staff()[email] ?? [])];
  }

  /** Perfis além de cliente (vazio = não é da equipe). */
  staffRolesOf(email: string): readonly Role[] {
    return this.staff()[email] ?? [];
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
