import { Category } from '../models/category';
import { Highlight } from '../models/highlight';
import { Product } from '../models/product';

/**
 * Dados mockados do catálogo. Consumidos apenas pelo `CatalogService` — nenhum
 * componente importa este arquivo, de modo que a troca por HTTP fique contida no serviço.
 */

export const HIGHLIGHTS_MOCK: readonly Highlight[] = [
  {
    icon: 'local_shipping',
    title: 'Frete grátis',
    text: 'Acima de R$ 299, para todo o Brasil',
  },
  {
    icon: 'credit_card',
    title: 'Parcele em até 12x',
    text: 'No cartão de crédito, sem juros',
  },
  {
    icon: 'verified_user',
    title: 'Compra segura',
    text: 'Seus dados sempre protegidos',
  },
  {
    icon: 'headset_mic',
    title: 'Consultoria olfativa',
    text: 'Nosso time ajuda na escolha',
  },
];

export const CATEGORIES_MOCK: readonly Category[] = [
  {
    id: 'masculinos',
    name: 'Masculinos',
    text: 'Amadeirados, especiados e couros',
    image: 'img/cat-masculinos.svg',
  },
  {
    id: 'femininos',
    name: 'Femininos',
    text: 'Florais, frutados e baunilhas',
    image: 'img/cat-femininos.svg',
  },
  {
    id: 'arabes',
    name: 'Árabes',
    text: 'Oud, âmbar e incenso',
    image: 'img/cat-arabes.svg',
  },
  {
    id: 'kits',
    name: 'Kits',
    text: 'Conjuntos para presentear',
    image: 'img/cat-kits.svg',
  },
  {
    id: 'lancamentos',
    name: 'Lançamentos',
    text: 'As novidades da temporada',
    image: 'img/cat-lancamentos.svg',
  },
  {
    id: 'ofertas',
    name: 'Ofertas',
    text: 'Seleção com até 40% off',
    image: 'img/cat-ofertas.svg',
  },
];

export const FEATURED_PRODUCTS_MOCK: readonly Product[] = [
  {
    id: 'noite-de-oud',
    name: 'Noite de Oud',
    subtitle: 'Eau de Parfum 100ml',
    category: 'Árabes',
    price: 389.9,
    oldPrice: 649.9,
    image: 'img/prod-noite-oud.svg',
    rating: 5,
    reviews: 142,
    badge: 'Oferta',
  },
  {
    id: 'ambar-real',
    name: 'Âmbar Real',
    subtitle: 'Eau de Parfum 100ml',
    category: 'Árabes',
    price: 449.9,
    image: 'img/prod-ambar-real.svg',
    rating: 5,
    reviews: 87,
    badge: 'Lançamento',
  },
  {
    id: 'flor-de-damasco',
    name: 'Flor de Damasco',
    subtitle: 'Eau de Parfum 75ml',
    category: 'Femininos',
    price: 329.9,
    image: 'img/prod-flor-damasco.svg',
    rating: 4,
    reviews: 96,
    badge: 'Mais vendido',
  },
  {
    id: 'madeira-do-deserto',
    name: 'Madeira do Deserto',
    subtitle: 'Eau de Parfum 100ml',
    category: 'Masculinos',
    price: 519.9,
    image: 'img/prod-madeira.svg',
    rating: 5,
    reviews: 64,
  },
];
