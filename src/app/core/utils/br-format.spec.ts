import {
  cardBrand,
  formatCardNumber,
  formatCpf,
  formatDocument,
  formatExpiry,
  isValidCardNumber,
  isValidCpf,
  isValidDocument,
  isValidExpiry,
} from './br-format';

describe('br-format', () => {
  it('formata e valida CPF', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('aceita CPF ou CNPJ no mesmo campo', () => {
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(isValidDocument('11.222.333/0001-81')).toBe(true);
    expect(isValidDocument('11.222.333/0001-82')).toBe(false);
    expect(isValidDocument('529.982.247-25')).toBe(true);
  });

  it('formata e valida cartão (Luhn) e identifica a bandeira', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
    expect(isValidCardNumber('4111 1111 1111 1111')).toBe(true);
    expect(isValidCardNumber('4111 1111 1111 1112')).toBe(false);
    expect(cardBrand('4111')).toBe('Visa');
    expect(cardBrand('5555')).toBe('Mastercard');
    expect(cardBrand('3782')).toBe('American Express');
  });

  it('formata e valida validade MM/AA', () => {
    const now = new Date(2026, 9, 2);
    expect(formatExpiry('1229')).toBe('12/29');
    expect(isValidExpiry('12/29', now)).toBe(true);
    expect(isValidExpiry('10/26', now)).toBe(true);
    expect(isValidExpiry('09/26', now)).toBe(false);
    expect(isValidExpiry('13/29', now)).toBe(false);
  });
});
