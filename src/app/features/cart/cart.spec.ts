import { TestBed } from '@angular/core/testing';
import { $, $$, productBySlug, render, settle, textOf, type } from '../../../testing/test-helpers';
import { CartStore } from '../../core/services/cart-store';
import { CouponService } from '../../core/services/coupon-service';
import { ShippingService } from '../../core/services/shipping-service';
import { Cart } from './cart';

describe('Carrinho', () => {
  beforeEach(() => localStorage.clear());

  const withItem = async (quantity = 1) => {
    const f = await render(Cart);
    const asad = productBySlug('lattafa-asad');
    TestBed.inject(CartStore).add(asad, asad.variants[0], quantity);
    await settle(f);
    return f;
  };

  it('vazio mostra o estado vazio com link para os perfumes', async () => {
    const f = await render(Cart);
    expect($$(f, 'app-empty-state')).toHaveLength(1);
  });

  it('muda quantidade, respeita o estoque e remove o item', async () => {
    const f = await withItem();
    const cart = TestBed.inject(CartStore);
    expect(($(f, '[aria-label="Diminuir quantidade"]') as HTMLButtonElement).disabled).toBe(true);
    $(f, '[aria-label="Aumentar quantidade"]').click();
    await settle(f);
    expect(cart.items()[0].quantity).toBe(2);
    $(f, '[aria-label="Diminuir quantidade"]').click();
    await settle(f);
    expect(cart.items()[0].quantity).toBe(1);
    cart.setQuantity(cart.items()[0].variant.id, 999);
    await settle(f);
    expect(
      ($(f, '[aria-label="Quantidade máxima em estoque"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    $(f, '.line__remove').click();
    await settle(f);
    expect(cart.count()).toBe(0);
    expect($$(f, 'app-empty-state')).toHaveLength(1);
  });

  it('cupom: inválido mostra erro; válido aplica desconto e pode ser removido', async () => {
    const f = await withItem();
    type($(f, '.cart__coupon input'), 'NAOEXISTE');
    $(f, '.cart__coupon').dispatchEvent(new Event('submit'));
    await settle(f);
    expect($(f, '.cart__coupon-error').textContent).toBeTruthy();
    type($(f, '.cart__coupon input'), 'nani10');
    await settle(f);
    expect($$(f, '.cart__coupon-error')).toHaveLength(0);
    $(f, '.cart__coupon').dispatchEvent(new Event('submit'));
    await settle(f);
    expect(TestBed.inject(CouponService).applied()?.code).toBe('NANI10');
    expect($$(f, '.cart__row--discount')).toHaveLength(1);
    $(f, '.cart__coupon-applied button').click();
    await settle(f);
    expect(TestBed.inject(CouponService).applied()).toBeNull();
  });

  it('frete: CEP inválido avisa; válido mostra as opções e entra no total', async () => {
    const f = await withItem();
    const cep = $(f, '#shipping-cep') as HTMLInputElement;
    type(cep, '0579');
    $(f, 'form.ship').dispatchEvent(new Event('submit'));
    await settle(f);
    expect(textOf(f)).toContain('Digite um CEP válido');
    type(cep, '05794340');
    expect(cep.value).toBe('05794-340');
    $(f, 'form.ship').dispatchEvent(new Event('submit'));
    await settle(f);
    expect(TestBed.inject(ShippingService).cep()).toBe('05794340');
    const radios = $$(f, 'input[type=radio]') as HTMLInputElement[];
    expect(radios.length).toBeGreaterThan(0);
    radios[0].dispatchEvent(new Event('change'));
    await settle(f);
    expect(textOf(f)).toMatch(/Total/);
  });

  it('aviso de frete grátis: quanto falta', async () => {
    const f = await withItem();
    expect(textOf(f)).toMatch(/frete grátis/i);
  });
});
