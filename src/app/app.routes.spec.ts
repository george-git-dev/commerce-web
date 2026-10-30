import { Route, Routes } from '@angular/router';
import { routes } from './app.routes';
import { loginPageGuard } from './core/guards/auth-guard';
import { STORE_CONFIG } from './core/config/store-config';
import { ADMIN_NAV } from './features/admin/admin-nav';
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

  it('todo item do menu do backoffice abre uma tela de verdade', () => {
    const screens = flatten(ADMIN_ROUTES[0].children ?? []).filter(
      ({ route }) => route.loadComponent,
    );
    for (const item of ADMIN_NAV) {
      expect(
        screens.some(({ path }) => path === item.path),
        `menu "${item.label}" sem tela`,
      ).toBe(true);
    }
  });

  it('título da rota é só o nome da página (a marca entra pelo SeoTitleStrategy); backoffice exige equipe e permissão por tela', () => {
    for (const { path, route } of all) {
      if (!route.title) continue;
      const title = String(route.title);
      expect(title, path).not.toContain('|');
      expect(title, path).not.toContain(STORE_CONFIG.name);
      expect(title, path).not.toContain(STORE_CONFIG.adminName);
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
    for (const open of ['', 'produtos', 'carrinho', 'seja-afiliado', 'ajuda/:pagina']) {
      expect(guards(open), open).toHaveLength(0);
    }
    // Telas de login: no modo bff mandam para o Keycloak.
    for (const path of ['login', 'esqueci-senha', 'redefinir-senha']) {
      expect(guards(path), path).toEqual([loginPageGuard]);
    }
  });
});
