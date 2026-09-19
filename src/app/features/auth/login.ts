import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

type AuthMode = 'entrar' | 'cadastro';

/**
 * `/login`. Só visual/demo — alterna entre "entrar" e "criar conta" sem
 * nenhuma lógica real. A Etapa 3 do roadmap implementa autenticação de verdade.
 */
@Component({
  selector: 'app-login',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly snackBar = inject(MatSnackBar);

  protected readonly mode = signal<AuthMode>('entrar');

  protected setMode(mode: AuthMode): void {
    this.mode.set(mode);
  }

  protected submit(): void {
    this.snackBar.open('Login é só uma demonstração visual por enquanto.', 'Fechar', {
      duration: 3000,
    });
  }
}
