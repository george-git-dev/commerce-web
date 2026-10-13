import { FormControl } from '@angular/forms';
import {
  cardNumberValidator,
  cepValidator,
  cpfValidator,
  cvvValidator,
  documentValidator,
  expiryValidator,
  phoneValidator,
} from './br-validators';

const check = (validator: typeof cepValidator, value: string) => validator(new FormControl(value));

describe('validadores de formulário (BR)', () => {
  it('campo vazio passa (o obrigatório é outro validador)', () => {
    for (const v of [cepValidator, cpfValidator, documentValidator, cardNumberValidator]) {
      expect(check(v, '')).toBeNull();
    }
  });

  it('CEP, CPF e documento (CPF ou CNPJ)', () => {
    expect(check(cepValidator, '05794-340')).toBeNull();
    expect(check(cepValidator, '0579')).toEqual({ cep: true });
    expect(check(cpfValidator, '529.982.247-25')).toBeNull();
    expect(check(cpfValidator, '111.111.111-11')).toEqual({ cpf: true });
    expect(check(documentValidator, '11.222.333/0001-81')).toBeNull();
    expect(check(documentValidator, '123')).toEqual({ document: true });
  });

  it('cartão, validade, CVV e celular', () => {
    expect(check(cardNumberValidator, '4111 1111 1111 1111')).toBeNull();
    expect(check(cardNumberValidator, '4111 1111 1111 1112')).toEqual({ cardNumber: true });
    expect(check(expiryValidator, '12/99')).toBeNull();
    expect(check(expiryValidator, '01/20')).toEqual({ expiry: true });
    expect(check(cvvValidator, '123')).toBeNull();
    expect(check(cvvValidator, '12')).toEqual({ cvv: true });
    expect(check(phoneValidator, '(11) 98765-4321')).toBeNull();
    expect(check(phoneValidator, '(11) 1234')).toEqual({ phone: true });
  });
});
