import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { NO_RETRY, REQUEST_TIMEOUT, SKIP_GLOBAL_ERROR } from '../http/api-context';
import { onlyCepDigits } from './shipping-service';

export interface CepAddress {
  street: string;
  district: string;
  city: string;
  state: string;
}

/** Resposta do BFF (`GET /api/cep/{cep}`). */
interface CepResponse extends CepAddress {
  cep: string;
}

/** Cidades fictícias por região (1º dígito do CEP), só para o modo simulado preencher algo. */
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

/** A busca é ajuda, não obrigação: se demorar, o cliente preenche à mão. */
export const CEP_LOOKUP_TIMEOUT_MS = 6_000;

/**
 * Endereço a partir do CEP. Modo `bff`: `GET /api/cep/{cep}` (o BFF consulta ViaCEP, com
 * BrasilAPI de reserva, e guarda em cache). Modo `mock`: endereço fictício.
 *
 * Erro (CEP não encontrado, serviço fora do ar) chega como `ApiError` com a frase do back,
 * SEM aviso global: a tela mostra embaixo do campo e o cliente segue preenchendo.
 * O cliente sempre pode corrigir o que veio preenchido.
 */
@Injectable({ providedIn: 'root' })
export class CepLookup {
  /** Só o modo `bff` faz chamada HTTP (o simulado funciona sem `HttpClient` configurado). */
  private readonly http = inject(AUTH_MODE) === 'bff' ? inject(HttpClient) : null;

  lookup(cep: string): Observable<CepAddress> {
    const digits = onlyCepDigits(cep);
    if (!this.http) {
      const [city, state] = REGION_CITY[digits[0]] ?? REGION_CITY['0'];
      return of({ street: 'Rua das Acácias', district: 'Centro', city, state });
    }
    const context = new HttpContext()
      .set(SKIP_GLOBAL_ERROR, true)
      .set(NO_RETRY, true)
      .set(REQUEST_TIMEOUT, CEP_LOOKUP_TIMEOUT_MS);
    return this.http
      .get<CepResponse>(`/api/cep/${digits}`, { context })
      .pipe(map(({ street, district, city, state }) => ({ street, district, city, state })));
  }
}
