import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { AdminOrderStore } from './admin-order-store';
import { AdminPurchaseStore } from './admin-purchase-store';
import { AdminStockStore } from './admin-stock-store';
import {
  lastSaleBySku,
  purchasesReport,
  reportCsv,
  reportRange,
  stockReport,
} from './report-rules';

const NOW = new Date(2026, 9, 12, 15);

describe('relatórios: períodos, estoque e compras', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
  });

  it('períodos: este mês, 30/90 dias e personalizado (sem datas = hoje)', () => {
    expect(reportRange('mes', NOW)).toMatchObject({ days: 12 });
    expect(reportRange('30', NOW).days).toBe(30);
    expect(reportRange('90', NOW).days).toBe(90);
    expect(reportRange('personalizado', NOW).days).toBe(1);
    expect(reportRange('personalizado', NOW, new Date(2026, 9, 1), new Date(2026, 9, 5)).days).toBe(
      5,
    );
  });

  it('estoque valorizado: valor = saldo × custo, dias sem venda e totais', () => {
    const rows = TestBed.inject(AdminStockStore).rows();
    const orders = TestBed.inject(AdminOrderStore).orders();
    const last = lastSaleBySku(orders);
    expect(last.size).toBeGreaterThan(0);
    const table = stockReport(rows, last, new Date());
    expect(table.rows).toHaveLength(rows.length);
    const sold = table.rows.find((r) => r.cells['semVenda'] != null)!;
    expect(sold.cells['semVenda']).toBeGreaterThanOrEqual(0);
    const never = table.rows.find((r) => !last.has(r.cells['sku'] as string));
    if (never) expect(never.cells['semVenda']).toBeNull();
    const row = table.rows.find((r) => r.cells['custo'] != null)!;
    expect(row.cells['valor']).toBeCloseTo(
      (row.cells['custo'] as number) * (row.cells['saldo'] as number),
      1,
    );
    expect(table.totals!['saldo']).toBe(rows.reduce((s, r) => s + r.variant.stock, 0));

    // Sem custo: valor vazio.
    const uncosted = stockReport([{ ...rows[0], cost: undefined as never }], new Map(), new Date());
    expect(uncosted.rows[0].cells['valor']).toBeNull();
  });

  it('compras por nota e por fornecedor', () => {
    const purchases = TestBed.inject(AdminPurchaseStore);
    const range = reportRange('personalizado', NOW, new Date(2020, 0, 1), new Date(2030, 0, 1));
    const byInvoice = purchasesReport(purchases.entries(), purchases.suppliers(), range, 'nota');
    expect(byInvoice.rows).toHaveLength(purchases.entries().length);
    expect(byInvoice.rows.map((r) => r.cells['situacao'])).toEqual(
      expect.arrayContaining(['Recebido', 'A receber']),
    );
    const bySupplier = purchasesReport(
      purchases.entries(),
      purchases.suppliers(),
      range,
      'fornecedor',
    );
    const totals = bySupplier.rows.map((r) => r.cells['total'] as number);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(bySupplier.totals!['total']).toBe(byInvoice.totals!['total']);
    // Fornecedor removido aparece como "—".
    const orphan = purchasesReport(purchases.entries(), [], range, 'fornecedor');
    expect(orphan.rows.every((r) => r.cells['fornecedor'] === '—')).toBe(true);

    const csv = reportCsv(byInvoice);
    expect(csv).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
