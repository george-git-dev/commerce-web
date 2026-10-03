import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { RETURN_URL_PARAM, safeReturnUrl } from '../../core/guards/auth-guard';
import { BrandIcon } from '../../shared/brand-icon/brand-icon';
import { AuthService, MIN_PASSWORD_LENGTH } from '../../core/services/auth-service';

type AuthMode = 'entrar' | 'cadastro';

/**
 * `/login`. Entrar e criar conta com o `AuthService` (simulado até a Fase 2).
 * Depois do login volta para `?retorno=` (ex.: o checkout) ou para Minha conta.
 */
@Component({
  selector: 'app-login',
  imports: [BrandIcon, MatButtonModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly minPassword = MIN_PASSWORD_LENGTH;
  protected readonly mode = signal<AuthMode>('entrar');
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);
  /** Veio do checkout (ou outra rota protegida)? Mostra o aviso no topo. */
  protected readonly fromCheckout =
    this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM)?.startsWith('/finalizar-compra') ??
    false;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  protected setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set('');
    const name = this.form.controls.name;
    name.setValidators(mode === 'cadastro' ? [Validators.required, Validators.minLength(2)] : []);
    name.updateValueAndValidity();
  }

  /** Erro do campo só depois que o cliente mexeu nele (ou tentou enviar). */
  protected invalid(field: 'name' | 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, password } = this.form.getRawValue();
    const result =
      this.mode() === 'entrar'
        ? this.auth.login(email, password)
        : this.auth.register(name, email, password);
    if (!result.ok) {
      this.error.set(result.message);
      return;
    }
    this.goBack();
  }

  protected continueWithGoogle(): void {
    this.auth.loginWithGoogle();
    this.goBack();
  }

  /** Volta para a página de origem (`?retorno=`) ou para Minha conta. */
  private goBack(): void {
    const target = this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM);
    this.router.navigateByUrl(safeReturnUrl(target));
  }
}
