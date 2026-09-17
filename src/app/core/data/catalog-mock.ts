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
