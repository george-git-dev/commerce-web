import { BODY_CARE_CATEGORIES } from '../config/product-categories';
import { FREE_SHIPPING_LABEL, STORE_CONFIG } from '../config/store-config';
import { Category } from '../models/category';
import { Highlight } from '../models/highlight';

/**
 * Dados mockados do catálogo. Consumidos apenas pelo `CatalogService` — nenhum
 * componente importa este arquivo, de modo que a troca por HTTP fique contida no serviço.
 */

export const HIGHLIGHTS_MOCK: readonly Highlight[] = [
  {
    icon: 'local_shipping',
    title: 'Frete grátis',
    text: `Acima de ${FREE_SHIPPING_LABEL}, para todo o Brasil`,
  },
  {
    icon: 'lock',
    title: 'Compra segura',
    text: 'Seus dados sempre protegidos',
  },
  {
    icon: 'inventory_2',
    title: 'Produto original',
    text: 'Frascos lacrados, direto do importador',
  },
  {
    icon: 'payments',
    title: 'Pagamento facilitado',
    text: `Parcele em até ${STORE_CONFIG.maxInstallments}x sem juros`,
  },
];

export const CATEGORIES_MOCK: readonly Category[] = [
  {
    id: 'masculinos',
    name: 'Masculinos',
    text: 'Amadeirados, especiados e couros',
    icon: 'male',
    image: 'img/categorias/masculinos.webp',
    genderFilter: 'Masculino',
  },
  {
    id: 'femininos',
    name: 'Femininos',
    text: 'Florais, frutados e baunilhas',
    icon: 'female',
    image: 'img/categorias/femininos.webp',
    genderFilter: 'Feminino',
  },
  {
    id: 'unissex',
    name: 'Unissex',
    text: 'Notas versáteis, para qualquer ocasião',
    icon: 'diversity_1',
    image: 'img/categorias/unissex.webp',
    genderFilter: 'Unissex',
  },
  {
    id: 'kits',
    name: 'Kits e presentes',
    text: 'Conjuntos para presentear',
    icon: 'redeem',
    image: 'img/categorias/kits.webp',
    categoryFilter: ['kit'],
  },
  {
    id: 'corpo-e-banho',
    name: 'Corpo e banho',
    text: 'Hidratantes e body splash',
    icon: 'spa',
    image: 'img/categorias/corpo-e-banho.webp',
    categoryFilter: BODY_CARE_CATEGORIES,
  },
  {
    id: 'lancamentos',
    name: 'Lançamentos',
    text: 'As novidades da temporada',
    icon: 'auto_awesome',
    image: 'img/categorias/lancamentos.webp',
  },
  {
    id: 'ofertas',
    name: 'Ofertas',
    text: 'Seleção com até 40% off',
    icon: 'sell',
    image: 'img/categorias/ofertas.webp',
  },
  {
    // Fecha a grade em 8 (2×4 no celular, 4×2 a partir do tablet).
    id: 'ver-tudo',
    name: 'Ver tudo',
    text: 'O catálogo completo',
    icon: 'grid_view',
  },
];
