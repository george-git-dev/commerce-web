import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AwayTitle } from './core/seo/away-title';
import { ConnectionBanner } from './layout/connection-banner/connection-banner';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  imports: [RouterOutlet, Header, Footer, ConnectionBanner],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** No backoffice (`/admin`) a loja some: sem header, rodapé e faixa de anúncios. */
  protected readonly isAdmin = toSignal(
    inject(Router).events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/admin')),
    ),
    { initialValue: !!inject(DOCUMENT).location?.pathname.startsWith('/admin') },
  );

  constructor() {
    // Título rolando só com a aba em segundo plano (ver AwayTitle).
    inject(DestroyRef).onDestroy(inject(AwayTitle).start());
  }
}
