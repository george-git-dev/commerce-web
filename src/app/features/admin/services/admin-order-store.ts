import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';
import { CouponService } from '../../../core/services/coupon-service';
import { PromotionService } from '../../../core/services/promotion-service';
import { AdminOrder, adminOrdersMock } from '../data/admin-orders-mock';
import { auditMock } from '../data/audit-mock';
import { AdminAudit } from './admin-audit';
import { canCancel, nextStatus, statusLabel } from './admin-order-flow';

/**
 * Pedidos do backoffice (mock em memória). Fase 2 (B7): `GET /admin/orders`,
 * `PATCH /admin/orders/{numero}/status` e `POST /admin/orders/{numero}/cancel`
 * — o back valida a transição, a permissão e grava a auditoria.
 */
@Injectable({ providedIn: 'root' })
export class AdminOrderStore {
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);
  private readonly coupons = inject(CouponService);
  private readonly promotions = inject(PromotionService);

  readonly now = new Date();
  private readonly state = signal<readonly AdminOrder[]>(adminOrdersMock(this.now));
  readonly orders = this.state.asReadonly();

  constructor() {
    // Mock: histórico de auditoria coerente com os pedidos (some na Fase 2).
    this.audit.seedOnce(auditMock(this.state(), this.now));
  }

  find(number: string | null): AdminOrder | undefined {
    return this.state().find((order) => order.number === number);
  }

  /** Leva o pedido ao próximo status (com rastreio, quando for envio). */
  advance(number: string, trackingCode?: string): AdminOrder | undefined {
    const order = this.find(number);
    const next = order && nextStatus(order);
    if (!order || !next) return undefined;
    const updated: AdminOrder = {
      ...order,
      status: next,
      trackingCode: trackingCode?.trim().toUpperCase() || order.trackingCode,
      history: [...order.history, { status: next, at: new Date(), by: this.who() }],
    };
    this.save(updated);
    this.audit.record({
      by: this.who(),
      action: 'Alterou status do pedido',
      entity: 'Pedido',
      entityId: number,
      changes: [
        {
          field: 'Status',
          before: statusLabel(order.status, order.shipping),
          after: statusLabel(next, order.shipping),
        },
        ...(trackingCode ? [{ field: 'Rastreio', before: '—', after: updated.trackingCode! }] : []),
      ],
    });
    return updated;
  }

  cancel(number: string, reason: string): AdminOrder | undefined {
    const order = this.find(number);
    if (!order || !canCancel(order)) return undefined;
    const updated: AdminOrder = {
      ...order,
      status: 'cancelado',
      cancelReason: reason.trim(),
      history: [...order.history, { status: 'cancelado', at: new Date(), by: this.who() }],
    };
    this.save(updated);
    // Cancelar só acontece antes do envio: cupom e unidades de promoção voltam.
    const released = this.releaseDiscounts(order);
    this.audit.record({
      by: this.who(),
      action: 'Cancelou pedido',
      entity: 'Pedido',
      entityId: number,
      changes: [
        { field: 'Status', before: statusLabel(order.status, order.shipping), after: 'Cancelado' },
        { field: 'Motivo', before: '—', after: reason.trim() },
        ...released,
      ],
    });
    return updated;
  }

  /** Devolve o uso do cupom e as unidades das promoções do pedido (para a auditoria). */
  private releaseDiscounts(order: AdminOrder): { field: string; before: string; after: string }[] {
    const changes: { field: string; before: string; after: string }[] = [];
    if (order.coupon) {
      this.coupons.releaseUse(order.coupon.code, order.customer.email, order.coupon.discount);
      changes.push({
        field: 'Cupom',
        before: `${order.coupon.code} usado`,
        after: 'Uso devolvido',
      });
    }
    for (const item of order.items) {
      if (item.promotionId == null) continue;
      this.promotions.release(item.promotionId, item.quantity);
      changes.push({
        field: 'Promoção',
        before: `${item.quantity} un. de ${item.sku}`,
        after: 'Unidades devolvidas ao limite',
      });
    }
    return changes;
  }

  /**
   * Exclusão de cadastro (LGPD): os pedidos ficam (fiscal/CDC), sem nome,
   * e-mail, telefone nem rua/número/CEP — só cidade/UF para relatório.
   * Fase 2: faz parte do `POST /admin/customers/{id}/anonymize`, numa transação.
   */
  anonymizeCustomer(email: string, identity: { name: string; email: string }): void {
    this.state.update((list) =>
      list.map((order) =>
        order.customer.email !== email
          ? order
          : {
              ...order,
              customer: { ...order.customer, ...identity, phone: '' },
              address: order.address && {
                street: 'Endereço removido',
                number: '',
                district: '',
                city: order.address.city,
                state: order.address.state,
                cep: '',
              },
            },
      ),
    );
  }

  private save(order: AdminOrder): void {
    this.state.update((list) => list.map((item) => (item.number === order.number ? order : item)));
  }

  private who(): string {
    return this.auth.user()?.name ?? 'Equipe';
  }
}
