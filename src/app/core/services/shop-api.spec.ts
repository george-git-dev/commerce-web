import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ShopApi } from './shop-api';

describe('ShopApi (contrato com o back)', () => {
  it('manda só ids e quantidades — nunca preço', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(ShopApi);
    const backend = TestBed.inject(HttpTestingController);
    api.addCartItem('asad-100', 2).subscribe();
    api.placeOrder([{ variantId: 'asad-100', quantity: 1 }]).subscribe();
    const cart = backend.expectOne('/api/cart/items');
    expect(cart.request.method).toBe('POST');
    expect(cart.request.body).toEqual({ variantId: 'asad-100', quantity: 2 });
    const order = backend.expectOne('/api/orders');
    expect(JSON.stringify(order.request.body)).not.toContain('price');
    backend.verify();
  });
});
