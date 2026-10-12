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
  /** Contador de pendências: avaliações (Vitrine) ou pedidos de afiliado (Afiliados). */
  badge?: 'reviews' | 'affiliates';
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
  // Preço promocional: por itens, categoria, marca ou formato, com período.
  { label: 'Promoções', icon: 'sell', path: 'promocoes', permission: 'products:view' },
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
  // Pedidos para ser afiliado, afiliados, comissões e pagamentos.
  {
    label: 'Afiliados',
    icon: 'handshake',
    path: 'afiliados',
    permission: 'affiliates:view',
    badge: 'affiliates',
  },
  { label: 'Relatórios', icon: 'insights', path: 'relatorios', permission: 'reports:view' },

  { label: 'Auditoria', icon: 'history', path: 'auditoria', permission: 'audit:view' },
  // Banners, avisos da faixa, avaliações dos clientes e configurações da loja (sem deploy).
  {
    label: 'Vitrine',
    icon: 'storefront',
    path: 'vitrine',
    permission: 'settings:view',
    shortcut: true,
    badge: 'reviews',
  },
];
