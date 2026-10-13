import { TestBed } from '@angular/core/testing';
import { AccountDirectory } from '../../../core/services/account-directory';
import { AuthService } from '../../../core/services/auth-service';
import { AdminAudit } from './admin-audit';
import { AdminCustomerStore } from './admin-customer-store';

const login = (email: string) => TestBed.inject(AuthService).login(email, '12345678');
const lastAudit = () => TestBed.inject(AdminAudit).entries()[0];
const customer = (email: string) =>
  TestBed.inject(AdminCustomerStore)
    .customers()
    .find((c) => c.email === email)!;

describe('AdminCustomerStore', () => {
  beforeEach(() => localStorage.clear());

  it('bloqueia e desbloqueia cliente (não equipe, não a si mesmo)', () => {
    login('admin@email.com');
    const store = TestBed.inject(AdminCustomerStore);
    const directory = TestBed.inject(AccountDirectory);
    const pedro = customer('pedro.alves@email.com');
    store.block(pedro, '  Fraude no cartão ');
    expect(directory.blockOf(pedro.email)?.reason).toBe('Fraude no cartão');
    expect(lastAudit().action).toBe('Bloqueou cliente');
    store.unblock(pedro);
    expect(directory.blockOf(pedro.email)).toBeUndefined();
    store.unblock(pedro); // já ativo: nada
    expect(lastAudit().action).toBe('Desbloqueou cliente');

    store.block(customer('viewer@email.com'), 'x');
    store.block(customer('admin@email.com'), 'x');
    expect(directory.blockOf('viewer@email.com')).toBeUndefined();
    expect(directory.blockOf('admin@email.com')).toBeUndefined();
    expect(store.find(null)).toBeUndefined();
    expect(store.find(pedro.id)?.email).toBe(pedro.email);
  });

  it('entrega em mãos: libera e cancela', () => {
    login('admin@email.com');
    const store = TestBed.inject(AdminCustomerStore);
    const marina = customer('marina.lopes@email.com');
    store.setInHands(marina, true);
    expect(TestBed.inject(AccountDirectory).canReceiveInHands(marina.email)).toBe(true);
    expect(lastAudit().action).toBe('Liberou entrega em mãos');
    store.setInHands(marina, false);
    expect(lastAudit().action).toBe('Cancelou entrega em mãos');
  });

  it('acesso ao backoffice: só super admin dá, troca e tira', () => {
    login('admin@email.com');
    const store = TestBed.inject(AdminCustomerStore);
    const directory = TestBed.inject(AccountDirectory);
    const pedro = customer('pedro.alves@email.com');
    store.setAccess(customer('vizinho@email.com'), 'ROLE_VIEWER');
    expect(directory.staffRolesOf('vizinho@email.com')).toEqual([]);

    TestBed.inject(AuthService).logout();
    login('superadmin@email.com');
    const vizinho = customer('vizinho@email.com');
    expect(store.accessProblem(vizinho)).toBeNull();
    expect(store.accessProblem(pedro)).toBe('Afiliado não faz parte da equipe.');
    store.setAccess(vizinho, 'ROLE_VIEWER');
    expect(lastAudit().action).toBe('Deu acesso ao backoffice');
    store.setAccess(vizinho, 'ROLE_VIEWER'); // igual: nada
    store.setAccess(vizinho, 'ROLE_ADMIN');
    expect(lastAudit().action).toBe('Trocou perfil da equipe');
    store.setAccess(vizinho, null);
    expect(lastAudit().action).toBe('Tirou acesso ao backoffice');
    expect(directory.staffRolesOf(vizinho.email)).toEqual([]);
  });

  it('senha: problemas por tipo de conta, e-mail e link (sem token na auditoria)', () => {
    login('admin@email.com');
    const store = TestBed.inject(AdminCustomerStore);
    expect(store.passwordProblem(customer('cliente.google@gmail.com'))).toMatch(/Google/);
    expect(store.passwordProblem(customer('admin@email.com'))).toMatch(/Esqueci minha senha/);
    expect(store.passwordProblem(customer('viewer@email.com'))).toMatch(/só o super admin/);

    const vizinho = customer('vizinho@email.com');
    // O e-mail do vizinho não chega (mock): fica registrado como falha.
    expect(store.sendResetEmail(vizinho)).toBe(false);
    expect(lastAudit().changes[0].after).toBe('Falhou');
    expect(store.sendResetEmail(customer('marina.lopes@email.com'))).toBe(true);
    expect(lastAudit()).toMatchObject({
      action: 'Enviou link de redefinição de senha por e-mail',
      changes: [expect.objectContaining({ after: 'Enviado' })],
    });
    const link = store.issueResetLink(vizinho)!;
    expect(link.url).toContain('/redefinir-senha?token=');
    const token = link.url.split('token=')[1];
    expect(JSON.stringify(lastAudit())).not.toContain(token);

    expect(store.sendResetEmail(customer('cliente.google@gmail.com'))).toBe(false);
    expect(store.issueResetLink(customer('cliente.google@gmail.com'))).toBeNull();

    TestBed.inject(AuthService).logout();
    login('viewer@email.com');
    expect(store.passwordProblem(vizinho)).toBe('Sem permissão para esta ação.');
  });

  it('exclusão LGPD: só super admin, sem pedido aberto; anonimiza e audita sem dado pessoal', () => {
    login('admin@email.com');
    const store = TestBed.inject(AdminCustomerStore);
    const vizinho = customer('vizinho@email.com');
    expect(store.deletionProblem(vizinho)).toBe('Só o super admin exclui cadastros.');
    expect(store.deleteCustomer(vizinho, 'Pedido do cliente')).toBe(false);

    TestBed.inject(AuthService).logout();
    login('superadmin@email.com');
    expect(store.deletionProblem(customer('viewer@email.com'))).toMatch(/equipe/);
    expect(store.deleteCustomer(vizinho, ' Pedido do cliente ')).toBe(true);
    const audit = lastAudit();
    expect(audit).toMatchObject({
      action: 'Excluiu cadastro (LGPD)',
      entityId: String(vizinho.id),
    });
    expect(JSON.stringify(audit)).not.toContain('vizinho@email.com');
    const anonymized = store.find(vizinho.id)!;
    expect(anonymized.anonymized).toBe(true);
    expect(store.passwordProblem(anonymized)).toBe('Cadastro excluído.');
    expect(store.deletionProblem(anonymized)).toBe('Cadastro já excluído.');
  });

  it('aplica a exclusão feita pelo próprio cliente em Minha conta', () => {
    const auth = TestBed.inject(AuthService);
    const store = TestBed.inject(AdminCustomerStore);
    login('maria@email.com');
    expect(auth.deleteOwnAccount('12345678', 'Não uso mais a loja', 0).ok).toBe(true);
    TestBed.tick();
    expect(TestBed.inject(AccountDirectory).pendingSelfDeletions()).toHaveLength(0);
    expect(lastAudit()).toMatchObject({ action: 'Cliente excluiu a própria conta', by: 'Cliente' });
    expect(store.customers().length).toBeGreaterThan(0);
  });
});
