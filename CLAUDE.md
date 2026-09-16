# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` / `ng serve` — dev server at `http://localhost:4200`
- `npm run build` / `ng build` — production build to `dist/`
- `npm run watch` — dev-config build in watch mode
- `npm test` / `ng test` — run unit tests (Vitest via `@angular/build:unit-test`)
- Run a single test file: `ng test -- src/app/features/home/home.spec.ts` (Vitest CLI args pass through after `--`)
- No lint script is configured in `package.json`.

## Architecture

Angular 22 storefront ("ÂMBRA" perfumery), standalone components only (no NgModules), **zoneless** change detection.

- `provideZonelessChangeDetection()` is enabled in `src/app/app.config.ts` — every component MUST use `ChangeDetectionStrategy.OnPush` and drive state through signals (`signal`/`computed`), not manual mutation, or the view won't update.
- Locale is hardcoded to `pt-BR` (`LOCALE_ID`), and UI copy/comments are in Portuguese. Keep new user-facing text and code comments consistent with this.
- Routing (`src/app/app.routes.ts`) is minimal: `''` lazy-loads `Home`, `**` lazy-loads `NotFound`. `withRouterConfig({ onSameUrlNavigation: 'reload' })` is set intentionally so re-clicking a nav link re-scrolls to its in-page anchor — don't remove it.

### Layer structure (`src/app/`)

- `core/` — app-wide, singleton stuff:
  - `config/` — static config objects (`store-config.ts`, `navigation.ts`, `imagery.ts`) — plain exported constants, not services.
  - `models/` — plain TS interfaces (`Product`, `Category`, `Highlight`, `NavLink`).
  - `data/catalog-mock.ts` — mock catalog data.
  - `services/` — `providedIn: 'root'` injectables holding signal state (`CatalogService`, `CartStore`). Services expose only `asReadonly()` signals; consumers never mutate state directly.
- `features/` — routed pages, currently `home/` (composed of `sections/*`, one component per landing-page section: hero, highlights, categories, products, cta) and `not-found/`.
- `layout/` — `header/` and `footer/`, wired into the app shell in `app.ts`/`app.html`.
- `shared/` — reusable presentational components (e.g. `product-card/`). These stay "dumb": they take `input()`/emit `output()` and don't inject stores directly (see the note in `product-card.ts`).

### State pattern

`CatalogService` currently serves mock data synchronously through signals. The intended migration path (see its doc comment) is to inject `HttpClient` and feed the same signals, or swap them for `resource()` — consuming components read signals and shouldn't need to change. Follow this pattern for any new data-backed service rather than introducing a different state approach (NgRx, RxJS store, etc.).

`CartStore` is intentionally minimal (badge count + add-to-cart feedback only) — check its doc comment before extending it for full cart/checkout logic.

### UI library

Angular Material (`@angular/material`, `@angular/cdk`) is the component library in use (toolbar, buttons, icons, badge). Prefer Material modules over hand-rolled equivalents for consistency with existing components (`header.ts`, `product-card.ts`).

## Frontend Standards

- **Mobile-first is mandatory.** Every new component, section, or layout change must be designed and coded starting from the smallest viewport, then progressively enhanced with `min-width` media queries (or Angular CDK `BreakpointObserver` where behavior — not just style — needs to change). Never build desktop-first and retrofit responsiveness afterward.
- Act as a senior frontend specialist applying current market best practices by default, not only when explicitly asked: semantic HTML, accessible markup (native semantics first, ARIA only to fill real gaps), touch targets ≥44x44px, no layout shift on load, and consistent use of the project's existing spacing/type scale rather than ad-hoc values.
- The `responsive-craft` skill is this project's standard for responsive/mobile-first implementation and review — use it (`/responsive-craft build` for new UI, `/responsive-craft audit` for reviewing existing layouts) whenever touching `features/`, `layout/`, or `shared/` components.

## Conventions

- Prettier: single quotes, 100-char print width, Angular parser for `.html` templates.
- Path-alias-free relative imports (`../../core/...`), consistent with existing files.
- `noPropertyAccessFromIndexSignature`, `strictTemplates`, and `strictInjectionParameters` are on — keep new code strict-mode clean.
- Component class files are named without a `.component` suffix (e.g. `header.ts`, not `header.component.ts`); this matches the Angular CLI schematics configured in `angular.json`.
