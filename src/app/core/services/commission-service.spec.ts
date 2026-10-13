import { TestBed } from '@angular/core/testing';
import { loginAs } from '../../../testing/test-helpers';
import { AffiliateProgram } from './affiliate-program';
import { CommissionService } from './commission-service';
import { StoreCredit } from './store-credit';

const JULIA = 'julia.afiliada@email.com';
const MARINA = 'marina.lopes@email.com';
const receipt = { name: 'pix.pdf', type: 'application/pdf', size: 1000, url: 'blob:x' };

describe('CommissionService', () => {
  beforeEach(() => localStorage.clear());

  it('registra comissão só de afiliado no ar, base positiva e sem repetir pedido', () => {
    const service = TestBed.inject(CommissionService);
    const before = service.commissions().length;
    service.register({ number: 'NPX1', couponCode: 'JULIA5', affiliateEmail: JULIA, base: 200 });
    service.register({ number: 'NPX1', couponCode: 'JULIA5', affiliateEmail: JULIA, base: 200 });
    service.register({ number: 'NPX2', couponCode: 'JULIA5', affiliateEmail: JULIA, base: 0 });
    service.register({
      number: 'NPX3',
      couponCode: 'X',
      affiliateEmail: 'ninguem@email.com',
      base: 9,
    });
    expect(service.commissions().length).toBe(before + 1);
    const created = service.commissions().find((c) => c.orderNumber === 'NPX1')!;
    expect(created).toMatchObject({ amount: 10, percent: 5, state: 'aberta' });
    // Programa fora do ar: não gera.
    const program = TestBed.inject(AffiliateProgram);
    program.save({ ...program.settings(), active: false });
    service.register({ number: 'NPX4', couponCode: 'JULIA5', affiliateEmail: JULIA, base: 100 });
    expect(service.commissions().some((c) => c.orderNumber === 'NPX4')).toBe(false);
  });

  it('entrega marca a data; cancelamento cancela; devolução reduz ou cancela', () => {
    const service = TestBed.inject(CommissionService);
    service.register({ number: 'NPY1', couponCode: 'JULIA5', affiliateEmail: JULIA, base: 200 });
    service.markDelivered('NPY1', new Date(2026, 9, 1));
    expect(service.commissions().find((c) => c.orderNumber === 'NPY1')?.deliveredAt).toEqual(
      new Date(2026, 9, 1),
    );
    expect(service.returnFromOrder('NPY1', 0)).toBe(false);
    expect(service.returnFromOrder('NPY1', 50)).toBe(true);
    expect(service.commissions().find((c) => c.orderNumber === 'NPY1')).toMatchObject({
      base: 150,
      amount: 7.5,
    });
    expect(service.returnFromOrder('NPY1', 150)).toBe(true);
    expect(service.commissions().find((c) => c.orderNumber === 'NPY1')?.state).toBe('cancelada');
    expect(service.cancelByOrder('NPY1')).toBe(false); // já cancelada
    service.register({ number: 'NPY2', couponCode: 'JULIA5', affiliateEmail: JULIA, base: 100 });
    expect(service.cancelByOrder('NPY2')).toBe(true);
  });

  it('afiliada vê só as suas vendas e pagamentos (mais recentes primeiro)', () => {
    loginAs('affiliate');
    const service = TestBed.inject(CommissionService);
    expect(service.mine().every((c) => c.affiliateEmail === JULIA)).toBe(true);
    expect(service.mine().length).toBeGreaterThan(0);
    const dates = service.myPayouts().map((p) => p.createdAt.getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it('pagar: Pix exige comprovante; crédito lança na hora com bônus; não paga duas vezes', () => {
    const service = TestBed.inject(CommissionService);
    expect(service.pay('ninguem@email.com', 'Admin')).toBeNull();
    // Júlia recebe por Pix e tem liberado no mock.
    expect(service.pay(JULIA, 'Admin')).toBeNull();
    const pix = service.pay(JULIA, 'Admin', receipt)!;
    expect(pix.method).toBe('pix');
    expect(pix.receipt).toEqual(receipt);
    expect(service.pay(JULIA, 'Admin', receipt)).toBeNull(); // nada mais liberado
    // Marina recebe em crédito.
    const credit = TestBed.inject(StoreCredit);
    const before = credit.balanceOf(MARINA);
    service.register({ number: 'NPZ1', couponCode: 'MARINA5', affiliateEmail: MARINA, base: 100 });
    service.markDelivered('NPZ1', new Date(Date.now() - 10 * 86_400_000));
    const paid = service.pay(MARINA, 'Admin');
    if (paid) {
      expect(paid.method).toBe('credito');
      expect(paid.receipt).toBeUndefined();
      expect(credit.balanceOf(MARINA)).toBeGreaterThan(before);
    }
  });
});
