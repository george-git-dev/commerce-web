import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Celular/computador com internet? (eventos `online`/`offline` do navegador). */
@Injectable({ providedIn: 'root' })
export class OnlineStatus {
  readonly online = signal(true);

  constructor() {
    const win = inject(DOCUMENT).defaultView;
    if (!win?.addEventListener) return;
    this.online.set(win.navigator.onLine);
    const on = () => this.online.set(true);
    const off = () => this.online.set(false);
    win.addEventListener('online', on);
    win.addEventListener('offline', off);
    inject(DestroyRef).onDestroy(() => {
      win.removeEventListener('online', on);
      win.removeEventListener('offline', off);
    });
  }
}
