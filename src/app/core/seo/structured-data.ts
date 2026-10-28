import { SOCIAL_LINKS, STORE_CONFIG } from '../config/store-config';
import { Product } from '../models/product';
import { effectivePrice, isAvailable } from '../utils/product-pricing';
import { absolute } from './seo';

/**
 * Dados estruturados (schema.org) que o Google usa no resultado da busca:
 * preço, estoque e estrelas no produto; nome, logo e redes da loja.
 * Validar em https://search.google.com/test/rich-results depois do deploy.
 */

const money = (value: number) => value.toFixed(2);

/** Produto: um `Product` com todas as variantes num `AggregateOffer` (menor e maior preço). */
export function productJsonLd(product: Product, path: string): Record<string, unknown> {
  const prices = product.variants.map(effectivePrice);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.variants[0]?.id,
    image: product.images.map(absolute),
    brand: { '@type': 'Brand', name: product.brandName },
    offers: {
      '@type': 'AggregateOffer',
      url: absolute(path),
      priceCurrency: 'BRL',
      lowPrice: money(Math.min(...prices)),
      highPrice: money(Math.max(...prices)),
      offerCount: product.variants.length,
      availability: isAvailable(product)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    // Só com avaliação de verdade (compra verificada e moderada).
    ...(product.rating && product.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };
}

/** Loja (na home): nome, endereço do site, logo, redes e atendimento. */
export function storeJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: STORE_CONFIG.name,
    slogan: STORE_CONFIG.tagline,
    url: STORE_CONFIG.siteUrl,
    logo: absolute('logo-nani-full.webp'),
    email: STORE_CONFIG.email,
    telephone: STORE_CONFIG.phone,
    sameAs: SOCIAL_LINKS.filter((link) => link.brand !== 'whatsapp').map((link) => link.url),
  };
}
