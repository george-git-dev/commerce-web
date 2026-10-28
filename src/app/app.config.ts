import {
  ApplicationConfig,
  ErrorHandler,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { apiInterceptor } from './core/http/api-interceptor';
import { mockApiInterceptor } from './core/http/mock-api-interceptor';
import {
  provideRouter,
  TitleStrategy,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { SeoTitleStrategy } from './core/seo/seo';
import { routes } from './app.routes';

registerLocaleData(ptBr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Explícito: o projeto não usa zone.js e todos os componentes são OnPush + signals.
    provideZonelessChangeDetection(),
    // withFetch(): usa a Fetch API em vez de XHR, evitando warning de interceptor fora do browser.
    // Proteção global das chamadas ao back (timeout, nova tentativa em GET, avisos, 401).
    // O mock da API fica por último: some na Fase 2, quando as chamadas vão para o Spring.
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor, mockApiInterceptor])),
    // Erro de código no front que ninguém tratou: registra e avisa (sem tela quebrada em silêncio).
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      // Sem isto, clicar duas vezes no mesmo item de menu não rola de novo até a seção.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    // Título + descrição, canonical, Open Graph e robots a cada navegação.
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
