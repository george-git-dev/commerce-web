export interface Product {
  id: string;
  name: string;
  /** Concentração e volume, exibidos sob o nome no card. */
  subtitle: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  badge?: string;
}
