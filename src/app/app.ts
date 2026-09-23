import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  private readonly fullTitle = 'Nani Perfums ● Essência do Oriente | ';
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private position = 0;

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
