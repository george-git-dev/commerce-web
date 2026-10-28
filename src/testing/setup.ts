/**
 * Preparação global dos testes (roda antes de cada arquivo de teste).
 * O jsdom não implementa algumas APIs do navegador; aqui elas viram stubs
 * silenciosos para os testes não encherem o terminal de erros falsos.
 */

// `@defer (on viewport)` usa IntersectionObserver: no teste, nunca "entra na tela".
class NoopIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver ??= NoopIntersectionObserver as never;

// Rolagem não existe no jsdom (as telas rolam até o topo/até um elemento).
window.scrollTo = () => undefined;
Element.prototype.scrollIntoView ??= () => undefined;

// O Swiper (web component) usa `element.part`, que o jsdom não implementa.
if (!('part' in Element.prototype)) {
  const parts = new WeakMap<Element, DOMTokenList>();
  Object.defineProperty(Element.prototype, 'part', {
    configurable: true,
    get(this: Element) {
      let list = parts.get(this);
      if (!list) {
        list = document.createElement('span').classList;
        parts.set(this, list);
      }
      return list;
    },
  });
}
