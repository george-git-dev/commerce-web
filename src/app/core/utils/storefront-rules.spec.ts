import {
  announcementProblems,
  bannerImageProblem,
  bannerProblems,
  freeShippingProblem,
  linkFromChoice,
  linkToText,
  moneyLabel,
  parseInternalLink,
  presetOf,
  showStatus,
} from './storefront-rules';

const banner = {
  name: 'Black Friday',
  image: 'img/bf-mobile.webp',
  alt: 'Black Friday: até 40% off em perfumes árabes.',
  active: true,
};
const noLink = { preset: 'none', text: '' };

describe('regras da vitrine', () => {
  it('situação: inativo, agendado, no ar e encerrado (dias inteiros)', () => {
    const today = '2026-10-09';
    expect(showStatus({ active: false }, today)).toBe('inativo');
    expect(showStatus({ active: true }, today)).toBe('no-ar');
    expect(showStatus({ active: true, startsOn: '2026-10-10' }, today)).toBe('agendado');
    expect(showStatus({ active: true, startsOn: '2026-10-09', endsOn: '2026-10-09' }, today)).toBe(
      'no-ar',
    );
    expect(showStatus({ active: true, endsOn: '2026-10-08' }, today)).toBe('encerrado');
  });

  it('link: só endereços da própria loja', () => {
    expect(parseInternalLink('/produtos?oferta=true')).toEqual({
      path: '/produtos',
      queryParams: { oferta: 'true' },
    });
    expect(parseInternalLink(' /produtos/lattafa-asad ')).toEqual({
      path: '/produtos/lattafa-asad',
    });
    for (const bad of [
      'https://golpe.com',
      '//golpe.com',
      'javascript:alert(1)',
      '/x?a=javascript:alert(1)',
      'produtos',
      '/../admin',
      '/<script>',
      '',
    ]) {
      expect(parseInternalLink(bad), bad).toBeNull();
    }
  });

  it('link: preset ⇄ texto', () => {
    expect(linkToText(linkFromChoice('deal', ''))).toBe('/produtos?oferta=true');
    expect(presetOf({ path: '/produtos', queryParams: { oferta: 'true' } })).toBe('deal');
    expect(presetOf({ path: '/produtos/lattafa-asad' })).toBe('custom');
    expect(presetOf(undefined)).toBe('none');
    expect(linkFromChoice('none', '')).toBeUndefined();
    expect(linkFromChoice('custom', '/produtos?marca=Lattafa')).toEqual({
      path: '/produtos',
      queryParams: { marca: 'Lattafa' },
    });
  });

  it('banner: nome, imagem do celular, descrição, link e período', () => {
    expect(bannerProblems(banner, noLink)).toEqual([]);
    expect(bannerProblems({ ...banner, image: '' }, noLink)).toContain(
      'Envie a imagem do celular.',
    );
    expect(bannerProblems({ ...banner, name: 'BF' }, noLink)).toHaveLength(1);
    expect(bannerProblems({ ...banner, alt: 'curto' }, noLink)).toHaveLength(1);
    expect(bannerProblems(banner, { preset: 'custom', text: 'https://x.com' })).toHaveLength(1);
    expect(
      bannerProblems({ ...banner, startsOn: '2026-11-30', endsOn: '2026-11-20' }, noLink),
    ).toHaveLength(1);
  });

  it('aviso: texto curto, sem HTML', () => {
    const ok = { text: 'Cupom BEMVINDA: 10% na 1ª compra', active: true };
    expect(announcementProblems(ok, noLink)).toEqual([]);
    expect(announcementProblems({ ...ok, text: 'a'.repeat(71) }, noLink)).toHaveLength(1);
    expect(announcementProblems({ ...ok, text: '<b>oi</b>' }, noLink)).toHaveLength(1);
  });

  it('frete grátis e imagem', () => {
    expect(freeShippingProblem('599')).toBeNull();
    expect(freeShippingProblem('0')).not.toBeNull();
    expect(freeShippingProblem('')).not.toBeNull();
    expect(freeShippingProblem('-10')).not.toBeNull();
    expect(moneyLabel(599)).toBe('R$ 599');
    expect(moneyLabel(599.9)).toBe('R$ 599,90');
    expect(bannerImageProblem({ type: 'image/webp', size: 100_000 })).toBeNull();
    expect(bannerImageProblem({ type: 'image/gif', size: 100 })).not.toBeNull();
    expect(bannerImageProblem({ type: 'image/png', size: 6 * 1024 * 1024 })).not.toBeNull();
  });
});
