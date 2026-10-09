import { PtBrPaginatorIntl } from './paginator-intl';

describe('paginador em português', () => {
  it('faixa "de" com a última página parcial', () => {
    const intl = new PtBrPaginatorIntl();
    expect(intl.getRangeLabel(2, 20, 670)).toBe('41–60 de 670');
    expect(intl.getRangeLabel(33, 20, 670)).toBe('661–670 de 670');
    expect(intl.getRangeLabel(0, 20, 0)).toBe('0 de 0');
  });
});
