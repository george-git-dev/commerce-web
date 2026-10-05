import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AddressBook } from '../../../core/services/address-book';
import { AuthService } from '../../../core/services/auth-service';
import { CepLookup } from '../../../core/services/cep-lookup';
import { OrderSummary } from '../../../core/services/order-summary';
import {
  isValidCep,
  onlyCepDigits,
  ShippingService,
} from '../../../core/services/shipping-service';
import { isValidCpf } from '../../../core/utils/br-format';
import { InputMask } from '../../../shared/input-mask/input-mask';
import { ShippingOptions } from '../../../shared/shipping-options/shipping-options';
import { AddressFields } from '../../../shared/address-fields/address-fields';
import { addressFromForm } from '../../../shared/address-fields/address-form';
import { CheckoutState } from '../checkout-state';

/** Passo 1: endereço de entrega, frete e dados para a nota fiscal. */
@Component({
  selector: 'app-delivery-step',
  imports: [
    MatButtonModule,
    ReactiveFormsModule,
    RouterLink,
    InputMask,
    ShippingOptions,
    AddressFields,
  ],
  templateUrl: './delivery-step.html',
  styleUrl: './delivery-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryStep {
  private readonly state = inject(CheckoutState);
  private readonly shipping = inject(ShippingService);
  private readonly cepLookup = inject(CepLookup);
  private readonly auth = inject(AuthService);
  protected readonly summary = inject(OrderSummary);
  protected readonly addressBook = inject(AddressBook);

  protected readonly form = this.state.delivery;
  protected readonly billing = this.state.billing;
  protected readonly sameAsDelivery = toSignal(this.billing.controls.sameAsDelivery.valueChanges, {
    initialValue: this.billing.controls.sameAsDelivery.value,
  });
  protected readonly shippingId = this.summary.shippingId;
  protected readonly shippingError = signal(false);
  protected readonly addressChoice = this.state.addressChoice;

  constructor() {
    // CEP já veio do carrinho: preenche o endereço sem o cliente digitar de novo.
    const address = this.form.controls.address;
    if (isValidCep(address.controls.cep.value) && !address.controls.street.value) {
      const found = this.cepLookup.lookup(address.controls.cep.value);
      if (found) address.patchValue(found);
    }
  }

  protected invalid(control: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected chooseAddress(id: string | null): void {
    this.state.chooseAddress(id);
  }

  /** CEP de entrega completo: recalcula o frete. */
  protected onDeliveryCep(cep: string): void {
    this.shipping.cep.set(onlyCepDigits(cep));
  }

  protected next(): void {
    this.shippingError.set(!this.summary.selectedShipping());
    if (this.form.invalid || this.billing.invalid || this.shippingError()) {
      this.form.markAllAsTouched();
      this.billing.markAllAsTouched();
      return;
    }
    // Conta sem CPF (ex.: entrou com Google) e informou um CPF aqui: salva no cadastro.
    const document = this.billing.controls.document.value;
    if (!this.auth.user()?.cpf && isValidCpf(document)) this.auth.completeCpf(document);
    this.saveNewAddress();
    this.state.goTo(2);
  }

  /** Endereço novo com "Salvar na minha conta": vai para a conta e passa a ser o escolhido. */
  private saveNewAddress(): void {
    const { recipient, address, saveToAccount } = this.form.getRawValue();
    if (this.addressChoice() !== null || !saveToAccount) return;
    const saved = this.addressBook.add({
      recipient: recipient.trim(),
      ...addressFromForm(address),
    });
    if (saved) this.addressChoice.set(saved.id);
  }
}
