import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { productBySlug } from '../../../testing/test-helpers';
import { Busy } from '../../shared/busy/busy';
import { ApiError } from '../http/api-errors';
import { CartActions } from './cart-actions';
import { CartStore } from './cart-store';
import { Notifier } from './notifier';
import { ShopApi } from './shop-api';

describe('CartActions (adicionar ao carrinho pelo back)', () => {
  let response: () => Observable<unknown>;
  let messages: string[];

  beforeEach(() => {
    localStorage.clear();
    messages = [];
    response = () => of({ ok: true });
    TestBed.configureTestingModule({
      providers: [
        { provide: ShopApi, useValue: { addCartItem: () => response() } },
        {
          provide: Notifier,
          useValue: {
            success: (m: string) => messages.push(m),
            error: (m: string) => messages.push('ERRO ' + m),
          },
        },
      ],
    });
  });

  it('só põe na sacola quando o back confirma, e avisa', () => {
    const asad = productBySlug('lattafa-asad');
    TestBed.inject(CartActions).add(asad, asad.variants[0]);
    expect(TestBed.inject(CartStore).count()).toBe(1);
    expect(messages[0]).toContain('foi adicionado ao carrinho');
  });

  it('com "depois", não avisa (ex.: Comprar agora vai direto ao carrinho)', () => {
    const asad = productBySlug('lattafa-asad');
    let went = false;
    TestBed.inject(CartActions).add(asad, asad.variants[0], new Busy(), () => (went = true));
    expect(went).toBe(true);
    expect(messages).toHaveLength(0);
  });

  it('back recusou (esgotou): não adiciona e mostra a mensagem do back', () => {
    response = () =>
      throwError(
        () => new ApiError('validation', 422, 'AB', { detail: 'Este tamanho acabou de esgotar.' }),
      );
    const asad = productBySlug('lattafa-asad');
    TestBed.inject(CartActions).add(asad, asad.variants[0]);
    expect(TestBed.inject(CartStore).count()).toBe(0);
    expect(messages).toEqual(['ERRO Este tamanho acabou de esgotar.']);
  });

  it('erro de servidor: não adiciona (o aviso é do interceptor)', () => {
    response = () => throwError(() => new ApiError('server', 500, 'AB'));
    const asad = productBySlug('lattafa-asad');
    TestBed.inject(CartActions).add(asad, asad.variants[0]);
    expect(TestBed.inject(CartStore).count()).toBe(0);
    expect(messages).toHaveLength(0);
  });
});
