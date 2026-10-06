/**
 * Perfis e permissões — ÚNICO lugar onde se decide quem vê/faz o quê.
 *
 * Um usuário pode ter vários perfis (ex.: CUSTOMER + VIEWER). Todo cadastro
 * nasce com `ROLE_CUSTOMER`; sem ela não há compra. Funcionário é um cliente a
 * quem um admin acrescentou outro perfil pelo backoffice.
 *
 * ⚠ No front isto só esconde menus, botões e rotas. Quem barra de verdade é o
 * back (`@PreAuthorize` por permissão, mesma tabela). A divisão abaixo é a
 * PROPOSTA INICIAL — o que cada perfil pode fazer ainda será decidido (roadmap).
 */
export type Role = 'ROLE_SUPER_ADMIN' | 'ROLE_ADMIN' | 'ROLE_VIEWER' | 'ROLE_CUSTOMER';

export const ROLE_LABELS: Record<Role, string> = {
  ROLE_SUPER_ADMIN: 'Super admin',
  ROLE_ADMIN: 'Admin',
  ROLE_VIEWER: 'Visualizador',
  ROLE_CUSTOMER: 'Cliente',
};

export type Permission =
  | 'shop:checkout'
  | 'admin:access'
  | 'dashboard:view'
  | 'orders:view'
  | 'orders:edit'
  | 'products:view'
  | 'products:edit'
  | 'stock:view'
  | 'stock:edit'
  | 'suppliers:view'
  | 'suppliers:edit'
  | 'customers:view'
  | 'customers:edit'
  /** Ver CPF e telefone completos (sem isso, aparecem mascarados). */
  | 'customers:sensitive'
  | 'approvals:view'
  | 'approvals:edit'
  | 'reports:view'
  | 'team:manage'
  | 'audit:view'
  | 'settings:view'
  | 'settings:edit';

/** Só leitura do backoffice (sem aprovações, equipe nem dados sensíveis). */
const VIEWER: readonly Permission[] = [
  'admin:access',
  'dashboard:view',
  'orders:view',
  'products:view',
  'stock:view',
  'suppliers:view',
  'customers:view',
  'reports:view',
  'audit:view',
  'settings:view',
];

/** Tudo no backoffice, menos gerenciar a equipe (quem é admin). */
const ADMIN: readonly Permission[] = [
  ...VIEWER,
  'orders:edit',
  'products:edit',
  'stock:edit',
  'suppliers:edit',
  'customers:edit',
  'customers:sensitive',
  'approvals:view',
  'approvals:edit',
  'settings:edit',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ROLE_CUSTOMER: ['shop:checkout'],
  ROLE_VIEWER: VIEWER,
  ROLE_ADMIN: ADMIN,
  ROLE_SUPER_ADMIN: [...ADMIN, 'team:manage'],
};

/** Algum dos perfis concede a permissão? */
export function hasPermission(roles: readonly Role[] | undefined, permission: Permission): boolean {
  return !!roles?.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}
