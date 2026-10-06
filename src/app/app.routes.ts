import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { customerGuard, staffGuard } from './core/guards/role-guard';
import { cartNotEmptyGuard } from './core/guards/cart-guard';

export const routes: Routes = [
  {
    // Backoffice: área separada, carregada só por quem é da equipe.
    path: 'admin',
    canActivate: [staffGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    title: 'Nani Perfumes | Essência do Oriente',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'produtos',
    title: 'Nani Perfumes | Perfumes',
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'produtos/:slug',
    title: 'Nani Perfumes | Perfume',
    loadComponent: () =>
      import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'carrinho',
    title: 'Nani Perfumes | Carrinho',
    loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'favoritos',
    title: 'Nani Perfumes | Favoritos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/favorites/favorites').then((m) => m.Favorites),
  },
  {
    path: 'login',
    title: 'Nani Perfumes | Entrar',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'esqueci-senha',
    title: 'Nani Perfumes | Esqueci minha senha',
    loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'redefinir-senha',
    title: 'Nani Perfumes | Nova senha',
    loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'minha-conta/dados',
    title: 'Nani Perfumes | Dados pessoais',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'minha-conta/enderecos',
    title: 'Nani Perfumes | Meus endereços',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/addresses/addresses').then((m) => m.Addresses),
  },
  {
    path: 'minha-conta/pedidos',
    title: 'Nani Perfumes | Meus pedidos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/orders/orders').then((m) => m.Orders),
  },
  {
    path: 'minha-conta/pedidos/:numero',
    title: 'Nani Perfumes | Pedido',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/order-detail/order-detail').then((m) => m.OrderDetail),
  },
  {
    path: 'minha-conta',
    title: 'Nani Perfumes | Minha conta',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account').then((m) => m.Account),
  },
  {
    path: 'finalizar-compra',
    title: 'Nani Perfumes | Finalizar compra',
    canActivate: [authGuard, customerGuard, cartNotEmptyGuard],
    loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'pedido/:numero',
    title: 'Nani Perfumes | Pedido recebido',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/order-confirmation/order-confirmation').then((m) => m.OrderConfirmation),
  },
  {
    path: 'ajuda/:pagina',
    title: 'Nani Perfumes | Ajuda',
    loadComponent: () => import('./features/help/help-page').then((m) => m.HelpPageView),
  },
  {
    path: '**',
    title: 'Nani Perfumes | Página não encontrada',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
