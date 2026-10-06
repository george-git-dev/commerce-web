import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/role-guard';
import { ADMIN_NAV } from './admin-nav';
import { AdminLayout } from './layout/admin-layout';

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
      // Telas das próximas sessões: por enquanto, uma página "em construção".
      ...ADMIN_NAV.filter((item) => item.path).map((item) => ({
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
