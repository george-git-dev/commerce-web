import { CurrencyPipe } from '@angular/common';
import { CouponTicket } from '../../../shared/coupon-ticket/coupon-ticket';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AdminCoupons } from '../services/admin-coupons';
import { ListMemory } from '../services/list-memory';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';
import { PromotionsTabs } from '../promotions/promotions-tabs';

type Filter = 'todos' | 'no-ar' | 'agendado' | 'fora';

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'no-ar', label: 'No ar' },
  { id: 'agendado', label: 'Agendados' },
  { id: 'fora', label: 'Encerrados e inativos' },
];

function createState() {
  const filter = signal<Filter>('todos');
  const search = signal('');
  return { filter, search, paging: new Paging(() => `${filter()}|${search()}`) };
}

const day = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');
const isOn = (status: string) => status === 'no-ar' || status === 'agendado';

/** `/admin/promocoes/cupons` — cupons que o cliente digita no carrinho. */
@Component({
  selector: 'app-admin-coupons',
  imports: [
    CouponTicket,
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    Pager,
    PromotionsTabs,
  ],
  templateUrl: './admin-coupons.html',
  styleUrl: '../promotions/admin-promotions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCouponsPage {
  protected readonly store = inject(AdminCoupons);
  private readonly state = inject(ListMemory).get('cupons', createState);
  protected readonly filters = FILTERS;
  protected readonly filter = this.state.filter;
  protected readonly search = this.state.search;
  protected readonly paging = this.state.paging;

  protected readonly rows = computed(() =>
    this.store
      .all()
      .map((coupon) => {
        const status = this.store.status(coupon);
        return {
          coupon,
          status,
          statusLabel: this.store.statusLabel(coupon),
          summary: this.store.summary(coupon),
          period:
            coupon.startsOn || coupon.endsOn
              ? `${day(coupon.startsOn) || 'Já'} a ${day(coupon.endsOn) || 'sem fim'}`
              : 'Sem data final',
          uses: coupon.maxUses ? `${coupon.uses} de ${coupon.maxUses} usos` : `${coupon.uses} usos`,
        };
      })
      .sort((a, b) => rank(a.status) - rank(b.status) || b.coupon.id - a.coupon.id),
  );

  protected readonly filtered = computed(() => {
    const filter = this.filter();
    const term = this.search().trim().toUpperCase();
    return this.rows().filter(
      (row) =>
        (!term || row.coupon.code.includes(term)) &&
        (filter === 'todos' ? true : filter === 'fora' ? !isOn(row.status) : row.status === filter),
    );
  });

  protected readonly counts = computed(() => {
    const rows = this.rows();
    return {
      todos: rows.length,
      'no-ar': rows.filter((r) => r.status === 'no-ar').length,
      agendado: rows.filter((r) => r.status === 'agendado').length,
      fora: rows.filter((r) => !isOn(r.status)).length,
    } as Record<Filter, number>;
  });

  protected readonly page = computed(() => this.paging.of(this.filtered()));
}

function rank(status: string): number {
  return status === 'no-ar' ? 0 : status === 'agendado' ? 1 : 2;
}
