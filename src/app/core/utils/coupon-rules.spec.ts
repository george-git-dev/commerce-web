import { Coupon, CouponDraft } from '../models/coupon';
import {
  couponDescription,
  couponDiscount,
  couponDiscountLabel,
  couponDraftProblems,
  couponProblem,
  couponStatus,
  normalizeCode,
} from './coupon-rules';

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  id: 1,
  code: 'NANI10',
  kind: 'percent',
  value: 10,
  firstPurchaseOnly: false,
  allowOnPromo: false,
  active: true,
  uses: 0,
  discountGiven: 0,
  ...over,
});
const today = '2026-10-12';
const ctx = (over: object = {}) => ({
  today,
  subtotal: 300,
  eligibleSubtotal: 300,
  customer: { usedThisCoupon: 0, hasPurchased: false },
  ...over,
});

describe('regras de cupom', () => {
  it('normaliza o código e calcula a situação (o que vencer primeiro)', () => {
    expect(normalizeCode('  nani10 ')).toBe('NANI10');
    expect(couponStatus(coupon(), today)).toBe('no-ar');
    expect(couponStatus(coupon({ active: false }), today)).toBe('inativo');
    expect(couponStatus(coupon({ endsOn: '2026-10-11' }), today)).toBe('encerrado');
    expect(couponStatus(coupon({ maxUses: 5, uses: 5 }), today)).toBe('esgotado');
    expect(couponStatus(coupon({ startsOn: '2026-10-20' }), today)).toBe('agendado');
  });

  it('textos do desconto', () => {
    expect(couponDiscountLabel(coupon({ kind: 'shipping' }))).toBe('Frete grátis');
    expect(couponDiscountLabel(coupon({ kind: 'fixed', value: 30 }))).toMatch(
      /R\$\s30,00 de desconto/,
    );
    expect(couponDiscountLabel(coupon({ maxDiscount: 50 }))).toMatch(
      /10% de desconto \(até R\$\s50,00\)/,
    );
    expect(couponDescription(coupon({ minSubtotal: 200 }))).toMatch(
      /10% de desconto · a partir de R\$\s200,00 · não vale em itens em oferta/,
    );
    expect(couponDescription(coupon({ kind: 'shipping' }))).toBe('Frete grátis');
  });

  it('motivo de não valer, para o cliente', () => {
    expect(couponProblem(coupon(), ctx())).toBeNull();
    expect(couponProblem(coupon({ active: false }), ctx())).toBe('Cupom inválido ou expirado.');
    expect(couponProblem(coupon({ endsOn: '2026-10-01' }), ctx())).toBe('Este cupom expirou.');
    expect(couponProblem(coupon({ maxUses: 1, uses: 1 }), ctx())).toContain('limite de usos');
    expect(couponProblem(coupon({ minSubtotal: 500 }), ctx())).toContain('a partir de');
    expect(couponProblem(coupon(), ctx({ eligibleSubtotal: 0 }))).toContain('em oferta');
    expect(couponProblem(coupon({ kind: 'shipping' }), ctx({ eligibleSubtotal: 0 }))).toBeNull();
    const customer = (c: object) =>
      ctx({ customer: { usedThisCoupon: 0, hasPurchased: false, ...c } });
    expect(couponProblem(coupon(), customer({ isOwner: true }))).toContain('próprio cupom');
    expect(
      couponProblem(coupon({ firstPurchaseOnly: true }), customer({ hasPurchased: true })),
    ).toContain('primeira compra');
    expect(couponProblem(coupon({ perCustomer: 1 }), customer({ usedThisCoupon: 1 }))).toBe(
      'Você já usou este cupom.',
    );
    expect(couponProblem(coupon({ perCustomer: 1 }), ctx({ customer: null }))).toBeNull();
  });

  it('desconto: %, teto, fixo e frete', () => {
    expect(couponDiscount(coupon(), 250)).toBe(25);
    expect(couponDiscount(coupon({ maxDiscount: 20 }), 250)).toBe(20);
    expect(couponDiscount(coupon({ kind: 'fixed', value: 30 }), 20)).toBe(20);
    expect(couponDiscount(coupon({ kind: 'shipping' }), 250)).toBe(0);
    expect(couponDiscount(coupon(), 0)).toBe(0);
  });

  it('cadastro: cada problema', () => {
    const draft = (over: Partial<CouponDraft> = {}): CouponDraft =>
      ({ ...coupon(), code: 'NOVO10', ...over }) as CouponDraft;
    expect(couponDraftProblems(draft(), ['NANI10'])).toEqual([]);
    expect(couponDraftProblems(draft({ code: 'a b' }), [])).toHaveLength(1);
    expect(couponDraftProblems(draft({ code: 'NANI10' }), ['NANI10'])).toEqual([
      'Já existe um cupom com este código.',
    ]);
    expect(couponDraftProblems(draft({ value: 0 }), [])).toEqual(['Informe o desconto.']);
    expect(couponDraftProblems(draft({ value: 95 }), [])).toHaveLength(1);
    expect(couponDraftProblems(draft({ maxDiscount: 0 }), [])).toHaveLength(1);
    expect(
      couponDraftProblems(draft({ kind: 'fixed', value: 300, minSubtotal: 200 }), []),
    ).toContain('O desconto fixo precisa ser menor que o pedido mínimo.');
    expect(couponDraftProblems(draft({ minSubtotal: -1 }), [])).toHaveLength(1);
    expect(
      couponDraftProblems(draft({ startsOn: '2026-10-10', endsOn: '2026-10-01' }), []),
    ).toHaveLength(1);
    expect(couponDraftProblems(draft({ maxUses: 0, perCustomer: 1.5 }), [])).toHaveLength(2);
    expect(couponDraftProblems(draft({ kind: 'shipping', value: 0 }), [])).toEqual([]);
  });
});
