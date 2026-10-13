import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  $,
  $$,
  buttonByText,
  currentUrl,
  loginAs,
  productBySlug,
  renderAt,
  settle,
  textOf,
  type,
} from '../../../testing/test-helpers';
import { apiInterceptor } from '../../core/http/api-interceptor';
import { FailureSimulator } from '../../core/http/failure-simulator';
import { mockApiInterceptor } from '../../core/http/mock-api-interceptor';
import { AddressBook } from '../../core/services/address-book';
import { CartStore } from '../../core/services/cart-store';
import { OrderService } from '../../core/services/order-service';
import { Checkout } from './checkout';
import { CheckoutState } from './checkout-state';

const http = provideHttpClient(withInterceptors([apiInterceptor, mockApiInterceptor]));

async function openCheckout(account = 'customer') {
  const page = await renderAt('/finalizar-compra', Checkout, {
    providers: [http],
    setup: () => {
      loginAs(account);
      const asad = productBySlug('lattafa-asad');
      TestBed.inject(CartStore).add(asad, asad.variants[0]);
    },
  });
  const state = page.fixture.debugElement.query(By.directive(Checkout)).injector.get(CheckoutState);
  return { ...page, state };
}

const submit = async (f: Parameters<typeof $>[0]) => {
  $(f, 'app-checkout form').dispatchEvent(new Event('submit'));
  await settle(f);
};

describe('Checkout', () => {
  beforeEach(() => localStorage.clear());

  it('fluxo completo com Pix: entrega → pagamento → revisão → pedido criado', async () => {
    const { fixture, state } = await openCheckout();
    expect(state.step()).toBe(1);
    // Endereço salvo e frete já vêm escolhidos; falta o CPF da nota.
    await submit(fixture);
    expect(state.step()).toBe(1);
    expect(textOf(fixture)).toContain('CPF ou CNPJ inválido');
    ($$(fixture, 'app-shipping-options input[type=radio]')[0] as HTMLInputElement).dispatchEvent(
      new Event('change'),
    );
    type($(fixture, '[formcontrolname=document]'), '529.982.247-25');
    await submit(fixture);
    expect(state.step()).toBe(2);
    await submit(fixture);
    expect(state.step()).toBe(3);
    expect(textOf(fixture)).toContain('Pix');
    const before = TestBed.inject(OrderService).orders().length;
    buttonByText(fixture, 'Confirmar pedido').click();
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Enviando pedido…'); // ocupado até o back responder
    await vi.waitFor(() => expect(currentUrl()).toMatch(/^\/pedido\/NP/), { timeout: 3000 });
    expect(TestBed.inject(OrderService).orders().length).toBe(before + 1);
    expect(TestBed.inject(CartStore).count()).toBe(0);
  });

  it('back fora do ar: aviso, botão volta e a sacola continua', async () => {
    const { fixture, state } = await openCheckout();
    ($$(fixture, 'app-shipping-options input[type=radio]')[0] as HTMLInputElement).dispatchEvent(
      new Event('change'),
    );
    type($(fixture, '[formcontrolname=document]'), '529.982.247-25');
    await submit(fixture);
    await submit(fixture);
    TestBed.inject(FailureSimulator).mode.set('erro');
    buttonByText(fixture, 'Confirmar pedido').click();
    await vi.waitFor(() => expect(textOf(fixture)).toContain('Confirmar pedido'), {
      timeout: 3000,
    });
    await settle(fixture);
    expect(state.step()).toBe(3);
    expect(TestBed.inject(CartStore).count()).toBe(1);
    expect(currentUrl()).toBe('/finalizar-compra');
  });

  it('cartão: exige dados válidos; parcelas; voltar e "Alterar" mudam de passo', async () => {
    const { fixture, state } = await openCheckout();
    ($$(fixture, 'app-shipping-options input[type=radio]')[0] as HTMLInputElement).dispatchEvent(
      new Event('change'),
    );
    type($(fixture, '[formcontrolname=document]'), '529.982.247-25');
    await submit(fixture);
    state.payment.controls.method.setValue('cartao');
    await settle(fixture);
    await submit(fixture);
    expect(state.step()).toBe(2);
    type($(fixture, '[formcontrolname=cardNumber]'), '4111111111111111');
    type($(fixture, '[formcontrolname=cardName]'), 'ANA COSTA');
    type($(fixture, '[formcontrolname=cardExpiry]'), '1299');
    type($(fixture, '[formcontrolname=cardCvv]'), '123');
    expect($$(fixture, 'select[formcontrolname=installments] option').length).toBeGreaterThan(1);
    await submit(fixture);
    expect(state.step()).toBe(3);
    expect(textOf(fixture)).toContain('1111');
    $$(fixture, '.rev__edit')[1].click();
    await settle(fixture);
    expect(state.step()).toBe(2);
    buttonByText(fixture, 'Voltar').click();
    await settle(fixture);
    expect(state.step()).toBe(1);
  });

  it('endereço novo vai para a conta; nota fiscal com outro nome exige o nome', async () => {
    const { fixture, state } = await openCheckout('nova.cliente@email.com');
    const radios = $$(fixture, '.delivery__option input[type=radio]') as HTMLInputElement[];
    radios[radios.length - 1].dispatchEvent(new Event('change')); // "Novo endereço"
    await settle(fixture);
    expect(state.addressChoice()).toBeNull();
    // Sem CEP, sem frete: pede para escolher a entrega.
    type($(fixture, '[formcontrolname=document]'), '529.982.247-25');
    await submit(fixture);
    expect(textOf(fixture)).toContain('Informe o CEP para ver as opções');
    type($(fixture, '[formcontrolname=recipient]'), 'Nova Cliente');
    type($(fixture, 'app-delivery-step [formcontrolname=cep]'), '20040002');
    await settle(fixture);
    type($(fixture, 'app-delivery-step [formcontrolname=number]'), '10');
    ($$(fixture, 'app-shipping-options input[type=radio]')[0] as HTMLInputElement).dispatchEvent(
      new Event('change'),
    );
    type($(fixture, '[formcontrolname=document]'), '529.982.247-25');
    state.billing.controls.sameAsDelivery.setValue(false);
    await settle(fixture);
    await submit(fixture);
    expect(state.step()).toBe(1); // nome da nota vazio
    state.billing.controls.sameAsDelivery.setValue(true);
    await settle(fixture);
    await submit(fixture);
    expect(state.step()).toBe(2);
    expect(
      TestBed.inject(AddressBook)
        .addresses()
        .some((a) => a.city === 'Rio de Janeiro'),
    ).toBe(true);
  });

  it('entrega em mãos (conta liberada): sem endereço nem frete; pode voltar para "receber em casa"', async () => {
    const { fixture, state } = await openCheckout('inHands');
    expect(state.inHands()).toBe(true);
    expect($$(fixture, '[formcontrolname=recipient]')).toHaveLength(0);
    type($(fixture, '[formcontrolname=document]'), '529.982.247-25');
    state.billing.controls.name.setValue('Vizinho da Loja');
    state.billing.controls.address.patchValue({
      cep: '05794-340',
      street: 'Rua A',
      number: '1',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
    });
    await settle(fixture);
    await submit(fixture);
    expect(state.step()).toBe(2);
    state.goTo(1);
    await settle(fixture);
    const radios = $$(fixture, '.delivery__option input[type=radio]') as HTMLInputElement[];
    radios[1].dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(state.inHands()).toBe(false);
    expect($$(fixture, '.delivery__option').length).toBeGreaterThan(2);
  });
});
