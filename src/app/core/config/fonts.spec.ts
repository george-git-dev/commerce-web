import { readFileSync } from 'node:fs';

/**
 * Fontes e ícones saem do próprio site (pacotes `@fontsource` importados no
 * `styles.scss`), nunca do Google: mais rápido no celular, sem depender de
 * terceiros e sem enviar o IP do visitante (LGPD).
 */
describe('Fontes', () => {
  const read = (path: string) => readFileSync(path, 'utf8');

  it('nada de Google Fonts no index.html nem nos estilos', () => {
    for (const file of ['src/index.html', 'src/styles.scss']) {
      expect(read(file)).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    }
  });

  it('estilos trazem as fontes da marca, os pesos usados e os ícones', () => {
    const styles = read('src/styles.scss');
    expect(styles).toContain("@fontsource/italiana/latin-400'");
    for (const weight of [400, 500, 600, 700]) {
      expect(styles).toContain(`@fontsource/dm-sans/latin-${weight}'`);
    }
    expect(styles).toContain('material-icons-latin-400-normal.woff2');
  });
});
