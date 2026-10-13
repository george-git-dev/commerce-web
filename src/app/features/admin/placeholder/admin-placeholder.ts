import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** Tela do backoffice que ainda vai ser construída (próximas sessões). */
@Component({
  selector: 'app-admin-placeholder',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <section class="ph">
      <mat-icon aria-hidden="true">{{ data['icon'] }}</mat-icon>
      <h1>{{ data['title'] }}</h1>
      <p>Esta tela está em construção e chega nas próximas sessões do backoffice.</p>
      <a matButton="outlined" class="ui-cta" routerLink="/admin">Voltar ao início</a>
    </section>
  `,
  styles: `
    .ph {
      display: grid;
      justify-items: center;
      gap: 12px;
      max-width: 420px;
      margin: 48px auto;
      padding: 32px 20px;
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      text-align: center;
    }

    mat-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
      color: var(--gold);
    }

    h1 {
      font-size: 1.75rem;
    }

    p {
      margin: 0;
      color: var(--muted-foreground);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlaceholder {
  protected readonly data = inject(ActivatedRoute).snapshot.data;
}
