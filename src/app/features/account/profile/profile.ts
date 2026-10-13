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
import { RouterLink } from '@angular/router';
import { AuthService, MIN_PASSWORD_LENGTH } from '../../../core/services/auth-service';
import { maskCpf } from '../../../core/utils/br-format';
import { cpfValidator, phoneValidator } from '../../../core/utils/br-validators';
import { InputMask } from '../../../shared/input-mask/input-mask';

/** Nova senha e confirmação iguais (erro no grupo). */
function samePasswords(group: AbstractControl): ValidationErrors | null {
  const { next, confirm } = group.value as { next: string; confirm: string };
  return confirm && next !== confirm ? { mismatch: true } : null;
}

/** `/minha-conta/dados` — nome, celular, CPF (se faltar) e troca de senha. */
@Component({
  selector: 'app-profile',
  imports: [MatButtonModule, MatIconModule, ReactiveFormsModule, RouterLink, InputMask],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly auth = inject(AuthService);
  protected readonly minPassword = MIN_PASSWORD_LENGTH;
  protected readonly maskCpf = maskCpf;

  private readonly user = this.auth.user();

  protected readonly data = this.fb.group({
    name: [this.user?.name ?? '', [Validators.required, Validators.minLength(2)]],
    phone: [this.user?.phone ?? '', phoneValidator],
    // Só aparece para quem ainda não tem CPF (conta antiga ou Google).
    cpf: ['', cpfValidator],
  });
  protected readonly dataError = signal<string | null>(null);

  protected readonly password = this.fb.group(
    {
      current: ['', Validators.required],
      next: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm: ['', Validators.required],
    },
    { validators: samePasswords },
  );
  protected readonly passwordError = signal<string | null>(null);
  protected readonly showPasswords = signal(false);

  protected invalid(control: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected saveData(): void {
    if (this.data.invalid) {
      this.data.markAllAsTouched();
      return;
    }
    const { name, phone, cpf } = this.data.getRawValue();
    if (cpf && !this.auth.user()?.cpf) {
      const result = this.auth.completeCpf(cpf);
      if (!result.ok) return this.dataError.set(result.message);
    }
    const result = this.auth.updateProfile(name, phone);
    if (!result.ok) return this.dataError.set(result.message);
    this.dataError.set(null);
    this.data.markAsPristine();
    this.snackBar.open('Dados atualizados.', 'Fechar', { duration: 3000 });
  }

  protected savePassword(): void {
    if (this.password.invalid) {
      this.password.markAllAsTouched();
      return;
    }
    const { current, next } = this.password.getRawValue();
    const result = this.auth.changePassword(current, next);
    if (!result.ok) return this.passwordError.set(result.message);
    this.passwordError.set(null);
    this.password.reset();
    this.snackBar.open('Senha alterada.', 'Fechar', { duration: 3000 });
  }
}
