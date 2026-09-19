import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'ÂMBRA | Alta Perfumaria',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'produtos',
    title: 'ÂMBRA | Perfumes',
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'produtos/:id',
    title: 'ÂMBRA | Perfume',
    loadComponent: () =>
      import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'carrinho',
    title: 'ÂMBRA | Carrinho',
    loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'favoritos',
    title: 'ÂMBRA | Favoritos',
    loadComponent: () => import('./features/favorites/favorites').then((m) => m.Favorites),
  },
  {
    path: 'login',
    title: 'ÂMBRA | Entrar',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'minha-conta',
    title: 'ÂMBRA | Minha conta',
    loadComponent: () => import('./features/account/account').then((m) => m.Account),
  },
  {
    // Antes havia um redirect silencioso para '', que escondia URLs inválidas.
    path: '**',
    title: 'ÂMBRA | Página não encontrada',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
