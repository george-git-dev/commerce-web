import { computed, inject, Injectable } from '@angular/core';
import { categoryInfo } from '../../../core/config/product-categories';
import { Promotion } from '../../../core/models/promotion';
import { AuthService } from '../../../core/services/auth-service';
import { PromotionService } from '../../../core/services/promotion-service';
import { variantLabel } from '../../../core/utils/product-pricing';
import {
  bestPromo,
  discountedPrice,
  discountLabel,
  formatLabel,
  PROMO_STATUS_LABELS,
  promoStatus,
  targetLabel,
  targetMatches,
  variantFormat,
} from '../../../core/utils/promotion-rules';
import { AdminAudit } from './admin-audit';
import { AdminProductStore } from './admin-product-store';
import { AdminStockStore } from './admin-stock-store';

/** Uma linha da prévia: o que acontece com cada variante atingida. */
export interface PromoPreviewRow {
  sku: string;
  slug: string;
  product: string;
  variant: string;
  price: number;
  /** Saldo em estoque hoje. */
  stock: number;
  /** Preço nesta promoção; `null` = não fica mais barato (não aplica). */
  promoPrice: number | null;
  cost?: number;
  /** Margem % no preço da promoção (com custo médio). */
  margin: number | null;
  /** Outra promoção no ar já dá um preço menor (esta não vale para o item). */
  beatenBy?: string;
}

type Draft = Omit<Promotion, 'id' | 'sold'>;

function limitText(p: Pick<Promotion, 'unitLimit' | 'untilSoldOut'>): string {
  if (p.untilSoldOut) return `até acabar o estoque (${p.unitLimit ?? 0})`;
  return p.unitLimit ? String(p.unitLimit) : 'sem limite';
}

/**
 * Promoções no backoffice: lista, prévia (itens atingidos, preço e margem),
 * salvar/excluir com auditoria. Ver: `products:view`; mexer: `products:edit`.
 * Fase 2 (B3/B7): `GET/POST/PUT/DELETE /admin/promotions` — o back valida,
 * guarda e aplica no preço do pedido.
 */
@Injectable({ providedIn: 'root' })
export class AdminPromotions {
  private readonly promotions = inject(PromotionService);
  private readonly products = inject(AdminProductStore);
  private readonly stock = inject(AdminStockStore);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  readonly all = this.promotions.all;
  readonly today = this.promotions.today;
  readonly canEdit = computed(() => this.auth.can('products:edit'));

  /** Só produtos publicados recebem promoção na loja. */
  readonly published = computed(() =>
    this.products.products().filter((product) => product.status === 'publicado'),
  );

  /** Opções do alvo: categorias, marcas e formatos que existem no catálogo. */
  readonly options = computed(() => {
    const products = this.published();
    const categories = [...new Set(products.map((p) => p.category))].map((id) => ({
      id,
      label: categoryInfo(id).plural,
    }));
    const brands = [...new Set(products.map((p) => p.brandName))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );
    const decants = [
      ...new Set(
        products
          .flatMap((p) => p.variants)
          .filter((v) => v.kind === 'decant')
          .map(variantFormat),
      ),
    ].sort((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1]));
    const formats = ['frasco', 'decant', ...decants].map((id) => ({ id, label: formatLabel(id) }));
    return { categories, brands, formats };
  });

  find(id: number): Promotion | undefined {
    return this.all().find((promo) => promo.id === id);
  }

  status(promo: Promotion) {
    return promoStatus(promo, this.today());
  }

  statusLabel(promo: Promotion): string {
    return PROMO_STATUS_LABELS[this.status(promo)];
  }

  summary(promo: Pick<Promotion, 'target' | 'discount'>): string {
    return `${discountLabel(promo.discount)} · ${targetLabel(promo.target)}`;
  }

  /** Variantes atingidas pelo rascunho, com preço, margem e conflito. */
  preview(draft: Draft, editingId: number | null): PromoPreviewRow[] {
    const costs = this.stock.costBySku();
    const others = this.all().filter((promo) => promo.id !== editingId);
    const rows: PromoPreviewRow[] = [];
    for (const product of this.published()) {
      for (const variant of product.variants) {
        if (!targetMatches(draft.target, product, variant)) continue;
        const promoPrice = discountedPrice(variant.price, draft.discount);
        const cost = costs[variant.id];
        const other = bestPromo(product, variant, others, this.today());
        rows.push({
          sku: variant.id,
          slug: product.slug,
          product: product.name,
          variant: variantLabel(product, variant),
          price: variant.price,
          stock: variant.stock,
          promoPrice,
          cost,
          margin:
            promoPrice != null && cost != null
              ? Math.round(((promoPrice - cost) / promoPrice) * 1000) / 10
              : null,
          beatenBy:
            other && promoPrice != null && other.price < promoPrice ? other.promo.name : undefined,
        });
      }
    }
    return rows.sort((a, b) => a.product.localeCompare(b.product, 'pt-BR'));
  }

  save(id: number | null, draft: Draft): number {
    if (!this.canEdit()) return id ?? 0;
    const before = id == null ? undefined : this.find(id);
    const savedId = this.promotions.save(id, draft);
    const period = (p?: Pick<Promotion, 'startsOn' | 'endsOn'>) =>
      p ? `${p.startsOn ?? 'já'} → ${p.endsOn ?? 'sem fim'}` : '';
    const fields: [string, string, string][] = [
      ['Nome', before?.name ?? '', draft.name],
      ['Onde vale', before ? targetLabel(before.target) : '', targetLabel(draft.target)],
      ['Desconto', before ? discountLabel(before.discount) : '', discountLabel(draft.discount)],
      ['Período', period(before), period(draft)],
      ['Quantidade com desconto', before ? limitText(before) : '', limitText(draft)],
      ['Ativa', before ? (before.active ? 'Sim' : 'Não') : '', draft.active ? 'Sim' : 'Não'],
    ];
    this.audit.record({
      by: this.auth.user()?.name ?? 'Equipe',
      action: before ? 'Alterou promoção' : 'Criou promoção',
      entity: 'Promoção',
      entityId: draft.name,
      link: `/admin/promocoes/${savedId}`,
      changes: fields
        .filter(([, b, a]) => b !== a)
        .map(([field, b, a]) => ({ field, before: b, after: a })),
    });
    return savedId;
  }

  remove(id: number): void {
    const promo = this.find(id);
    if (!promo || !this.canEdit()) return;
    this.promotions.remove(id);
    this.audit.record({
      by: this.auth.user()?.name ?? 'Equipe',
      action: 'Excluiu promoção',
      entity: 'Promoção',
      entityId: promo.name,
      changes: [{ field: 'Desconto', before: this.summary(promo), after: '' }],
    });
  }
}
