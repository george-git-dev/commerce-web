import { TestBed } from '@angular/core/testing';
import { CepLookup } from './cep-lookup';

describe('CepLookup (mock do ViaCEP)', () => {
  it('preenche cidade/UF pela região do CEP; CEP inválido não busca', () => {
    const lookup = TestBed.inject(CepLookup);
    expect(lookup.lookup('20040-002')).toEqual({
      street: 'Rua das Acácias',
      district: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
    });
    expect(lookup.lookup('90000000')?.state).toBe('RS');
    expect(lookup.lookup('123')).toBeNull();
  });
});
