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
    content.saveSettings({ freeShippingMin: 450, freeShippingNotice: true });
    expect(content.announcements()[0].text).toBe('Frete grátis acima de R$ 450');
    expect(content.fill('Acima de {freteGratis}, para todo o Brasil')).toBe(
      'Acima de R$ 450, para todo o Brasil',
    );
    content.saveSettings({ freeShippingMin: 450, freeShippingNotice: false });
    expect(content.announcements().some((a) => a.text.startsWith('Frete grátis'))).toBe(false);
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
