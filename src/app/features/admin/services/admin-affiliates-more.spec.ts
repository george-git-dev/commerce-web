import { TestBed } from '@angular/core/testing';
import { AffiliateProgram } from '../../../core/services/affiliate-program';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { CouponService } from '../../../core/services/coupon-service';
import { AdminAudit } from './admin-audit';
import { AdminAffiliates, AffiliateEdit } from './admin-affiliates';

const login = (email = 'admin@email.com') => TestBed.inject(AuthService).login(email, '12345678');
const byEmail = (email: string) =>
  TestBed.inject(AffiliateService)
    .all()
    .find((a) => a.email === email)!;
const lastAudit = () => TestBed.inject(AdminAudit).entries()[0];

describe('afiliados no backoffice: pedidos, edição e programa', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.inject(AffiliateProgram).today.set('2026-10-12');
    TestBed.inject(CouponService).today.set('2026-10-12');
  });

  it('sugere código livre e valida o código digitado', () => {
    login();
    const admin = TestBed.inject(AdminAffiliates);
    const carla = byEmail('carla.mendes@email.com');
    const code = admin.suggestCode(carla);
    expect(code).toMatch(/^CARLA/);
    expect(admin.codeProblem(code)).toBeNull();
    expect(admin.codeProblem('a b')).toMatch(/3 a 20/);
    expect(admin.codeProblem('nani10')).toBe('Já existe um cupom com este código.');
  });

  it('aprovar: só pendente, com código válido e com permissão', () => {
    const auth = TestBed.inject(AuthService);
    login('viewer@email.com');
    const admin = TestBed.inject(AdminAffiliates);
    const carla = () => byEmail('carla.mendes@email.com');
    expect(admin.approve(carla(), 'CARLA5')).toBe(false);
    auth.logout();
    login();
    expect(admin.approve(carla(), 'NANI10')).toBe(false);
    expect(admin.approve(byEmail('julia.afiliada@email.com'), 'OUTRO5')).toBe(false);
    expect(admin.approve(carla(), ' carla5 ')).toBe(true);
    expect(carla()).toMatchObject({ status: 'aprovado', couponCode: 'CARLA5' });
  });

  it('reprovar: exige motivo e audita', () => {
    login();
    const admin = TestBed.inject(AdminAffiliates);
    const carla = () => byEmail('carla.mendes@email.com');
    expect(admin.reject(carla(), 'não')).toBe(false);
    expect(admin.reject(carla(), ' Perfil sem conteúdo ')).toBe(true);
    expect(carla()).toMatchObject({
      status: 'reprovado',
      decision: { reason: 'Perfil sem conteúdo' },
    });
    expect(lastAudit().action).toBe('Reprovou afiliado');
    expect(admin.reject(carla(), 'De novo, motivo')).toBe(false);
  });

  it('valida desconto, período e data do cupom antigo', () => {
    login('superadmin@email.com');
    const admin = TestBed.inject(AdminAffiliates);
    const marina = byEmail('marina.lopes@email.com');
    const edit: AffiliateEdit = {
      commissionPercent: 5,
      discountPercent: 5,
      code: 'MARINA5',
      active: true,
    };
    expect(admin.editProblems(marina, edit)).toEqual([]);
    expect(admin.editProblems(marina, { ...edit, discountPercent: 0 })).toHaveLength(1);
    expect(
      admin.editProblems(marina, { ...edit, startsOn: '2026-11-10', endsOn: '2026-11-01' }),
    ).toEqual(['A data final precisa ser igual ou depois da inicial.']);
    expect(admin.editProblems(marina, { ...edit, oldCodeUntil: '2026-01-01' })).toEqual([
      'A data do cupom antigo não pode ser no passado.',
    ]);
    expect(admin.update(marina, { ...edit, discountPercent: 0 })).toBe(false);
    expect(admin.update(byEmail('carla.mendes@email.com'), edit)).toBe(false); // não aprovada
  });

  it('cupom sem uso é só renomeado; pausar e período entram na auditoria', () => {
    login('superadmin@email.com');
    const admin = TestBed.inject(AdminAffiliates);
    const coupons = TestBed.inject(CouponService);
    const marina = byEmail('marina.lopes@email.com');
    expect(
      admin.update(marina, {
        commissionPercent: marina.commissionPercent,
        discountPercent: 8,
        code: 'marina8',
        active: false,
        startsOn: '2026-10-12',
        endsOn: '2026-12-31',
      }),
    ).toBe(true);
    expect(coupons.find('MARINA5')).toBeUndefined();
    expect(coupons.find('MARINA8')!.value).toBe(8);
    const fields = lastAudit().changes.map((c) => c.field);
    expect(fields).toEqual(['Cupom', 'Desconto do cupom', 'Situação', 'Período']);
    expect(byEmail('marina.lopes@email.com')).toMatchObject({
      active: false,
      couponCode: 'MARINA8',
    });

    // Salvar sem mudar nada não audita.
    const count = TestBed.inject(AdminAudit).entries().length;
    const now = byEmail('marina.lopes@email.com');
    admin.update(now, {
      commissionPercent: now.commissionPercent,
      discountPercent: 8,
      code: 'MARINA8',
      active: false,
      startsOn: '2026-10-12',
      endsOn: '2026-12-31',
    });
    expect(TestBed.inject(AdminAudit).entries()).toHaveLength(count);
  });

  it('cupom já usado, sem data: o antigo é desativado na hora', () => {
    login('superadmin@email.com');
    const admin = TestBed.inject(AdminAffiliates);
    const coupons = TestBed.inject(CouponService);
    const julia = byEmail('julia.afiliada@email.com');
    admin.update(julia, {
      commissionPercent: julia.commissionPercent,
      discountPercent: 5,
      code: 'JULIANOVA',
      active: true,
    });
    expect(coupons.find('JULIA5')!.active).toBe(false);
    expect(lastAudit().changes[0].after).toContain('desativado');
  });

  it('programa: valida, salva e audita só o que mudou', () => {
    login('superadmin@email.com');
    const admin = TestBed.inject(AdminAffiliates);
    const settings = { ...admin.program() };
    expect(admin.programProblems({ ...settings, commissionPercent: -1 }).length).toBeGreaterThan(0);
    expect(admin.saveProgram({ ...settings, commissionPercent: -1 })).toBe(false);
    expect(admin.saveProgram({ ...settings, active: false, minPayout: 100 })).toBe(true);
    expect(admin.programLive()).toBe(false);
    expect(lastAudit().changes.map((c) => c.field)).toEqual(['Programa', 'Mínimo do Pix']);
    expect(admin.saveProgram({ ...admin.program(), startsOn: '2026-11-01' })).toBe(true);
    expect(lastAudit().changes[0]).toMatchObject({
      field: 'Período',
      after: '2026-11-01 → sem fim',
    });

    TestBed.inject(AuthService).logout();
    login('viewer@email.com');
    expect(admin.saveProgram(settings)).toBe(false);
  });
});
