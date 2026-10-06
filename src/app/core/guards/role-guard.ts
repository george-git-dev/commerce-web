import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission } from '../config/permissions';
import { AuthService } from '../services/auth-service';
import { RETURN_URL_PARAM } from './auth-guard';

/**
 * Exige uma permissão (use depois do `authGuard`). Sem ela, volta para a loja.
 * No front é só experiência — o back confere a mesma permissão em cada endpoint.
 */
export function permissionGuard(permission: Permission, fallback = '/'): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login'], { queryParams: { [RETURN_URL_PARAM]: state.url } });
    }
    return auth.can(permission) || router.parseUrl(fallback);
  };
}

/** Comprar exige `ROLE_CUSTOMER`: sem ela, a conta é tratada como sem acesso. */
export const customerGuard = permissionGuard('shop:checkout', '/carrinho');

/** Backoffice: qualquer perfil da equipe. */
export const staffGuard = permissionGuard('admin:access');
