import { computed, inject, Injectable, signal } from '@angular/core';
import { AFFILIATE_PROGRAM } from '../config/affiliate';
import { commissionsMock } from '../data/commissions-mock';
import { CreditEntry } from '../models/commission';
import { creditBalance } from '../utils/commission-rules';
import { AuthService } from './auth-service';

const DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Crédito na loja (mock em memória; nunca no navegador). Hoje entra só por
 * comissão de afiliado; sai no checkout, volta se o pedido for cancelado.
 * Fase 2: `GET /me/store-credit` (saldo + extrato) e lançamentos no back, na
 * mesma transação do pedido/cancelamento, com consumo por vencimento (FIFO).
 */
@Injectable({ providedIn: 'root' })
export class StoreCredit {
  private readonly auth = inject(AuthService);
  private readonly entries = signal<readonly CreditEntry[]>(commissionsMock().entries);
  readonly now = signal(new Date());

  /** Extrato da conta logada (mais recente primeiro). */
  readonly mine = computed(() => {
    const email = this.auth.user()?.email;
    return email ? this.of(email) : [];
  });
  readonly myBalance = computed(() => creditBalance(this.mine(), this.now()));

  of(email: string): CreditEntry[] {
    return this.entries()
      .filter((e) => e.email === email)
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  balanceOf(email: string): number {
    return creditBalance(this.of(email), this.now());
  }

  /** Comissão paga em crédito (com o bônus já somado). */
  addCommission(email: string, amount: number, payoutId: number): void {
    const at = new Date();
    this.push({
      email,
      kind: 'comissao',
      amount: round2(amount),
      at,
      expiresAt: new Date(at.getTime() + AFFILIATE_PROGRAM.storeCreditValidityMonths * 30 * DAY),
      payoutId,
    });
  }

  /** Usou no checkout (nunca mais que o saldo). */
  use(email: string, amount: number, orderNumber: string): boolean {
    if (amount <= 0 || amount > this.balanceOf(email) + 0.001) return false;
    this.push({ email, kind: 'uso', amount: -round2(amount), at: new Date(), orderNumber });
    return true;
  }

  /** Pedido cancelado: o crédito usado volta. */
  refund(email: string, amount: number, orderNumber: string): void {
    if (amount <= 0) return;
    this.push({ email, kind: 'estorno', amount: round2(amount), at: new Date(), orderNumber });
  }

  private push(entry: Omit<CreditEntry, 'id'>): void {
    this.entries.update((list) => [
      ...list,
      { ...entry, id: Math.max(0, ...list.map((e) => e.id)) + 1 },
    ]);
  }
}
