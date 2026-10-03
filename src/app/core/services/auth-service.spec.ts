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

  it('completa o CPF de quem entrou sem ele', () => {
    service.login('maria@email.com', '12345678');
    expect(service.user()?.cpf).toBeUndefined();
    expect(service.completeCpf('529.982.247-25').ok).toBe(true);
    expect(service.user()?.cpf).toBe('529.982.247-25');
  });

  it('recusa e-mail inválido ou senha curta', () => {
    expect(service.login('maria', '12345678').ok).toBe(false);
    expect(service.login('maria@email.com', '123').ok).toBe(false);
    expect(service.isLoggedIn()).toBe(false);
  });

  it('cadastra com nome e CPF (sem guardar o CPF no navegador) e sai', () => {
    expect(service.register('Ana Souza', 'ana@email.com', '123.456.789-00', 'senhaforte').ok).toBe(
      false,
    );
    expect(service.register('Ana Souza', 'ana@email.com', '529.982.247-25', 'senhaforte').ok).toBe(
      true,
    );
    expect(service.user()?.cpf).toBe('529.982.247-25');
    expect(localStorage.getItem('nani.auth.mock')).not.toContain('529');
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
