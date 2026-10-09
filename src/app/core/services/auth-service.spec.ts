import { TestBed } from '@angular/core/testing';
import { safeReturnUrl } from '../guards/auth-guard';
import { AccountDirectory } from './account-directory';
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
    expect(service.user()).toEqual({
      name: 'Maria',
      email: 'maria.silva@email.com',
      roles: ['ROLE_CUSTOMER'],
    });
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

  it('atualiza nome e celular, sem levar o celular para o navegador', () => {
    service.login('maria@email.com', '12345678');
    expect(service.updateProfile('Maria Souza', '(11) 98765-4321').ok).toBe(true);
    expect(service.user()?.phone).toBe('(11) 98765-4321');
    expect(localStorage.getItem('nani.auth.mock')).toContain('Maria Souza');
    expect(localStorage.getItem('nani.auth.mock')).not.toContain('98765');
    expect(service.updateProfile('Maria', '(11) 1234').ok).toBe(false);
  });

  it('link de redefinição de senha: uso único e com validade', () => {
    expect(service.requestPasswordReset('não-é-email')).toBeNull();
    const token = service.requestPasswordReset('Maria@Email.com')!;
    expect(service.isResetLinkValid(token)).toBe(true);
    expect(service.resetPassword(token, 'curta').ok).toBe(false);
    expect(service.resetPassword(token, 'novasenha1').ok).toBe(true);
    expect(service.isResetLinkValid(token)).toBe(false);
    expect(service.resetPassword(token, 'novasenha1').ok).toBe(false);
    expect(service.resetPassword('inventado', 'novasenha1').ok).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('link de redefinição expira', () => {
    vi.useFakeTimers();
    const token = service.requestPasswordReset('maria@email.com')!;
    vi.advanceTimersByTime(31 * 60_000);
    expect(service.isResetLinkValid(token)).toBe(false);
    vi.useRealTimers();
  });

  it('troca de senha valida tamanho e exige senha diferente', () => {
    service.login('maria@email.com', '12345678');
    expect(service.changePassword('123', 'novasenha1').ok).toBe(false);
    expect(service.changePassword('12345678', 'curta').ok).toBe(false);
    expect(service.changePassword('12345678', '12345678').ok).toBe(false);
    expect(service.changePassword('12345678', 'novasenha1').ok).toBe(true);
  });

  it('todo cadastro é cliente; equipe ganha perfil a mais', () => {
    service.login('maria@email.com', '12345678');
    expect(service.can('shop:checkout')).toBe(true);
    expect(service.isStaff()).toBe(false);
    service.logout();
    expect(service.can('shop:checkout')).toBe(false);
    service.login('viewer@email.com', '12345678');
    expect(service.user()?.roles).toEqual(['ROLE_CUSTOMER', 'ROLE_VIEWER']);
    expect(service.isStaff()).toBe(true);
    expect(service.can('orders:edit')).toBe(false);
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

describe('AuthService + AccountDirectory (backoffice)', () => {
  beforeEach(() => localStorage.clear());

  it('conta bloqueada não entra; desbloqueada volta a entrar', () => {
    const auth = TestBed.inject(AuthService);
    const directory = TestBed.inject(AccountDirectory);
    directory.block('cliente@x.com', 'fraude', 'Admin');
    expect(auth.login('cliente@x.com', '12345678').ok).toBe(false);
    directory.unblock('cliente@x.com');
    expect(auth.login('cliente@x.com', '12345678').ok).toBe(true);
  });

  it('entrega em mãos liberada no backoffice aparece no próximo login', () => {
    const auth = TestBed.inject(AuthService);
    TestBed.inject(AccountDirectory).setInHands('maria@x.com', true);
    auth.login('maria@x.com', '12345678');
    expect(auth.user()?.inHandsDelivery).toBe(true);
  });

  it('perfil dado ou tirado no backoffice vale no próximo login', () => {
    const auth = TestBed.inject(AuthService);
    const directory = TestBed.inject(AccountDirectory);
    directory.setStaffRole('irma@x.com', 'ROLE_VIEWER');
    auth.login('irma@x.com', '12345678');
    expect(auth.can('admin:access'), 'com acesso').toBe(true);
    auth.logout();
    directory.setStaffRole('irma@x.com', null);
    auth.login('irma@x.com', '12345678');
    expect(auth.can('admin:access'), 'sem acesso').toBe(false);
  });
});
