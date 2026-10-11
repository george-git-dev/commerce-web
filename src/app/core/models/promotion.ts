/**
 * Promoção de preço: onde vale (alvo), quanto desconta e quando. É a ÚNICA
 * fonte do preço promocional — o produto só tem o preço normal. Contrato do
 * futuro `GET/POST/PUT /admin/promotions`; o back aplica no preço do pedido.
 */

/** Onde a promoção vale. */
export type PromoTarget =
  /** Variantes escolhidas (SKUs). */
  | { kind: 'itens'; skus: readonly string[] }
  /** Uma categoria inteira (perfume, kit, hidratante…). */
  | { kind: 'categoria'; category: string }
  /** Uma marca inteira. */
  | { kind: 'marca'; brand: string }
  /** Um formato: `frasco`, `decant` (todos) ou `decant:5` (só 5 ml). */
  | { kind: 'formato'; format: string };

/** Quanto desconta. */
export type PromoDiscount =
  /** % sobre o preço (1 a 90). */
  | { kind: 'percent'; value: number }
  /** R$ a menos em cada unidade. */
  | { kind: 'amount'; value: number }
  /** Preço final fixo (ex.: decant 5 ml por R$ 5,99). */
  | { kind: 'fixed'; value: number };

export interface Promotion {
  id: number;
  /** Nome interno ("Liquidação decants"). O cliente vê só o preço riscado. */
  name: string;
  active: boolean;
  target: PromoTarget;
  discount: PromoDiscount;
  /** Período (`aaaa-mm-dd`). Sem início = já vale; sem fim = até desativar ou acabar. */
  startsOn?: string;
  endsOn?: string;
  /** Limite de unidades vendidas na promoção (opcional): "as primeiras 50". */
  unitLimit?: number;
  /**
   * "Até acabar o estoque": o limite é o estoque dos itens no momento em que
   * a promoção é salva (o back calcula). Reposição depois não entra.
   */
  untilSoldOut?: boolean;
  /** Unidades já vendidas nela (no back, contado pelos pedidos). */
  sold: number;
}
