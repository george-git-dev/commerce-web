/**
 * Item de menu. Como a aplicação tem uma única rota, todo link navega para a home
 * e rola até um `fragment` que existe no DOM — não há destinos inexistentes.
 */
export interface NavLink {
  label: string;
  fragment: string;
}
