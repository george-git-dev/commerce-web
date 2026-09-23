export interface SocialLink {
  icon: string;
  label: string;
  url: string;
}

export interface StoreConfig {
  name: string;
  tagline: string;
  phone: string;
  phoneHref: string;
  whatsappHref: string;
  address: string;
  cnpj: string;
  delivery: string;
}

export const STORE_CONFIG: StoreConfig = {
  name: 'Nani Perfums',
  tagline: 'Essência do Oriente',
  phone: '(11) 3456-7890',
  phoneHref: 'tel:+551134567890',
  whatsappHref: 'https://wa.me/551134567890',
  address: 'Alameda Lorena, 1420 - Jardins, São Paulo - SP',
  cnpj: '12.345.678/0000-01',
  delivery: '2 - 5 dias úteis',
};

/**
 * Só entram aqui perfis com URL real — a lista é renderizada como está.
 * Instagram, Facebook e YouTube foram retirados por não terem destino conhecido;
 * basta adicioná-los aqui com a URL correta para voltarem a aparecer.
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { icon: 'chat', label: 'WhatsApp', url: STORE_CONFIG.whatsappHref },
];
