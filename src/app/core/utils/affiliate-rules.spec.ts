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
