import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth-service';
import { CatalogService } from './catalog-service';
import { FavoritesStore } from './favorites-store';

describe('FavoritesStore (por conta, salvo no navegador)', () => {
  beforeEach(() => localStorage.clear());

  it('guarda por e-mail, some ao sair e volta ao entrar de novo', () => {
    const auth = TestBed.inject(AuthService);
    const favorites = TestBed.inject(FavoritesStore);
    const yara = TestBed.inject(CatalogService).findBySlug('lattafa-yara')!;

    auth.login('maria@email.com', '12345678');
    TestBed.tick();
    favorites.toggle(yara);
    TestBed.tick();
    expect(localStorage.getItem('nani.favorites.v1.maria@email.com')).toBe('["lattafa-yara"]');

    auth.logout();
    TestBed.tick();
    expect(favorites.count()).toBe(0);

    auth.login('maria@email.com', '12345678');
    TestBed.tick();
    expect(favorites.isFavorite(yara.id)).toBe(true);

    auth.logout();
    auth.login('outra@email.com', '12345678');
    TestBed.tick();
    expect(favorites.count()).toBe(0);
  });
});
