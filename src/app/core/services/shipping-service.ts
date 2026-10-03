import { Injectable, signal } from '@angular/core';
import { STORE_CONFIG } from '../config/store-config';
import { ShippingOption } from '../models/shipping';

/** Tabela fictícia por região (1º dígito do CEP): [econômico, prazo, expresso, prazo]. */
const REGION_TABLE: Record<string, readonly [number, number, number, number, number, number]> = {
  '0': [14.9, 3, 5, 24.9, 1, 2], // SP (Grande SP)
  '1': [16.9, 3, 6, 26.9, 1, 3], // SP (interior)
  '2': [19.9, 4, 6, 32.9, 2, 3], // RJ / ES
  '3': [19.9, 4, 6, 32.9, 2, 3], // MG
  '4': [27.9, 6, 9, 44.9, 3, 5], // BA / SE
  '5': [29.9, 7, 10, 49.9, 3, 5], // PE / AL / PB / RN
  '6': [34.9, 8, 12, 59.9, 4, 6], // CE / PI / MA / Norte
  '7': [27.9, 6, 9, 44.9, 3, 5], // DF / GO / TO / MT / MS / RO / AC
  '8': [19.9, 4, 6, 32.9, 2, 3], // PR / SC
  '9': [22.9, 5, 7, 36.9, 2, 4], // RS
};

/** Mantém só os dígitos e limita a 8. */
export function onlyCepDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

/** "01310100" → "01310-100" (aceita parcial, para a máscara do campo). */
export function formatCep(value: string): string {
  const digits = onlyCepDigits(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function isValidCep(value: string): boolean {
  const digits = onlyCepDigits(value);
  return digits.length === 8 && !/^(\d)\1{7}$/.test(digits);
}

/**
 * Cálculo de frete. Hoje usa uma tabela fictícia por região; na Fase 2 vira
 * `POST /shipping/quote` com CEP e itens — o valor final do frete (como todo
 * valor do pedido) é sempre calculado no back, nunca confiado ao front (B6).
 *
 * Guarda o CEP da sessão para o carrinho e, depois, o checkout reaproveitarem.
 */
@Injectable({ providedIn: 'root' })
export class ShippingService {
  /** CEP consultado (só dígitos); vazio = ainda não calculado. */
  readonly cep = signal('');

  /** Opções para o CEP e o subtotal. Acima do mínimo, o econômico sai grátis. */
  quote(cep: string, subtotal: number): readonly ShippingOption[] {
    if (!isValidCep(cep)) return [];
    const [eco, ecoMin, ecoMax, exp, expMin, expMax] = REGION_TABLE[cep[0]];
    const free = subtotal >= STORE_CONFIG.freeShippingMin;
    return [
      {
        id: 'economico',
        label: 'Econômico',
        minDays: ecoMin,
        maxDays: ecoMax,
        price: free ? 0 : eco,
      },
      { id: 'expresso', label: 'Expresso', minDays: expMin, maxDays: expMax, price: exp },
    ];
  }
}
