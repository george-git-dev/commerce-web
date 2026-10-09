import { computed, Injectable, signal } from '@angular/core';
import { DEFAULT_BANNER } from '../config/banners';
import { ANNOUNCEMENTS_MOCK, BANNERS_MOCK, STORE_SETTINGS_MOCK } from '../data/storefront-mock';
import { Banner } from '../models/banner';
import { Announcement, StoreBanner, StoreLink, StoreSettings } from '../models/storefront';
import { isLive, isoDay, moneyLabel } from '../utils/storefront-rules';

/** Marca no texto que vira o valor do frete grátis ("acima de {freteGratis}"). */
export const FREE_SHIPPING_TOKEN = '{freteGratis}';

/** Aviso da faixa já pronto para a loja (texto puro + link interno opcional). */
export interface LiveAnnouncement {
  text: string;
  link?: StoreLink;
}

/**
 * Conteúdo da vitrine que muda sem deploy: banners, avisos da faixa e frete
 * grátis. A loja (carrossel, faixa, carrinho, checkout, textos) lê daqui; o
 * backoffice edita por `AdminStorefront`.
 *
 * Mock em memória: no desenvolvimento, salvar no backoffice já muda a loja.
 * Fase 2: a loja busca `GET /storefront` (cache curto, só o que está no ar) e
 * o backoffice usa `/admin/banners`, `/admin/announcements` e
 * `/admin/settings`. Se a API falhar, a loja mantém o banner padrão.
 */
@Injectable({ providedIn: 'root' })
export class StorefrontContent {
  private readonly bannersState = signal<readonly StoreBanner[]>(BANNERS_MOCK);
  private readonly announcementsState = signal<readonly Announcement[]>(ANNOUNCEMENTS_MOCK);
  private readonly settingsState = signal<StoreSettings>(STORE_SETTINGS_MOCK);

  /** Hoje (`aaaa-mm-dd`). Fase 2: o back decide o que está no ar. */
  readonly today = signal(isoDay(new Date()));

  // --- Backoffice (tudo, na ordem de exibição) -----------------------------
  readonly allBanners = this.bannersState.asReadonly();
  readonly allAnnouncements = this.announcementsState.asReadonly();
  readonly settings = this.settingsState.asReadonly();

  // --- Loja ----------------------------------------------------------------
  readonly freeShippingMin = computed(() => this.settingsState().freeShippingMin);
  /** "R$ 599" — para os textos da loja. */
  readonly freeShippingLabel = computed(() => moneyLabel(this.freeShippingMin()));

  /** Banners no ar hoje, no formato da loja. Nenhum no ar = banner padrão. */
  readonly banners = computed<readonly Banner[]>(() => {
    const live = this.bannersState().filter((banner) => isLive(banner, this.today()));
    if (!live.length) return [DEFAULT_BANNER];
    return live.map((banner) => ({
      id: String(banner.id),
      image: banner.image,
      imageDesktop: banner.imageDesktop,
      alt: banner.alt,
      link: banner.link,
    }));
  });

  /** Faixa do topo: frete grátis (se ligado) + avisos no ar, na ordem. */
  readonly announcements = computed<readonly LiveAnnouncement[]>(() => {
    const list: LiveAnnouncement[] = this.settingsState().freeShippingNotice
      ? [{ text: `Frete grátis acima de ${this.freeShippingLabel()}` }]
      : [];
    for (const item of this.announcementsState()) {
      if (isLive(item, this.today())) list.push({ text: item.text, link: item.link });
    }
    return list;
  });

  /** Troca `{freteGratis}` pelo valor atual (textos de ajuda e destaques). */
  fill(text: string): string {
    return text.split(FREE_SHIPPING_TOKEN).join(this.freeShippingLabel());
  }

  // --- Escrita (chamada só pelo `AdminStorefront`, que valida e audita) ----

  saveBanner(id: number | null, data: Omit<StoreBanner, 'id'>): number {
    const nextId = id ?? Math.max(0, ...this.bannersState().map((b) => b.id)) + 1;
    this.bannersState.update((list) =>
      id == null
        ? [...list, { ...data, id: nextId }]
        : list.map((banner) => (banner.id === id ? { ...data, id } : banner)),
    );
    return nextId;
  }

  removeBanner(id: number): void {
    this.bannersState.update((list) => list.filter((banner) => banner.id !== id));
  }

  moveBanner(id: number, step: -1 | 1): void {
    this.bannersState.update((list) => move(list, id, step));
  }

  saveAnnouncement(id: number | null, data: Omit<Announcement, 'id'>): number {
    const nextId = id ?? Math.max(0, ...this.announcementsState().map((a) => a.id)) + 1;
    this.announcementsState.update((list) =>
      id == null
        ? [...list, { ...data, id: nextId }]
        : list.map((item) => (item.id === id ? { ...data, id } : item)),
    );
    return nextId;
  }

  removeAnnouncement(id: number): void {
    this.announcementsState.update((list) => list.filter((item) => item.id !== id));
  }

  moveAnnouncement(id: number, step: -1 | 1): void {
    this.announcementsState.update((list) => move(list, id, step));
  }

  saveSettings(settings: StoreSettings): void {
    this.settingsState.set(settings);
  }
}

/** Troca o item de lugar com o vizinho (primeiro/último não saem da lista). */
function move<T extends { id: number }>(list: readonly T[], id: number, step: -1 | 1): T[] {
  const index = list.findIndex((item) => item.id === id);
  const target = index + step;
  if (index < 0 || target < 0 || target >= list.length) return [...list];
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
