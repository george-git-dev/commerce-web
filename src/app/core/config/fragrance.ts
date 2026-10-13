/**
 * Listas fixas do catálogo de perfumes. São a fonte de verdade do cadastro
 * (backoffice) e dos filtros: nada de texto livre, senão "Oud" e "oud" viram
 * duas notas diferentes e a comparação entre perfumes deixa de funcionar.
 *
 * Para acrescentar uma opção, inclua na lista certa (em ordem alfabética).
 */

export const OLFACTORY_FAMILIES = [
  'Almiscarado',
  'Amadeirado',
  'Aquático',
  'Aromático',
  'Chipre',
  'Cítrico',
  'Couro',
  'Especiado',
  'Floral',
  'Fougère',
  'Frutado',
  'Gourmand',
  'Oriental',
  'Verde',
] as const;

export type OlfactoryFamily = (typeof OLFACTORY_FAMILIES)[number];

export const FRAGRANCE_NOTES = [
  'Açafrão',
  'Alecrim',
  'Almíscar',
  'Âmbar',
  'Baunilha',
  'Benjoim',
  'Bergamota',
  'Café',
  'Canela',
  'Cardamomo',
  'Cedro',
  'Chá Branco',
  'Couro',
  'Cravo',
  'Fava Tonka',
  'Flor de Laranjeira',
  'Folhas Verdes',
  'Framboesa',
  'Fumaça',
  'Groselha',
  'Incenso',
  'Íris',
  'Jasmim',
  'Laranja',
  'Lavanda',
  'Limão Siciliano',
  'Madeiras Brancas',
  'Mirra',
  'Musgo',
  'Oud',
  'Patchouli',
  'Pera',
  'Pêssego',
  'Peônia',
  'Pimenta Preta',
  'Pimenta Rosa',
  'Rosa',
  'Sândalo',
  'Tabaco',
  'Tuberosa',
  'Vetiver',
] as const;

export type FragranceNote = (typeof FRAGRANCE_NOTES)[number];

/**
 * Imagem de cada nota (mock da futura biblioteca de notas no S3).
 * Toda nota TEM imagem: o tipo `Record<FragranceNote, string>` faz o build
 * falhar se uma nota nova entrar na lista sem imagem aqui. No back, a mesma
 * regra vira campo obrigatório no cadastro da nota.
 */
export const NOTE_IMAGES: Record<FragranceNote, string> = {
  Açafrão: 'img/notas/acafrao.webp',
  Alecrim: 'img/notas/alecrim.webp',
  Almíscar: 'img/notas/almiscar.webp',
  Âmbar: 'img/notas/ambar.webp',
  Baunilha: 'img/notas/baunilha.webp',
  Benjoim: 'img/notas/benjoim.webp',
  Bergamota: 'img/notas/bergamota.webp',
  Café: 'img/notas/cafe.webp',
  Canela: 'img/notas/canela.webp',
  Cardamomo: 'img/notas/cardamomo.webp',
  Cedro: 'img/notas/cedro.webp',
  'Chá Branco': 'img/notas/cha-branco.webp',
  Couro: 'img/notas/couro.webp',
  Cravo: 'img/notas/cravo.webp',
  'Fava Tonka': 'img/notas/fava-tonka.webp',
  'Flor de Laranjeira': 'img/notas/flor-de-laranjeira.webp',
  'Folhas Verdes': 'img/notas/folhas-verdes.webp',
  Framboesa: 'img/notas/framboesa.webp',
  Fumaça: 'img/notas/fumaca.webp',
  Groselha: 'img/notas/groselha.webp',
  Incenso: 'img/notas/incenso.webp',
  Íris: 'img/notas/iris.webp',
  Jasmim: 'img/notas/jasmim.webp',
  Laranja: 'img/notas/laranja.webp',
  Lavanda: 'img/notas/lavanda.webp',
  'Limão Siciliano': 'img/notas/limao-siciliano.webp',
  'Madeiras Brancas': 'img/notas/madeiras-brancas.webp',
  Mirra: 'img/notas/mirra.webp',
  Musgo: 'img/notas/musgo.webp',
  Oud: 'img/notas/oud.webp',
  Patchouli: 'img/notas/patchouli.webp',
  Pera: 'img/notas/pera.webp',
  Pêssego: 'img/notas/pessego.webp',
  Peônia: 'img/notas/peonia.webp',
  'Pimenta Preta': 'img/notas/pimenta-preta.webp',
  'Pimenta Rosa': 'img/notas/pimenta-rosa.webp',
  Rosa: 'img/notas/rosa.webp',
  Sândalo: 'img/notas/sandalo.webp',
  Tabaco: 'img/notas/tabaco.webp',
  Tuberosa: 'img/notas/tuberosa.webp',
  Vetiver: 'img/notas/vetiver.webp',
};

export const CONCENTRATIONS = [
  'Eau de Toilette',
  'Eau de Parfum',
  'Parfum',
  'Extrait de Parfum',
] as const;

export type Concentration = (typeof CONCENTRATIONS)[number];

/** Rótulos para exibir o tipo da variante. */
export const VARIANT_KIND_LABELS = {
  frasco: 'Frasco',
  decant: 'Decant',
} as const;

export const OCCASION_LABELS = {
  dia: 'Dia',
  noite: 'Noite',
} as const;
