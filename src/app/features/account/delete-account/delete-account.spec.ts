import { TestBed } from '@angular/core/testing';
import { AdminAudit } from '../../admin/services/admin-audit';
import { AdminCustomerStore } from '../../admin/services/admin-customer-store';
import { AccountDirectory } from '../../../core/services/account-directory';
import { AuthService } from '../../../core/services/auth-service';

describe('Excluir minha conta', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    auth = TestBed.inject(AuthService);
  });

  it('confere a senha, exclui, sai da conta e não deixa entrar de novo', () => {
    auth.login('maria@email.com', '12345678');
    expect(auth.deleteOwnAccount('123', '', 0)).toEqual({ ok: false, message: 'Senha incorreta.' });
    expect(auth.deleteOwnAccount('12345678', 'Não uso mais a loja', 0)).toEqual({ ok: true });
    expect(auth.user()).toBeNull();
    expect(auth.login('maria@email.com', '12345678').ok).toBe(false);
    // O e-mail fica livre para um cadastro novo.
    expect(auth.register('Maria', 'maria@email.com', '529.982.247-25', '12345678').ok).toBe(true);
  });

  it('com pedido em andamento ou conta da equipe, não exclui', () => {
    auth.login('maria@email.com', '12345678');
    expect(auth.deleteOwnAccount('12345678', '', 1).ok).toBe(false);
    auth.logout();
    auth.login('viewer@email.com', '12345678');
    expect(auth.ownDeletionBlock(0)).toMatch(/^Conta da equipe/);
  });

  it('conta só Google confirma com o e-mail', () => {
    auth.loginWithGoogle();
    expect(auth.deleteOwnAccount('outro@email.com', '', 0).ok).toBe(false);
    expect(auth.deleteOwnAccount('CLIENTE.GOOGLE@gmail.com', '', 0).ok).toBe(true);
  });

  it('o backoffice anonimiza os pedidos e audita sem dado pessoal', () => {
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const store = TestBed.inject(AdminCustomerStore);
    const customer = store.customers().find((c) => c.orders.length && !store.isStaff(c))!;
    // Simula a exclusão feita pelo cliente na loja.
    TestBed.inject(AccountDirectory).markDeleted(customer.email, {
      customerId: 0,
      reason: 'Preocupação com meus dados',
      by: 'Cliente (própria conta)',
      at: new Date(),
      pending: true,
    });
    TestBed.tick();
    expect(store.customers().some((c) => c.email === customer.email)).toBe(false);
    const entry = TestBed.inject(AdminAudit).entries()[0];
    expect(entry.action).toBe('Cliente excluiu a própria conta');
    expect(entry.role).toBe('Cliente');
    expect(JSON.stringify(entry)).not.toContain(customer.email);
  });
});
