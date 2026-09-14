import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'ÂMBRA | Alta Perfumaria',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    // Antes havia um redirect silencioso para '', que escondia URLs inválidas.
    path: '**',
    title: 'ÂMBRA | Página não encontrada',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
