import { Concentration, FragranceNote, OlfactoryFamily } from '../config/fragrance';

export type Gender = 'Masculino' | 'Feminino' | 'Unissex';

/**
 * - `frasco`: o frasco original lacrado, no volume de fábrica. **No máximo um
 *   por produto** — não existe "escolher tamanho" de frasco (regra que o
 *   cadastro e o back também validam).
 * - `decant`: perfume fracionado (1, 5, 10 ml…). Pós-MVP; o estoque real de
 *   decant será em ml a granel (ver roadmap), aqui ainda é por unidade.
 */
export type VariantKind = 'frasco' | 'decant';

export type Occasion = 'dia' | 'noite';

export type ProductStatus = 'rascunho' | 'publicado';

/**
 * Id da categoria do produto ("perfume", "kit"…). As fixas e seus rótulos
 * estão em `core/config/product-categories.ts`; novas são criadas no
 * backoffice. `perfume` e `kit` têm campos próprios (concentração, itens).
 * Fase 2 (B3): tabela `category` + `GET /categories`.
 */
export type ProductCategory = string;

/**
 * O que o cliente compra: um tamanho de um perfume, com preço e estoque próprios.
 * É a variante (não o produto) que vai para o carrinho e para o pedido.
 */
export interface ProductVariant {
  /** SKU — identificador único da variante. */
  id: string;
  kind: VariantKind;
  /** Volume em ml. Opcional porque o kit não tem um volume único. */
  volumeMl?: number;
  /** Preço cheio, em reais. */
  price: number;
  /** Preço promocional; quando existe, é o que o cliente paga e `price` aparece riscado. */
  promoPrice?: number;
  /** Unidades disponíveis. 0 = "Esgotado" só neste tamanho. */
  stock: number;
  /** Foto própria da variante (ex.: frasquinho do decant). Pós-MVP; ainda sem uso. */
  image?: string;
}

/** Pirâmide olfativa, com notas da lista fixa (`FRAGRANCE_NOTES`). */
export interface OlfactoryNotes {
  top: readonly FragranceNote[];
  heart: readonly FragranceNote[];
  base: readonly FragranceNote[];
}

/**
 * Perfume. É o contrato que o back vai devolver na Fase 2 (`ProductResponse`):
 * o front define, o back segue. Preço e estoque ficam nas variantes.
 */
export interface Product {
  id: number;
  /** Identificador legível da URL: `/produtos/lattafa-asad`. */
  slug: string;
  /** Linha do perfume (ex.: "Asad"). Agrupa as versões de uma mesma linha. */
  line: string;
  /** Versão dentro da linha (ex.: "Bourbon", "Elixir"). Opcional: o original não tem. */
  subtitle?: string;
  /** Nome exibido, já montado pelo back: linha + subtítulo (ex.: "Asad Bourbon"). */
  name: string;
  description: string;
  brandId: number;
  brandName: string;
  category: ProductCategory;
  /** Vale para todas as categorias (um body splash pode ser feminino, um kit masculino). */
  gender: Gender;
  /** Só perfume. */
  concentration?: Concentration;
  /** Pode ser vazio (ex.: kit, hidratante sem fragrância definida). */
  families: readonly OlfactoryFamily[];
  /** Opcional: sem notas, a página não mostra a pirâmide olfativa. */
  notes?: OlfactoryNotes;
  /** Só kit: o que vem na caixa (ex.: "Asad Eau de Parfum 100 ml"). */
  kitItems?: readonly string[];
  occasions?: readonly Occasion[];
  /** Só produtos publicados aparecem na loja. */
  status: ProductStatus;
  /** Automático: entre os últimos cadastrados (`core/utils/product-highlights.ts`). */
  launch?: boolean;
  /** Automático: entre os mais vendidos (`core/utils/product-highlights.ts`). */
  bestSeller?: boolean;
  /** Selo manual do card (ex.: "Exclusivo"). Mais vendido/Lançamento/Oferta são automáticos. */
  badge?: string;
  // Avaliações: decisão pendente no roadmap (não exibir nota inventada).
  /** Média das avaliações aprovadas (calculada pelo back). Ausente = sem avaliações. */
  rating?: number;
  /** Total de avaliações aprovadas (calculado pelo back). */
  reviewCount?: number;
  /**
   * Unidades vendidas (todas as variantes). Calculado pelo back a partir dos
   * pedidos pagos — nunca digitado no cadastro. Usado em "Mais vendidos".
   */
  soldCount?: number;
  /**
   * Fotos do produto, na ordem da galeria; a primeira é a principal.
   * Caminhos relativos a `public/` (ex.: 'img/produtos/garrafa-preta.webp').
   */
  images: readonly string[];
  /** Pelo menos uma variante; no máximo uma `frasco`, decants à vontade. */
  variants: readonly ProductVariant[];
}

/** Produto + tamanho escolhido. É o que os componentes emitem ao adicionar ao carrinho. */
export interface ProductSelection {
  product: Product;
  variant: ProductVariant;
}
