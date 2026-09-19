/** Item de navegação: sempre uma rota real, com filtros opcionais do catálogo via query params. */
export interface NavLink {
  label: string;
  path: string;
  queryParams?: Record<string, string>;
}
