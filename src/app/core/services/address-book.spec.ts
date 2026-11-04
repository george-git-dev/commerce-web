import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { apiInterceptor } from '../http/api-interceptor';
import { AddressBook, MAX_ADDRESSES } from './address-book';
import { AuthService } from './auth-service';

const address = (number: string) => ({
  cep: '01310-100',
  street: 'Avenida Paulista',
  number,
  complement: '',
  district: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
});

/** No modo simulado tudo responde na hora: pega o valor sem `subscribe` em cada linha. */
function now<T>(work: Observable<T>): T {
  let value!: T;
  work.subscribe((result) => (value = result));
  return value;
}

describe('AddressBook (endereços da conta, em memória)', () => {
  let book: AddressBook;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    auth = TestBed.inject(AuthService);
    book = TestBed.inject(AddressBook);
  });

  it('sem login não há endereços; logado começa com o de exemplo como principal', () => {
    expect(book.addresses().length).toBe(0);
    auth.login('maria@email.com', '12345678');
    expect(book.addresses().length).toBe(1);
    expect(book.defaultAddress()?.street).toBe('Rua das Acácias');
  });

  it('um único principal; remover o principal promove o próximo', () => {
    auth.login('maria@email.com', '12345678');
    const novo = now(book.add(address('100'), true))!;
    expect(book.defaultAddress()?.id).toBe(novo.id);
    expect(book.addresses().filter((item) => item.isDefault).length).toBe(1);
    expect(book.addresses()[0].id).toBe(novo.id);

    now(book.remove(novo.id));
    expect(book.defaultAddress()?.id).toBe('endereco-exemplo');

    now(book.restore(novo));
    expect(book.defaultAddress()?.id).toBe(novo.id);
  });

  it('não duplica o mesmo endereço e respeita o limite', () => {
    auth.login('maria@email.com', '12345678');
    const first = now(book.add(address('1')));
    expect(now(book.add({ ...address('1'), complement: ' ' }))?.id).toBe(first?.id);
    for (let n = 2; book.addresses().length < MAX_ADDRESSES; n++) now(book.add(address(String(n))));
    expect(book.isFull()).toBe(true);
    expect(now(book.add(address('99')))).toBeNull();
  });

  it('cada conta tem os seus', () => {
    auth.login('maria@email.com', '12345678');
    now(book.add(address('7')));
    auth.logout();
    auth.login('outra@email.com', '12345678');
    expect(book.addresses().length).toBe(1);
  });

  it('edita, torna principal, desfaz remoção e esquece a conta excluída', () => {
    auth.login('maria@email.com', '12345678');
    const first = book.addresses()[0];
    const added = now(book.add(address('200')))!;
    now(book.update(added.id, { ...address('200'), complement: 'Ap 12' }, true));
    expect(book.find(added.id)?.complement).toBe('Ap 12');
    expect(book.find(added.id)?.isDefault).toBe(true);
    now(book.setDefault(first.id));
    expect(book.find(first.id)?.isDefault).toBe(true);
    const removed = book.find(first.id)!;
    now(book.remove(first.id));
    expect(book.find(first.id)).toBeUndefined();
    now(book.restore(removed));
    expect(book.find(first.id)?.isDefault).toBe(true);
    now(book.restore(removed)); // já existe: não duplica
    expect(book.addresses().filter((a) => a.id === first.id)).toHaveLength(1);
    book.forgetAccount('maria@email.com');
    expect(book.find(added.id)).toBeUndefined();
  });
});

describe('AddressBook (modo bff: o back é a fonte)', () => {
  const ana = {
    cep: '01310-100',
    street: 'Avenida Paulista',
    number: '1000',
    complement: '',
    district: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  };
  let book: AddressBook;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_MODE, useValue: 'bff' },
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    TestBed.inject(AuthService).login('maria@email.com', '12345678');
    book = TestBed.inject(AddressBook);
    backend = TestBed.inject(HttpTestingController);
  });

  it('carrega do BFF na ordem do back (sem endereço de exemplo) e com id em texto', () => {
    expect(book.addresses()).toHaveLength(0);
    book.load().subscribe();
    backend.expectOne('/bff/me/addresses').flush([
      { ...ana, id: 7, isDefault: true },
      { ...ana, number: '2', id: 3, isDefault: false },
    ]);
    expect(book.addresses().map((a) => a.id)).toEqual(['7', '3']);
    expect(book.defaultAddress()?.id).toBe('7');
  });

  it('cadastrar manda para o BFF e busca a lista de novo (o back escolhe o principal)', () => {
    let created: unknown;
    book.add(ana).subscribe((saved) => (created = saved));
    const post = backend.expectOne({ method: 'POST', url: '/bff/me/addresses' });
    expect(post.request.body).toEqual({ ...ana, isDefault: false });
    post.flush({ ...ana, id: 9, isDefault: true });
    backend
      .expectOne({ method: 'GET', url: '/bff/me/addresses' })
      .flush([{ ...ana, id: 9, isDefault: true }]);
    expect(created).toEqual({ ...ana, id: '9', isDefault: true });
  });

  it('tornar principal é um PUT com isDefault; remover é DELETE; os dois recarregam a lista', () => {
    book.load().subscribe();
    backend.expectOne('/bff/me/addresses').flush([
      { ...ana, id: 7, isDefault: true },
      { ...ana, number: '2', id: 3, isDefault: false },
    ]);

    book.setDefault('3').subscribe();
    const put = backend.expectOne({ method: 'PUT', url: '/bff/me/addresses/3' });
    expect(put.request.body.isDefault).toBe(true);
    put.flush({});
    backend
      .expectOne({ method: 'GET', url: '/bff/me/addresses' })
      .flush([{ ...ana, number: '2', id: 3, isDefault: true }]);

    book.remove('7').subscribe();
    backend.expectOne({ method: 'DELETE', url: '/bff/me/addresses/7' }).flush(null);
    backend
      .expectOne({ method: 'GET', url: '/bff/me/addresses' })
      .flush([{ ...ana, number: '2', id: 3, isDefault: true }]);
    expect(book.addresses()).toHaveLength(1);
    backend.verify();
  });
});
