import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/role-guard';
import { ADMIN_NAV } from './admin-nav';
import { AdminLayout } from './layout/admin-layout';

/** Telas já prontas (as outras do menu abrem "em construção"). */
const READY = [
  'pedidos',
  'produtos',
  'promocoes',
  'estoque',
  'clientes',
  'afiliados',
  'auditoria',
  'relatorios',
  'vitrine',
];

/** Rotas do backoffice (`/admin`). Cada tela exige a permissão do seu item de menu. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      {
        path: '',
        title: 'Nani Admin | Painel de vendas',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'pedidos',
        title: 'Nani Admin | Pedidos',
        canActivate: [permissionGuard('orders:view', '/admin')],
        loadComponent: () => import('./orders/admin-orders').then((m) => m.AdminOrders),
      },
      {
        path: 'pedidos/devolucoes',
        title: 'Nani Admin | Devoluções',
        canActivate: [permissionGuard('orders:view', '/admin')],
        loadComponent: () => import('./returns/admin-returns-page').then((m) => m.AdminReturnsPage),
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
        path: 'promocoes',
        title: 'Nani Admin | Promoções',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () =>
          import('./promotions/admin-promotions').then((m) => m.AdminPromotionsPage),
      },
      {
        path: 'promocoes/cupons',
        title: 'Nani Admin | Cupons',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () => import('./coupons/admin-coupons').then((m) => m.AdminCouponsPage),
      },
      {
        path: 'promocoes/cupons/novo',
        title: 'Nani Admin | Novo cupom',
        canActivate: [permissionGuard('products:edit', '/admin/promocoes/cupons')],
        loadComponent: () =>
          import('./coupon-form/admin-coupon-form').then((m) => m.AdminCouponForm),
      },
      {
        path: 'promocoes/cupons/:id',
        title: 'Nani Admin | Cupom',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () =>
          import('./coupon-form/admin-coupon-form').then((m) => m.AdminCouponForm),
      },
      {
        path: 'promocoes/nova',
        title: 'Nani Admin | Nova promoção',
        canActivate: [permissionGuard('products:edit', '/admin/promocoes')],
        loadComponent: () =>
          import('./promotion-form/admin-promotion-form').then((m) => m.AdminPromotionForm),
      },
      {
        path: 'promocoes/:id',
        title: 'Nani Admin | Promoção',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () =>
          import('./promotion-form/admin-promotion-form').then((m) => m.AdminPromotionForm),
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
      {
        path: 'clientes',
        title: 'Nani Admin | Clientes',
        canActivate: [permissionGuard('customers:view', '/admin')],
        loadComponent: () => import('./customers/admin-customers').then((m) => m.AdminCustomers),
      },
      {
        path: 'clientes/:id',
        title: 'Nani Admin | Cliente',
        canActivate: [permissionGuard('customers:view', '/admin')],
        loadComponent: () =>
          import('./customer-detail/admin-customer-detail').then((m) => m.AdminCustomerDetail),
      },
      {
        path: 'afiliados',
        title: 'Nani Admin | Afiliados',
        canActivate: [permissionGuard('affiliates:view', '/admin')],
        loadComponent: () =>
          import('./affiliates/admin-affiliate-payouts').then((m) => m.AdminAffiliatePayouts),
      },
      {
        path: 'relatorios',
        title: 'Nani Admin | Relatórios',
        canActivate: [permissionGuard('reports:view', '/admin')],
        loadComponent: () => import('./reports/admin-reports').then((m) => m.AdminReports),
      },
      {
        path: 'auditoria',
        title: 'Nani Admin | Auditoria',
        canActivate: [permissionGuard('audit:view', '/admin')],
        loadComponent: () => import('./audit/admin-audit-page').then((m) => m.AdminAuditPage),
      },
      {
        path: 'vitrine',
        title: 'Nani Admin | Vitrine',
        canActivate: [permissionGuard('settings:view', '/admin')],
        loadComponent: () => import('./storefront/admin-banners').then((m) => m.AdminBanners),
      },
      {
        path: 'vitrine/avaliacoes',
        title: 'Nani Admin | Avaliações',
        canActivate: [permissionGuard('approvals:view', '/admin/vitrine')],
        loadComponent: () => import('./reviews/admin-reviews').then((m) => m.AdminReviews),
      },
      {
        path: 'vitrine/avisos',
        title: 'Nani Admin | Avisos',
        canActivate: [permissionGuard('settings:view', '/admin')],
        loadComponent: () =>
          import('./storefront/admin-announcements').then((m) => m.AdminAnnouncements),
      },
      {
        path: 'vitrine/banners/novo',
        title: 'Nani Admin | Novo banner',
        canActivate: [permissionGuard('settings:edit', '/admin/vitrine')],
        loadComponent: () =>
          import('./banner-form/admin-banner-form').then((m) => m.AdminBannerForm),
      },
      {
        path: 'vitrine/banners/:id',
        title: 'Nani Admin | Banner',
        canActivate: [permissionGuard('settings:view', '/admin')],
        loadComponent: () =>
          import('./banner-form/admin-banner-form').then((m) => m.AdminBannerForm),
      },
      {
        path: 'vitrine/configuracoes',
        title: 'Nani Admin | Configurações da loja',
        canActivate: [permissionGuard('settings:view', '/admin')],
        loadComponent: () => import('./settings/admin-settings').then((m) => m.AdminSettings),
      },
      // Endereços antigos (menu e auditoria antigos): continuam funcionando.
      { path: 'configuracoes', redirectTo: 'vitrine/configuracoes', pathMatch: 'full' },
      { path: 'aprovacoes', redirectTo: 'vitrine/avaliacoes', pathMatch: 'full' },
      { path: 'aprovacoes/afiliados', redirectTo: 'afiliados', pathMatch: 'full' },
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
