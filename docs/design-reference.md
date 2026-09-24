# Referência de design — protótipo Lovable

Extraído do protótipo publicado em https://oriental-essence-elegance.lovable.app (visualizado em 375px, mobile).
O protótipo é React + Tailwind + shadcn. **Não copiar código ou classes Tailwind**: esta é a referência visual a ser reproduzida em Angular + Angular Material + SCSS.

> ⚠️ O protótipo usa a marca antiga ("NAYR Parfums"). No projeto a marca é **Nani Perfumes**, slogan **"Essência do Oriente"**.

## Design tokens

Usar como CSS custom properties globais (`styles.scss`). Os valores `oklch` são os originais; o hex é aproximado, só para leitura.

| Token                  | oklch                      | Hex aprox. | Uso                                                      |
| ---------------------- | -------------------------- | ---------- | -------------------------------------------------------- |
| `--background`         | `oklch(97.5% .006 78)`     | `#f9f6f2`  | Fundo da página (off-white quente)                       |
| `--foreground`         | `oklch(19% .012 70)`       | `#17130e`  | Texto principal                                          |
| `--card`               | `oklch(99.5% .003 78)`     | `#fffdfb`  | Fundo de cards e seções alternadas                       |
| `--primary`            | `oklch(19% .012 70)`       | `#17130e`  | Seções escuras (hero, rodapé, curadoria), botões sólidos |
| `--primary-foreground` | `oklch(97.5% .006 78)`     | `#f9f6f2`  | Texto sobre `--primary`                                  |
| `--secondary`          | `oklch(77% .072 76)`       | `#cfae80`  | Dourado claro                                            |
| `--accent`             | `oklch(93% .024 77)`       | `#f1e6d7`  | Destaques suaves                                         |
| `--muted`              | `oklch(94.5% .012 76)`     | `#f2ece4`  | Fundos neutros                                           |
| `--muted-foreground`   | `oklch(47% .018 65)`       | `#625950`  | Texto secundário                                         |
| `--border` / `--input` | `oklch(87% .017 76)`       | `#dbd3c8`  | Bordas e inputs                                          |
| `--ring`               | `oklch(64% .085 71)`       | `#ad8350`  | Foco                                                     |
| `--gold`               | `oklch(67% .095 74)`       | `#b88c4f`  | **Cor de marca**: eyebrows, detalhes, logo               |
| `--gold-soft`          | `oklch(93% .035 77)`       | `#f5e5cf`  | Fundo da seção de newsletter                             |
| `--earth`              | `oklch(42% .045 55)`       | `#614735`  | Tom terroso de apoio                                     |
| `--surface-dark`       | `oklch(16% .011 65)`       | `#110c08`  | Superfície mais escura                                   |
| `--destructive`        | `oklch(57.7% .245 27.325)` | `#e40016`  | Erros                                                    |
| `--radius`             | `.375rem`                  | 6px        | Raio base (botões usam ~2px, quase reto)                 |

Só existe tema claro. As variáveis `.dark` do protótipo são padrões do shadcn e não fazem parte do design.

## Tipografia

Google Fonts: `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Italiana&display=swap`

| Elemento                          | Fonte                         | Mobile (375px)                           | Detalhes                                    |
| --------------------------------- | ----------------------------- | ---------------------------------------- | ------------------------------------------- |
| Títulos de exibição (h1, h2)      | **Italiana**, serif, peso 400 | h1 48px / lh ~1.04; h2 30px / lh 1.2     | Elegante, sem negrito                       |
| Corpo e UI                        | **DM Sans**, peso 400/500/600 | 16px                                     | —                                           |
| Eyebrow (texto acima dos títulos) | DM Sans 600                   | 12px, `letter-spacing: .2em`, UPPERCASE  | Cor `--gold`                                |
| Botões                            | DM Sans 600                   | 13px, `letter-spacing: .14em`, UPPERCASE | Altura 48px, padding lateral 32px, raio 2px |
| Nome do produto (h3 no card)      | DM Sans 500                   | 16px                                     | —                                           |

## Layout e espaçamento

- **Container:** `width: min(100% - 2rem, 80rem); margin-inline: auto;` (16px de respiro lateral no mobile, máximo de 1280px).
- **Espaçamento vertical das seções:** 80px (`py-20`); seções de faixa usam 64px (`py-16`).
- Fundos alternados entre `--background`, `--card` e `--primary` (escuro) para separar as seções.
- Breakpoints do protótipo (Tailwind): `sm` 640px, `lg` 1024px. O menu desktop só aparece a partir de `lg`.

## Componentes

- **Barra de anúncio** (topo, fundo escuro): "Frete grátis para todo Brasil em compras acima de R$ 499".
- **Header (sticky)**: fundo `--background` com 95% de opacidade e `backdrop-filter: blur`, borda inferior. No mobile: menu hambúrguer à esquerda, logo centralizado (nome em Italiana + "PARFUMS" pequeno em dourado e espaçado) e busca + carrinho com badge à direita. No desktop (≥1024px): navegação inline (Início, Perfumes, Masculinos, Femininos, Unissex, Marcas).
- **Botão primário**: sólido `--primary` / texto claro. **Botão secundário**: contorno fino. Ambos em caixa alta e com espaçamento entre letras.
- **Card de produto**: badge de desconto (ex.: "-19%") ou "MAIS VENDIDO", marca em caixa alta pequena, nome, nota em estrelas com número de avaliações, preço antigo riscado + preço atual, parcelamento ("6x de R$ 58,32") e botão "Adicionar".
- **Animações**: as seções aparecem com fade-in ao entrar na tela. Se forem reproduzidas, respeitar `prefers-reduced-motion`.

## Home — ordem das seções

1. **Hero** (fundo escuro com imagem de frasco, altura ~100vh no mobile): eyebrow "Perfumaria árabe contemporânea", h1 "Descubra a essência do Oriente", subtítulo e dois botões (Explorar perfumes / Ver lançamentos).
2. **Categorias** — "Encontre sua assinatura / Perfumes para cada presença": Masculinos, Femininos, Unissex, Lançamentos, Mais vendidos, Ofertas.
3. **Destaques** (fundo `--card`) — "Curadoria / Perfumes em destaque" + link "Ver todos" e grade de cards.
4. **Faixa de benefícios**: Envio para todo o Brasil · Compra segura · Produtos originais · Pagamento facilitado (Pix, cartão e parcelamento).
5. **Mais vendidos** — "Escolhas comprovadas / Os favoritos dos nossos clientes".
6. **Marcas** — "Casas que admiramos": Lattafa, Maison Alhambra, Afnan, Armaf, Al Haramain, Rasasi, Swiss Arabian.
7. **Curadoria / história** (fundo escuro, 2 colunas a partir de `lg`) — "Uma experiência olfativa do Oriente para você" + "Conheça nossa história".
8. **Newsletter** (fundo `--gold-soft`) — "Receba novidades e ofertas exclusivas" + botão "Quero receber".
9. **Rodapé** (fundo escuro).

## Rotas do protótipo → features Angular

| Protótipo                                                                                     | commerce-web                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                           | `features/home`                                                                                                                     |
| `/catalogo` (filtros por query: `genero`, `categoria`, `lancamentos`)                         | `features/catalog`                                                                                                                  |
| `/produto/:slug`                                                                              | `features/product-detail`                                                                                                           |
| `/carrinho`                                                                                   | `features/cart`                                                                                                                     |
| `/favoritos`                                                                                  | `features/favorites`                                                                                                                |
| `/login`                                                                                      | `features/auth`                                                                                                                     |
| `/institucional/*` (nossa-historia, quem-somos, contato, ajuda, trocas, entrega, privacidade) | Não existe ainda — páginas estáticas; avaliar se entram no MVP (trocas, entrega e privacidade costumam ser necessárias para vender) |

## O que não reproduzir

- O badge "Made with Lovable".
- As classes Tailwind e os componentes shadcn: usar Angular Material com tema customizado a partir dos tokens acima.
- O tema `.dark` do shadcn.
