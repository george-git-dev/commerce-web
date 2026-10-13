import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AddressBook } from '../../../core/services/address-book';
import { AuthService } from '../../../core/services/auth-service';
import { FavoritesStore } from '../../../core/services/favorites-store';
import { OrderService } from '../../../core/services/order-service';

/** Motivos (opcionais) — só para a loja entender; vão para a auditoria sem dado pessoal. */
const REASONS = [
  'Não uso mais a loja',
  'Preocupação com meus dados',
  'Recebo e-mails demais',
  'Vou criar outra conta',
  'Outro motivo',
];

/**
 * `/minha-conta/excluir-conta` — o cliente exclui a própria conta (LGPD).
 * Confirma com a senha (ou o e-mail, em conta só Google). Fase 2: `DELETE /me`.
 */
@Component({
  selector: 'app-delete-account',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './delete-account.html',
  styleUrl: './delete-account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccount {
  private readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly favorites = inject(FavoritesStore);
  private readonly addresses = inject(AddressBook);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly reasons = REASONS;
  protected readonly email = this.auth.user()?.email ?? '';
  protected readonly googleOnly = this.auth.isGoogleOnly();
  private readonly openOrders = this.orders.openPlacedCount(this.email);

  protected readonly confirmation = signal('');
  protected readonly reason = signal('');
  protected readonly understood = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Trava que não depende do que a pessoa digita (equipe, pedido em andamento). */
  protected readonly blocked = computed(() => this.auth.ownDeletionBlock(this.openOrders));

  protected submit(): void {
    if (!this.understood()) {
      this.error.set('Marque que você entende que não dá para desfazer.');
      return;
    }
    const problem = this.auth.ownDeletionProblem(this.confirmation(), this.openOrders);
    if (problem) {
      this.error.set(problem);
      return;
    }
    const email = this.email;
    this.favorites.forgetAccount(email);
    this.addresses.forgetAccount(email);
    const result = this.auth.deleteOwnAccount(this.confirmation(), this.reason(), this.openOrders);
    if (!result.ok) {
      this.error.set(result.message);
      return;
    }
    this.router.navigate(['/'], { replaceUrl: true });
    this.snackBar.open('Sua conta foi excluída.', 'Fechar', { duration: 6000 });
  }
}
