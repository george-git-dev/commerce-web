/**
 * Acesso seguro ao localStorage: em aba anônima, com armazenamento bloqueado
 * ou fora do navegador (SSR), as funções simplesmente não fazem nada.
 * Use só para conveniências do cliente — nunca para preço, senha ou CPF.
 */
export function readJson<T>(key: string): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Sem espaço ou sem permissão: segue só em memória.
  }
}

export function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Idem.
  }
}
