import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/role-guard';
import { ADMIN_NAV } from './admin-nav';
import { AdminLayout } from './layout/admin-layout';

/** Telas já prontas (as outras do menu abrem "em construção"). */
const READY = ['pedidos', 'produtos', 'estoque'];

/** Rotas do backoffice (`/admin`). Cada tela exige a permissão do seu item de menu. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      {
        path: '',
        title: 'Nani Admin | Início',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'pedidos',
        title: 'Nani Admin | Pedidos',
        canActivate: [permissionGuard('orders:view', '/admin')],
        loadComponent: () => import('./orders/admin-orders').then((m) => m.AdminOrders),
      },
      {
        path: 'pedidos/:numero',
        title: 'Nani Admin | Pedido',
        canActivate: [permissionGuard('orders:view', '/admin')],
        loadComponent: () =>
          import('./order-detail/admin-order-detail').then((m) => m.AdminOrderDetail),
      },
      {
        path: 'produtos',
        title: 'Nani Admin | Produtos',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () => import('./products/admin-products').then((m) => m.AdminProducts),
      },
      {
        path: 'produtos/novo',
        title: 'Nani Admin | Novo produto',
        canActivate: [permissionGuard('products:edit', '/admin/produtos')],
        loadComponent: () =>
          import('./product-form/admin-product-form').then((m) => m.AdminProductForm),
      },
      {
        path: 'produtos/:slug',
        title: 'Nani Admin | Produto',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () =>
          import('./product-form/admin-product-form').then((m) => m.AdminProductForm),
      },
      {
        path: 'estoque',
        title: 'Nani Admin | Estoque',
        canActivate: [permissionGuard('stock:view', '/admin')],
        loadComponent: () => import('./stock/admin-stock').then((m) => m.AdminStock),
      },
      {
        path: 'estoque/entradas',
        title: 'Nani Admin | Entradas',
        canActivate: [permissionGuard('stock:view', '/admin')],
        loadComponent: () => import('./entries/admin-entries').then((m) => m.AdminEntries),
      },
      {
        path: 'estoque/entradas/nova',
        title: 'Nani Admin | Nova entrada',
        canActivate: [permissionGuard('stock:edit', '/admin/estoque/entradas')],
        loadComponent: () => import('./entry-form/admin-entry-form').then((m) => m.AdminEntryForm),
      },
      {
        path: 'estoque/entradas/:id',
        title: 'Nani Admin | Entrada',
        canActivate: [permissionGuard('stock:view', '/admin')],
        loadComponent: () =>
          import('./entry-detail/admin-entry-detail').then((m) => m.AdminEntryDetail),
      },
      {
        path: 'estoque/fornecedores',
        title: 'Nani Admin | Fornecedores',
        canActivate: [permissionGuard('suppliers:view', '/admin/estoque')],
        loadComponent: () => import('./suppliers/admin-suppliers').then((m) => m.AdminSuppliers),
      },
      {
        path: 'estoque/fornecedores/novo',
        title: 'Nani Admin | Novo fornecedor',
        canActivate: [permissionGuard('suppliers:edit', '/admin/estoque/fornecedores')],
        loadComponent: () =>
          import('./supplier-form/admin-supplier-form').then((m) => m.AdminSupplierForm),
      },
      {
        path: 'estoque/fornecedores/:id',
        title: 'Nani Admin | Fornecedor',
        canActivate: [permissionGuard('suppliers:view', '/admin/estoque')],
        loadComponent: () =>
          import('./supplier-form/admin-supplier-form').then((m) => m.AdminSupplierForm),
      },
      {
        path: 'estoque/:sku',
        title: 'Nani Admin | Estoque',
        canActivate: [permissionGuard('stock:view', '/admin')],
        loadComponent: () =>
          import('./stock-detail/admin-stock-detail').then((m) => m.AdminStockDetail),
      },
      // Telas das próximas sessões: por enquanto, uma página "em construção".
      ...ADMIN_NAV.filter((item) => item.path && !READY.includes(item.path)).map((item) => ({
        path: item.path,
        title: `Nani Admin | ${item.label}`,
        canActivate: [permissionGuard(item.permission, '/admin')],
        data: { title: item.label, icon: item.icon },
        loadComponent: () =>
          import('./placeholder/admin-placeholder').then((m) => m.AdminPlaceholder),
      })),
      { path: '**', redirectTo: '' },
    ],
  },
];
