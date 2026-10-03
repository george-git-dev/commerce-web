import { TestBed } from '@angular/core/testing';
import { safeReturnUrl } from '../guards/auth-guard';
import { AuthService } from './auth-service';

describe('AuthService (simulado)', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(AuthService);
  });

  it('entra com e-mail válido e senha de 8+ caracteres, sem guardar a senha', () => {
    const result = service.login('Maria.Silva@Email.com', '12345678');
    expect(result.ok).toBe(true);
    expect(service.user()).toEqual({ name: 'Maria', email: 'maria.silva@email.com' });
    expect(localStorage.getItem('nani.auth.mock')).not.toContain('12345678');
  });

  it('recusa e-mail inválido ou senha curta', () => {
    expect(service.login('maria', '12345678').ok).toBe(false);
    expect(service.login('maria@email.com', '123').ok).toBe(false);
    expect(service.isLoggedIn()).toBe(false);
  });

  it('cadastra com nome e sai', () => {
    expect(service.register('Ana Souza', 'ana@email.com', 'senhaforte').ok).toBe(true);
    expect(service.user()?.name).toBe('Ana Souza');
    service.logout();
    expect(service.user()).toBeNull();
    expect(localStorage.getItem('nani.auth.mock')).toBeNull();
  });
});

describe('safeReturnUrl', () => {
  it('aceita só caminhos internos', () => {
    expect(safeReturnUrl('/finalizar-compra')).toBe('/finalizar-compra');
    expect(safeReturnUrl('//site-falso.com')).toBe('/minha-conta');
    expect(safeReturnUrl('/\\site-falso.com')).toBe('/minha-conta');
    expect(safeReturnUrl('https://site-falso.com')).toBe('/minha-conta');
    expect(safeReturnUrl(null)).toBe('/minha-conta');
  });
});
