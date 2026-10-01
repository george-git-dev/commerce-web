/**
 * Mock da resposta de `GET /products/{slug}/related?limit=4`: para cada
 * perfume, os slugs sugeridos em "Você também pode gostar", na ordem.
 *
 * Gerado offline com a regra que o back vai implementar (ver roadmap, B3):
 * gênero compatível, só produtos com estoque, +5 se for da mesma categoria,
 * +3 por família em comum, +1 por
 * nota em comum (+1 extra se for de fundo) e +2 por ocasião em comum. O front
 * não calcula nada — só mostra o que o back devolver.
 */
export const RELATED_MOCK: Readonly<Record<string, readonly string[]>> = {
  'lattafa-asad': [
    'lattafa-khamrah',
    'afnan-9pm',
    'swiss-arabian-shaghaf-oud',
    'al-haramain-amber-oud-gold-edition',
  ],
  'lattafa-yara': [
    'swiss-arabian-layali',
    'al-wataniah-sabah-al-ward',
    'lattafa-khamrah',
    'swiss-arabian-casablanca',
  ],
  'lattafa-khamrah': [
    'al-wataniah-attar-al-wesal',
    'lattafa-asad',
    'afnan-9pm',
    'al-haramain-amber-oud-gold-edition',
  ],
  'lattafa-fakhar-black': [
    'afnan-turathi-blue',
    'rasasi-hawas-black',
    'ard-al-zaafaran-oud-24-hours',
    'afnan-9pm',
  ],
  'lattafa-bade-e-al-oud-oud-for-glory': [
    'swiss-arabian-shaghaf-oud',
    'ard-al-zaafaran-oud-24-hours',
    'al-wataniah-attar-al-wesal',
    'armaf-club-de-nuit-intense-man',
  ],
  'armaf-club-de-nuit-intense-man': [
    'afnan-supremacy-silver',
    'al-haramain-l-aventure',
    'ard-al-zaafaran-dirham',
    'al-haramain-amber-oud-gold-edition',
  ],
  'armaf-club-de-nuit-women': [
    'al-wataniah-sabah-al-ward',
    'maison-alhambra-delilah',
    'lattafa-yara',
    'swiss-arabian-layali',
  ],
  'afnan-9pm': [
    'lattafa-khamrah',
    'lattafa-asad',
    'rasasi-hawas-black',
    'al-haramain-amber-oud-gold-edition',
  ],
  'afnan-turathi-blue': [
    'lattafa-fakhar-black',
    'rasasi-hawas-for-him',
    'armaf-club-de-nuit-intense-man',
    'al-haramain-l-aventure',
  ],
  'afnan-supremacy-silver': [
    'armaf-club-de-nuit-intense-man',
    'al-haramain-l-aventure',
    'ard-al-zaafaran-dirham',
    'al-haramain-amber-oud-gold-edition',
  ],
  'rasasi-hawas-for-him': [
    'armaf-club-de-nuit-intense-man',
    'al-haramain-l-aventure',
    'al-haramain-amber-oud-gold-edition',
    'ard-al-zaafaran-dirham',
  ],
  'rasasi-hawas-black': ['afnan-9pm', 'lattafa-fakhar-black', 'lattafa-khamrah', 'lattafa-asad'],
  'rasasi-la-yuqawam': [
    'ard-al-zaafaran-oud-24-hours',
    'armaf-club-de-nuit-intense-man',
    'al-haramain-l-aventure',
    'lattafa-fakhar-black',
  ],
  'maison-alhambra-delilah': [
    'al-wataniah-sabah-al-ward',
    'ard-al-zaafaran-dirham',
    'lattafa-yara',
    'al-haramain-amber-oud-gold-edition',
  ],
  'al-haramain-l-aventure': [
    'armaf-club-de-nuit-intense-man',
    'afnan-supremacy-silver',
    'rasasi-hawas-for-him',
    'ard-al-zaafaran-dirham',
  ],
  'al-haramain-amber-oud-gold-edition': [
    'ard-al-zaafaran-dirham',
    'lattafa-khamrah',
    'armaf-club-de-nuit-intense-man',
    'swiss-arabian-layali',
  ],
  'al-wataniah-sabah-al-ward': [
    'maison-alhambra-delilah',
    'lattafa-yara',
    'ard-al-zaafaran-dirham',
    'ard-al-zaafaran-shams-al-emarat',
  ],
  'al-wataniah-attar-al-wesal': [
    'lattafa-khamrah',
    'swiss-arabian-shaghaf-oud',
    'ard-al-zaafaran-dirham',
    'ard-al-zaafaran-oud-24-hours',
  ],
  'ard-al-zaafaran-dirham': [
    'al-haramain-amber-oud-gold-edition',
    'swiss-arabian-layali',
    'armaf-club-de-nuit-intense-man',
    'lattafa-khamrah',
  ],
  'ard-al-zaafaran-oud-24-hours': [
    'swiss-arabian-shaghaf-oud',
    'swiss-arabian-casablanca',
    'lattafa-bade-e-al-oud-oud-for-glory',
    'al-wataniah-attar-al-wesal',
  ],
  'ard-al-zaafaran-shams-al-emarat': [
    'swiss-arabian-layali',
    'lattafa-khamrah',
    'swiss-arabian-casablanca',
    'lattafa-yara',
  ],
  'swiss-arabian-shaghaf-oud': [
    'ard-al-zaafaran-oud-24-hours',
    'lattafa-bade-e-al-oud-oud-for-glory',
    'al-wataniah-attar-al-wesal',
    'lattafa-khamrah',
  ],
  'swiss-arabian-casablanca': [
    'swiss-arabian-layali',
    'ard-al-zaafaran-oud-24-hours',
    'ard-al-zaafaran-dirham',
    'lattafa-khamrah',
  ],
  'swiss-arabian-layali': [
    'swiss-arabian-casablanca',
    'ard-al-zaafaran-dirham',
    'ard-al-zaafaran-shams-al-emarat',
    'lattafa-yara',
  ],
  'lattafa-asad-kit-presente': [
    'armaf-club-de-nuit-intense-man-kit-presente',
    'lattafa-asad',
    'afnan-9pm',
    'armaf-club-de-nuit-intense-man',
  ],
  'lattafa-yara-kit-presente': [
    'lattafa-yara',
    'lattafa-yara-body-mist',
    'maison-alhambra-delilah',
    'maison-alhambra-delilah-body-mist',
  ],
  'armaf-club-de-nuit-intense-man-kit-presente': [
    'lattafa-asad-kit-presente',
    'lattafa-asad',
    'afnan-9pm',
    'rasasi-hawas-for-him',
  ],
  'lattafa-yara-body-mist': [
    'lattafa-yara',
    'maison-alhambra-delilah-body-mist',
    'al-wataniah-sabah-al-ward-body-spray',
    'al-wataniah-sabah-al-ward',
  ],
  'maison-alhambra-delilah-body-mist': [
    'lattafa-yara-body-mist',
    'maison-alhambra-delilah',
    'al-wataniah-sabah-al-ward',
    'al-wataniah-sabah-al-ward-body-spray',
  ],
  'al-wataniah-sabah-al-ward-body-spray': [
    'lattafa-yara-body-mist',
    'maison-alhambra-delilah-body-mist',
    'al-wataniah-sabah-al-ward',
    'lattafa-yara',
  ],
  'lattafa-khamrah-locao-hidratante': [
    'lattafa-khamrah',
    'al-wataniah-attar-al-wesal',
    'lattafa-yara',
    'afnan-9pm',
  ],
  'lattafa-yara-locao-hidratante': [
    'lattafa-yara',
    'lattafa-yara-body-mist',
    'al-wataniah-sabah-al-ward-creme-hidratante',
    'al-wataniah-sabah-al-ward',
  ],
  'al-wataniah-sabah-al-ward-creme-hidratante': [
    'maison-alhambra-delilah',
    'maison-alhambra-delilah-body-mist',
    'al-wataniah-sabah-al-ward',
    'al-wataniah-sabah-al-ward-body-spray',
  ],
};
