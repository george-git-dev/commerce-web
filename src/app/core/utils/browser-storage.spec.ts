import { readJson, removeKey, writeJson } from './browser-storage';

describe('browser-storage (localStorage seguro)', () => {
  beforeEach(() => localStorage.clear());

  it('grava, lê e remove JSON', () => {
    writeJson('k', { a: 1 });
    expect(readJson<{ a: number }>('k')).toEqual({ a: 1 });
    removeKey('k');
    expect(readJson('k')).toBeNull();
  });

  it('dado corrompido ou armazenamento bloqueado não quebra', () => {
    localStorage.setItem('k', '{quebrado');
    expect(readJson('k')).toBeNull();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => writeJson('k', 1)).not.toThrow();
    spy.mockRestore();
    const spy2 = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => removeKey('k')).not.toThrow();
    spy2.mockRestore();
  });
});
