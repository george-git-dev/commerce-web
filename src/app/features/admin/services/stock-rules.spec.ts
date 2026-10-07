import { adjustProblems, stockStatus, validMinimum } from './stock-rules';

describe('stock-rules', () => {
  it('situação: zerado, baixo (no mínimo ou abaixo) e ok', () => {
    expect(stockStatus(0, 3)).toBe('zerado');
    expect(stockStatus(3, 3)).toBe('baixo');
    expect(stockStatus(2, 3)).toBe('baixo');
    expect(stockStatus(4, 3)).toBe('ok');
    expect(stockStatus(1, 0)).toBe('ok');
  });

  it('ajuste exige quantidade inteira > 0 e motivo da direção certa', () => {
    expect(adjustProblems(5, 'entrada', 3, 'Envase de decant')).toEqual([]);
    expect(adjustProblems(5, 'entrada', 0, 'Envase de decant')).toHaveLength(1);
    expect(adjustProblems(5, 'entrada', 1.5, 'Envase de decant')).toHaveLength(1);
    expect(adjustProblems(5, 'entrada', 2, 'Perda/avaria')).toEqual(['Escolha o motivo.']);
    // Compra não é ajuste: entra por "Entradas", com fornecedor e custo.
    expect(adjustProblems(5, 'entrada', 2, 'Entrada de mercadoria')).toEqual(['Escolha o motivo.']);
  });

  it('saída não deixa o estoque negativo', () => {
    expect(adjustProblems(5, 'saida', 5, 'Perda/avaria')).toEqual([]);
    expect(adjustProblems(5, 'saida', 6, 'Perda/avaria')[0]).toContain('maior que o estoque');
  });

  it('mínimo: inteiro, zero ou mais', () => {
    expect(validMinimum(0)).toBe(true);
    expect(validMinimum('4')).toBe(true);
    expect(validMinimum(-1)).toBe(false);
    expect(validMinimum('')).toBe(false);
    expect(validMinimum(2.5)).toBe(false);
  });
});
