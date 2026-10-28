let loading: Promise<void> | undefined;

/**
 * Carrega e registra os web components do Swiper (`<swiper-container>`,
 * `<swiper-slide>`) só quando um carrossel aparece na tela — fica fora do
 * carregamento inicial do site. Carrega uma vez só; as próximas chamadas
 * reaproveitam a mesma promessa.
 */
export function loadSwiper(): Promise<void> {
  loading ??= import('swiper/element/bundle').then(({ register }) => register());
  return loading;
}
