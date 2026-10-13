import { downloadCsv, toCsv } from './csv';

describe('CSV para Excel pt-BR', () => {
  it('usa ; , vírgula decimal, aspas e BOM; protege contra fórmula', () => {
    const csv = toCsv(
      ['Produto', 'Valor', 'Obs'],
      [
        ['Asad "Elixir"', 1234.56, null],
        ['=HYPERLINK("x")', 10, '+1'],
      ],
    );
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('"Produto";"Valor";"Obs"');
    expect(lines[1]).toBe('"Asad ""Elixir""";1234,56;');
    expect(lines[2]).toBe(`"'=HYPERLINK(""x"")";10;"'+1"`);
  });

  it('baixa com nome-AAAA-MM-DD.csv e libera a URL', () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => (created.push('blob:x'), 'blob:x');
    URL.revokeObjectURL = (url: string) => void revoked.push(url);
    let downloaded = '';
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      downloaded = this.download;
    };
    try {
      downloadCsv('vendas', 'a;b');
      expect(downloaded).toMatch(/^vendas-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(created).toHaveLength(1);
      expect(revoked).toEqual(['blob:x']);
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      HTMLAnchorElement.prototype.click = click;
    }
  });
});
