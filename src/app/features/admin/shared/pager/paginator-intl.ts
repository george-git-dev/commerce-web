import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/** Textos do `mat-paginator` em português ("1–20 de 670"). */
@Injectable()
export class PtBrPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Itens por página';
  override nextPageLabel = 'Próxima página';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primeira página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (!length) return '0 de 0';
    const from = page * pageSize + 1;
    const to = Math.min(from + pageSize - 1, length);
    return `${from}–${to} de ${length}`;
  };
}
