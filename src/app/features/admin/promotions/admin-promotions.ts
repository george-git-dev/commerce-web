import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AdminPromotions } from '../services/admin-promotions';
import { ListMemory } from '../services/list-memory';
import { Pager } from '../shared/pager/pager';
import { Paging } from '../shared/pager/paging';

type Filter = 'todas' | 'no-ar' | 'agendada' | 'fora';

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'no-ar', label: 'No ar' },
  { id: 'agendada', label: 'Agendadas' },
  { id: 'fora', label: 'Encerradas e inativas' },
];

function createState() {
  const filter = signal<Filter>('todas');
  return { filter, paging: new Paging(() => filter()) };
}

const day = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * `/admin/promocoes` — promoções de preço (por itens, categoria, marca ou
 * formato), com período e limite. É a única fonte do preço promocional da
 * loja; o produto só tem o preço normal.
 */
@Component({
  selector: 'app-admin-promotions',
  imports: [MatButtonModule, MatIconModule, RouterLink, Pager],
  templateUrl: './admin-promotions.html',
  styleUrl: './admin-promotions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPromotionsPage {
  protected readonly store = inject(AdminPromotions);
  private readonly state = inject(ListMemory).get('promocoes', createState);
  protected readonly filters = FILTERS;
  protected readonly filter = this.state.filter;
  protected readonly paging = this.state.paging;

  protected readonly rows = computed(() =>
    this.store
      .all()
      .map((promo) => {
        const status = this.store.status(promo);
        return {
          promo,
          status,
          statusLabel: this.store.statusLabel(promo),
          summary: this.store.summary(promo),
          period:
            promo.startsOn || promo.endsOn
              ? `${day(promo.startsOn) || 'Já'} a ${day(promo.endsOn) || 'sem fim'}`
              : promo.unitLimit
                ? 'Sem data final'
                : 'Sem período (até desativar)',
          limit: promo.untilSoldOut
            ? `Até acabar o estoque · ${promo.sold} de ${promo.unitLimit ?? 0} vendidas`
            : promo.unitLimit
              ? `${promo.sold} de ${promo.unitLimit} vendidas`
              : '',
        };
      })
      // No ar primeiro, depois agendadas, depois o resto; dentro, mais nova primeiro.
      .sort((a, b) => rank(a.status) - rank(b.status) || b.promo.id - a.promo.id),
  );

  protected readonly filtered = computed(() => {
    const filter = this.filter();
    return this.rows().filter((row) =>
      filter === 'todas'
        ? true
        : filter === 'fora'
          ? !['no-ar', 'agendada'].includes(row.status)
          : row.status === filter,
    );
  });

  protected readonly counts = computed(() => {
    const rows = this.rows();
    return {
      todas: rows.length,
      'no-ar': rows.filter((r) => r.status === 'no-ar').length,
      agendada: rows.filter((r) => r.status === 'agendada').length,
      fora: rows.filter((r) => !['no-ar', 'agendada'].includes(r.status)).length,
    } as Record<Filter, number>;
  });

  protected readonly page = computed(() => this.paging.of(this.filtered()));
}

function rank(status: string): number {
  return status === 'no-ar' ? 0 : status === 'agendada' ? 1 : 2;
}
