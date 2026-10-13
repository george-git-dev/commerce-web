import { toCsv } from './csv';

describe('CSV para o Excel', () => {
  it('BOM, ; , vírgula decimal, aspas e sem fórmula', () => {
    const csv = toCsv(
      ['Nome', 'Valor'],
      [
        ['Ana "A"', 1234.5],
        ['=HYPERLINK("x")', -10],
        [null, 0],
      ],
    );
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('﻿"Nome";"Valor"');
    expect(lines[1]).toBe('"Ana ""A""";1234,5');
    expect(lines[2], 'texto com = vira texto; número negativo fica número').toBe(
      `"'=HYPERLINK(""x"")";-10`,
    );
    expect(lines[3]).toBe(';0');
  });
});
