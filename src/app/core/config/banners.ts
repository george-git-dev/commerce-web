import { Banner } from '../models/banner';
import { CATALOG_QUERY_PARAMS } from './navigation';

/**
 * Banner PADRÃO do carrossel: aparece só quando nenhum banner está no ar
 * (todos inativos, fora do período ou a API fora do ar), para a home nunca
 * abrir vazia. Os banners de verdade são cadastrados no backoffice em
 * Vitrine → Banners, sem deploy.
 *
 * TAMANHO DAS IMAGENS (vale também para o cadastro no backoffice)
 * - Celular (image):          1080 × 1350 px  — formato vertical 4:5 (obrigatória)
 * - Desktop (imageDesktop):   1920 × 720 px   — formato largo 8:3 (opcional)
 *
 * - O que importa é a proporção; tamanhos maiores na mesma proporção também funcionam.
 * - Formato: .webp (preferível) ou .jpg. Evite .png para fotos (arquivo muito pesado).
 * - Peso ideal: até ~150 KB cada. A maioria dos clientes acessa pelo celular (4G).
 * - Deixe textos e elementos importantes longe das bordas (~5% de margem).
 * - O `alt` descreve o que a arte diz/mostra (ex.: "Até 40% off em perfumes selecionados").
 */
export const DEFAULT_BANNER: Banner = {
  id: 'padrao',
  image: 'img/carrossel/lancamentos-mobile.webp',
  imageDesktop: 'img/carrossel/lancamentos-desktop.webp',
  alt: 'Lançamentos da temporada: fragrâncias árabes que acabaram de chegar.',
  link: { path: '/produtos', queryParams: { [CATALOG_QUERY_PARAMS.launch]: 'true' } },
};
