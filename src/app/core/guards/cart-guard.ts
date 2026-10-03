import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartStore } from '../services/cart-store';

/** Checkout só com algo na sacola; senão, volta para o carrinho. */
export const cartNotEmptyGuard: CanActivateFn = () =>
  inject(CartStore).count() > 0 || inject(Router).createUrlTree(['/carrinho']);
