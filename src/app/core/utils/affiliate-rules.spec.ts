import { maskPixKey, pixKeyKind, suggestAffiliateCode } from './affiliate-rules';

describe('regras de afiliado', () => {
  it('reconhece os tipos de chave Pix', () => {
    expect(pixKeyKind('529.982.247-25')).toBe('cpf');
    expect(pixKeyKind('maria@email.com')).toBe('email');
    expect(pixKeyKind('(11) 98765-4321')).toBe('telefone');
    expect(pixKeyKind('+55 11 98765-4321')).toBe('telefone');
    expect(pixKeyKind('123e4567-e89b-12d3-a456-426614174000')).toBe('aleatoria');
    expect(pixKeyKind('111.111.111-11')).toBeNull();
    expect(pixKeyKind('qualquer coisa')).toBeNull();
  });

  it('mascara a chave Pix', () => {
    expect(maskPixKey('maria@email.com')).toBe('ma***@email.com');
    expect(maskPixKey('529.982.247-25')).toBe('*******4725');
  });

  it('sugere cupom pelo primeiro nome, sem acento e sem repetir', () => {
    expect(suggestAffiliateCode('Júlia Andrade', 10, [])).toBe('JULIA10');
    expect(suggestAffiliateCode('Júlia Souza', 10, ['JULIA10'])).toBe('JULIA210');
  });
});

describe('afiliados — chave Pix, máscara e código sugerido', () => {
  it('reconhece cada tipo de chave e mascara para a tela', async () => {
    const r = await import('./affiliate-rules');
    expect(r.pixKeyKind('maria@email.com')).toBe('email');
    expect(r.pixKeyKind('123e4567-e89b-12d3-a456-426614174000')).toBe('aleatoria');
    expect(r.pixKeyKind('529.982.247-25')).toBe('cpf');
    expect(r.pixKeyKind('11.222.333/0001-81')).toBe('cnpj');
    expect(r.pixKeyKind('+55 (11) 98765-4321')).toBe('telefone');
    expect(r.pixKeyKind('123')).toBeNull();
    expect(r.maskPixKey('maria@email.com')).toBe('ma***@email.com');
    expect(r.maskPixKey('123e4567-e89b-12d3-a456-426614174000')).toBe('123e…4000');
    expect(r.maskPixKey('529.982.247-25')).toBe('*******4725');
  });

  it('pedido: cada problema; código sugerido não repete', async () => {
    const r = await import('./affiliate-rules');
    const ok = {
      channel: 'Instagram',
      profile: '@ju',
      pitch: 'x'.repeat(30),
      pixKey: 'ju@email.com',
    };
    expect(r.affiliateDraftProblems(ok as never, true)).toEqual([]);
    expect(
      r.affiliateDraftProblems(
        { ...ok, profile: 'a', pitch: 'x'.repeat(400), pixKey: '1' } as never,
        false,
      ),
    ).toHaveLength(4);
    expect(r.suggestAffiliateCode('Júlia Souza', 5, [])).toBe('JULIA5');
    expect(r.suggestAffiliateCode('Júlia Souza', 5, ['JULIA5'])).toBe('JULIA25');
    expect(r.suggestAffiliateCode('!!!', 10, [])).toBe('NANI10');
  });
});
