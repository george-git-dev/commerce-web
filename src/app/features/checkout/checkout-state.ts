import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { PaymentMethod } from '../../core/models/order';
import { AddressBook } from '../../core/services/address-book';
import { AuthService } from '../../core/services/auth-service';
import { OrderSummary } from '../../core/services/order-summary';
import { formatCep, onlyCepDigits, ShippingService } from '../../core/services/shipping-service';
import {
  cardNumberValidator,
  cvvValidator,
  documentValidator,
  expiryValidator,
} from '../../core/utils/br-validators';
import { addressGroup, fillAddressForm } from '../../shared/address-fields/address-form';

export type CheckoutStep = 1 | 2 | 3;

/**
 * Estado do checkout (passo atual + formulários), compartilhado pelos passos.
 * Fornecido pela página (`providers`), então nasce e morre com ela.
 */
@Injectable()
export class CheckoutState {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly summary = inject(OrderSummary);
  private readonly shipping = inject(ShippingService);
  private readonly addressBook = inject(AddressBook);

  readonly step = signal<CheckoutStep>(1);

  private readonly user = inject(AuthService).user();

  readonly delivery = this.fb.group({
    recipient: [this.user?.name ?? '', [Validators.required, Validators.minLength(3)]],
    address: addressGroup(this.fb, formatCep(this.shipping.cep())),
    /** Endereço novo digitado aqui vai para Minha conta → Endereços. */
    saveToAccount: [true],
  });

  /** Endereço salvo escolhido na entrega; `null` = "Novo endereço" (formulário). */
  readonly addressChoice = signal<string | null>(null);

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
    // Começa pelo endereço salvo com o CEP da sacola; senão, pelo principal.
    const cep = this.shipping.cep();
    const saved = this.addressBook.addresses();
    const start =
      saved.find((address) => onlyCepDigits(address.cep) === cep) ??
      this.addressBook.defaultAddress();
    if (start) this.chooseAddress(start.id);

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

  /** Troca o endereço de entrega: preenche o formulário e recalcula o frete. */
  chooseAddress(id: string | null): void {
    const saved = id ? this.addressBook.find(id) : undefined;
    this.addressChoice.set(saved?.id ?? null);
    const { recipient, address } = this.delivery.controls;
    if (saved) {
      recipient.setValue(saved.recipient);
      fillAddressForm(address, saved);
      this.shipping.cep.set(onlyCepDigits(saved.cep));
    } else {
      recipient.setValue(this.user?.name ?? '');
      fillAddressForm(address);
      // Sem CEP, sem frete: evita mostrar o valor do endereço anterior.
      this.shipping.cep.set('');
    }
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
