import { TestBed } from '@angular/core/testing';
import { AddressBook, MAX_ADDRESSES } from './address-book';
import { AuthService } from './auth-service';

const address = (number: string) => ({
  recipient: 'Maria Souza',
  cep: '01310-100',
  street: 'Avenida Paulista',
  number,
  complement: '',
  district: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
});

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
    const novo = book.add(address('100'), true)!;
    expect(book.defaultAddress()?.id).toBe(novo.id);
    expect(book.addresses().filter((item) => item.isDefault).length).toBe(1);
    expect(book.addresses()[0].id).toBe(novo.id);

    book.remove(novo.id);
    expect(book.defaultAddress()?.id).toBe('endereco-exemplo');

    book.restore(novo);
    expect(book.defaultAddress()?.id).toBe(novo.id);
  });

  it('não duplica o mesmo endereço e respeita o limite', () => {
    auth.login('maria@email.com', '12345678');
    const first = book.add(address('1'));
    expect(book.add({ ...address('1'), recipient: 'Outra pessoa' })?.id).toBe(first?.id);
    for (let n = 2; book.addresses().length < MAX_ADDRESSES; n++) book.add(address(String(n)));
    expect(book.isFull()).toBe(true);
    expect(book.add(address('99'))).toBeNull();
  });

  it('cada conta tem os seus', () => {
    auth.login('maria@email.com', '12345678');
    book.add(address('7'));
    auth.logout();
    auth.login('outra@email.com', '12345678');
    expect(book.addresses().length).toBe(1);
  });
});
