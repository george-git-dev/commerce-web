import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cupom com cara de ticket: canhoto "CUPOM", picote tracejado e recortes nas
 * laterais. `sm` para listas (backoffice); `lg` para destaque (área do afiliado).
 * Só visual — o texto do código continua selecionável e lido por leitor de tela.
 */
@Component({
  selector: 'app-coupon-ticket',
  template: `
    <span class="tk" [class.tk--lg]="size() === 'lg'">
      <span class="tk__stub" aria-hidden="true">{{ label() }}</span>
      <span class="tk__code"> <span class="tk__sr">Cupom </span>{{ code() }} </span>
    </span>
  `,
  styleUrl: './coupon-ticket.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponTicket {
  readonly code = input.required<string>();
  readonly size = input<'sm' | 'lg'>('sm');
  readonly label = input('Cupom');
}
