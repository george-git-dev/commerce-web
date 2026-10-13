import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { AdminDashboard } from '../../services/admin-dashboard';
import { formatMatches } from '../../services/admin-metrics';

export type ProductSalesRow = ReturnType<AdminDashboard['productSales']>[number];
type SortKey = 'revenue' | 'units' | 'profit' | 'margin';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'revenue', label: 'Faturamento' },
  { id: 'units', label: 'Unidades' },
  { id: 'profit', label: 'Lucro bruto' },
  { id: 'margin', label: 'Margem' },
];

/** Quantos aparecem fechado / aberto. */
const SHORT = 5;
const LONG = 15;

/**
 * Ranking de produtos do período: unidades, faturamento, lucro bruto e
 * margem. Vender muito com margem baixa aparece ao ordenar por margem.
 * Celular: cada produto em duas linhas; ≥ 700px: colunas alinhadas.
 */
@Component({
  selector: 'app-top-products',
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    <header class="tp__head">
      <div>
        <h3>Produtos mais vendidos</h3>
        <p>Frasco e cada decant em linhas separadas · lucro = preço − custo médio</p>
      </div>
      <div class="tp__controls">
        <label class="tp__sort">
          Formato
          <select (change)="format.set($any($event.target).value)">
            <option value="" [selected]="!format()">Todos</option>
            @for (option of formats(); track option.id) {
              <option [value]="option.id" [selected]="format() === option.id">
                {{ option.label }}
              </option>
            }
          </select>
        </label>
        <label class="tp__sort">
          Ordenar por
          <select (change)="sort.set($any($event.target).value)">
            @for (option of sorts; track option.id) {
              <option [value]="option.id" [selected]="sort() === option.id">
                {{ option.label }}
              </option>
            }
          </select>
        </label>
      </div>
    </header>

    @if (sorted().length) {
      <div class="tp__row tp__row--head" aria-hidden="true">
        <span></span><span></span><span>Produto</span> <span>Unidades</span><span>Faturamento</span
        ><span>Lucro bruto</span><span>Margem</span>
      </div>
      <ol class="tp__list">
        @for (p of visible(); track p.sku; let i = $index) {
          <li class="tp__row">
            <span class="tp__rank">{{ i + 1 }}</span>
            <img [src]="p.image" alt="" width="40" height="40" />
            <span class="tp__name">
              <strong>{{ p.name }}</strong>
              <small>
                <span class="tp__fmt" [class.tp__fmt--decant]="p.variant.startsWith('Decant')">{{
                  p.variant
                }}</span>
                {{ p.brand }}
              </small>
            </span>
            <span class="tp__revenue">{{ p.revenue | currency: 'BRL' }}</span>
            <span class="tp__stats">
              <span class="tp__units">{{ p.units }}<span class="tp__m"> un.</span></span>
              <span class="tp__profit">
                <span class="tp__m">Lucro </span>
                @if (p.profit != null) {
                  {{ p.profit | currency: 'BRL' }}
                } @else {
                  <span title="Sem custo registrado (registre uma entrada)">sem custo</span>
                }
              </span>
              <span class="tp__margin">
                <span class="tp__m">Margem </span>
                {{ p.margin != null ? (p.margin | number: '1.0-1') + '%' : '—' }}
              </span>
            </span>
          </li>
        }
      </ol>
      @if (sorted().length > short) {
        <button type="button" class="tp__more" (click)="open.set(!open())">
          {{ open() ? 'Ver menos' : 'Ver mais' }}
        </button>
      }
    } @else {
      <p class="tp__empty">
        {{ format() ? 'Nenhuma venda deste formato no período.' : 'Nenhuma venda no período.' }}
      </p>
    }
  `,
  styleUrl: './top-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopProducts {
  readonly products = input.required<readonly ProductSalesRow[]>();
  /** Opções do filtro (Frasco, Kit, Decant todos, Decant N ml), do catálogo. */
  readonly formats = input.required<readonly { id: string; label: string }[]>();

  /** Filtro só do ranking (o "Formato" lá de cima filtra o painel inteiro). */
  protected readonly format = signal('');

  protected readonly sorts = SORTS;
  protected readonly short = SHORT;
  protected readonly sort = signal<SortKey>('revenue');
  protected readonly open = signal(false);

  /** Sem custo (lucro/margem `null`) vai para o fim. */
  protected readonly sorted = computed(() => {
    const key = this.sort();
    const format = this.format();
    return this.products()
      .filter((p) => formatMatches(p.format, format))
      .sort(
        (a, b) =>
          (b[key] ?? -Infinity) - (a[key] ?? -Infinity) ||
          b.revenue - a.revenue ||
          a.name.localeCompare(b.name),
      );
  });

  protected readonly visible = computed(() => this.sorted().slice(0, this.open() ? LONG : SHORT));
}
