import { HttpContextToken } from '@angular/common/http';

/** Tempo máximo de espera por resposta (ms). */
export const API_TIMEOUT_MS = 15_000;

/** A tela trata o erro sozinha: sem aviso global (ex.: mensagem no próprio formulário). */
export const SKIP_GLOBAL_ERROR = new HttpContextToken<boolean>(() => false);

/** Sem nova tentativa automática (já é o padrão fora do GET). */
export const NO_RETRY = new HttpContextToken<boolean>(() => false);

/** Timeout próprio para uma chamada (ex.: upload de imagem). */
export const REQUEST_TIMEOUT = new HttpContextToken<number>(() => API_TIMEOUT_MS);
