import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { STORE_CONFIG } from '../config/store-config';

/** SEO de uma página. O que não vier usa o padrão da loja. */
export interface PageSeo {
  /** Título da aba e do Google ("Asad — Lattafa | Nani Perfumes"). */
  title?: string;
  /** Até ~155 caracteres; o resto o Google corta. */
  description?: string;
  /** Imagem da prévia (caminho do site, ex.: `img/produtos/asad.webp`). */
  image?: string;
  /** Página que não deve aparecer no Google (conta, carrinho, checkout, admin). */
  noindex?: boolean;
  /** Dados estruturados (schema.org) em JSON-LD. */
  jsonLd?: Record<string, unknown>;
  /** `product` na página de produto; o resto é `website`. */
  type?: 'website' | 'product';
}

/** Em `data.seo` da rota: descrição e noindex fixos da página. */
export type RouteSeo = Pick<PageSeo, 'description' | 'noindex'>;

const JSON_LD_ID = 'seo-jsonld';
const DEFAULT_IMAGE = 'img/og-nani.jpg';

/**
 * Título, descrição, canonical, Open Graph, robots e JSON-LD da página.
 *
 * ⚠ Sem SSR: o Google executa o JavaScript e lê tudo isto; WhatsApp,
 * Instagram e Facebook NÃO executam — a prévia de link mostra as tags fixas do
 * `index.html` (dívida registrada; solução na Fase 3 com função no CloudFront).
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** Aplica a página. Chamado na navegação (padrões da rota) e pelas telas com conteúdo próprio. */
  update(page: PageSeo, path = this.currentPath()): void {
    const title = page.title ?? `${STORE_CONFIG.name} | ${STORE_CONFIG.tagline}`;
    const description = truncate(page.description ?? STORE_CONFIG.description, 160);
    const url = absolute(path);
    const image = absolute(page.image ?? DEFAULT_IMAGE);

    this.title.setTitle(title);
    this.setName('description', description);
    this.setName('robots', page.noindex ? 'noindex, nofollow' : 'index, follow');
    this.setProperty('og:title', title);
    this.setProperty('og:description', description);
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.setProperty('og:type', page.type ?? 'website');
    this.setName('twitter:card', 'summary_large_image');
    this.setCanonical(page.noindex ? null : url);
    this.setJsonLd(page.jsonLd);
  }

  private currentPath(): string {
    return this.document.location?.pathname ?? '/';
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  /** Endereço "oficial" da página: sem filtros nem parâmetros (evita duplicado no Google). */
  private setCanonical(url: string | null): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      head.appendChild(link);
    }
    link.href = url;
  }

  private setJsonLd(data: Record<string, unknown> | undefined): void {
    this.document.getElementById(JSON_LD_ID)?.remove();
    if (!data) return;
    const script = this.document.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    // `<` escapado: um texto do cadastro nunca fecha a tag <script>.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}

/** Caminho do site → endereço completo (`img/x.webp` → `https://…/img/x.webp`). */
export function absolute(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${STORE_CONFIG.siteUrl}/${path.replace(/^\//, '')}`.replace(/\/$/, '');
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Na navegação: título da rota + descrição/noindex de `data.seo` (o da rota
 * mais interna vale; `noindex` de uma rota pai vale para as filhas, ex.: admin).
 * Telas com conteúdo próprio (produto, ajuda) chamam `Seo.update` depois.
 */
@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seo = inject(Seo);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route: ActivatedRouteSnapshot | null = snapshot.root;
    const seo: RouteSeo = {};
    while (route) {
      const data = route.data?.['seo'] as RouteSeo | undefined;
      if (data?.description) seo.description = data.description;
      if (data?.noindex) seo.noindex = true;
      route = route.firstChild;
    }
    this.seo.update(
      { ...seo, title: this.buildTitle(snapshot) },
      snapshot.url.split(/[?#]/)[0] || '/',
    );
  }
}
