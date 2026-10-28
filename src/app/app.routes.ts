import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { customerGuard, staffGuard } from './core/guards/role-guard';
import { cartNotEmptyGuard } from './core/guards/cart-guard';

export const routes: Routes = [
  {
    // Backoffice: área separada, carregada só por quem é da equipe.
    path: 'admin',
    data: { seo: { noindex: true, brand: 'admin' } },
    canActivate: [staffGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'produtos',
    data: {
      seo: {
        description:
          'Perfumes árabes originais para todos os estilos: masculinos, femininos e unissex, em frasco lacrado ou decant. Filtre por marca, família olfativa e preço.',
      },
    },
    title: 'Perfumes',
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'produtos/:slug',
    title: 'Perfume',
    loadComponent: () =>
      import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'carrinho',
    data: { seo: { noindex: true } },
    title: 'Carrinho',
    loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'favoritos',
    data: { seo: { noindex: true } },
    title: 'Favoritos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/favorites/favorites').then((m) => m.Favorites),
  },
  {
    path: 'login',
    data: { seo: { noindex: true } },
    title: 'Entrar',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'esqueci-senha',
    data: { seo: { noindex: true } },
    title: 'Esqueci minha senha',
    loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'redefinir-senha',
    data: { seo: { noindex: true } },
    title: 'Nova senha',
    loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'minha-conta/dados',
    data: { seo: { noindex: true } },
    title: 'Dados pessoais',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'seja-afiliado',
    data: {
      seo: {
        description:
          'Divulgue a Nani Perfumes com o seu cupom: quem compra ganha desconto e você recebe comissão a cada venda.',
      },
    },
    title: 'Seja afiliado',
    loadComponent: () =>
      import('./features/affiliate/affiliate-landing').then((m) => m.AffiliateLanding),
  },
  {
    path: 'minha-conta/afiliado',
    data: { seo: { noindex: true } },
    title: 'Programa de afiliados',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/affiliate/affiliate-area').then((m) => m.AffiliateArea),
  },
  {
    path: 'minha-conta/credito',
    data: { seo: { noindex: true } },
    title: 'Crédito na loja',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/store-credit/store-credit-page').then((m) => m.StoreCreditPage),
  },
  {
    path: 'minha-conta/excluir-conta',
    data: { seo: { noindex: true } },
    title: 'Excluir conta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/delete-account/delete-account').then((m) => m.DeleteAccount),
  },
  {
    path: 'minha-conta/enderecos',
    data: { seo: { noindex: true } },
    title: 'Meus endereços',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/addresses/addresses').then((m) => m.Addresses),
  },
  {
    path: 'minha-conta/pedidos',
    data: { seo: { noindex: true } },
    title: 'Meus pedidos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/orders/orders').then((m) => m.Orders),
  },
  {
    path: 'minha-conta/pedidos/:numero/devolucao',
    data: { seo: { noindex: true } },
    title: 'Devolução',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/return-request/return-request').then((m) => m.ReturnRequestPage),
  },
  {
    path: 'minha-conta/pedidos/:numero',
    data: { seo: { noindex: true } },
    title: 'Pedido',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/order-detail/order-detail').then((m) => m.OrderDetail),
  },
  {
    path: 'minha-conta',
    data: { seo: { noindex: true } },
    title: 'Minha conta',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account').then((m) => m.Account),
  },
  {
    path: 'finalizar-compra',
    data: { seo: { noindex: true } },
    title: 'Finalizar compra',
    canActivate: [authGuard, customerGuard, cartNotEmptyGuard],
    loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'pedido/:numero',
    data: { seo: { noindex: true } },
    title: 'Pedido recebido',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/order-confirmation/order-confirmation').then((m) => m.OrderConfirmation),
  },
  {
    path: 'ajuda/:pagina',
    title: 'Ajuda',
    loadComponent: () => import('./features/help/help-page').then((m) => m.HelpPageView),
  },
  {
    path: '**',
    data: { seo: { noindex: true } },
    title: 'Página não encontrada',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
