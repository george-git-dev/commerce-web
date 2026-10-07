import { PurchaseEntry, Supplier } from '../services/purchase-rules';

/** Fornecedores fictícios (CNPJs com dígito válido, inventados). */
export const SUPPLIERS_MOCK: readonly Supplier[] = [
  {
    id: 1,
    legalName: 'Oriente Importadora Ltda',
    tradeName: 'Oriente Import',
    cnpj: '11222333000181',
    contact: 'Rafael',
    whatsapp: '11987650001',
    email: 'vendas@oriente.exemplo.com.br',
    leadTimeDays: 7,
    brands: ['Lattafa', 'Armaf'],
    active: true,
    notes: 'Pedido mínimo de 6 unidades por perfume.',
  },
  {
    id: 2,
    legalName: 'Arabian Scents Distribuidora Ltda',
    tradeName: 'Arabian Scents',
    cnpj: '44555666000181',
    contact: 'Camila',
    whatsapp: '11987650002',
    email: 'comercial@arabianscents.exemplo.com.br',
    leadTimeDays: 10,
    brands: ['Afnan', 'Rasasi', 'Lattafa'],
    active: true,
    notes: '',
  },
  {
    id: 3,
    legalName: 'Al Waha Comércio de Perfumes Ltda',
    tradeName: 'Al Waha',
    cnpj: '77888999000181',
    contact: 'Yusuf',
    whatsapp: '',
    email: 'contato@alwaha.exemplo.com.br',
    leadTimeDays: 15,
    brands: ['Al Haramain', 'Ard Al Zaafaran', 'Maison Alhambra'],
    active: true,
    notes: '',
  },
];

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

/**
 * Compras fictícias. As recebidas já estão no saldo dos produtos mock — o
 * histórico de estoque as mostra como entradas (ver `AdminStockStore`).
 * O Asad aparece em dois fornecedores com custos diferentes (comparativo).
 */
export const PURCHASES_MOCK: readonly PurchaseEntry[] = [
  {
    id: 1,
    supplierId: 1,
    invoice: '000.481',
    date: daysAgo(48),
    items: [
      { sku: 'lattafa-asad-100', quantity: 12, unitCost: 172 },
      { sku: 'lattafa-khamrah-100', quantity: 10, unitCost: 205 },
      { sku: 'lattafa-fakhar-black-100', quantity: 8, unitCost: 138 },
    ],
    status: 'recebido',
    createdBy: 'George',
    receivedAt: daysAgo(46),
    receivedBy: 'George',
  },
  {
    id: 2,
    supplierId: 2,
    invoice: '7.215',
    date: daysAgo(30),
    items: [
      { sku: 'lattafa-asad-100', quantity: 10, unitCost: 164 },
      { sku: 'rasasi-hawas-for-him-100', quantity: 12, unitCost: 228 },
      { sku: 'afnan-supremacy-silver-100', quantity: 6, unitCost: 214 },
    ],
    status: 'recebido',
    createdBy: 'George',
    receivedAt: daysAgo(27),
    receivedBy: 'George',
  },
  {
    id: 3,
    supplierId: 3,
    invoice: '1.902',
    date: daysAgo(21),
    items: [
      { sku: 'al-haramain-l-aventure-100', quantity: 10, unitCost: 199 },
      { sku: 'ard-al-zaafaran-dirham-100', quantity: 20, unitCost: 82 },
    ],
    status: 'recebido',
    createdBy: 'George',
    receivedAt: daysAgo(15),
    receivedBy: 'George',
  },
  {
    id: 4,
    supplierId: 2,
    invoice: '7.388',
    date: daysAgo(2),
    items: [
      { sku: 'afnan-9pm-100', quantity: 6, unitCost: 190 },
      { sku: 'rasasi-hawas-black-100', quantity: 6, unitCost: 241 },
    ],
    status: 'pedido',
    createdBy: 'George',
  },
];
