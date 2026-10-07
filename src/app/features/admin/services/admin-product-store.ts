import { computed, inject, Injectable, signal } from '@angular/core';
import { BRANDS } from '../../../core/config/brands';
import { CategoryInfo, PRODUCT_CATEGORIES } from '../../../core/config/product-categories';
import { FRAGRANCE_NOTES, NOTE_IMAGES } from '../../../core/config/fragrance';
import { MOCK_PRODUCTS } from '../../../core/data/mock-products';
import { Product } from '../../../core/models/product';
import { AuthService } from '../../../core/services/auth-service';
import { AdminAudit } from './admin-audit';
import { BADGE_OPTIONS, normalizeName, slugify } from './product-rules';

const brl = (value: number | undefined) =>
  value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Produtos no backoffice (mock em memória, cópia do catálogo). Fase 2 (B3/B7):
 * `GET/POST/PUT /admin/products` — a loja passa a ler do mesmo lugar.
 */
@Injectable({ providedIn: 'root' })
export class AdminProductStore {
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);
  private readonly state = signal<readonly Product[]>(structuredClone(MOCK_PRODUCTS) as Product[]);
  readonly products = this.state.asReadonly();

  /** Notas criadas no cadastro (nome + imagem). Fase 2: tabela `fragrance_note` (B3). */
  private readonly customNotes = signal<readonly { name: string; image: string }[]>([]);

  /** Categorias criadas no cadastro. Fase 2: tabela `category` (B3). */
  private readonly customCategories = signal<readonly CategoryInfo[]>([]);
  readonly categories = computed(() => [...PRODUCT_CATEGORIES, ...this.customCategories()]);

  categoryLabel(id: string): string {
    return this.categories().find((category) => category.id === id)?.label ?? id;
  }

  /** Id da categoria com esse nome; cria se ainda não existe. */
  ensureCategory(label: string): string {
    const key = normalizeName(label);
    const existing = this.categories().find((category) => normalizeName(category.label) === key);
    if (existing) return existing.id;
    const id = slugify(label);
    this.customCategories.update((list) => [...list, { id, label, plural: label }]);
    return id;
  }

  /** Selos: os sugeridos + os já usados em produtos. Fase 2: tabela `badge` (B3). */
  readonly badgeNames = computed(() => [
    ...new Set([
      ...BADGE_OPTIONS,
      ...this.state()
        .map((p) => p.badge)
        .filter((badge): badge is string => !!badge),
    ]),
  ]);

  /** Marcas: as da vitrine + as já usadas em produtos. */
  readonly brandNames = computed(() => [
    ...new Set([...BRANDS.map((brand) => brand.name), ...this.state().map((p) => p.brandName)]),
  ]);

  readonly noteNames = computed(() => [
    ...FRAGRANCE_NOTES,
    ...this.customNotes().map((note) => note.name),
  ]);

  noteImage(name: string): string {
    return (
      (NOTE_IMAGES as Record<string, string>)[name] ??
      this.customNotes().find((note) => note.name === name)?.image ??
      ''
    );
  }

  addNote(name: string, image: string): void {
    this.customNotes.update((list) => [...list, { name, image }]);
  }

  /** Linhas já cadastradas de uma marca (Asad, Yara…). */
  lines(brand: string): string[] {
    return [
      ...new Set(
        this.state()
          .filter((p) => p.brandName === brand)
          .map((p) => p.line),
      ),
    ];
  }

  /** Mesmo produto já cadastrado (marca + linha + versão), menos o próprio. */
  findDuplicate(brand: string, line: string, subtitle: string, exceptId: number | null) {
    const key = normalizeName(`${brand} ${line} ${subtitle}`);
    return this.state().find(
      (p) =>
        p.id !== exceptId && normalizeName(`${p.brandName} ${p.line} ${p.subtitle ?? ''}`) === key,
    );
  }

  find(slug: string | null): Product | undefined {
    return this.state().find((product) => product.slug === slug);
  }

  nextId(): number {
    return Math.max(0, ...this.state().map((product) => product.id)) + 1;
  }

  /** SKUs usados pelos outros produtos (para checar duplicados). */
  skusExcept(productId: number | null): string[] {
    return this.state()
      .filter((product) => product.id !== productId)
      .flatMap((product) => product.variants.map((variant) => variant.id.toLowerCase()));
  }

  save(product: Product): void {
    const before = this.state().find((item) => item.id === product.id);
    this.state.update((list) =>
      before ? list.map((item) => (item.id === product.id ? product : item)) : [product, ...list],
    );
    this.audit.record({
      by: this.auth.user()?.name ?? 'Equipe',
      action: before ? 'Editou produto' : 'Cadastrou produto',
      entity: 'Produto',
      entityId: product.name,
      changes: before
        ? this.diff(before, product)
        : [{ field: 'Produto', before: '—', after: product.name }],
    });
  }

  /** Só o que importa auditar: nome, status, preços e estoque por SKU. */
  private diff(before: Product, after: Product) {
    const changes: { field: string; before: string; after: string }[] = [];
    if (before.name !== after.name)
      changes.push({ field: 'Nome', before: before.name, after: after.name });
    if (before.status !== after.status) {
      changes.push({ field: 'Status', before: before.status, after: after.status });
    }
    for (const variant of after.variants) {
      const old = before.variants.find((item) => item.id === variant.id);
      if (!old) {
        changes.push({ field: `Variante ${variant.id}`, before: '—', after: 'criada' });
        continue;
      }
      if (old.price !== variant.price) {
        changes.push({
          field: `Preço ${variant.id}`,
          before: brl(old.price),
          after: brl(variant.price),
        });
      }
      if (old.promoPrice !== variant.promoPrice) {
        changes.push({
          field: `Promoção ${variant.id}`,
          before: brl(old.promoPrice),
          after: brl(variant.promoPrice),
        });
      }
      if (old.stock !== variant.stock) {
        changes.push({
          field: `Estoque ${variant.id}`,
          before: String(old.stock),
          after: String(variant.stock),
        });
      }
    }
    for (const old of before.variants) {
      if (!after.variants.some((variant) => variant.id === old.id)) {
        changes.push({ field: `Variante ${old.id}`, before: 'existia', after: 'removida' });
      }
    }
    return changes.length ? changes : [{ field: 'Dados', before: '—', after: 'atualizados' }];
  }
}
