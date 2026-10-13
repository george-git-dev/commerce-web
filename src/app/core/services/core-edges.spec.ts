import { TestBed } from '@angular/core/testing';
import { loginAs } from '../../../testing/test-helpers';
import { API_ERROR_MESSAGES, errorKind, isTransient, showsGlobally } from '../http/api-errors';
import { ApiError } from '../http/api-errors';
import { AccountDirectory } from './account-directory';
import { AffiliateProgram, programProblems } from './affiliate-program';
import { AffiliateService } from './affiliate-service';
import { AuthService } from './auth-service';
import { PromotionService } from './promotion-service';
import { OrderService } from './order-service';
import { ReturnService } from './return-service';

/** Casos de borda dos serviços do core que os testes por fluxo não cobriam. */
describe('core — casos de borda', () => {
  beforeEach(() => localStorage.clear());

  it('erros: todo status vira um tipo; só falha passageira repete; validação/404 ficam com a tela', () => {
    expect([0, 401, 403, 404, 408, 504, 429, 400, 409, 422, 500, 302].map(errorKind)).toEqual([
      'offline',
      'session',
      'forbidden',
      'not-found',
      'timeout',
      'timeout',
      'rate-limit',
      'validation',
      'validation',
      'validation',
      'server',
      'unknown',
    ]);
    expect(isTransient(new ApiError('server', 502, 'X'))).toBe(true);
    expect(isTransient(new ApiError('validation', 422, 'X'))).toBe(false);
    expect(showsGlobally(new ApiError('not-found', 404, 'X'))).toBe(false);
    expect(showsGlobally(new ApiError('forbidden', 403, 'X'))).toBe(true);
    // Sem `detail` do back: usa a reserva; com `detail` vazio também.
    expect(new ApiError('forbidden', 403, 'X', { detail: '  ' }).message).toBe(
      API_ERROR_MESSAGES.forbidden,
    );
    expect(new ApiError('forbidden', 403, 'X').fromServer).toBe(false);
  });

  it('diretório de contas: e-mail de senha (com falha simulada), afiliado e exclusões', () => {
    const dir = TestBed.inject(AccountDirectory);
    expect(dir.sendResetEmail('ana@email.com').ok).toBe(true);
    expect(dir.sendResetEmail('vizinho@email.com').ok).toBe(false);
    expect(dir.resetEmailOf('vizinho@email.com')?.ok).toBe(false);
    expect(dir.isGoogleOnly('cliente.google@gmail.com')).toBe(true);
    dir.setAffiliate('bia@email.com', true);
    expect(dir.rolesOf('bia@email.com')).toContain('ROLE_AFFILIATE');
    dir.setAffiliate('bia@email.com', false);
    expect(dir.rolesOf('bia@email.com')).toEqual(['ROLE_CUSTOMER']);
    dir.markDeleted('x@email.com', {
      customerId: 0,
      reason: 'r',
      by: 'Cliente',
      at: new Date(),
      pending: true,
    });
    expect(dir.pendingSelfDeletions()).toHaveLength(1);
    dir.confirmDeletion('x@email.com', 42);
    dir.confirmDeletion('nao-existe@email.com', 1);
    expect(dir.pendingSelfDeletions()).toHaveLength(0);
    expect(dir.deletionById(42)?.reason).toBe('r');
  });

  it('afiliado: bloqueios do pedido, reprovado espera 30 dias, forma de recebimento', () => {
    const affiliates = TestBed.inject(AffiliateService);
    expect(affiliates.applyBlock()).toBe('Entre na sua conta.');
    loginAs('viewer');
    expect(affiliates.applyBlock()).toMatch(/^Contas da equipe/);
    loginAs('affiliate');
    expect(affiliates.applyBlock()).toBe('Você já é afiliado.');
    affiliates.setPayoutMethod('credito');
    expect(affiliates.mine()?.payoutMethod).toBe('credito');
    loginAs('carla.mendes@email.com');
    expect(affiliates.applyBlock()).toBe('Seu pedido já está em análise.');
    affiliates.setPayoutMethod('credito'); // pendente: ignora
    expect(affiliates.mine()?.payoutMethod).toBe('pix');
    const carla = affiliates.mine()!;
    affiliates.decide(carla.id, {
      status: 'reprovado',
      decision: { by: 'Admin', at: new Date(), reason: 'Perfil privado' },
    });
    expect(affiliates.applyBlock()).toMatch(/^Você pode pedir de novo a partir de/);
    expect(affiliates.applyBlock(new Date(Date.now() + 31 * 86_400_000))).toBeNull();
  });

  it('programa: cada limite das configurações', () => {
    const s = TestBed.inject(AffiliateProgram).settings();
    expect(programProblems({ ...s, buyerDiscountPercent: 60 })).toHaveLength(1);
    expect(programProblems({ ...s, minPayout: -1 })).toEqual(['Mínimo do Pix inválido.']);
    expect(programProblems({ ...s, storeCreditBonusPercent: 80 })).toHaveLength(1);
  });

  it('conta: cadastro, CPF, perfil, troca de senha e Google bloqueado', () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.register('A', 'a@email.com', '529.982.247-25', '12345678').ok).toBe(false);
    expect(auth.register('Ana', 'a@email.com', '111', '12345678').ok).toBe(false);
    expect(auth.completeCpf('529.982.247-25').ok).toBe(false);
    expect(auth.updateProfile('Ana', '').ok).toBe(false);
    expect(auth.changePassword('12345678', 'novaSenha1').ok).toBe(false);
    loginAs('customer');
    expect(auth.completeCpf('111').ok).toBe(false);
    expect(auth.completeCpf('529.982.247-25').ok).toBe(true);
    expect(auth.updateProfile('A', '').ok).toBe(false);
    expect(auth.updateProfile('Ana Costa', '123').ok).toBe(false);
    expect(auth.updateProfile('Ana Costa', '(11) 98765-4321').ok).toBe(true);
    expect(auth.user()?.name).toBe('Ana Costa');
    expect(auth.changePassword('1', 'novaSenha1')).toEqual({
      ok: false,
      message: 'Senha atual incorreta.',
    });
    TestBed.inject(AccountDirectory).block('cliente.google@gmail.com', 'fraude', 'Admin');
    expect(auth.loginWithGoogle().ok).toBe(false);
  });

  it('sessão salva de conta bloqueada (ou excluída) não volta ao abrir o site', () => {
    localStorage.setItem('nani.auth.mock', JSON.stringify({ name: 'Ana', email: 'ana@email.com' }));
    TestBed.inject(AccountDirectory).block('ana@email.com', 'fraude', 'Admin');
    expect(TestBed.inject(AuthService).user()).toBeNull();
    expect(localStorage.getItem('nani.auth.mock')).toBeNull();
  });

  it('devolução: sem login, pedido não entregue, problema do formulário e foto inválida', () => {
    const returns = TestBed.inject(ReturnService);
    const draft = { items: [], reason: 'defeito' as const, description: '' };
    loginAs('bia@email.com');
    const orders = TestBed.inject(OrderService);
    const delivered = orders.find('NP100238')!;
    const shipped = orders.find('NP100245')!;
    TestBed.inject(AuthService).logout();
    expect(returns.request(delivered, draft).ok).toBe(false);
    loginAs('bia@email.com');
    expect(returns.request(shipped, draft)).toEqual({
      ok: false,
      message: 'Só dá para pedir devolução de pedido entregue.',
    });
    expect(returns.request(delivered, draft).ok).toBe(false); // sem item
    const bad = returns.request(delivered, {
      items: [{ itemId: delivered.items[0].id, quantity: 1 }],
      reason: 'avariado',
      description: 'Chegou vazando muito.',
      photos: [{ name: 'a.gif', type: 'image/gif', size: 10, url: 'x' }],
    });
    expect(bad).toEqual({ ok: false, message: 'a.gif: use JPG, PNG ou WEBP.' });
  });

  it('promoção: criar e editar mantém o id', () => {
    const service = TestBed.inject(PromotionService);
    const base = {
      name: 'Teste',
      active: true,
      target: { kind: 'marca' as const, brand: 'Lattafa' },
      discount: { kind: 'percent' as const, value: 10 },
    };
    const id = service.save(null, base);
    expect(service.save(id, { ...base, name: 'Teste 2' })).toBe(id);
    expect(service.all().find((p) => p.id === id)?.name).toBe('Teste 2');
  });
});
