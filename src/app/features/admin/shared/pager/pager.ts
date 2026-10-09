import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DEFAULT_PAGE_SIZE, Page, PAGE_SIZES } from '../../../../core/utils/paging';
import { PtBrPaginatorIntl } from './paginator-intl';
import { Paging } from './paging';

/**
 * Paginador das listas do backoffice: `mat-paginator` (padrão do projeto) com
 * primeira/última página e textos em português. Ao trocar, volta ao topo da
 * lista. Some quando tudo cabe numa página.
 */
@Component({
  selector: 'app-pager',
  imports: [MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useClass: PtBrPaginatorIntl }],
  template: `
    @if (visible()) {
      <mat-paginator
        [length]="page().totalElements"
        [pageIndex]="page().number"
        [pageSize]="page().size"
        [pageSizeOptions]="sizes"
        [showFirstLastButtons]="true"
        [attr.aria-label]="'Páginas de ' + noun()"
        (page)="change($event)"
      />
    }
  `,
  styleUrl: './pager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pager {
  readonly paging = input.required<Paging>();
  readonly page = input.required<Page<unknown>>();
  /** Elemento do topo da lista (rola até ele ao trocar de página). */
  readonly anchor = input<HTMLElement>();
  /** "pedidos", "clientes"… para o leitor de tela. */
  readonly noun = input('itens');

  protected readonly sizes = [...PAGE_SIZES];
  protected readonly visible = computed(
    () => this.page().totalPages > 1 || this.page().size !== DEFAULT_PAGE_SIZE,
  );

  protected change(event: PageEvent): void {
    if (event.pageSize !== this.page().size) this.paging().setSize(event.pageSize);
    else this.paging().setPage(event.pageIndex);
    this.anchor()?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}
