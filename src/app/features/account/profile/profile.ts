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
import { Profile as ProfileData, ProfileService } from '../../../core/services/profile-service';
import { ApiError } from '../../../core/http/api-errors';
import { formatPhone } from '../../../core/utils/br-format';
import { Busy } from '../../../shared/busy/busy';
import { cpfValidator, phoneValidator } from '../../../core/utils/br-validators';
import { InputMask } from '../../../shared/input-mask/input-mask';

/** Nova senha e confirmação iguais (erro no grupo). */
function samePasswords(group: AbstractControl): ValidationErrors | null {
  const { next, confirm } = group.value as { next: string; confirm: string };
  return confirm && next !== confirm ? { mismatch: true } : null;
}

/**
 * `/minha-conta/dados` — nome, celular, CPF (se faltar) e troca de senha. Os dados vêm do back
 * (`ProfileService` → BFF `/api/me/profile`). Celular e CPF salvam no back; o nome, no login
 * de verdade, é editado na tela do Keycloak.
 */
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
  private readonly profiles = inject(ProfileService);
  protected readonly minPassword = MIN_PASSWORD_LENGTH;

  /** Dados como estão no back (`null` enquanto carrega). */
  protected readonly profile = signal<ProfileData | null>(null);
  /** Não deu para carregar (o aviso global já saiu pelo interceptor); a tela oferece tentar de novo. */
  protected readonly loadFailed = signal(false);

  protected readonly data = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', phoneValidator],
    // Só aparece para quem ainda não tem CPF (conta antiga ou Google).
    cpf: ['', cpfValidator],
  });
  protected readonly dataError = signal<string | null>(null);
  /** "Salvar dados" ocupado: botão desabilitado com "Aguarde…" até o back responder. */
  protected readonly saving = new Busy();

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

  constructor() {
    this.load();
  }

  /** Busca os dados no back e preenche o formulário. */
  protected load(): void {
    this.loadFailed.set(false);
    this.profiles.load().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.data.reset({ name: profile.name, phone: formatPhone(profile.phone ?? ''), cpf: '' });
      },
      error: () => this.loadFailed.set(true),
    });
  }

  protected invalid(control: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected saveData(): void {
    if (this.data.invalid) {
      this.data.markAllAsTouched();
      return;
    }
    const { name, phone, cpf } = this.data.getRawValue();
    this.dataError.set(null);
    this.saving.run(
      this.profiles.save({ name, phone, cpf: this.profile()?.cpf ? '' : cpf }),
      (profile) => {
        this.profile.set(profile);
        this.data.reset({ name: profile.name, phone: formatPhone(profile.phone ?? ''), cpf: '' });
        this.snackBar.open('Dados atualizados.', 'Fechar', { duration: 3000 });
      },
      (error) => this.showError(error),
    );
  }

  /** Mensagem do back no formulário; erro de campo (`errors`) também marca o campo. */
  private showError(error: ApiError): void {
    this.dataError.set(error.message);
    for (const [field, message] of Object.entries(error.problem?.errors ?? {})) {
      const control = this.data.get(field);
      control?.setErrors({ server: message });
      control?.markAsTouched();
    }
  }

  /** Mensagem que o back mandou para o campo (ou `null` para usar a do front). */
  protected serverError(field: 'phone' | 'cpf'): string | null {
    return this.data.controls[field].getError('server') ?? null;
  }

  /** Login de verdade: a troca de senha é na tela do Keycloak (confere a senha atual). */
  protected changePassword(): void {
    this.auth.startPasswordChange('/minha-conta/dados');
  }

  /** Só no modo simulado (testes e `start:mock`). */
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
