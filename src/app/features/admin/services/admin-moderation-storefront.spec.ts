import { TestBed } from '@angular/core/testing';
import { AffiliateService } from '../../../core/services/affiliate-service';
import { AuthService } from '../../../core/services/auth-service';
import { AdminAudit } from './admin-audit';
import { AdminCommissions } from './admin-commissions';
import { AdminStorefront } from './admin-storefront';
import { ReviewModeration } from './review-moderation';

const login = (email = 'admin@email.com') => TestBed.inject(AuthService).login(email, '12345678');
const audits = () => TestBed.inject(AdminAudit).entries();
const lastAudit = () => audits()[0];

describe('ReviewModeration', () => {
  beforeEach(() => localStorage.clear());

  const review = (id: number) =>
    TestBed.inject(ReviewModeration)
      .all()
      .find((r) => r.id === id)!;

  it('aprova, responde, edita e remove a resposta; tira do ar com motivo', () => {
    login();
    const mod = TestBed.inject(ReviewModeration);
    const pending = mod.pendingCount();

    expect(mod.reply(review(9001), 'Obrigado pela avaliação!')).toBe(false); // ainda pendente
    mod.approve(review(9001));
    expect(review(9001).status).toBe('aprovada');
    expect(mod.pendingCount()).toBe(pending - 1);
    expect(lastAudit().action).toBe('Aprovou avaliação');
    const count = audits().length;
    mod.approve(review(9001)); // já aprovada
    expect(audits()).toHaveLength(count);

    expect(mod.reply(review(9001), 'oi')).toBe(false);
    expect(mod.reply(review(9001), 'Obrigado pela avaliação, Patrícia!')).toBe(true);
    expect(lastAudit().action).toBe('Respondeu avaliação');
    expect(mod.reply(review(9001), 'Obrigado de novo pela avaliação!')).toBe(true);
    expect(lastAudit().action).toBe('Editou resposta da loja');
    mod.removeReply(review(9001));
    expect(lastAudit().action).toBe('Removeu resposta da loja');
    expect(review(9001).reply?.text ?? '').toBe('');

    mod.reject(review(9001), 'x'); // motivo curto
    expect(review(9001).status).toBe('aprovada');
    mod.reject(review(9001), ' Não fala do produto ');
    expect(lastAudit().action).toBe('Tirou avaliação do ar');
    mod.reject(review(9002), 'Spam ou propaganda');
    expect(lastAudit().action).toBe('Reprovou avaliação');
    expect(review(9002).status).toBe('reprovada');
  });

  it('visualizador não modera', () => {
    login('viewer@email.com');
    const mod = TestBed.inject(ReviewModeration);
    expect(mod.canEdit()).toBe(false);
    mod.approve(review(9001));
    mod.reject(review(9001), 'Spam ou propaganda');
    expect(review(9001).status).toBe('pendente');
    mod.removeReply(review(9001));
    expect(audits()).toHaveLength(0);
  });
});

describe('AdminStorefront', () => {
  beforeEach(() => {
    localStorage.clear();
    login();
  });

  it('banners: cria, altera só o que mudou, move e exclui', () => {
    const store = TestBed.inject(AdminStorefront);
    const data = {
      name: 'Promo',
      image: 'img/a.webp',
      alt: 'Promoção',
      link: { path: '/produtos', queryParams: { oferta: '1' } },
      active: true,
    };
    const id = store.saveBanner(null, data);
    expect(store.banner(id)?.name).toBe('Promo');
    expect(lastAudit().action).toBe('Criou banner');

    store.saveBanner(id, { ...data, image: 'img/b.webp', startsOn: '2026-11-01' });
    expect(lastAudit().action).toBe('Alterou banner');
    expect(lastAudit().changes.map((c) => c.field)).toEqual(['Imagem do celular', 'Período']);

    const count = audits().length;
    store.saveBanner(id, { ...data, image: 'img/b.webp', startsOn: '2026-11-01' });
    expect(audits()).toHaveLength(count); // nada mudou

    const order = () => store.content.allBanners().map((b) => b.id);
    store.moveBanner(id, -1);
    expect(order().indexOf(id)).toBe(order().length - 2);
    store.removeBanner(id);
    expect(store.banner(id)).toBeUndefined();
    expect(lastAudit().action).toBe('Excluiu banner');
    store.removeBanner(id);
    expect(store.banner(null)).toBeUndefined();
  });

  it('avisos e frete grátis', () => {
    const store = TestBed.inject(AdminStorefront);
    const id = store.saveAnnouncement(null, { text: 'Frete grátis no Pix', active: true });
    expect(lastAudit().action).toBe('Criou aviso');
    store.saveAnnouncement(id, { text: 'Frete grátis no Pix', active: false });
    expect(lastAudit().changes).toEqual([{ field: 'Ativo', before: 'Sim', after: 'Não' }]);
    store.removeAnnouncement(id);
    expect(store.announcement(id)).toBeUndefined();
    expect(lastAudit().action).toBe('Excluiu aviso');
    store.removeAnnouncement(id);
    expect(store.announcement(null)).toBeUndefined();

    const settings = store.content.settings();
    store.saveSettings({ ...settings, freeShipping: { ...settings.freeShipping, min: 999 } });
    expect(lastAudit()).toMatchObject({ action: 'Alterou frete grátis' });
    expect(lastAudit().changes.map((c) => c.field)).toEqual(['Frete grátis acima de']);
  });
});

describe('AdminCommissions (painel)', () => {
  beforeEach(() => localStorage.clear());

  it('linhas por afiliado, totais, nomes e chave Pix mascarada sem permissão', () => {
    login('viewer@email.com');
    const store = TestBed.inject(AdminCommissions);
    const rows = store.rows();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].revenue).toBeGreaterThanOrEqual(rows.at(-1)!.revenue);
    expect(store.totals().paid).toBeGreaterThanOrEqual(0);
    expect(store.nameOf('julia.afiliada@email.com')).not.toBe('julia.afiliada@email.com');
    expect(store.nameOf('ninguem@email.com')).toBe('ninguem@email.com');
    expect(store.pixOf('julia.afiliada@email.com')).not.toBe('julia.afiliada@email.com');
    expect(store.methodLabel({ method: 'pix' })).toBe('Pix');
    expect(store.methodLabel({ payoutMethod: 'credito' })).toMatch(/[Cc]rédito/);
    const first = store.commissions()[0];
    expect(store.status(first)).toBeTruthy();
  });

  it('super admin vê a chave inteira; paga em crédito sem comprovante', () => {
    login('superadmin@email.com');
    const store = TestBed.inject(AdminCommissions);
    const affiliates = TestBed.inject(AffiliateService);
    expect(store.pixOf('julia.afiliada@email.com')).toBe('julia.afiliada@email.com');
    const withMoney = store.rows().find((r) => store.preview(r.affiliate).commissionIds.length);
    if (!withMoney) return;
    affiliates.decide(withMoney.affiliate.id, { payoutMethod: 'credito' });
    const affiliate = affiliates.approvedBy(withMoney.affiliate.email)!;
    const payout = store.pay(affiliate)!;
    expect(payout.method).toBe('credito');
    expect(lastAudit().action).toBe('Pagou comissão em crédito');
    expect(store.pay(affiliate)).toBeNull(); // nada mais a pagar
  });
});
