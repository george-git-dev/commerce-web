import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';

registerLocaleData(ptBr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Explícito: o projeto não usa zone.js e todos os componentes são OnPush + signals.
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      // Sem isto, clicar duas vezes no mesmo item de menu não rola de novo até a seção.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
