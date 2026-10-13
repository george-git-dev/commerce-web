import {
  averageCost,
  entryProblems,
  EntryDraft,
  supplierProblems,
  SupplierDraft,
} from './purchase-rules';

const supplier: SupplierDraft = {
  legalName: 'Oriente Importadora Ltda',
  tradeName: 'Oriente Import',
  cnpj: '11.222.333/0001-81',
  contact: '',
  whatsapp: '',
  email: '',
  leadTimeDays: '',
  brands: [],
  active: true,
  notes: '',
};

const entry: EntryDraft = {
  supplierId: 1,
  invoice: '1234',
  date: '2026-10-01',
  items: [{ sku: 'lattafa-asad-100', quantity: 6, unitCost: 165 }],
};

describe('purchase-rules', () => {
  it('fornecedor: razão social, CNPJ válido e único', () => {
    expect(supplierProblems(supplier, [])).toEqual([]);
    expect(supplierProblems({ ...supplier, cnpj: '11.222.333/0001-82' }, [])).toHaveLength(1);
    expect(supplierProblems(supplier, ['11222333000181'])[0]).toContain('Já existe');
    const bad = { ...supplier, email: 'x@', whatsapp: '119', leadTimeDays: -2 };
    expect(supplierProblems(bad, [])).toHaveLength(3);
  });

  it('entrada: fornecedor, nota, data não futura e itens válidos', () => {
    expect(entryProblems(entry, '2026-10-07')).toEqual([]);
    expect(entryProblems({ ...entry, date: '2026-10-08' }, '2026-10-07')).toHaveLength(1);
    expect(entryProblems({ ...entry, supplierId: null, invoice: ' ' }, '2026-10-07')).toHaveLength(
      2,
    );
    expect(entryProblems({ ...entry, items: [] }, '2026-10-07')).toHaveLength(1);
    const twice = [entry.items[0], entry.items[0]];
    expect(entryProblems({ ...entry, items: twice }, '2026-10-07')[0]).toContain('repetidos');
    const bad = [{ sku: 'x', quantity: 0, unitCost: -1 }];
    expect(entryProblems({ ...entry, items: bad }, '2026-10-07')).toHaveLength(2);
  });

  it('custo médio ponderado', () => {
    expect(averageCost(0, undefined, 10, 150)).toBe(150);
    expect(averageCost(10, 150, 10, 170)).toBe(160);
    expect(averageCost(5, undefined, 5, 100)).toBe(100);
  });
});
