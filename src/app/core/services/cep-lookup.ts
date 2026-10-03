import { Injectable } from '@angular/core';
import { isValidCep, onlyCepDigits } from './shipping-service';

export interface CepAddress {
  street: string;
  district: string;
  city: string;
  state: string;
}

/** Cidades fictícias por região (1º dígito do CEP), só para o mock preencher algo. */
const REGION_CITY: Record<string, [string, string]> = {
  '0': ['São Paulo', 'SP'],
  '1': ['Campinas', 'SP'],
  '2': ['Rio de Janeiro', 'RJ'],
  '3': ['Belo Horizonte', 'MG'],
  '4': ['Salvador', 'BA'],
  '5': ['Recife', 'PE'],
  '6': ['Fortaleza', 'CE'],
  '7': ['Brasília', 'DF'],
  '8': ['Curitiba', 'PR'],
  '9': ['Porto Alegre', 'RS'],
};

/**
 * Busca de endereço pelo CEP. Hoje é um mock; na Fase 2, consultar o ViaCEP
 * (ou um serviço do gateway de frete) — de preferência pelo back, com cache.
 * O cliente sempre pode corrigir o que veio preenchido.
 */
@Injectable({ providedIn: 'root' })
export class CepLookup {
  lookup(cep: string): CepAddress | null {
    const digits = onlyCepDigits(cep);
    if (!isValidCep(digits)) return null;
    const [city, state] = REGION_CITY[digits[0]];
    return { street: 'Rua das Acácias', district: 'Centro', city, state };
  }
}
