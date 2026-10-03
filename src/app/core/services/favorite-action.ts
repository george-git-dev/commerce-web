import { effect, inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RETURN_URL_PARAM } from '../guards/auth-guard';
import { Product } from '../models/product';
import { AuthService } from './auth-service';
import { FavoritesStore } from './favorites-store';

/** `?motivo=favoritos` no login: mostra o aviso certo na tela de entrar. */
export const LOGIN_REASON_PARAM = 'motivo';

/**
 * Clique no coração. Favoritos exigem conta: sem login, guarda o produto,
 * manda para o login e, quando o cliente entra, adiciona o produto e avisa.
 */
@Injectable({ providedIn: 'root' })
export class FavoriteAction {
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  /** Produto que o cliente tentou favoritar antes de entrar. */
  private readonly pending = signal<Product | null>(null);

  constructor() {
    effect(() => {
      const product = this.pending();
      if (this.auth.isLoggedIn() && product) {
        this.pending.set(null);
        this.favorites.add(product);
        this.snackBar.open(`${product.name} foi adicionado aos favoritos.`, 'Fechar', {
          duration: 3000,
        });
      }
    });
  }

  toggle(product: Product): void {
    if (this.auth.isLoggedIn()) {
      this.favorites.toggle(product);
      return;
    }
    this.pending.set(product);
    this.router.navigate(['/login'], {
      queryParams: { [RETURN_URL_PARAM]: this.router.url, [LOGIN_REASON_PARAM]: 'favoritos' },
    });
  }
}
