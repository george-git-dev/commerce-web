export type HelpGroup = 'institucional' | 'suporte' | 'politicas';

export interface HelpSection {
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
}

/** Página de conteúdo (ajuda, políticas, contato) em `/ajuda/:pagina`. */
export interface HelpPage {
  slug: string;
  title: string;
  group: HelpGroup;
  summary: string;
  /** Data ISO da última revisão do texto. */
  updatedAt: string;
  /** Seções viram perguntas que abrem e fecham. */
  faq?: boolean;
  sections: readonly HelpSection[];
}
