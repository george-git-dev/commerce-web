import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, MIN_PASSWORD_LENGTH } from '../../core/services/auth-service';

function samePasswords(group: AbstractControl): ValidationErrors | null {
  const { password, confirm } = group.value as { password: string; confirm: string };
  return confirm && password !== confirm ? { mismatch: true } : null;
}

/** `/redefinir-senha?token=…` — cria a senha nova a partir do link do e-mail. */
@Component({
  selector: 'app-reset-password',
  imports: [MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './password-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly minPassword = MIN_PASSWORD_LENGTH;
  protected readonly validLink = signal(this.auth.isResetLinkValid(this.token));
  protected readonly showPassword = signal(false);
  protected readonly error = signal('');

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm: ['', Validators.required],
    },
    { validators: samePasswords },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const result = this.auth.resetPassword(this.token, this.form.getRawValue().password);
    if (!result.ok) {
      this.error.set(result.message);
      this.validLink.set(this.auth.isResetLinkValid(this.token));
      return;
    }
    this.snackBar.open('Senha alterada. Entre com a senha nova.', 'Fechar', { duration: 4000 });
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
