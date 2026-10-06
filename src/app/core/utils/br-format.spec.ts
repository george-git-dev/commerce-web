import {
  cardBrand,
  formatCardNumber,
  formatCpf,
  formatDocument,
  formatExpiry,
  formatPhone,
  isValidCardNumber,
  isValidCpf,
  isValidDocument,
  isValidExpiry,
  isValidPhone,
  maskCpf,
  maskDocument,
  maskPhone,
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

describe('telefone e CPF mascarado', () => {
  it('formata celular e fixo enquanto digita', () => {
    expect(formatPhone('11')).toBe('(11');
    expect(formatPhone('1198765')).toBe('(11) 98765');
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890');
  });

  it('valida DDD e celular começando com 9', () => {
    expect(isValidPhone('(11) 98765-4321')).toBe(true);
    expect(isValidPhone('(11) 3456-7890')).toBe(true);
    expect(isValidPhone('(11) 88765-4321')).toBe(false);
    expect(isValidPhone('(01) 98765-4321')).toBe(false);
    expect(isValidPhone('(11) 9876')).toBe(false);
  });

  it('mascara o CPF para exibir', () => {
    expect(maskCpf('529.982.247-25')).toBe('***.982.247-**');
    expect(maskCpf('')).toBe('');
    expect(maskDocument('52998224725')).toBe('***.982.247-**');
    expect(maskDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(maskPhone('(11) 98765-4321')).toBe('(11) *****-4321');
  });
});
