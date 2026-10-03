import { BrandIconName } from './brand-icons';

export interface SocialLink {
  /** Ícone de marca (`BRAND_ICONS`). */
  brand: BrandIconName;
  label: string;
  url: string;
}

export interface PaymentMethod {
  label: string;
  /** Sem ícone de marca disponível (Elo, Hipercard, Boleto): vira selo de texto. */
  brand?: BrandIconName;
}

export interface StoreConfig {
  name: string;
  tagline: string;
  /** Razão social — obrigatória no site (Decreto 7.962/2013), junto com CNPJ e endereço. */
  legalName: string;
  cnpj: string;
  address: string;
  phone: string;
  phoneHref: string;
  whatsapp: string;
  whatsappHref: string;
  email: string;
  emailHref: string;
  hours: string;
  delivery: string;
  /** Pedido a partir deste valor (R$) tem o frete econômico grátis. */
  freeShippingMin: number;
  /** Desconto no Pix (%). 0 = desligado (decisão de 02/10). */
  pixDiscountPercent: number;
  /** Parcelas sem juros no cartão. */
  maxInstallments: number;
  /** Valor mínimo de cada parcela (R$) — depende do gateway (decisão pendente). */
  minInstallmentValue: number;
}

/**
 * ⚠ DADOS FICTÍCIOS (dívida técnica): trocar pelos reais antes do lançamento —
 * razão social, CNPJ, endereço, telefones, e-mail, horário e redes sociais.
 * Este é o único lugar onde esses dados ficam; rodapé e páginas de ajuda leem daqui.
 */
export const STORE_CONFIG: StoreConfig = {
  name: 'Nani Perfumes',
  tagline: 'Essência do Oriente',
  legalName: 'Nani Comércio de Perfumes LTDA',
  cnpj: '12.345.678/0001-90',
  address: 'Alameda Lorena, 1420 - Jardins, São Paulo - SP, 01424-001',
  phone: '(11) 3456-7890',
  phoneHref: 'tel:+551134567890',
  whatsapp: '(11) 93456-7890',
  whatsappHref: 'https://wa.me/5511934567890',
  email: 'atendimento@naniperfumes.com.br',
  emailHref: 'mailto:atendimento@naniperfumes.com.br',
  hours: 'Segunda a sexta, das 9h às 18h',
  delivery: '2 - 5 dias úteis',
  freeShippingMin: 599,
  pixDiscountPercent: 0,
  maxInstallments: 6,
  minInstallmentValue: 20,
};

/** Perfis da loja, na ordem de exibição (URLs fictícias até o lançamento). */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { brand: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/naniperfumes' },
  { brand: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@naniperfumes' },
  { brand: 'whatsapp', label: 'WhatsApp', url: STORE_CONFIG.whatsappHref },
];

/** Formas de pagamento exibidas no rodapé — confirmar com o gateway escolhido (B6). */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { label: 'Pix', brand: 'pix' },
  { label: 'Visa', brand: 'visa' },
  { label: 'Mastercard', brand: 'mastercard' },
  { label: 'American Express', brand: 'amex' },
  { label: 'Elo' },
  { label: 'Hipercard' },
  { label: 'Boleto' },
];

/** Mensagens da faixa rolante no topo do site, na ordem de exibição. */
export const ANNOUNCEMENTS: readonly string[] = [
  'Frete grátis acima de R$ 599',
  'Parcele em até 12x',
  'Compra segura',
];
