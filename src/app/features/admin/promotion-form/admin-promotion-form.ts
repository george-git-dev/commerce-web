import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PromoDiscount, Promotion, PromoTarget } from '../../../core/models/promotion';
import { variantLabel } from '../../../core/utils/product-pricing';
import {
  PROMO_NAME_MAX,
  PROMO_STATUS_LABELS,
  promoStatus,
  promotionProblems,
} from '../../../core/utils/promotion-rules';
import { AdminPromotions } from '../services/admin-promotions';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';

type LimitMode = 'sem' | 'estoque' | 'unidades';
type TargetKind = PromoTarget['kind'];
type DiscountKind = PromoDiscount['kind'];

const TARGET_KINDS: readonly { id: TargetKind; label: string }[] = [
  { id: 'itens', label: 'Itens escolhidos' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'marca', label: 'Marca' },
  { id: 'formato', label: 'Formato' },
];

const DISCOUNT_KINDS: readonly { id: DiscountKind; label: string; hint: string }[] = [
  { id: 'percent', label: '% de desconto', hint: 'Ex.: 10 = 10% off em cada item.' },
  { id: 'amount', label: 'R$ a menos', hint: 'Ex.: 20 = R$ 20 a menos em cada item.' },
  { id: 'fixed', label: 'Preço fixo', hint: 'Ex.: 5,99 = todos os itens por R$ 5,99.' },
];

/** Linhas da prévia mostradas de uma vez (o resto vira "e mais N"). */
const PREVIEW_MAX = 50;

/** Itens da busca mostrados de uma vez na escolha. */
const CHOICES_MAX = 30;

/** Texto do campo de dinheiro/percentual → número (aceita vírgula). */
function toNumber(text: string): number {
  const clean = text.trim().replace(/\./g, '').replace(',', '.');
  return clean ? Number(clean) : NaN;
}

/**
 * `/admin/promocoes/nova` e `/:id` — onde vale, quanto desconta, período e
 * limite, com prévia dos itens atingidos (preço, preço na promoção e margem).
 */
@Component({
  selector: 'app-admin-promotion-form',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './admin-promotion-form.html',
  styleUrls: ['../storefront/storefront-form.scss', './admin-promotion-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPromotionForm {
  protected readonly store = inject(AdminPromotions);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly readOnly = !this.store.canEdit();
  protected readonly nameMax = PROMO_NAME_MAX;
  protected readonly targetKinds = TARGET_KINDS;
  protected readonly discountKinds = DISCOUNT_KINDS;
  protected readonly statusLabels = PROMO_STATUS_LABELS;

  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  protected readonly original: Promotion | undefined = this.id
    ? this.store.find(this.id)
    : undefined;

  private readonly t = this.original?.target;
  private readonly d = this.original?.discount;

  protected readonly name = signal(this.original?.name ?? '');
  protected readonly targetKind = signal<TargetKind>(this.t?.kind ?? 'itens');
  protected readonly skus = signal<readonly string[]>(this.t?.kind === 'itens' ? this.t.skus : []);
  protected readonly category = signal(this.t?.kind === 'categoria' ? this.t.category : '');
  protected readonly brand = signal(this.t?.kind === 'marca' ? this.t.brand : '');
  protected readonly format = signal(this.t?.kind === 'formato' ? this.t.format : '');
  protected readonly discountKind = signal<DiscountKind>(this.d?.kind ?? 'percent');
  protected readonly discountText = signal(this.d ? String(this.d.value).replace('.', ',') : '');
  /** Promoção nova começa ativa, mas só entra no ar no período. */
  protected readonly active = signal(this.original?.active ?? true);
  protected readonly startsOn = signal(this.original?.startsOn ?? '');
  protected readonly endsOn = signal(this.original?.endsOn ?? '');
  /** Quantidade: sem limite, até acabar o estoque ou N unidades. */
  protected readonly limitMode = signal<LimitMode>(
    this.original?.untilSoldOut ? 'estoque' : this.original?.unitLimit ? 'unidades' : 'sem',
  );
  protected readonly limitText = signal(
    this.original?.unitLimit && !this.original.untilSoldOut ? String(this.original.unitLimit) : '',
  );
  protected readonly sold = this.original?.sold ?? 0;
  protected readonly search = signal('');
  protected readonly belowCostOk = signal(false);
  protected readonly tried = signal(false);

  protected readonly discountHint = computed(
    () => DISCOUNT_KINDS.find((k) => k.id === this.discountKind())!.hint,
  );

  private readonly target = computed<PromoTarget>(() => {
    switch (this.targetKind()) {
      case 'itens':
        return { kind: 'itens', skus: this.skus() };
      case 'categoria':
        return { kind: 'categoria', category: this.category() };
      case 'marca':
        return { kind: 'marca', brand: this.brand() };
      case 'formato':
        return { kind: 'formato', format: this.format() };
    }
  });

  /** Tudo menos a quantidade (a prévia depende disto; o limite depende da prévia). */
  private readonly base = computed<Omit<Promotion, 'id' | 'sold'>>(() => ({
    name: this.name().trim(),
    active: this.active(),
    target: this.target(),
    discount: { kind: this.discountKind(), value: toNumber(this.discountText()) },
    startsOn: this.startsOn() || undefined,
    endsOn: this.endsOn() || undefined,
  }));

  protected readonly draft = computed<Omit<Promotion, 'id' | 'sold'>>(() => {
    const base = this.base();
    switch (this.limitMode()) {
      case 'sem':
        return base;
      case 'estoque':
        // Já vendidas na promoção + o que sobrou no estoque (no back: calculado ao salvar).
        return { ...base, untilSoldOut: true, unitLimit: this.sold + this.stockTotal() };
      case 'unidades': {
        const limit = this.limitText().trim();
        return { ...base, unitLimit: limit ? Number(limit) : NaN };
      }
    }
  });

  protected readonly draftValueOk = computed(() => {
    const value = this.base().discount.value;
    return Number.isFinite(value) && value > 0;
  });

  protected readonly status = computed(() =>
    promoStatus({ ...this.draft(), id: 0, sold: this.original?.sold ?? 0 }, this.store.today()),
  );

  /** Prévia só com alvo e desconto válidos (senão, nada a mostrar). */
  protected readonly preview = computed(() => {
    const draft = this.base();
    if (!(draft.discount.value > 0)) return [];
    return this.store.preview(draft, this.id);
  });
  protected readonly previewShown = computed(() => this.preview().slice(0, PREVIEW_MAX));
  protected readonly applies = computed(
    () => this.preview().filter((row) => row.promoPrice != null && !row.beatenBy).length,
  );
  protected readonly belowCost = computed(
    () => this.preview().filter((row) => row.margin != null && row.margin < 0).length,
  );

  protected readonly problems = computed(() => {
    const problems = promotionProblems(this.draft());
    if (this.limitMode() === 'estoque' && this.preview().length && !this.stockTotal()) {
      problems.push('"Até acabar o estoque": os itens da promoção estão sem estoque.');
    }
    if (this.belowCost() && !this.belowCostOk()) {
      problems.push('Há itens abaixo do custo: confirme na prévia que quer vender assim.');
    }
    return problems;
  });

  /** Itens escolhidos que aparecem na lista (para mostrar só os marcados). */
  protected readonly onlyChosen = signal(false);

  /** Variantes que batem com a busca (nome, marca ou SKU) — todas. */
  protected readonly matches = computed(() => {
    const term = this.search().trim().toLocaleLowerCase('pt-BR');
    const chosen = new Set(this.skus());
    return this.store
      .published()
      .flatMap((product) =>
        product.variants.map((variant) => ({
          sku: variant.id,
          label: `${product.name} — ${variantLabel(product, variant)}`,
          brand: product.brandName,
          price: variant.price,
          stock: variant.stock,
          chosen: chosen.has(variant.id),
        })),
      )
      .filter(
        (row) =>
          (!this.onlyChosen() || row.chosen) &&
          (!term ||
            `${row.label} ${row.brand} ${row.sku}`.toLocaleLowerCase('pt-BR').includes(term)),
      );
  });
  /** O que cabe na tela de uma vez (a busca refina o resto). */
  protected readonly choices = computed(() => this.matches().slice(0, CHOICES_MAX));
  protected readonly allMatchesChosen = computed(
    () => this.matches().length > 0 && this.matches().every((row) => row.chosen),
  );

  /** Marca (ou desmarca) TODOS os itens da lista, inclusive os fora da tela. */
  protected toggleAll(): void {
    const skus = this.matches().map((row) => row.sku);
    if (this.allMatchesChosen()) {
      const off = new Set(skus);
      this.skus.update((list) => list.filter((sku) => !off.has(sku)));
    } else {
      this.skus.update((list) => [...new Set([...list, ...skus])]);
    }
  }

  /** Estoque somado dos itens em que a promoção vale (para o limite). */
  protected readonly stockTotal = computed(() =>
    this.preview()
      .filter((row) => row.promoPrice != null && !row.beatenBy)
      .reduce((sum, row) => sum + row.stock, 0),
  );
  protected readonly limitAboveStock = computed(() => {
    const limit = this.draft().unitLimit;
    return (
      this.limitMode() === 'unidades' &&
      !!limit &&
      this.preview().length > 0 &&
      limit > this.sold + this.stockTotal()
    );
  });

  protected toggleSku(sku: string, on: boolean): void {
    this.skus.update((list) => (on ? [...list, sku] : list.filter((s) => s !== sku)));
  }

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    const id = this.store.save(this.id, this.draft());
    this.snackBar.open(
      this.status() === 'no-ar' ? 'Promoção salva — já vale na loja.' : 'Promoção salva.',
      'Fechar',
      { duration: 3000 },
    );
    if (!this.id) this.router.navigate(['/admin/promocoes', id], { replaceUrl: true });
  }

  protected remove(): void {
    if (!this.id || !this.original) return;
    const data: ActionDialogData = {
      title: 'Excluir promoção?',
      message: `"${this.original.name}" sai da lista e os preços voltam ao normal. Para só pausar, desmarque "Ativa".`,
      confirmLabel: 'Excluir',
      danger: true,
    };
    this.dialog
      .open(ActionDialog, { data, width: '420px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed || !this.id) return;
        this.store.remove(this.id);
        this.snackBar.open('Promoção excluída.', 'Fechar', { duration: 3000 });
        this.router.navigate(['/admin/promocoes']);
      });
  }
}
