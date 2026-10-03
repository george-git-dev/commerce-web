import { TestBed } from '@angular/core/testing';
import { formatCep, isValidCep, ShippingService } from './shipping-service';

describe('ShippingService', () => {
  let service: ShippingService;

  beforeEach(() => {
    service = TestBed.inject(ShippingService);
  });

  it('valida e formata o CEP', () => {
    expect(formatCep('01310100')).toBe('01310-100');
    expect(formatCep('0131')).toBe('0131');
    expect(isValidCep('01310-100')).toBe(true);
    expect(isValidCep('0131010')).toBe(false);
    expect(isValidCep('00000000')).toBe(false);
  });

  it('cota econômico e expresso e zera o econômico acima do mínimo', () => {
    const paid = service.quote('01310100', 299.9);
    expect(paid.map((option) => option.id)).toEqual(['economico', 'expresso']);
    expect(paid[0].price).toBeGreaterThan(0);

    const free = service.quote('01310100', 650);
    expect(free[0].price).toBe(0);
    expect(free[1].price).toBeGreaterThan(0);
  });

  it('CEP inválido não gera opções', () => {
    expect(service.quote('123', 100)).toEqual([]);
  });
});
