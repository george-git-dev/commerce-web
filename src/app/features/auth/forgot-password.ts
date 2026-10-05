import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService, RESET_LINK_MINUTES } from '../../core/services/auth-service';

/** `/esqueci-senha` — pede o link de redefinição por e-mail. */
@Component({
  selector: 'app-forgot-password',
  imports: [MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './password-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);

  protected readonly minutes = RESET_LINK_MINUTES;
  protected readonly email = inject(NonNullableFormBuilder).control('', [
    Validators.required,
    Validators.email,
  ]);
  protected readonly sent = signal(false);
  /** Só no mock: o "e-mail" vira um link na própria tela. */
  protected readonly demoToken = signal<string | null>(null);

  protected submit(): void {
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }
    this.demoToken.set(this.auth.requestPasswordReset(this.email.value));
    this.sent.set(true);
  }
}
