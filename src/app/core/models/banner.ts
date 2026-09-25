/**
 * Banner do carrossel da home. É o contrato do futuro `GET /banners`:
 * o back vai devolver uma lista neste formato.
 */
export interface Banner {
  id: string;
  /** Imagem principal, usada no celular. Formato vertical (≈4:5). */
  image: string;
  /** Opcional: versão larga para tablet/desktop (≈8:3). Sem ela, usa `image`. */
  imageDesktop?: string;
  /** Descrição da imagem, para leitores de tela e Google. */
  alt: string;
}