import { TestBed } from '@angular/core/testing';
import { AffiliateProgram, programProblems } from '../../../core/services/affiliate-program';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { CartStore } from '../../../core/services/cart-store';
import { CatalogService } from '../../../core/services/catalog-service';
import { CouponService } from '../../../core/services/coupon-service';
import { AdminAudit } from './admin-audit';
import { AdminAffiliates, AffiliateEdit } from './admin-affiliates';

describe('editar afiliados e o programa', () => {
  beforeEach(() => localStorage.clear());

  const setup = () => {
    const cart = TestBed.inject(CartStore);
    const asad = TestBed.inject(CatalogService)
      .products()
      .find((p) => p.slug === 'lattafa-asad')!;
    cart.add(asad, asad.variants[0]);
    const coupons = TestBed.inject(CouponService);
    coupons.today.set('2026-10-12');
    const program = TestBed.inject(AffiliateProgram);
    program.today.set('2026-10-12');
    return { coupons, program };
  };

  const julia = () =>
    TestBed.inject(AffiliateService)
      .all()
      .find((a) => a.email === 'julia.afiliada@email.com')!;

  const base = (): AffiliateEdit => ({
    commissionPercent: 5,
    discountPercent: 5,
    code: 'JULIA5',
    active: true,
  });

  it('programa no ar depende de ligado + período', () => {
    const program = TestBed.inject(AffiliateProgram);
    program.today.set('2026-10-12');
    expect(program.live()).toBe(true);
    const s = program.settings();
    program.save({ ...s, startsOn: '2026-11-01' });
    expect(program.live()).toBe(false);
    program.save({ ...s, startsOn: '2026-10-01', endsOn: '2026-10-11' });
    expect(program.live()).toBe(false);
    program.save({ ...s, active: false });
    expect(program.live()).toBe(false);
    expect(programProblems({ ...s, commissionPercent: 80 })).toHaveLength(1);
    expect(programProblems({ ...s, startsOn: '2026-10-10', endsOn: '2026-10-01' })).toHaveLength(1);
  });

  it('programa pausado: cupom de afiliado não vale e ninguém pede para entrar', () => {
    const { coupons, program } = setup();
    TestBed.inject(AuthService).login('ana@email.com', '12345678');
    program.save({ ...program.settings(), active: false });
    expect(coupons.apply('JULIA5').ok).toBe(false);
    expect(coupons.apply('NANI10').ok).toBe(true); // cupom comum continua
    expect(TestBed.inject(AffiliateService).applyBlock()).toBe(
      'O programa de afiliados está pausado no momento.',
    );
    program.save({ ...program.settings(), active: true });
    expect(coupons.apply('JULIA5').ok).toBe(true);
  });

  it('afiliado pausado ou fora do período: o cupom dele não vale', () => {
    const { coupons } = setup();
    const auth = TestBed.inject(AuthService);
    auth.login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminAffiliates);
    expect(admin.update(julia(), { ...base(), active: false })).toBe(true);
    auth.logout();
    auth.login('ana@email.com', '12345678');
    expect(coupons.apply('JULIA5').ok).toBe(false);
    auth.logout();
    auth.login('admin@email.com', '12345678');
    admin.update(julia(), { ...base(), endsOn: '2026-10-01' });
    auth.logout();
    auth.login('ana@email.com', '12345678');
    expect(coupons.apply('JULIA5').ok).toBe(false);
  });

  it('trocar o código de cupom já usado: nasce o novo e o antigo vale até a data', () => {
    const { coupons } = setup();
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminAffiliates);
    const edit = { ...base(), code: 'julia10', discountPercent: 10, commissionPercent: 10 };
    expect(admin.marginWarning(edit)).toBe(false);
    expect(admin.update(julia(), { ...edit, oldCodeUntil: '2026-10-31' })).toBe(true);

    const fresh = coupons.find('JULIA10')!;
    expect(fresh.value).toBe(10);
    expect(fresh.uses).toBe(0);
    expect(fresh.affiliateEmail).toBe('julia.afiliada@email.com');
    const old = coupons.find('JULIA5')!;
    expect(old.endsOn).toBe('2026-10-31');
    expect(old.uses).toBe(23);
    expect(julia().couponCode).toBe('JULIA10');
    expect(julia().commissionPercent).toBe(10);
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Alterou afiliado');
  });

  it('valida a edição e quem pode editar', () => {
    setup();
    const auth = TestBed.inject(AuthService);
    auth.login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminAffiliates);
    expect(admin.editProblems(julia(), { ...base(), commissionPercent: 70 })).toHaveLength(1);
    expect(admin.editProblems(julia(), { ...base(), code: 'NANI10' })).toEqual([
      'Já existe um cupom com este código.',
    ]);
    expect(admin.marginWarning({ commissionPercent: 20, discountPercent: 30 })).toBe(true);
    auth.logout();
    auth.login('viewer@email.com', '12345678');
    expect(admin.update(julia(), { ...base(), commissionPercent: 10 })).toBe(false);
  });
});
