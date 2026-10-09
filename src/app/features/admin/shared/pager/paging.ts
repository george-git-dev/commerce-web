import { linkedSignal, Signal, signal, WritableSignal } from '@angular/core';
import { DEFAULT_PAGE_SIZE, Page, pageOf } from '../../../../core/utils/paging';

/**
 * Estado de paginação de uma lista. A página pertence a um conjunto de
 * filtros (`key`): mudou busca, filtro ou ordem, volta sozinha para a 1ª —
 * sem efeito colateral. Guardado no `ListMemory`, sobrevive à ida e volta
 * da ficha.
 */
export class Paging {
  readonly size = signal<number>(DEFAULT_PAGE_SIZE);
  private readonly current: WritableSignal<number>;
  /** Página pedida (base 0); a efetiva, já limitada ao total, vem de `of()`. */
  readonly page: Signal<number>;

  constructor(key: () => string = () => '') {
    this.current = linkedSignal<string, number>({ source: key, computation: () => 0 });
    this.page = this.current.asReadonly();
  }

  of<T>(list: readonly T[]): Page<T> {
    return pageOf(list, this.page(), this.size());
  }

  setPage(page: number): void {
    this.current.set(Math.max(0, page));
  }

  setSize(size: number): void {
    this.size.set(size);
    this.current.set(0);
  }
}
