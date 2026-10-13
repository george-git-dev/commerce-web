import { Route, Routes } from '@angular/router';
import { routes } from './app.routes';
import { ADMIN_ROUTES } from './features/admin/admin.routes';

/** Todas as rotas (com filhos), achatadas. */
function flatten(list: Routes, prefix = ''): { path: string; route: Route }[] {
  return list.flatMap((route) => {
    const path = [prefix, route.path].filter(Boolean).join('/');
    return [{ path, route }, ...flatten(route.children ?? [], path)];
  });
}

describe('rotas', () => {
  const all = [...flatten(routes), ...flatten(ADMIN_ROUTES, 'admin')];

  // Carrega todos os chunks de tela: em máquina mais lenta (ou com a suíte inteira
  // rodando em paralelo) passa dos 5 s padrão, então o limite deste teste é maior.
  it(
    'toda tela carregada sob demanda existe (import não quebrado)',
    { timeout: 60_000 },
    async () => {
      const lazy = all.filter(({ route }) => route.loadComponent || route.loadChildren);
      expect(lazy.length).toBeGreaterThan(30);
      const loaded = await Promise.all(
        lazy.map(({ route }) => (route.loadComponent ?? route.loadChildren)!()),
      );
      loaded.forEach((item, i) => expect(item, lazy[i].path).toBeTruthy());
    },
  );

  it('telas com título têm o nome da loja; backoffice exige equipe e permissão por tela', () => {
    for (const { path, route } of all) {
      if (route.title) expect(String(route.title), path).toMatch(/^Nani (Perfumes|Admin) \|/);
    }
    expect(routes.find((r) => r.path === 'admin')!.canActivate?.length).toBe(1);
    const screens = flatten(ADMIN_ROUTES, 'admin').filter(
      ({ path, route }) => route.loadComponent && path !== 'admin',
    );
    for (const { path, route } of screens) {
      expect(route.canActivate?.length, `${path} sem permissão`).toBeGreaterThan(0);
    }
  });

  it('área do cliente, favoritos e pedidos exigem login; checkout exige carrinho e cliente', () => {
    const guards = (path: string) => routes.find((r) => r.path === path)?.canActivate ?? [];
    const private_ = routes
      .map((r) => r.path!)
      .filter((p) => p.startsWith('minha-conta') || p === 'favoritos' || p === 'pedido/:numero');
    expect(private_.length).toBeGreaterThanOrEqual(10);
    for (const path of private_) expect(guards(path).length, path).toBe(1);
    expect(guards('finalizar-compra')).toHaveLength(3);
    for (const open of ['', 'produtos', 'carrinho', 'login', 'seja-afiliado', 'ajuda/:pagina']) {
      expect(guards(open), open).toHaveLength(0);
    }
  });
});
