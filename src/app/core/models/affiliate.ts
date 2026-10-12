import { AffiliateChannel } from '../config/affiliate';
import { PayoutMethod } from './commission';

export type AffiliateStatus = 'pendente' | 'aprovado' | 'reprovado';

/**
 * Pedido de afiliação (e, depois de aprovado, o afiliado). A chave Pix é dado
 * sensível: fica só no back; no front só aparece mascarada (nunca no navegador).
 * Contrato do futuro `POST /me/affiliate` e `GET /admin/affiliates`.
 */
export interface Affiliate {
  id: number;
  /** Conta da loja (todo afiliado é cliente cadastrado). */
  email: string;
  name: string;
  channel: AffiliateChannel;
  /** @ ou link do perfil principal. */
  profile: string;
  /** Como pretende divulgar (texto curto). */
  pitch: string;
  pixKey: string;
  /** Aceite dos termos do programa (data/hora; o back guarda a versão do termo). */
  acceptedTermsAt: Date;
  createdAt: Date;
  status: AffiliateStatus;
  /** Cupom próprio (criado ao aprovar). */
  couponCode?: string;
  /** Comissão (%) deste afiliado. */
  commissionPercent: number;
  /** Como quer receber no próximo fechamento (padrão: Pix). */
  payoutMethod: PayoutMethod;
  decision?: { by: string; at: Date; reason?: string };
}

export type AffiliateDraft = Pick<Affiliate, 'channel' | 'profile' | 'pitch' | 'pixKey'>;
