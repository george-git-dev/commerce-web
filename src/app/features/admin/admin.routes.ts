import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/role-guard';
import { AdminLayout } from './layout/admin-layout';

/** Rotas do backoffice (`/admin`). Cada tela exige a permissão do seu item de menu. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      {
        path: '',
        title: 'Painel de vendas',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'pedidos',
        title: 'Pedidos',
        canActivate: [permissionGuard('orders:view', '/admin')],
        loadComponent: () => import('./orders/admin-orders').then((m) => m.AdminOrders),
      },
      {
        path: 'pedidos/devolucoes',
        title: 'Devoluções',
        canActivate: [permissionGuard('orders:view', '/admin')],
        loadComponent: () => import('./returns/admin-returns-page').then((m) => m.AdminReturnsPage),
      },
      {
        path: 'pedidos/:numero',
        title: 'Pedido',
        canActivate: [permissionGuard('orders:view', '/admin')],
        loadComponent: () =>
          import('./order-detail/admin-order-detail').then((m) => m.AdminOrderDetail),
      },
      {
        path: 'produtos',
        title: 'Produtos',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () => import('./products/admin-products').then((m) => m.AdminProducts),
      },
      {
        path: 'produtos/novo',
        title: 'Novo produto',
        canActivate: [permissionGuard('products:edit', '/admin/produtos')],
        loadComponent: () =>
          import('./product-form/admin-product-form').then((m) => m.AdminProductForm),
      },
      {
        path: 'produtos/:slug',
        title: 'Produto',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () =>
          import('./product-form/admin-product-form').then((m) => m.AdminProductForm),
      },
      {
        path: 'promocoes',
        title: 'Promoções',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () =>
          import('./promotions/admin-promotions').then((m) => m.AdminPromotionsPage),
      },
      {
        path: 'promocoes/cupons',
        title: 'Cupons',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () => import('./coupons/admin-coupons').then((m) => m.AdminCouponsPage),
      },
      {
        path: 'promocoes/cupons/novo',
        title: 'Novo cupom',
        canActivate: [permissionGuard('products:edit', '/admin/promocoes/cupons')],
        loadComponent: () =>
          import('./coupon-form/admin-coupon-form').then((m) => m.AdminCouponForm),
      },
      {
        path: 'promocoes/cupons/:id',
        title: 'Cupom',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () =>
          import('./coupon-form/admin-coupon-form').then((m) => m.AdminCouponForm),
      },
      {
        path: 'promocoes/nova',
        title: 'Nova promoção',
        canActivate: [permissionGuard('products:edit', '/admin/promocoes')],
        loadComponent: () =>
          import('./promotion-form/admin-promotion-form').then((m) => m.AdminPromotionForm),
      },
      {
        path: 'promocoes/:id',
        title: 'Promoção',
        canActivate: [permissionGuard('products:view', '/admin')],
        loadComponent: () =>
          import('./promotion-form/admin-promotion-form').then((m) => m.AdminPromotionForm),
      },
      {
        path: 'estoque',
        title: 'Estoque',
        canActivate: [permissionGuard('stock:view', '/admin')],
        loadComponent: () => import('./stock/admin-stock').then((m) => m.AdminStock),
      },
      {
        path: 'estoque/entradas',
        title: 'Entradas',
        canActivate: [permissionGuard('stock:view', '/admin')],
        loadComponent: () => import('./entries/admin-entries').then((m) => m.AdminEntries),
      },
      {
        path: 'estoque/entradas/nova',
        title: 'Nova entrada',
        canActivate: [permissionGuard('stock:edit', '/admin/estoque/entradas')],
        loadComponent: () => import('./entry-form/admin-entry-form').then((m) => m.AdminEntryForm),
      },
      {
        path: 'estoque/entradas/:id',
        title: 'Entrada',
        canActivate: [permissionGuard('stock:view', '/admin')],
        loadComponent: () =>
          import('./entry-detail/admin-entry-detail').then((m) => m.AdminEntryDetail),
      },
      {
        path: 'estoque/fornecedores',
        title: 'Fornecedores',
        canActivate: [permissionGuard('suppliers:view', '/admin/estoque')],
        loadComponent: () => import('./suppliers/admin-suppliers').then((m) => m.AdminSuppliers),
      },
      {
        path: 'estoque/fornecedores/novo',
        title: 'Novo fornecedor',
        canActivate: [permissionGuard('suppliers:edit', '/admin/estoque/fornecedores')],
        loadComponent: () =>
          import('./supplier-form/admin-supplier-form').then((m) => m.AdminSupplierForm),
      },
      {
        path: 'estoque/fornecedores/:id',
        title: 'Fornecedor',
        canActivate: [permissionGuard('suppliers:view', '/admin/estoque')],
        loadComponent: () =>
          import('./supplier-form/admin-supplier-form').then((m) => m.AdminSupplierForm),
      },
      {
        path: 'estoque/:sku',
        title: 'Estoque',
        canActivate: [permissionGuard('stock:view', '/admin')],
        loadComponent: () =>
          import('./stock-detail/admin-stock-detail').then((m) => m.AdminStockDetail),
      },
      {
        path: 'clientes',
        title: 'Clientes',
        canActivate: [permissionGuard('customers:view', '/admin')],
        loadComponent: () => import('./customers/admin-customers').then((m) => m.AdminCustomers),
      },
      {
        path: 'clientes/:id',
        title: 'Cliente',
        canActivate: [permissionGuard('customers:view', '/admin')],
        loadComponent: () =>
          import('./customer-detail/admin-customer-detail').then((m) => m.AdminCustomerDetail),
      },
      {
        path: 'afiliados',
        title: 'Afiliados',
        canActivate: [permissionGuard('affiliates:view', '/admin')],
        loadComponent: () =>
          import('./affiliates/admin-affiliate-payouts').then((m) => m.AdminAffiliatePayouts),
      },
      {
        path: 'relatorios',
        title: 'Relatórios',
        canActivate: [permissionGuard('reports:view', '/admin')],
        loadComponent: () => import('./reports/admin-reports').then((m) => m.AdminReports),
      },
      {
        path: 'auditoria',
        title: 'Auditoria',
        canActivate: [permissionGuard('audit:view', '/admin')],
        loadComponent: () => import('./audit/admin-audit-page').then((m) => m.AdminAuditPage),
      },
      {
        path: 'vitrine',
        title: 'Vitrine',
        canActivate: [permissionGuard('settings:view', '/admin')],
        loadComponent: () => import('./storefront/admin-banners').then((m) => m.AdminBanners),
      },
      {
        path: 'vitrine/avaliacoes',
        title: 'Avaliações',
        canActivate: [permissionGuard('approvals:view', '/admin/vitrine')],
        loadComponent: () => import('./reviews/admin-reviews').then((m) => m.AdminReviews),
      },
      {
        path: 'vitrine/avisos',
        title: 'Avisos',
        canActivate: [permissionGuard('settings:view', '/admin')],
        loadComponent: () =>
          import('./storefront/admin-announcements').then((m) => m.AdminAnnouncements),
      },
      {
        path: 'vitrine/banners/novo',
        title: 'Novo banner',
        canActivate: [permissionGuard('settings:edit', '/admin/vitrine')],
        loadComponent: () =>
          import('./banner-form/admin-banner-form').then((m) => m.AdminBannerForm),
      },
      {
        path: 'vitrine/banners/:id',
        title: 'Banner',
        canActivate: [permissionGuard('settings:view', '/admin')],
        loadComponent: () =>
          import('./banner-form/admin-banner-form').then((m) => m.AdminBannerForm),
      },
      {
        path: 'vitrine/configuracoes',
        title: 'Configurações da loja',
        canActivate: [permissionGuard('settings:view', '/admin')],
        loadComponent: () => import('./settings/admin-settings').then((m) => m.AdminSettings),
      },
      // Endereços antigos (menu e auditoria antigos): continuam funcionando.
      { path: 'configuracoes', redirectTo: 'vitrine/configuracoes', pathMatch: 'full' },
      { path: 'aprovacoes', redirectTo: 'vitrine/avaliacoes', pathMatch: 'full' },
      { path: 'aprovacoes/afiliados', redirectTo: 'afiliados', pathMatch: 'full' },
      { path: '**', redirectTo: '' },
    ],
  },
];
