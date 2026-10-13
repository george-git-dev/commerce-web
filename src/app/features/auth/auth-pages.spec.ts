import { TestBed } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  currentUrl,
  loginAs,
  renderAt,
  settle,
  textOf,
  type,
} from '../../../testing/test-helpers';
import { AuthService } from '../../core/services/auth-service';
import { ForgotPassword } from './forgot-password';
import { Login } from './login';
import { ResetPassword } from './reset-password';

describe('Login e cadastro', () => {
  beforeEach(() => localStorage.clear());

  const fill = (f: Parameters<typeof $>[0], name: string, value: string) =>
    type($(f, `[formcontrolname=${name}]`), value);

  it('entra e volta para a página de origem (só caminho interno)', async () => {
    const { fixture } = await renderAt('/login?retorno=/carrinho', Login);
    fill(fixture, 'email', 'ana@email.com');
    fill(fixture, 'password', '12345678');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(TestBed.inject(AuthService).user()?.email).toBe('ana@email.com');
    expect(currentUrl()).toBe('/carrinho');
  });

  it('retorno para outro site é ignorado (vai para Minha conta)', async () => {
    const { fixture } = await renderAt('/login?retorno=//evil.com', Login);
    fill(fixture, 'email', 'ana@email.com');
    fill(fixture, 'password', '12345678');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(currentUrl()).toBe('/minha-conta');
  });

  it('erros: campos inválidos só depois de mexer; senha curta e conta bloqueada', async () => {
    const { fixture } = await renderAt('/login', Login);
    expect($$(fixture, '[role=alert]')).toHaveLength(0);
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect($$(fixture, '.auth__error').length).toBeGreaterThan(0);
    expect(TestBed.inject(AuthService).user()).toBeNull();
  });

  it('cadastro exige nome e CPF válido; mostra o erro do serviço', async () => {
    const { fixture } = await renderAt('/login', Login);
    buttonByText(fixture, 'Criar conta').click();
    await settle(fixture);
    expect($$(fixture, '[formcontrolname=cpf]')).toHaveLength(1);
    fill(fixture, 'name', 'Bia');
    fill(fixture, 'cpf', '111.111.111-11');
    fill(fixture, 'email', 'bia@email.com');
    fill(fixture, 'password', '12345678');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(TestBed.inject(AuthService).user()).toBeNull();
    fill(fixture, 'cpf', '529.982.247-25');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(TestBed.inject(AuthService).user()?.name).toBe('Bia');
  });

  it('login recusado mostra a mensagem; mostrar senha alterna o campo', async () => {
    const { fixture } = await renderAt('/login', Login);
    fill(fixture, 'email', 'ana@email.com');
    fill(fixture, 'password', '12345678');
    vi.spyOn(TestBed.inject(AuthService), 'login').mockReturnValue({
      ok: false,
      message: 'Conta bloqueada.',
    });
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(textOf(fixture)).toContain('Conta bloqueada.');
    const input = $(fixture, '[formcontrolname=password]') as HTMLInputElement;
    expect(input.type).toBe('password');
    $(fixture, '.auth__field button, [aria-label*="senha" i]').click();
    await settle(fixture);
    expect(input.type).toBe('text');
  });

  it('avisos: favoritos e checkout; Google entra e volta', async () => {
    const { fixture } = await renderAt('/login?motivo=favoritos', Login);
    expect(textOf(fixture)).toContain('salvar seus favoritos');
    $(fixture, '.auth__google').click();
    await settle(fixture);
    expect(TestBed.inject(AuthService).user()?.email).toBe('cliente.google@gmail.com');
    TestBed.resetTestingModule();
    const checkout = await renderAt('/login?retorno=/finalizar-compra', Login);
    expect(textOf(checkout.fixture)).toContain('finalizar a compra');
  });
});

describe('Esqueci minha senha e redefinir', () => {
  beforeEach(() => localStorage.clear());

  it('pede o link (mesma resposta exista ou não a conta) e mostra o link de demonstração', async () => {
    const { fixture } = await renderAt('/esqueci-senha', ForgotPassword);
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(textOf(fixture)).not.toContain('Verifique');
    type($(fixture, 'input'), 'ana@email.com');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect($$(fixture, 'a[href*="redefinir-senha"]').length).toBeGreaterThan(0);
  });

  it('link inválido avisa; link válido troca a senha e vai ao login; senhas diferentes não', async () => {
    const bad = await renderAt('/redefinir-senha?token=xyz', ResetPassword);
    expect($$(bad.fixture, 'form')).toHaveLength(0);
    TestBed.resetTestingModule();
    localStorage.clear();
    let token = '';
    const { fixture } = await renderAt(() => `/redefinir-senha?token=${token}`, ResetPassword, {
      path: 'redefinir-senha',
      setup: () => (token = TestBed.inject(AuthService).requestPasswordReset('ana@email.com')!),
    });
    type($(fixture, '[formcontrolname=password]'), 'novaSenha1');
    type($(fixture, '[formcontrolname=confirm]'), 'outraSenha');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(currentUrl()).toContain('redefinir-senha');
    type($(fixture, '[formcontrolname=confirm]'), 'novaSenha1');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(currentUrl()).toBe('/login');
  });
});

void loginAs;
