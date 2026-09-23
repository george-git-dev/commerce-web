import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Nani Perfums | Essência do Oriente',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'produtos',
    title: 'Nani Perfums | Perfumes',
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'produtos/:id',
    title: 'Nani Perfums | Perfume',
    loadComponent: () =>
      import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'carrinho',
    title: 'Nani Perfums | Carrinho',
    loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'favoritos',
    title: 'Nani Perfums | Favoritos',
    loadComponent: () => import('./features/favorites/favorites').then((m) => m.Favorites),
  },
  {
    path: 'login',
    title: 'Nani Perfums | Entrar',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'minha-conta',
    title: 'Nani Perfums | Minha conta',
    loadComponent: () => import('./features/account/account').then((m) => m.Account),
  },
  {
    path: '**',
    title: 'Nani Perfums | Página não encontrada',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];