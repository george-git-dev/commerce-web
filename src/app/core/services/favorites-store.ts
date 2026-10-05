import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Product } from '../models/product';
import { readJson, writeJson } from '../utils/browser-storage';
import { AuthService } from './auth-service';
import { CatalogService } from './catalog-service';

/** Favoritos são da conta: uma lista por e-mail, só com os slugs. */
const favoritesKey = (email: string) => `nani.favorites.v1.${email}`;

/**
 * Favoritos da conta logada, guardados no navegador (por e-mail) até a Fase 2,
 * quando vêm de `/me/favorites`. Ao sair, a lista some da tela (continua salva
 * para quando a pessoa voltar a entrar).
 */
@Injectable({ providedIn: 'root' })
export class FavoritesStore {
  private readonly catalog = inject(CatalogService);
  private readonly items = signal<readonly Product[]>([]);
  /** De quem é a lista carregada (null = ninguém logado). */
  private readonly owner = signal<string | null>(null);

  readonly products = this.items.asReadonly();
  readonly count = computed(() => this.items().length);

  constructor() {
    const auth = inject(AuthService);

    // Entrou: carrega a lista salva, somando o que já estiver na tela
    // (ex.: o produto favoritado antes do login). Saiu: limpa a tela.
    effect(() => {
      const email = auth.user()?.email ?? null;
      untracked(() => {
        if (!email) {
          this.owner.set(null);
          this.items.set([]);
          return;
        }
        const stored = (readJson<string[]>(favoritesKey(email)) ?? [])
          .map((slug) => this.catalog.findBySlug(slug))
          .filter((product): product is Product => product !== undefined);
        // Só soma o que está na tela se ninguém estava logado antes; trocar
        // direto de uma conta para outra não pode misturar as listas.
        const pending = this.owner() === null ? this.items() : [];
        this.items.set([
          ...stored,
          ...pending.filter((product) => !stored.some((item) => item.id === product.id)),
        ]);
        this.owner.set(email);
      });
    });

    effect(() => {
      const email = this.owner();
      const slugs = this.items().map((product) => product.slug);
      if (email) writeJson(favoritesKey(email), slugs);
    });
  }

  isFavorite(productId: number): boolean {
    return this.items().some((product) => product.id === productId);
  }

  add(product: Product): void {
    if (!this.isFavorite(product.id)) this.items.update((items) => [...items, product]);
  }

  clear(): void {
    this.items.set([]);
  }

  toggle(product: Product): void {
    this.items.update((items) =>
      items.some((item) => item.id === product.id)
        ? items.filter((item) => item.id !== product.id)
        : [...items, product],
    );
  }
}
