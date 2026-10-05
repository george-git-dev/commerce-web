import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Código Pix "copia e cola" FICTÍCIO — na Fase 2 vem do gateway, por pedido. */
const FAKE_PIX_CODE =
  '00020126580014BR.GOV.BCB.PIX0136nani-perfumes-exemplo-nao-pague5204000053039865802BR5913NANI PERFUMES6009SAO PAULO6304ABCD';

/** Bloco "Pague com Pix": QR, código copia e cola e botão de copiar. */
@Component({
  selector: 'app-pix-payment',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './pix-payment.html',
  styleUrl: './pix-payment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixPayment {
  protected readonly code = FAKE_PIX_CODE;
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }
}
