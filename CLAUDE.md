# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## Contexto do projeto

Frontend da **Nani Perfums** ("Essência do Oriente"), e-commerce de perfumes começando por perfumes árabes. Meta: MVP funcional até o fim de 2026. O backend fica em outro repositório (`commerce-api`, Java 21 / Spring Boot).

Fase atual: o layout está sendo redesenhado a partir de um protótipo feito no Lovable. O objetivo é ficar o mais próximo possível do visual dele, mantendo Angular + Angular Material e mobile-first. As telas usam **dados mockados** até o visual fechar; a integração com a API real vem depois.

## ⚠️ MOBILE-FIRST É OBRIGATÓRIO

**Cerca de 90% dos clientes vão acessar pelo celular.** O celular é o produto principal; tablet e desktop são adaptações. Toda decisão de layout, UX e performance parte do mobile.

- **Estilos base = celular.** O CSS sem media query é o do celular (referência: 360px de largura). Tablet e desktop entram depois, só com media queries `min-width`. Nunca usar `max-width` para "consertar" o mobile.
- **Nunca construir desktop primeiro e adaptar depois.** Ao criar ou alterar qualquer tela, componente ou seção, pensar e codar primeiro para o celular.
- **Validar sempre nestas larguras:** 360px, 390px (celulares), 768px (tablet), 1024px e 1440px (desktop). Nenhuma delas pode ter scroll horizontal.
- **Toque, não mouse:** áreas de toque com no mínimo 44x44px e espaçamento entre elas. Nenhuma funcionalidade pode depender de `:hover`.
- **Zona do polegar:** ações principais (adicionar ao carrinho, finalizar compra) ficam ao alcance do polegar, de preferência fixas na parte de baixo da tela no mobile.
- **Rede móvel:** imagens com `NgOptimizedImage` (`ngSrc`, tamanhos e `priority` na imagem principal da dobra), sem layout shift no carregamento e com bundle enxuto.
- **Formulários (login, cadastro, checkout):** usar os `type`, `inputmode` e `autocomplete` corretos para abrir o teclado certo e permitir preenchimento automático.
- Respeitar as safe areas de celulares com notch (`env(safe-area-inset-*)`) em elementos fixos.
- Usar o `BreakpointObserver` do Angular CDK só quando o **comportamento** muda entre tamanhos, não apenas o estilo.
- A skill `responsive-craft` é o padrão do projeto para implementar e revisar responsividade: `/responsive-craft build` para UI nova e `/responsive-craft audit` para revisar layouts existentes, sempre que mexer em `features/`, `layout/` ou `shared/`.

## Comandos

- `npm start` / `ng serve`: servidor de desenvolvimento em `http://localhost:4200`
- `npm run build` / `ng build`: build de produção em `dist/`
- `npm run watch`: build de desenvolvimento em modo watch
- `npm test` / `ng test`: testes unitários (Vitest via `@angular/build:unit-test`)
- Rodar um único arquivo de teste: `ng test -- src/app/features/home/home.spec.ts` (argumentos do Vitest vão depois do `--`)
- Ainda não há script de lint no `package.json`.

## Arquitetura

Loja em Angular 22, apenas standalone components (sem NgModules) e change detection **zoneless**.

- `provideZonelessChangeDetection()` está ativo em `src/app/app.config.ts`. Todo componente DEVE usar `ChangeDetectionStrategy.OnPush` e controlar estado com signals (`signal`/`computed`), nunca com mutação manual, ou a tela não atualiza.
- O locale é fixo em `pt-BR` (`LOCALE_ID`). Textos para o usuário e comentários de código são em português; manter esse padrão.
- As rotas ficam em `src/app/app.routes.ts` e toda feature é carregada com lazy loading (`loadComponent` / `loadChildren`). O `withRouterConfig({ onSameUrlNavigation: 'reload' })` é intencional: faz o clique repetido num link do menu rolar de novo até a âncora da página. Não remover.

### Estrutura de camadas (`src/app/`)

- `core/`: itens únicos, usados pela aplicação inteira.
  - `config/`: objetos de configuração estáticos (`store-config.ts`, `navigation.ts`, `imagery.ts`). São constantes exportadas, não services.
  - `models/`: interfaces TypeScript simples.
  - `data/`: dados mockados (ex.: `catalog-mock.ts`).
  - `services/`: injectables `providedIn: 'root'` que guardam estado em signals (ex.: `CatalogService`, `CartStore`). Os services expõem apenas signals `asReadonly()`; quem consome nunca altera o estado diretamente.
- `features/`: uma pasta por página com rota (home, catalog, product-detail, cart, favorites, auth, account, not-found). Páginas grandes são compostas por `sections/*`, um componente por seção (ver `home/`).
- `layout/`: `header/` e `footer/`, ligados ao shell da aplicação em `app.ts`/`app.html`.
- `shared/`: componentes de apresentação reutilizáveis (ex.: `product-card/`). São componentes "burros": recebem `input()`, emitem `output()` e não injetam stores.

### Padrão de estado

O `CatalogService` entrega dados mockados de forma síncrona via signals. O caminho de migração planejado (ver o comentário de documentação dele) é injetar o `HttpClient` e alimentar os mesmos signals, ou trocá-los por `resource()`. Os componentes continuam lendo signals e não precisam mudar. Seguir esse padrão para qualquer novo service com dados; não introduzir outra abordagem de estado (NgRx, store com RxJS etc.).

O `CartStore` é propositalmente mínimo. Ler o comentário de documentação dele antes de estendê-lo para a lógica completa de carrinho e checkout.

### Biblioteca de UI

Angular Material (`@angular/material`, `@angular/cdk`).

## Boas práticas de frontend

- Atuar como especialista sênior em frontend, aplicando as boas práticas atuais de mercado por padrão, mesmo sem pedido explícito: HTML semântico, acessibilidade (semântica nativa primeiro, ARIA só para lacunas reais), sem layout shift e uso consistente da escala de espaçamento e tipografia do projeto, sem valores avulsos.
- Nada de atalho só para "funcionar". Se um atalho for inevitável por causa do prazo do MVP, sinalizar explicitamente como **dívida técnica**.

## Performance, SSR e segurança

- **Código compatível com SSR.** O SSR/hydration está previsto (SEO das páginas de produto), mas ainda não está ativo. Nunca acessar `window`, `document`, `localStorage` ou outras APIs exclusivas do navegador diretamente. Usar `inject(DOCUMENT)`, `afterNextRender()` ou proteger com `isPlatformBrowser`.
- Usar `@defer (on viewport)` em seções pesadas abaixo da dobra.
- Com Observables (ex.: `HttpClient`), preferir `toSignal()` ou `takeUntilDestroyed()`. Nada de `subscribe` manual sem limpeza.
- Autenticação: usar guards funcionais (`CanActivateFn`) e interceptors funcionais (`HttpInterceptorFn`) para o token. Nunca ler ou anexar token dentro de componentes.
- Nunca usar `bypassSecurityTrust*` nem fazer bind de `innerHTML` com dados da API ou do usuário.
- Não importar bibliotecas inteiras para usar uma única função; manter o bundle dentro dos budgets do `angular.json`.

## Convenções

- Prettier: aspas simples, largura de 100 caracteres, parser Angular para templates `.html`.
- Imports relativos sem path alias (`../../core/...`), como nos arquivos existentes.
- `noPropertyAccessFromIndexSignature`, `strictTemplates` e `strictInjectionParameters` estão ativos; manter o código novo sem erros de strict mode.
- Arquivos de classe de componente sem o sufixo `.component` (ex.: `header.ts`, não `header.component.ts`), conforme os schematics configurados no `angular.json`.

## Fluxo de trabalho

- O dono do projeto é dev backend Java/Spring e está aprendendo Angular: explicar o "porquê" das decisões de frontend, sem assumir conhecimento avançado.
- Trabalhar em passos pequenos: propor o plano da sessão, esperar aprovação e então dizer exatamente o que fazer (comando, arquivo, conteúdo). Ele aplica e valida antes do próximo passo. Não rodar comandos nem editar arquivos sem ele pedir.
- Cada sessão começa e termina uma etapa do roadmap.
- Refatorações de arquitetura ficam para a revisão pós-MVP.
- Ambiente: Windows com Git Bash (MINGW64). Os comandos precisam ser compatíveis com bash.

## Regras de Git

- Trabalhar sempre na branch `develop`.
- Nunca adicionar linha de coautoria (`Co-Authored-By: Claude`) nem "Generated with Claude Code" em mensagens de commit ou descrições de PR.
