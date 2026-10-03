import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { PaymentMethod } from '../../core/models/order';
import { AuthService } from '../../core/services/auth-service';
import { OrderSummary } from '../../core/services/order-summary';
import { formatCep, ShippingService } from '../../core/services/shipping-service';
import {
  cardNumberValidator,
  cepValidator,
  cvvValidator,
  documentValidator,
  expiryValidator,
} from '../../core/utils/br-validators';

export type CheckoutStep = 1 | 2 | 3;

/** Campos de endereço (entrega e cobrança usam o mesmo formato). */
export type AddressForm = FormGroup<{
  cep: FormControl<string>;
  street: FormControl<string>;
  number: FormControl<string>;
  noNumber: FormControl<boolean>;
  complement: FormControl<string>;
  district: FormControl<string>;
  city: FormControl<string>;
  state: FormControl<string>;
}>;

function addressGroup(fb: NonNullableFormBuilder, cep = ''): AddressForm {
  return fb.group({
    cep: [cep, [Validators.required, cepValidator]],
    street: ['', Validators.required],
    number: ['', Validators.required],
    noNumber: [false],
    complement: [''],
    district: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
  });
}

/**
 * Estado do checkout (passo atual + formulários), compartilhado pelos passos.
 * Fornecido pela página (`providers`), então nasce e morre com ela.
 */
@Injectable()
export class CheckoutState {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly summary = inject(OrderSummary);

  readonly step = signal<CheckoutStep>(1);

  private readonly user = inject(AuthService).user();

  readonly delivery = this.fb.group({
    recipient: [this.user?.name ?? '', [Validators.required, Validators.minLength(3)]],
    address: addressGroup(this.fb, formatCep(inject(ShippingService).cep())),
  });

  /**
   * Dados para nota fiscal. O CPF vem do cadastro (pode trocar por CNPJ).
   * "Usar as mesmas informações da entrega" desliga o endereço de cobrança —
   * campos desabilitados não entram na validação.
   */
  readonly billing = this.fb.group({
    document: [this.user?.cpf ?? '', [Validators.required, documentValidator]],
    sameAsDelivery: [true],
    name: [{ value: '', disabled: true }, [Validators.required, Validators.minLength(3)]],
    address: addressGroup(this.fb),
  });

  /**
   * Dados do cartão só existem neste formulário, em memória: não são salvos,
   * nem logados, nem enviados para o nosso back. Na Fase 2 o gateway transforma
   * o cartão em token direto no navegador (tokenização) e só o token segue.
   */
  readonly payment = this.fb.group({
    method: ['pix' as PaymentMethod, Validators.required],
    cardNumber: [''],
    cardName: [''],
    cardExpiry: [''],
    cardCvv: [''],
    installments: [1],
  });

  constructor() {
    this.billing.controls.address.disable();
    this.billing.controls.sameAsDelivery.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((same) => {
        const { name, address } = this.billing.controls;
        for (const control of [name, address]) {
          if (same) control.disable();
          else control.enable();
        }
      });

    this.summary.paymentMethod.set(this.payment.controls.method.value);
    this.payment.controls.method.valueChanges.pipe(takeUntilDestroyed()).subscribe((method) => {
      this.summary.paymentMethod.set(method);
      this.toggleCardValidators(method === 'cartao');
    });
  }

  goTo(step: CheckoutStep): void {
    this.step.set(step);
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private toggleCardValidators(required: boolean): void {
    const { cardNumber, cardName, cardExpiry, cardCvv } = this.payment.controls;
    const rules = [
      [cardNumber, cardNumberValidator],
      [cardName, Validators.minLength(3)],
      [cardExpiry, expiryValidator],
      [cardCvv, cvvValidator],
    ] as const;
    for (const [control, validator] of rules) {
      control.setValidators(required ? [Validators.required, validator] : []);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }
}
