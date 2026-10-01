import { ProductCategory } from './product';

export interface Category {
  id: string;
  name: string;
  text: string;
  /** Nome de um Material Icon — não há foto por categoria nesta fase. */
  icon: string;
  image?: string;
  genderFilter?: 'Masculino' | 'Feminino' | 'Unissex';
  /**
   * Tile que leva a uma ou mais categorias de produto
   * (Kits → `?categoria=kit`; Corpo e banho → `?categoria=hidratante,body-splash`).
   */
  categoryFilter?: readonly ProductCategory[];
}
