import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { AdminAudit } from './admin-audit';
import { AdminBrandStore } from './admin-brand-store';
import { AdminProductStore } from './admin-product-store';
import { AdminPurchaseStore } from './admin-purchase-store';
import { AdminStockStore } from './admin-stock-store';
import { ListMemory } from './list-memory';
import { DEFAULT_MIN_STOCK } from './stock-rules';

const login = (email = 'admin@email.com') => TestBed.inject(AuthService).login(email, '12345678');
const lastAudit = () => TestBed.inject(AdminAudit).entries()[0];

describe('AdminProductStore', () => {
  beforeEach(() => {
    localStorage.clear();
    login();
  });

  it('categorias: acha pelo nome (sem acento/caixa) ou cria', () => {
    const store = TestBed.inject(AdminProductStore);
    const existing = store.categories()[0];
    expect(store.ensureCategory(existing.label.toUpperCase())).toBe(existing.id);
    const id = store.ensureCategory('Óleo Perfumado');
    expect(id).toBe('oleo-perfumado');
    expect(store.categoryLabel(id)).toBe('Óleo Perfumado');
    expect(store.categoryLabel('nao-existe')).toBe('nao-existe');
  });

  it('marcas e notas: sem duplicar, contagem e renomear', () => {
    const store = TestBed.inject(AdminProductStore);
    const total = store.brandNames().length;
    store.addBrand('lattafa');
    expect(store.brandNames()).toHaveLength(total);
    store.addBrand('  Nova Casa ');
    expect(store.brandNames()).toContain('Nova Casa');

    const count = store.productCount('Lattafa');
    expect(count).toBeGreaterThan(0);
    expect(store.lines('Lattafa').length).toBeGreaterThan(0);
    store.renameBrand('Lattafa', 'Lattafa Perfumes');
    expect(store.productCount('Lattafa Perfumes')).toBe(count);
    expect(store.brandNames()).not.toContain('Lattafa');

    store.addNote('Figo', 'img/figo.webp');
    expect(store.noteNames()).toContain('Figo');
    expect(store.noteImage('Figo')).toBe('img/figo.webp');
    expect(store.noteImage('Nada')).toBe('');
    expect(store.noteImage(store.noteNames()[0])).not.toBe('');
    expect(store.badgeNames().length).toBeGreaterThan(0);
  });

  it('duplicado, busca, próximo id e SKUs dos outros', () => {
    const store = TestBed.inject(AdminProductStore);
    const asad = store.find('lattafa-asad')!;
    expect(store.findDuplicate('lattafa', asad.line, asad.subtitle ?? '', null)?.id).toBe(asad.id);
    expect(store.findDuplicate('Lattafa', asad.line, asad.subtitle ?? '', asad.id)).toBeUndefined();
    expect(store.nextId()).toBeGreaterThan(asad.id);
    expect(store.skusExcept(asad.id)).not.toContain(asad.variants[0].id.toLowerCase());
    expect(store.skusExcept(null)).toContain(asad.variants[0].id.toLowerCase());
    expect(store.find(null)).toBeUndefined();
  });

  it('rascunho rápido: slug/SKU únicos, sem preço; audita o cadastro', () => {
    const store = TestBed.inject(AdminProductStore);
    const data = {
      brand: 'Lattafa',
      line: 'Teste',
      subtitle: 'Intense',
      category: 'perfume',
      gender: 'Unissex' as const,
      volumeMl: 100,
    };
    const sku = store.createDraft(data);
    const sku2 = store.createDraft({ ...data, subtitle: ' Intense ' });
    expect(sku).toBe('lattafa-teste-intense-100');
    expect(sku2).not.toBe(sku);
    const draft = store.find('lattafa-teste-intense')!;
    expect(draft).toMatchObject({ status: 'rascunho', name: 'Teste Intense' });
    expect(draft.variants[0].price).toBe(0);
    expect(lastAudit().action).toBe('Cadastrou produto');
    expect(store.createDraft({ ...data, line: 'Solo', subtitle: '' })).toBe('lattafa-solo-100');
    expect(store.find('lattafa-solo')!.name).toBe('Solo');
  });

  it('editar audita nome, status, preço, estoque e variantes', () => {
    const store = TestBed.inject(AdminProductStore);
    const asad = store.find('lattafa-asad')!;
    const [first, ...rest] = asad.variants;
    store.save({
      ...asad,
      name: 'Asad Novo',
      status: 'rascunho',
      variants: [
        { ...first, price: first.price + 10, stock: first.stock + 1 },
        { ...first, id: 'asad-novo-sku' },
      ],
    });
    const fields = lastAudit().changes.map((c) => c.field);
    expect(lastAudit().action).toBe('Editou produto');
    expect(fields).toEqual(
      expect.arrayContaining([
        'Nome',
        'Status',
        `Preço ${first.id}`,
        `Estoque ${first.id}`,
        'Variante asad-novo-sku',
      ]),
    );
    if (rest.length) expect(fields).toContain(`Variante ${rest[0].id}`);

    store.save(store.find('lattafa-asad')!);
    expect(lastAudit().changes).toEqual([{ field: 'Dados', before: '—', after: 'atualizados' }]);

    store.setStock('asad-novo-sku', 42);
    expect(store.find('lattafa-asad')!.variants[1].stock).toBe(42);
  });
});

describe('AdminPurchaseStore', () => {
  beforeEach(() => {
    localStorage.clear();
    login();
  });

  it('fornecedores: nome, CNPJs, cadastro e edição auditados', () => {
    const store = TestBed.inject(AdminPurchaseStore);
    expect(store.supplierName(1)).toBe('Oriente Import');
    expect(store.supplierName(999)).toBe('—');
    expect(store.cnpjsExcept(1)).not.toContain('11222333000181');
    const draft = {
      legalName: ' Nova Ltda ',
      tradeName: '',
      cnpj: '12.345.678/0001-95',
      contact: ' Ana ',
      whatsapp: '(11) 99999-0000',
      email: ' a@b.com ',
      leadTimeDays: '',
      brands: ['Lattafa'],
      active: true,
      notes: ' ',
    };
    const id = store.saveSupplier(null, draft);
    expect(store.supplier(id)).toMatchObject({
      legalName: 'Nova Ltda',
      cnpj: '12345678000195',
      whatsapp: '11999990000',
      leadTimeDays: null,
    });
    expect(store.supplierName(id)).toBe('Nova Ltda');
    expect(lastAudit().action).toBe('Cadastrou fornecedor');
    store.saveSupplier(id, { ...draft, tradeName: 'Nova', leadTimeDays: 5 });
    expect(store.supplier(id)!.leadTimeDays).toBe(5);
    expect(lastAudit().action).toBe('Editou fornecedor');
    expect(store.supplier(null)).toBeUndefined();
  });

  it('entrada pedida → recebida soma no estoque uma vez só, com custo médio', () => {
    const store = TestBed.inject(AdminPurchaseStore);
    const stock = TestBed.inject(AdminStockStore);
    const pending = store.entries().find((e) => e.status === 'pedido')!;
    const sku = pending.items[0].sku;
    const before = stock.row(sku)!.variant.stock;
    const pendingCount = store.pendingCount();

    store.receive(pending.id);
    expect(stock.row(sku)!.variant.stock).toBe(before + pending.items[0].quantity);
    expect(store.pendingCount()).toBe(pendingCount - 1);
    expect(stock.history(sku)[0]).toMatchObject({
      reason: 'Entrada de mercadoria',
      reference: `NF ${pending.invoice}`,
    });
    store.receive(pending.id);
    expect(stock.row(sku)!.variant.stock).toBe(before + pending.items[0].quantity);
    store.receive(9999);

    expect(store.purchasesOf(sku).length).toBeGreaterThan(0);
    expect(store.yearTotal(pending.supplierId)).toBeGreaterThan(0);
    expect(store.yearTotal(pending.supplierId, 1999)).toBe(0);
  });

  it('cria entrada (e recebe na hora); SKU desconhecido não quebra', () => {
    const store = TestBed.inject(AdminPurchaseStore);
    const stock = TestBed.inject(AdminStockStore);
    const sku = 'lattafa-asad-100';
    const before = stock.row(sku)!.variant.stock;
    const id = store.createEntry(
      {
        supplierId: 1,
        invoice: ' 123 ',
        date: new Date(),
        items: [
          { sku, quantity: 2, unitCost: 150 },
          { sku: 'nao-existe', quantity: 1, unitCost: 1 },
        ],
      },
      true,
    );
    expect(store.entry(id)).toMatchObject({ invoice: '123', status: 'recebido' });
    expect(stock.row(sku)!.variant.stock).toBe(before + 2);
    const waiting = store.createEntry(
      { supplierId: 2, invoice: '9', date: new Date(), items: [] },
      false,
    );
    expect(store.entry(waiting)!.status).toBe('pedido');
    expect(store.entriesOf(2).some((e) => e.id === waiting)).toBe(true);
  });
});

describe('AdminBrandStore', () => {
  beforeEach(() => {
    localStorage.clear();
    login();
  });

  it('cadastra, valida e renomeia em produtos e fornecedores', () => {
    const brands = TestBed.inject(AdminBrandStore);
    const products = TestBed.inject(AdminProductStore);
    const purchases = TestBed.inject(AdminPurchaseStore);
    const usage = brands.usage('Lattafa');
    expect(usage.products).toBeGreaterThan(0);
    expect(usage.suppliers).toBe(2);

    brands.add('Lattafa');
    expect(lastAudit()?.action).not.toBe('Cadastrou marca');
    brands.add('Casa Nova');
    expect(lastAudit().action).toBe('Cadastrou marca');

    expect(brands.problems('Armaf', 'Lattafa').length).toBeGreaterThan(0);
    expect(brands.problems('Lattafa', 'Lattafa')).toEqual([]);

    brands.rename('Lattafa', '  ');
    brands.rename('Lattafa', 'Lattafa');
    brands.rename('Lattafa', ' Lattafa Perfumes ');
    expect(products.productCount('Lattafa Perfumes')).toBe(usage.products);
    expect(purchases.supplierCount('Lattafa Perfumes')).toBe(2);
    expect(lastAudit()).toMatchObject({ action: 'Renomeou marca', entityId: 'Lattafa Perfumes' });
  });
});

describe('AdminStockStore', () => {
  beforeEach(() => {
    localStorage.clear();
    login();
  });

  it('ajuste manual: entrada, saída e saldo nunca negativo', () => {
    const stock = TestBed.inject(AdminStockStore);
    const sku = 'lattafa-asad-100';
    const start = stock.row(sku)!.variant.stock;
    stock.adjust(sku, 'entrada', 3, 'Contagem', 'achei no fundo');
    expect(stock.row(sku)!.variant.stock).toBe(start + 3);
    expect(stock.history(sku)[0]).toMatchObject({ quantity: 3, note: 'achei no fundo' });
    stock.adjust(sku, 'saida', 1, 'Avaria');
    expect(stock.row(sku)!.variant.stock).toBe(start + 2);
    expect(lastAudit().action).toBe('Ajustou estoque');
    stock.adjust(sku, 'saida', 9999, 'Avaria');
    expect(stock.row(sku)!.variant.stock).toBe(start + 2);
    stock.adjust('nao-existe', 'entrada', 1, 'x');
    expect(stock.row(null)).toBeUndefined();
  });

  it('estoque mínimo: padrão, troca auditada e alerta', () => {
    const stock = TestBed.inject(AdminStockStore);
    const sku = 'lattafa-asad-100';
    expect(stock.minimum(sku)).toBe(DEFAULT_MIN_STOCK);
    const audits = TestBed.inject(AdminAudit).entries().length;
    stock.setMinimum(sku, DEFAULT_MIN_STOCK);
    expect(TestBed.inject(AdminAudit).entries()).toHaveLength(audits);
    const alerts = stock.alertCount();
    stock.setMinimum(sku, 10_000);
    expect(stock.minimum(sku)).toBe(10_000);
    expect(lastAudit().action).toBe('Alterou estoque mínimo');
    expect(stock.alertCount()).toBe(alerts + (stock.row(sku)!.status !== 'ok' ? 1 : 0));
    expect(stock.row(sku)!.status).not.toBe('ok');
  });
});

describe('ListMemory', () => {
  it('guarda por lista e zera ao trocar de usuário', () => {
    localStorage.clear();
    const memory = TestBed.inject(ListMemory);
    login();
    const state = memory.get('pedidos', () => ({ page: 1 }));
    state.page = 3;
    expect(memory.get('pedidos', () => ({ page: 1 })).page).toBe(3);
    TestBed.inject(AuthService).logout();
    login('viewer@email.com');
    expect(memory.get('pedidos', () => ({ page: 1 })).page).toBe(1);
  });
});
