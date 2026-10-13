import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  $,
  $$,
  productBySlug,
  render,
  screenProviders,
  textOf,
  type,
} from '../../testing/test-helpers';
import { AddressFields } from './address-fields/address-fields';
import {
  addressFromForm,
  addressGroup,
  fillAddressForm,
  NO_NUMBER,
} from './address-fields/address-form';
import { CouponTicket } from './coupon-ticket/coupon-ticket';
import { InputMask, MaskKind } from './input-mask/input-mask';
import { NonNegative } from './input-mask/non-negative';
import { OrderStatusChip } from './order-status/order-status';
import { PixPayment } from './pix-payment/pix-payment';
import { ProductCard } from './product-card/product-card';
import { ShippingOptions } from './shipping-options/shipping-options';
import { StarRating } from './star-rating/star-rating';
import { BrandIcon } from './brand-icon/brand-icon';

describe('componentes compartilhados', () => {
  it('CouponTicket: código, tamanho e rótulo', async () => {
    const f = await render(CouponTicket, { inputs: { code: 'JULIA5', size: 'lg', label: 'Seu' } });
    expect(textOf(f)).toContain('JULIA5');
    expect(textOf(f)).toContain('Seu');
    expect($(f, '.tk').classList).toContain('tk--lg');
  });

  it('OrderStatusChip: rótulo, texto próprio e entrega em mãos', async () => {
    const f = await render(OrderStatusChip, { inputs: { status: 'pago' } });
    expect(textOf(f)).toBe('Pagamento confirmado');
    expect((f.nativeElement as HTMLElement).className).toContain('status--pago');
    f.componentRef.setInput('status', 'pronto-envio');
    f.componentRef.setInput('inHands', true);
    f.detectChanges();
    expect(textOf(f)).toBe('Pronto para entrega');
    f.componentRef.setInput('text', 'Outro');
    f.detectChanges();
    expect(textOf(f)).toBe('Outro');
  });

  it('PixPayment: copia o código e confirma; sem permissão de copiar, não confirma', async () => {
    const writes: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (t: string) => (writes.push(t), Promise.resolve()) },
    });
    const f = await render(PixPayment);
    $(f, 'button').click();
    await Promise.resolve();
    f.detectChanges();
    expect(writes[0]).toContain('BR.GOV.BCB.PIX');
    expect(textOf(f)).toContain('Código copiado');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('negado')) },
    });
    $(f, 'button').click();
    await new Promise((r) => setTimeout(r));
    f.detectChanges();
    expect(textOf(f)).toContain('Copiar código Pix');
  });

  it('ShippingOptions: lista, prazo, grátis e seleção', async () => {
    const options = [
      { id: 'economico', label: 'Econômico', minDays: 3, maxDays: 5, price: 14.9 },
      {
        id: 'em-maos',
        label: 'Entrega em mãos',
        minDays: 0,
        maxDays: 0,
        price: 0,
        note: 'Combinar',
      },
    ];
    const f = await render(ShippingOptions, { inputs: { options } });
    expect(textOf(f)).toContain('3 a 5 dias úteis');
    expect(textOf(f)).toMatch(/R\$\s14,90/);
    expect(textOf(f)).toContain('Combinar');
    const radios = $$(f, 'input[type=radio]') as HTMLInputElement[];
    radios[1].dispatchEvent(new Event('change'));
    expect(f.componentInstance.selected()).toBe('em-maos');
    f.componentRef.setInput('allFree', true);
    f.detectChanges();
    expect(textOf(f)).not.toMatch(/R\$\s14,90/);
  });

  it('StarRating: inteiras, meia e vazias', async () => {
    const f = await render(StarRating, { inputs: { rating: 3.5, reviews: 12 } });
    const icons = $$(f, 'mat-icon').map((i) => i.textContent?.trim());
    expect(icons.slice(0, 5)).toEqual(['star', 'star', 'star', 'star_half', 'star_border']);
  });

  it('BrandIcon: cor da marca só com "colored"', async () => {
    const f = await render(BrandIcon, { inputs: { name: 'instagram' } });
    expect($(f, 'path').getAttribute('fill')).toBe('currentColor');
    f.componentRef.setInput('colored', true);
    f.detectChanges();
    expect($(f, 'path').getAttribute('fill')).not.toBe('currentColor');
  });

  it('ProductCard: preço, favorito e adicionar (emite a variante padrão)', async () => {
    const asad = productBySlug('lattafa-asad');
    const f = await render(ProductCard, { inputs: { product: asad } });
    expect(textOf(f)).toContain(asad.name);
    const added: unknown[] = [];
    const favs: unknown[] = [];
    f.componentInstance.addToCart.subscribe((e) => added.push(e));
    f.componentInstance.toggleFavorite.subscribe((e) => favs.push(e));
    $(f, '.card__buy').click();
    $(f, '.card__wish').click();
    expect(added).toHaveLength(1);
    expect(favs).toEqual([asad]);
    expect($(f, '.card__wish').getAttribute('aria-label')).toBe('Adicionar aos favoritos');
    f.componentRef.setInput('favorite', true);
    f.detectChanges();
    expect($(f, '.card__wish').getAttribute('aria-pressed')).toBe('true');
  });

  it('ProductCard: sem estoque fica indisponível e não emite', async () => {
    const asad = productBySlug('lattafa-asad');
    const soldOut = { ...asad, variants: asad.variants.map((v) => ({ ...v, stock: 0 })) };
    const f = await render(ProductCard, { inputs: { product: soldOut } });
    expect(textOf(f)).toContain('Indisponível');
    expect(($(f, '.card__buy') as HTMLButtonElement).disabled).toBe(true);
  });
});

@Component({
  imports: [ReactiveFormsModule, InputMask, NonNegative],
  template: `
    <input id="mask" [appMask]="kind()" [formControl]="control" />
    <input id="int" appNonNegative="integer" />
    <input id="dec" appNonNegative />
  `,
})
class MaskHost {
  readonly kind = signal<MaskKind>('cpf');
  readonly control = new FormControl('');
}

describe('máscaras de campo', () => {
  const cases: [MaskKind, string, string][] = [
    ['cpf', '52998224725', '529.982.247-25'],
    ['cep', '05794340', '05794-340'],
    ['phone', '11987654321', '(11) 98765-4321'],
    ['card', '4111111111111111', '4111 1111 1111 1111'],
    ['expiry', '1229', '12/29'],
    ['cvv', '12a345', '1234'],
  ];

  it('formata enquanto digita e mantém o formulário igual ao exibido', async () => {
    const f = await render(MaskHost);
    for (const [kind, typed, shown] of cases) {
      f.componentInstance.kind.set(kind);
      f.detectChanges();
      const input = $(f, '#mask') as HTMLInputElement;
      type(input, typed);
      expect(input.value).toBe(shown);
      expect(f.componentInstance.control.value).toBe(shown);
    }
  });

  it('sem negativo: bloqueia "-", "e" e (no inteiro) vírgula, ao digitar e colar', async () => {
    const f = await render(MaskHost);
    const key = (id: string, k: string) => {
      const e = new KeyboardEvent('keydown', { key: k, cancelable: true });
      $(f, id).dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(key('#int', '-')).toBe(true);
    expect(key('#int', ',')).toBe(true);
    expect(key('#int', '5')).toBe(false);
    expect(key('#dec', ',')).toBe(false);
    expect(key('#dec', 'e')).toBe(true);
    const paste = (text: string) => {
      const e = new Event('paste', { cancelable: true }) as ClipboardEvent;
      Object.defineProperty(e, 'clipboardData', { value: { getData: () => text } });
      $(f, '#int').dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(paste('-3')).toBe(true);
    expect(paste('42')).toBe(false);
  });
});

@Component({
  imports: [AddressFields],
  template: `<app-address-fields [group]="group" idPrefix="t" (cepComplete)="cep = $event" />`,
})
class AddressHost {
  readonly group = addressGroup(new FormBuilder().nonNullable);
  cep = '';
}

describe('endereço', () => {
  it('CEP completo preenche o endereço e avisa; "Sem número" grava S/N e trava', async () => {
    TestBed.configureTestingModule({ providers: screenProviders() });
    const f = TestBed.createComponent(AddressHost);
    f.detectChanges();
    const cep = $(f, 'input[formcontrolname=cep]');
    type(cep, '20040002');
    f.detectChanges();
    const group = f.componentInstance.group;
    expect(group.controls.city.value).toBe('Rio de Janeiro');
    expect(f.componentInstance.cep).toBe('20040002');
    const noNumber = $(f, 'input[formcontrolname=noNumber]') as HTMLInputElement;
    noNumber.checked = true;
    noNumber.dispatchEvent(new Event('change'));
    expect(group.controls.number.value).toBe(NO_NUMBER);
    expect(group.controls.number.disabled).toBe(true);
    noNumber.checked = false;
    noNumber.dispatchEvent(new Event('change'));
    expect(group.controls.number.enabled).toBe(true);
  });

  it('erro só aparece depois que o campo foi mexido', async () => {
    TestBed.configureTestingModule({ providers: screenProviders() });
    const f = TestBed.createComponent(AddressHost);
    f.detectChanges();
    expect(textOf(f)).not.toMatch(/obrigat|inválid/i);
    f.componentInstance.group.controls.street.markAsTouched();
    f.detectChanges();
    expect($$(f, '[aria-invalid=true]').length).toBeGreaterThan(0);
  });

  it('formulário ↔ endereço: UF em maiúscula, espaços cortados, S/N trava o número', () => {
    const group = addressGroup(new FormBuilder().nonNullable, '01310-100');
    group.patchValue({
      street: ' Av. Paulista ',
      number: '1000',
      district: 'Bela Vista',
      city: 'SP',
      state: 'sp',
    });
    expect(addressFromForm(group.getRawValue())).toMatchObject({
      street: 'Av. Paulista',
      state: 'SP',
    });
    fillAddressForm(group, {
      cep: '01310-100',
      street: 'X',
      number: NO_NUMBER,
      complement: '',
      district: 'Y',
      city: 'Z',
      state: 'SP',
    });
    expect(group.controls.noNumber.value).toBe(true);
    expect(group.controls.number.disabled).toBe(true);
    fillAddressForm(group);
    expect(group.controls.number.enabled).toBe(true);
  });
});
