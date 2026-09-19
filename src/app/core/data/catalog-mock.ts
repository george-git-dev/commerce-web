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
    icon: 'lock',
    title: 'Compra segura',
    text: 'Seus dados sempre protegidos',
  },
  {
    icon: 'inventory_2',
    title: 'Produto original',
    text: 'Frascos lacrados, direto do fabricante',
  },
  {
    icon: 'payments',
    title: 'Pagamento facilitado',
    text: 'Parcele em até 12x sem juros',
  },
];

export const CATEGORIES_MOCK: readonly Category[] = [
  {
    id: 'masculinos',
    name: 'Masculinos',
    text: 'Amadeirados, especiados e couros',
    icon: 'male',
    genderFilter: 'Masculino',
  },
  {
    id: 'femininos',
    name: 'Femininos',
    text: 'Florais, frutados e baunilhas',
    icon: 'female',
    genderFilter: 'Feminino',
  },
  {
    id: 'unissex',
    name: 'Unissex',
    text: 'Notas versáteis, para qualquer ocasião',
    icon: 'diversity_1',
    genderFilter: 'Unissex',
  },
  {
    id: 'kits',
    name: 'Kits',
    text: 'Conjuntos para presentear',
    icon: 'redeem',
  },
  {
    id: 'lancamentos',
    name: 'Lançamentos',
    text: 'As novidades da temporada',
    icon: 'auto_awesome',
  },
  {
    id: 'ofertas',
    name: 'Ofertas',
    text: 'Seleção com até 40% off',
    icon: 'sell',
  },
];
