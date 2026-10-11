import { TestBed } from '@angular/core/testing';
import { StorefrontContent } from './storefront-content';

describe('StorefrontContent', () => {
  let content: StorefrontContent;

  beforeEach(() => {
    content = TestBed.inject(StorefrontContent);
    content.today.set('2026-10-09');
  });

  it('loja vê só banners no ar, na ordem; nenhum no ar = banner padrão', () => {
    const id = content.saveBanner(null, {
      name: 'Black Friday',
      image: 'bf.webp',
      alt: 'Black Friday: até 40% off.',
      active: true,
      startsOn: '2026-11-20',
    });
    expect(content.banners().map((b) => b.id)).not.toContain(String(id));
    content.today.set('2026-11-21');
    expect(content.banners().map((b) => b.id)).toContain(String(id));
    content.moveBanner(id, -1);
    expect(content.banners().at(-2)?.id).toBe(String(id));
    for (const banner of content.allBanners()) {
      content.saveBanner(banner.id, { ...banner, active: false });
    }
    expect(content.banners().map((b) => b.id)).toEqual(['padrao']);
  });

  it('frete grátis: vale na faixa e nos textos; aviso pode ser desligado', () => {
    content.saveSettings({
      freeShipping: { active: true, min: 450, notice: true },
    });
    expect(content.announcements()[0]).toEqual({ text: 'Frete grátis acima de R$ 450' });
    expect(content.fill('Acima de {freteGratis}, para todo o Brasil')).toBe(
      'Acima de R$ 450, para todo o Brasil',
    );
    content.saveSettings({ freeShipping: { active: true, min: 450, notice: false } });
    expect(content.announcements().some((a) => a.text.startsWith('Frete grátis'))).toBe(false);
    expect(content.freeShippingMin(), 'aviso desligado, promoção continua').toBe(450);
  });

  it('frete grátis fora do período ou desligado: frete normal e textos escondidos', () => {
    content.today.set('2026-10-10');
    content.saveSettings({
      freeShipping: {
        active: true,
        min: 299,
        notice: true,
        startsOn: '2026-11-20',
        endsOn: '2026-11-30',
      },
    });
    expect(content.freeShippingMin(), 'agendada').toBeNull();
    expect(content.announcements().some((a) => a.text.startsWith('Frete grátis'))).toBe(false);
    expect(content.fill('Acima de {freteGratis}')).toBeNull();
    expect(content.fill('Texto sem promoção')).toBe('Texto sem promoção');
    content.today.set('2026-11-25');
    expect(content.freeShippingMin(), 'no período').toBe(299);
    content.saveSettings({ freeShipping: { active: false, min: 299, notice: true } });
    expect(content.freeShippingMin(), 'desligada').toBeNull();
  });

  it('avisos fora do período ou inativos não aparecem', () => {
    const id = content.saveAnnouncement(null, {
      text: 'Cupom BEMVINDA',
      active: true,
      endsOn: '2026-10-08',
    });
    expect(content.announcements().map((a) => a.text)).not.toContain('Cupom BEMVINDA');
    content.saveAnnouncement(id, { text: 'Cupom BEMVINDA', active: true });
    expect(content.announcements().map((a) => a.text)).toContain('Cupom BEMVINDA');
    content.removeAnnouncement(id);
    expect(content.allAnnouncements().some((a) => a.id === id)).toBe(false);
  });
});
