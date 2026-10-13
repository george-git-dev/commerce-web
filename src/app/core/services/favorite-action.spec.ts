import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { loginAs, productBySlug } from '../../../testing/test-helpers';
import { FavoriteAction } from './favorite-action';
import { FavoritesStore } from './favorites-store';

describe('FavoriteAction (coração exige conta)', () => {
  let snacks: string[];

  beforeEach(() => {
    localStorage.clear();
    snacks = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: MatSnackBar, useValue: { open: (m: string) => snacks.push(m) } },
      ],
    });
  });

  it('logado: liga e desliga o favorito', () => {
    loginAs('customer');
    const asad = productBySlug('lattafa-asad');
    const favorites = TestBed.inject(FavoritesStore);
    TestBed.inject(FavoriteAction).toggle(asad);
    expect(favorites.isFavorite(asad.id)).toBe(true);
    TestBed.inject(FavoriteAction).toggle(asad);
    expect(favorites.isFavorite(asad.id)).toBe(false);
  });

  it('sem login: vai ao login com o motivo e adiciona quando o cliente entra', async () => {
    const asad = productBySlug('lattafa-asad');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    TestBed.inject(FavoriteAction).toggle(asad);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { retorno: '/', motivo: 'favoritos' },
    });
    loginAs('customer');
    TestBed.tick();
    expect(TestBed.inject(FavoritesStore).isFavorite(asad.id)).toBe(true);
    expect(snacks[0]).toContain('foi adicionado aos favoritos');
  });
});
