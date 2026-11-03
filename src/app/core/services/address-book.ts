import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, of, switchMap } from 'rxjs';
import { AUTH_MODE } from '../config/auth-mode';
import { SAMPLE_ADDRESS } from '../data/orders-mock';
import { Address, SavedAddress } from '../models/order';
import { AuthService } from './auth-service';
import { onlyCepDigits } from './shipping-service';

export const MAX_ADDRESSES = 5;

const URL = '/api/me/addresses';

/** Endereço como o BFF devolve (`id` numérico). */
interface ApiAddress extends Address {
  id: number;
  isDefault: boolean;
}

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

function toBody(address: Address, isDefault: boolean) {
  const { cep, street, number, complement, district, city, state } = address;
  return { cep, street, number, complement, district, city, state, isDefault };
}

/**
 * Endereços da conta logada (Minha conta → Endereços e checkout).
 * - Modo `bff`: `/api/me/addresses`. As regras são do back (um único principal, limite,
 *   ordem — principal primeiro); depois de cada mudança a lista é buscada de novo e a tela
 *   só mostra o que o back devolveu.
 * - Modo `mock` (testes e `start:mock`): só em memória, com as mesmas regras simuladas.
 */
@Injectable({ providedIn: 'root' })
export class AddressBook {
  private readonly auth = inject(AuthService);
  /** Só o modo `bff` faz chamada HTTP (o simulado funciona sem `HttpClient` configurado). */
  private readonly http = inject(AUTH_MODE) === 'bff' ? inject(HttpClient) : null;

  /** Modo `bff`: última lista do back, de qual conta ela é (troca de conta não mostra a anterior). */
  private readonly server = signal<{ email: string; list: readonly SavedAddress[] } | null>(null);
  /** Modo `mock`: endereços por conta, em memória. */
  private readonly books = signal<Readonly<Record<string, readonly SavedAddress[]>>>({});
  private sequence = 0;

  /** Principal primeiro (no modo `bff`, na ordem que o back mandou). */
  readonly addresses = computed<readonly SavedAddress[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    if (this.http) {
      const loaded = this.server();
      return loaded?.email === user.email ? loaded.list : [];
    }
    const list = this.books()[user.email] ?? [
      { ...SAMPLE_ADDRESS, id: 'endereco-exemplo', isDefault: true },
    ];
    return [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  });

  readonly defaultAddress = computed(() => this.addresses().find((address) => address.isDefault));
  readonly isFull = computed(() => this.addresses().length >= MAX_ADDRESSES);

  find(id: string): SavedAddress | undefined {
    return this.addresses().find((address) => address.id === id);
  }

  /** Busca a lista no back (no modo `mock`, devolve a da memória). */
  load(): Observable<readonly SavedAddress[]> {
    const email = this.auth.user()?.email;
    if (!this.http || !email) return of(this.addresses());
    return this.http.get<ApiAddress[]>(URL).pipe(
      map((list) => list.map((address) => ({ ...address, id: String(address.id) }))),
      map((list) => {
        this.server.set({ email, list });
        return list;
      }),
    );
  }

  /** Salva um endereço novo. Se já existe igual, devolve o existente; cheio = `null`. */
  add(address: Address, makeDefault = false): Observable<SavedAddress | null> {
    const existing = this.addresses().find((saved) => sameAddress(saved, address));
    if (existing) return of(existing);
    if (this.isFull()) return of(null);
    if (this.http) {
      return this.http
        .post<ApiAddress>(URL, toBody(address, makeDefault))
        .pipe(switchMap((created) => this.reloadAnd(() => this.find(String(created.id)) ?? null)));
    }
    const id = `endereco-${Date.now().toString(36)}-${++this.sequence}`;
    this.write((list) =>
      withDefault(
        [...list, { ...address, id, isDefault: false }],
        makeDefault || list.length === 0 ? id : null,
      ),
    );
    return of(this.find(id) ?? null);
  }

  update(id: string, address: Address, makeDefault = false): Observable<void> {
    if (this.http) {
      return this.http
        .put(`${URL}/${id}`, toBody(address, makeDefault))
        .pipe(switchMap(() => this.reloadAnd(() => undefined)));
    }
    this.write((list) =>
      withDefault(
        list.map((saved) => (saved.id === id ? { ...saved, ...address } : saved)),
        makeDefault ? id : null,
      ),
    );
    return of(undefined);
  }

  /** Removendo o principal, o próximo da lista assume (no modo `bff`, o back decide). */
  remove(id: string): Observable<void> {
    if (this.http) {
      return this.http
        .delete(`${URL}/${id}`)
        .pipe(switchMap(() => this.reloadAnd(() => undefined)));
    }
    this.write((list) => {
      const rest = list.filter((address) => address.id !== id);
      const hasDefault = rest.some((address) => address.isDefault);
      return hasDefault || !rest.length ? rest : withDefault(rest, rest[0].id);
    });
    return of(undefined);
  }

  /** "Desfazer" da remoção: volta como estava (inclusive se era o principal). */
  restore(address: SavedAddress): Observable<void> {
    if (this.find(address.id) || this.isFull()) return of(undefined);
    if (this.http) return this.add(address, address.isDefault).pipe(map(() => undefined));
    this.write((list) =>
      withDefault(
        [...list, { ...address, isDefault: false }],
        address.isDefault ? address.id : null,
      ),
    );
    return of(undefined);
  }

  setDefault(id: string): Observable<void> {
    const address = this.find(id);
    if (this.http && address) return this.update(id, address, true);
    this.write((list) => withDefault(list, id));
    return of(undefined);
  }

  /** Conta excluída: os endereços salvos dela somem. Fase 2: parte do `DELETE /me`. */
  forgetAccount(email: string): void {
    if (this.server()?.email === email) this.server.set(null);
    this.books.update((books) => {
      const next = { ...books };
      delete next[email];
      return next;
    });
  }

  /** Depois de mudar no back, busca a lista de novo (o back é quem ordena e escolhe o principal). */
  private reloadAnd<T>(result: () => T): Observable<T> {
    return this.load().pipe(map(result));
  }

  private write(change: (list: readonly SavedAddress[]) => SavedAddress[]): void {
    const email = this.auth.user()?.email;
    if (!email) return;
    const next = change(this.addresses());
    this.books.update((books) => ({ ...books, [email]: next }));
  }
}
