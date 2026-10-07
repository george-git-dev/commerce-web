import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/role-guard';
import { ADMIN_NAV } from './admin-nav';
import { AdminLayout } from './layout/admin-layout';

/** Telas já prontas (as outras do menu abrem "em construção"). */
const READY = ['pedidos', 'produtos'];

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
