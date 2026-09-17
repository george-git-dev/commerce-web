export interface ProductAttribute {
  name: string;
  value: string;
}

/**
 * Espelha o `ProductResponse` da Commerce API.
 *
 * A API ainda não tem campo de imagem — enquanto isso não muda, a UI usa um
 * placeholder genérico (ver `product-card`).
 */
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  categoryId: number;
  categoryName: string;
  brandId: number;
  brandName: string;
  attributes: readonly ProductAttribute[];
  finalPrice: number;
  promotionActive: boolean;
}