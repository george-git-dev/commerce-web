export interface Category {
  id: string;
  name: string;
  text: string;
  /** Nome de um Material Icon — não há foto por categoria nesta fase. */
  icon: string;
  genderFilter?: 'Masculino' | 'Feminino' | 'Unissex';
}
