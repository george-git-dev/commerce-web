/** Marca exibida na faixa de marcas da home. */
export interface Brand {
  name: string;
  /** Opcional: caminho da logo em `public/` (SVG ou PNG transparente). Sem ela, mostra o nome. */
  logo?: string;
}