import { hasPermission } from './permissions';

describe('permissões por perfil', () => {
  it('cliente só compra; perfis somam permissões', () => {
    expect(hasPermission(['ROLE_CUSTOMER'], 'shop:checkout')).toBe(true);
    expect(hasPermission(['ROLE_CUSTOMER'], 'admin:access')).toBe(false);
    expect(hasPermission(['ROLE_CUSTOMER', 'ROLE_VIEWER'], 'admin:access')).toBe(true);
    expect(hasPermission([], 'shop:checkout')).toBe(false);
    expect(hasPermission(undefined, 'shop:checkout')).toBe(false);
  });

  it('visualizador só lê; admin não gerencia a equipe; super admin tudo', () => {
    expect(hasPermission(['ROLE_VIEWER'], 'orders:view')).toBe(true);
    expect(hasPermission(['ROLE_VIEWER'], 'orders:edit')).toBe(false);
    expect(hasPermission(['ROLE_VIEWER'], 'customers:sensitive')).toBe(false);
    expect(hasPermission(['ROLE_VIEWER'], 'approvals:view')).toBe(false);
    expect(hasPermission(['ROLE_ADMIN'], 'approvals:edit')).toBe(true);
    expect(hasPermission(['ROLE_ADMIN'], 'team:manage')).toBe(false);
    expect(hasPermission(['ROLE_SUPER_ADMIN'], 'team:manage')).toBe(true);
  });
});
