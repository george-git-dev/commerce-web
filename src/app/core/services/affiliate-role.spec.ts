import { TestBed } from '@angular/core/testing';
import { accessChangeProblem } from '../../features/admin/services/customer-rules';
import { AdminAffiliates } from '../../features/admin/services/admin-affiliates';
import { AccountDirectory } from './account-directory';
import { AffiliateService } from './affiliate-service';
import { AuthService } from './auth-service';

describe('ROLE_AFFILIATE', () => {
  beforeEach(() => localStorage.clear());

  it('afiliado aprovado entra com CUSTOMER + AFFILIATE e não é equipe', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('julia.afiliada@email.com', '12345678');
    expect(auth.user()?.roles).toEqual(['ROLE_CUSTOMER', 'ROLE_AFFILIATE']);
    expect(auth.can('affiliate:area')).toBe(true);
    expect(auth.can('shop:checkout')).toBe(true);
    expect(auth.isStaff()).toBe(false);
    expect(auth.ownDeletionBlock(0)).toContain('Você é afiliado');
  });

  it('cliente comum fica só com CUSTOMER', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('ana@email.com', '12345678');
    expect(auth.user()?.roles).toEqual(['ROLE_CUSTOMER']);
    expect(auth.can('affiliate:area')).toBe(false);
  });

  it('aprovar o pedido dá a role (vale no próximo login); afiliado pode pedir', () => {
    const auth = TestBed.inject(AuthService);
    const affiliates = TestBed.inject(AffiliateService);
    auth.login('bia@email.com', '12345678');
    affiliates.apply(
      {
        channel: 'Instagram',
        profile: '@bia',
        pitch: 'Resenhas de perfumes nos stories.',
        pixKey: 'bia@email.com',
      },
      true,
    );
    auth.logout();
    auth.login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminAffiliates);
    admin.approve(
      admin.all().find((a) => a.email === 'bia@email.com')!,
      'BIA5',
    );
    expect(TestBed.inject(AccountDirectory).isAffiliate('bia@email.com')).toBe(true);
    auth.logout();
    auth.login('bia@email.com', '12345678');
    expect(auth.can('affiliate:area')).toBe(true);
  });

  it('pausar não tira a role', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('admin@email.com', '12345678');
    const admin = TestBed.inject(AdminAffiliates);
    const julia = admin.all().find((a) => a.email === 'julia.afiliada@email.com')!;
    admin.update(julia, {
      commissionPercent: 5,
      discountPercent: 5,
      code: 'JULIA5',
      active: false,
    });
    expect(TestBed.inject(AccountDirectory).isAffiliate(julia.email)).toBe(true);
  });

  it('afiliado não recebe perfil da equipe', () => {
    expect(accessChangeProblem({ self: false, blocked: false, roles: [], affiliate: true })).toBe(
      'Afiliado não faz parte da equipe.',
    );
  });
});
