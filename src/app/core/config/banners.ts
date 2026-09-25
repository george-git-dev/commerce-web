import { Banner } from '../models/banner';

/**
 * Banners do carrossel da home, na ordem de exibição.
 *
 * COMO ADICIONAR UM BANNER
 * 1. Coloque as imagens em `public/img/carrossel/` (ex.: banner-3-mobile.webp, banner-3-desktop.webp).
 * 2. Acrescente um bloco nesta lista com id, image, imageDesktop e alt.
 * Para remover: apague o bloco e as imagens.
 *
 * TAMANHO DAS IMAGENS
 * - Celular (image):          1080 × 1350 px  — formato vertical 4:5 (obrigatória)
 * - Desktop (imageDesktop):   1920 × 720 px   — formato largo 8:3 (opcional)
 *
 * - O que importa é a proporção; tamanhos maiores na mesma proporção também funcionam.
 * - Formato: .webp (preferível) ou .jpg. Evite .png para fotos (arquivo muito pesado).
 * - Peso ideal: até ~150 KB cada. A maioria dos clientes acessa pelo celular (4G).
 * - Deixe textos e elementos importantes longe das bordas (~5% de margem).
 * - O `alt` descreve o que a arte diz/mostra (ex.: "Até 40% off em perfumes selecionados").
 */

export const BANNERS: readonly Banner[] = [
  {
    id: 'lancamentos',
    image: 'img/carrossel/lancamentos-mobile.webp',
    imageDesktop: 'img/carrossel/lancamentos-desktop.webp',
    alt: 'Lançamentos da temporada: fragrâncias árabes que acabaram de chegar.',
  },
  {
    id: 'ofertas',
    image: 'img/carrossel/ofertas-mobile.webp',
    imageDesktop: 'img/carrossel/ofertas-desktop.webp',
    alt: 'Ofertas: até 40% off em perfumes selecionados, por tempo limitado.',
  },
];
