import { TestBed } from '@angular/core/testing';
import { CouponDraft } from '../../../core/models/coupon';
import { AuthService } from '../../../core/services/auth-service';
import { CouponService } from '../../../core/services/coupon-service';
import { AdminAudit } from './admin-audit';
import { AdminCoupons } from './admin-coupons';

const draft: CouponDraft = {
  code: 'TESTE20',
  kind: 'percent',
  value: 20,
  maxDiscount: 40,
  perCustomer: 1,
  firstPurchaseOnly: false,
  allowOnPromo: false,
  active: true,
};

describe('cupons (admin)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
  });

  it('valida código, duplicado e valores', () => {
    const store = TestBed.inject(AdminCoupons);
    expect(store.problems(null, draft)).toEqual([]);
    expect(store.problems(null, { ...draft, code: 'NANI10' })).toContain(
      'Já existe um cupom com este código.',
    );
    expect(store.problems(null, { ...draft, code: 'com espaço' })[0]).toMatch(/^Código/);
    expect(store.problems(null, { ...draft, value: 95 })).toContain(
      'Percentual entre 1% e 90% (número inteiro).',
    );
    expect(store.problems(null, { ...draft, kind: 'fixed', value: 50, minSubtotal: 40 })).toContain(
      'O desconto fixo precisa ser menor que o pedido mínimo.',
    );
  });

  it('cria (auditado), vale no carrinho e só exclui cupom nunca usado', () => {
    const store = TestBed.inject(AdminCoupons);
    const id = store.save(null, draft);
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Criou cupom');
    expect(TestBed.inject(CouponService).find('TESTE20')?.id).toBe(id);
    expect(store.summary(draft)).toMatch(/^20% de desconto \(até R\$\s40,00\)$/);

    const used = store.all().find((c) => c.code === 'NANI10')!;
    expect(store.remove(used.id)).toBe(false);
    expect(store.remove(id)).toBe(true);
    expect(store.find(id)).toBeUndefined();
  });
});

describe('cupons (admin): resumo e permissão', () => {
  beforeEach(() => localStorage.clear());

  it('resumo lista as regras do cupom; situação legível', () => {
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const store = TestBed.inject(AdminCoupons);
    const text = store.summary({
      ...draft,
      minSubtotal: 200,
      firstPurchaseOnly: true,
      allowOnPromo: true,
      affiliateEmail: 'a@b.com',
    });
    expect(text).toContain('mín.');
    expect(text).toContain('1ª compra');
    expect(text).toContain('vale em oferta');
    expect(text).toContain('cupom de afiliado');
    expect(store.statusLabel(store.all()[0])).toBeTruthy();
  });

  it('visualizador não cria nem exclui', () => {
    TestBed.inject(AuthService).login('viewer@email.com', '12345678');
    const store = TestBed.inject(AdminCoupons);
    expect(store.save(null, draft)).toBe(0);
    const unused = store.all().find((c) => c.uses === 0)!;
    expect(store.remove(unused.id)).toBe(false);
    expect(TestBed.inject(CouponService).find(unused.code)).toBeTruthy();
  });
});
