import { CATALOG_QUERY_PARAMS } from '../config/navigation';
import { Announcement, StoreBanner, StoreLink } from '../models/storefront';

/**
 * Regras da vitrine (banners, avisos, frete grátis) em funções puras. O back
 * repete as mesmas validações (B3): o front só ajuda quem está editando.
 */

export type ShowStatus = 'no-ar' | 'agendado' | 'encerrado' | 'inativo';

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  'no-ar': 'No ar',
  agendado: 'Agendado',
  encerrado: 'Encerrado',
  inativo: 'Inativo',
};

export const BANNER_RULES = {
  nameMax: 60,
  altMax: 160,
  /** Mesmo limite e tipos das fotos de produto. */
  maxBytes: 5 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

/** Aviso precisa caber na faixa do celular sem virar parágrafo. */
export const ANNOUNCEMENT_MAX = 70;

/** Limites do frete grátis (R$). */
export const FREE_SHIPPING_RULES = { min: 1, max: 100_000 } as const;

type Scheduled = Pick<StoreBanner, 'active' | 'startsOn' | 'endsOn'>;

/** Situação hoje (`today` = `aaaa-mm-dd`): período fechado nas duas pontas. */
export function showStatus(item: Scheduled, today: string): ShowStatus {
  if (!item.active) return 'inativo';
  if (item.startsOn && item.startsOn > today) return 'agendado';
  if (item.endsOn && item.endsOn < today) return 'encerrado';
  return 'no-ar';
}

export const isLive = (item: Scheduled, today: string) => showStatus(item, today) === 'no-ar';

/** `aaaa-mm-dd` no fuso local. */
export function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// --- Links ------------------------------------------------------------------

/**
 * Destinos prontos do botão/banner. `custom` = caminho digitado (só da loja).
 * Fase 2: a lista de categorias e selos vem da API.
 */
export const LINK_PRESETS: readonly { id: string; label: string; link: StoreLink | null }[] = [
  { id: 'none', label: 'Sem link (só imagem/texto)', link: null },
  { id: 'all', label: 'Todos os produtos', link: { path: '/produtos' } },
  {
    id: 'launch',
    label: 'Lançamentos',
    link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.launch]: 'true' } },
  },
  {
    id: 'deal',
    label: 'Ofertas',
    link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.deal]: 'true' } },
  },
  {
    id: 'best',
    label: 'Mais vendidos',
    link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.bestSeller]: 'true' } },
  },
  {
    id: 'male',
    label: 'Perfumes masculinos',
    link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.gender]: 'Masculino' } },
  },
  {
    id: 'female',
    label: 'Perfumes femininos',
    link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.gender]: 'Feminino' } },
  },
  {
    id: 'kits',
    label: 'Kits e presentes',
    link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.category]: 'kit' } },
  },
  { id: 'custom', label: 'Outra página da loja…', link: null },
];

/** "/produtos?oferta=true" ⇄ `{ path, queryParams }` (ordem dos filtros não importa). */
export function linkToText(link: StoreLink | undefined): string {
  if (!link) return '';
  const query = new URLSearchParams(link.queryParams ?? {}).toString();
  return query ? `${link.path}?${query}` : link.path;
}

/**
 * Lê um caminho digitado e aceita SÓ páginas da própria loja: começa com uma
 * barra, sem domínio (`//`, `http:`), sem `javascript:` nem caracteres
 * estranhos. Inválido = `null`.
 */
export function parseInternalLink(text: string): StoreLink | null {
  const value = text.trim();
  if (!/^\/(?!\/)[\w\-/.~%]*(\?[\w\-.~%=&,+ ]*)?$/.test(value)) return null;
  if (/[:\\]/.test(value) || value.includes('..')) return null;
  const [path, query] = value.split('?');
  const params = Object.fromEntries(new URLSearchParams(query ?? ''));
  return Object.keys(params).length ? { path, queryParams: params } : { path };
}

/** Qual preset bate com o link salvo (`custom` se nenhum; `none` sem link). */
export function presetOf(link: StoreLink | undefined): string {
  if (!link) return 'none';
  const text = linkToText(link);
  return LINK_PRESETS.find((p) => p.link && linkToText(p.link) === text)?.id ?? 'custom';
}

/** Link escolhido no formulário: preset pronto, caminho digitado ou nenhum. */
export function linkFromChoice(preset: string, text: string): StoreLink | undefined {
  if (preset === 'custom') return parseInternalLink(text) ?? undefined;
  return LINK_PRESETS.find((p) => p.id === preset)?.link ?? undefined;
}

// --- Validação --------------------------------------------------------------

function periodProblem(startsOn?: string, endsOn?: string): string | null {
  return startsOn && endsOn && endsOn < startsOn
    ? 'A data final precisa ser igual ou depois da inicial.'
    : null;
}

/** Problemas do banner (lista vazia = pode salvar). `linkText` = campo "outra página". */
export function bannerProblems(
  banner: Omit<StoreBanner, 'id'>,
  custom: { preset: string; text: string },
): string[] {
  const problems: string[] = [];
  const name = banner.name.trim();
  if (name.length < 3) problems.push('Dê um nome ao banner (mínimo 3 letras).');
  if (name.length > BANNER_RULES.nameMax) {
    problems.push(`Nome com no máximo ${BANNER_RULES.nameMax} caracteres.`);
  }
  if (!banner.image) problems.push('Envie a imagem do celular.');
  const alt = banner.alt.trim();
  if (alt.length < 10) problems.push('Descreva o que a arte mostra (mínimo 10 letras).');
  if (alt.length > BANNER_RULES.altMax) {
    problems.push(`Descrição com no máximo ${BANNER_RULES.altMax} caracteres.`);
  }
  if (custom.preset === 'custom' && !parseInternalLink(custom.text)) {
    problems.push('Link: use um endereço da loja começando com "/" (ex.: /produtos?oferta=true).');
  }
  const period = periodProblem(banner.startsOn, banner.endsOn);
  if (period) problems.push(period);
  return problems;
}

/** Problemas do aviso (lista vazia = pode salvar). */
export function announcementProblems(
  announcement: Omit<Announcement, 'id'>,
  custom: { preset: string; text: string },
): string[] {
  const problems: string[] = [];
  const text = announcement.text.trim();
  if (text.length < 3) problems.push('Escreva o aviso (mínimo 3 letras).');
  if (text.length > ANNOUNCEMENT_MAX) {
    problems.push(`Aviso com no máximo ${ANNOUNCEMENT_MAX} caracteres (cabe no celular).`);
  }
  if (/[<>]/.test(text)) problems.push('O aviso é só texto: sem os sinais < e >.');
  if (custom.preset === 'custom' && !parseInternalLink(custom.text)) {
    problems.push('Link: use um endereço da loja começando com "/".');
  }
  const period = periodProblem(announcement.startsOn, announcement.endsOn);
  if (period) problems.push(period);
  return problems;
}

/** Problema do valor do frete grátis (`null` = ok). */
export function freeShippingProblem(value: number | string | null): string | null {
  const number = Number(value);
  if (value === '' || value == null || !Number.isFinite(number)) return 'Informe o valor.';
  if (number < FREE_SHIPPING_RULES.min) return 'O valor precisa ser maior que zero.';
  if (number > FREE_SHIPPING_RULES.max) return 'Valor alto demais — confira.';
  return null;
}

/** Imagem do banner: tipo e tamanho (o back reprocessa e converte para WEBP). */
export function bannerImageProblem(file: { type: string; size: number }): string | null {
  if (!(BANNER_RULES.types as readonly string[]).includes(file.type)) {
    return 'Use imagem JPG, PNG ou WEBP.';
  }
  if (file.size > BANNER_RULES.maxBytes) return 'A imagem pode ter até 5 MB.';
  return null;
}

/** "R$ 599" / "R$ 599,90" — texto do frete grátis na loja. */
export function moneyLabel(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
