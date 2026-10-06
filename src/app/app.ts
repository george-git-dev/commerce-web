import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  imports: [RouterOutlet, Header, Footer],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit, OnDestroy {
  private readonly fullTitle = 'Nani Perfumes ● Essência do Oriente | ';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private position = 0;

  /** No backoffice (`/admin`) a loja some: sem header, rodapé e faixa de anúncios. */
  protected readonly isAdmin = toSignal(
    inject(Router).events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/admin')),
    ),
    { initialValue: !!inject(DOCUMENT).location?.pathname.startsWith('/admin') },
  );

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      const scrolled = this.fullTitle.slice(this.position) + this.fullTitle.slice(0, this.position);
      document.title = scrolled;
      this.position = (this.position + 1) % this.fullTitle.length;
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
