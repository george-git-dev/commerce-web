import { Permission } from '../../core/config/permissions';

export interface AdminNavItem {
  label: string;
  /** Nome curto na barra de atalhos do celular (padrão: `label`). */
  shortLabel?: string;
  icon: string;
  /** Caminho dentro de `/admin` ('' = Painel de vendas). */
  path: string;
  /** Sem esta permissão, o item some do menu e a rota é barrada. */
  permission: Permission;
  /** Também na barra de atalhos de baixo (celular). */
  shortcut?: boolean;
  /** Mostra o contador de pendências de aprovação. */
  badge?: boolean;
}

/** Menu do backoffice, na ordem de exibição. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    label: 'Painel de vendas',
    shortLabel: 'Vendas',
    icon: 'space_dashboard',
    path: '',
    permission: 'dashboard:view',
    shortcut: true,
  },
  {
    label: 'Pedidos',
    icon: 'receipt_long',
    path: 'pedidos',
    permission: 'orders:view',
    shortcut: true,
  },
  { label: 'Produtos', icon: 'inventory_2', path: 'produtos', permission: 'products:view' },
  // Saldo, entradas de mercadoria (compras) e fornecedores, em abas.
  {
    label: 'Estoque e compras',
    shortLabel: 'Estoque',
    icon: 'warehouse',
    path: 'estoque',
    permission: 'stock:view',
    shortcut: true,
  },
  { label: 'Clientes', icon: 'group', path: 'clientes', permission: 'customers:view' },
  {
    label: 'Aprovações',
    icon: 'task_alt',
    path: 'aprovacoes',
    permission: 'approvals:view',
    shortcut: true,
    badge: true,
  },
  { label: 'Relatórios', icon: 'insights', path: 'relatorios', permission: 'reports:view' },
  { label: 'Equipe', icon: 'admin_panel_settings', path: 'equipe', permission: 'team:manage' },
  { label: 'Auditoria', icon: 'history', path: 'auditoria', permission: 'audit:view' },
  {
    label: 'Configurações da loja',
    icon: 'settings',
    path: 'configuracoes',
    permission: 'settings:view',
  },
];
