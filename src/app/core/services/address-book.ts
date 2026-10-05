import { computed, inject, Injectable, signal } from '@angular/core';
import { SAMPLE_ADDRESS } from '../data/orders-mock';
import { Address, DeliveryAddress, SavedAddress } from '../models/order';
import { AuthService } from './auth-service';
import { onlyCepDigits } from './shipping-service';

export const MAX_ADDRESSES = 5;

/** Marca `id` como principal (e desmarca os outros); `null` mantém como está. */
function withDefault(list: readonly SavedAddress[], id: string | null): SavedAddress[] {
  return list.map((address) => (id ? { ...address, isDefault: address.id === id } : address));
}

/** Mesmo CEP + número + complemento = mesmo endereço (evita duplicar pelo checkout). */
function sameAddress(a: Address, b: Address): boolean {
  const key = (address: Address) =>
    [onlyCepDigits(address.cep), address.number, address.complement]
      .map((part) => part.trim().toLowerCase())
      .join('|');
  return key(a) === key(b);
}

/**
 * Endereços da conta logada. Ficam SÓ EM MEMÓRIA (endereço é dado pessoal e não
 * vai para o navegador): ao recarregar, volta o endereço de exemplo.
 * Dívida técnica até o B7: `GET/POST/PUT/DELETE /me/addresses` e
 * `PATCH /me/addresses/{id}/default` — o back garante um único principal.
 */
@Injectable({ providedIn: 'root' })
export class AddressBook {
  private readonly auth = inject(AuthService);
  private readonly books = signal<Readonly<Record<string, readonly SavedAddress[]>>>({});
  private sequence = 0;

  /** Principal primeiro. Conta sem nada salvo ainda começa com o endereço de exemplo. */
  readonly addresses = computed<readonly SavedAddress[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    const list = this.books()[user.email] ?? [
      { ...SAMPLE_ADDRESS, recipient: user.name, id: 'endereco-exemplo', isDefault: true },
    ];
    return [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  });

  readonly defaultAddress = computed(() => this.addresses().find((address) => address.isDefault));
  readonly isFull = computed(() => this.addresses().length >= MAX_ADDRESSES);

  find(id: string): SavedAddress | undefined {
    return this.addresses().find((address) => address.id === id);
  }

  /** Salva um endereço novo. Se já existe igual, devolve o existente; cheio = `null`. */
  add(address: DeliveryAddress, makeDefault = false): SavedAddress | null {
    const existing = this.addresses().find((saved) => sameAddress(saved, address));
    if (existing) return existing;
    if (this.isFull()) return null;
    const id = `endereco-${Date.now().toString(36)}-${++this.sequence}`;
    this.write((list) =>
      withDefault(
        [...list, { ...address, id, isDefault: false }],
        makeDefault || list.length === 0 ? id : null,
      ),
    );
    return this.find(id) ?? null;
  }

  update(id: string, address: DeliveryAddress, makeDefault = false): void {
    this.write((list) =>
      withDefault(
        list.map((saved) => (saved.id === id ? { ...saved, ...address } : saved)),
        makeDefault ? id : null,
      ),
    );
  }

  /** Removendo o principal, o próximo da lista assume. */
  remove(id: string): void {
    this.write((list) => {
      const rest = list.filter((address) => address.id !== id);
      const hasDefault = rest.some((address) => address.isDefault);
      return hasDefault || !rest.length ? rest : withDefault(rest, rest[0].id);
    });
  }

  /** "Desfazer" da remoção: volta como estava (inclusive se era o principal). */
  restore(address: SavedAddress): void {
    if (this.find(address.id) || this.isFull()) return;
    this.write((list) =>
      withDefault(
        [...list, { ...address, isDefault: false }],
        address.isDefault ? address.id : null,
      ),
    );
  }

  setDefault(id: string): void {
    this.write((list) => withDefault(list, id));
  }

  private write(change: (list: readonly SavedAddress[]) => SavedAddress[]): void {
    const email = this.auth.user()?.email;
    if (!email) return;
    const next = change(this.addresses());
    this.books.update((books) => ({ ...books, [email]: next }));
  }
}
