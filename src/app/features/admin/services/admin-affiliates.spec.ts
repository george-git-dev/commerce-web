import { TestBed } from '@angular/core/testing';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { CartStore } from '../../../core/services/cart-store';
import { CatalogService } from '../../../core/services/catalog-service';
import { CouponService } from '../../../core/services/coupon-service';
import { AdminAudit } from './admin-audit';
import { AdminAffiliates } from './admin-affiliates';

describe('programa de afiliados', () => {
  beforeEach(() => localStorage.clear());

  it('cliente pede, admin aprova: cria o cupom ligado à conta e audita', () => {
    const auth = TestBed.inject(AuthService);
    const affiliates = TestBed.inject(AffiliateService);
    auth.login('bia@email.com', '12345678');
    expect(
      affiliates.apply(
        {
          channel: 'Instagram',
          profile: '@bia',
          pitch: 'Resenhas de perfumes nos stories.',
          pixKey: 'bia@email.com',
        },
        false,
      ).ok,
    ).toBe(false); // sem aceitar os termos
    expect(
      affiliates.apply(
        {
          channel: 'Instagram',
          profile: '@bia',
          pitch: 'Resenhas de perfumes nos stories.',
          pixKey: 'bia@email.com',
        },
        true,
      ).ok,
    ).toBe(true);
    expect(affiliates.mine()?.status).toBe('pendente');
    expect(affiliates.applyBlock()).toBe('Seu pedido já está em análise.');

    auth.logout();
    auth.login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminAffiliates);
    const request = admin.all().find((a) => a.email === 'bia@email.com')!;
    expect(admin.codeProblem('JULIA5')).toBe('Já existe um cupom com este código.');
    expect(admin.approve(request, 'bia5')).toBe(true);
    const coupon = TestBed.inject(CouponService).find('BIA5')!;
    expect(coupon.affiliateEmail).toBe('bia@email.com');
    expect(coupon.value).toBe(5);
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Aprovou afiliado');
  });

  it('o afiliado não usa o próprio cupom; outra pessoa usa', () => {
    const auth = TestBed.inject(AuthService);
    const cart = TestBed.inject(CartStore);
    const asad = TestBed.inject(CatalogService)
      .products()
      .find((p) => p.slug === 'lattafa-asad')!;
    cart.add(asad, asad.variants[0]);
    const coupons = TestBed.inject(CouponService);
    coupons.today.set('2026-10-12');
    auth.login('julia.afiliada@email.com', '12345678');
    expect(coupons.apply('JULIA5')).toEqual({
      ok: false,
      message: 'Você não pode usar o seu próprio cupom de afiliado.',
    });
    auth.logout();
    auth.login('ana@email.com', '12345678');
    expect(coupons.apply('JULIA5').ok).toBe(true);
  });

  it('chave Pix mascarada sem customers:sensitive', () => {
    TestBed.inject(AuthService).login('viewer@email.com', '12345678');
    const admin = TestBed.inject(AdminAffiliates);
    const carla = admin.all().find((a) => a.status === 'pendente')!;
    expect(admin.pix(carla)).not.toContain('987654');
  });
});
