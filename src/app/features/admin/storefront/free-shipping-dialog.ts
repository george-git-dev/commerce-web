import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FreeShippingEditor } from './free-shipping-editor';

/** Aviso automático de frete grátis aberto pela aba Avisos (mesma regra das Configurações). */
@Component({
  selector: 'app-free-shipping-dialog',
  imports: [FreeShippingEditor, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Aviso de frete grátis</h2>
    <mat-dialog-content>
      <p class="fd__note">
        É a promoção de frete grátis da loja: vale no carrinho, no checkout e na faixa do topo.
        Também fica em Vitrine → Configurações.
      </p>
      <app-free-shipping-editor
        cancelLabel="Voltar"
        (saved)="ref.close()"
        (cancelled)="ref.close()"
      />
    </mat-dialog-content>
  `,
  styles: `
    .fd__note {
      margin: 0 0 12px;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeShippingDialog {
  protected readonly ref = inject(MatDialogRef<FreeShippingDialog>);
}
