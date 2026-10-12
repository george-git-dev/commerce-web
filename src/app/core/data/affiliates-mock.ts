import { AFFILIATE_PROGRAM } from '../config/affiliate';
import { Affiliate } from '../models/affiliate';

/** Afiliados FICTÍCIOS (um em análise e um aprovado). Somem na Fase 2. */
export const AFFILIATES_MOCK: readonly Affiliate[] = [
  {
    id: 1,
    email: 'julia.afiliada@email.com',
    name: 'Júlia Andrade',
    channel: 'Instagram',
    profile: '@juliaperfumada',
    pitch: 'Faço resenhas de perfumes árabes nos stories e no feed, com 18 mil seguidores.',
    pixKey: 'julia.afiliada@email.com',
    acceptedTermsAt: new Date(2026, 8, 20, 10, 12),
    createdAt: new Date(2026, 8, 20, 10, 12),
    status: 'aprovado',
    couponCode: 'JULIA5',
    commissionPercent: AFFILIATE_PROGRAM.commissionPercent,
    payoutMethod: 'pix',
    decision: { by: 'George', at: new Date(2026, 8, 21, 9, 30) },
  },
  {
    id: 2,
    email: 'carla.mendes@email.com',
    name: 'Carla Mendes',
    channel: 'TikTok',
    profile: '@carlacheirosa',
    pitch: 'Vídeos curtos comparando perfumes árabes com os de grife (dupes), 40 mil seguidores.',
    pixKey: '11987654321',
    acceptedTermsAt: new Date(2026, 9, 11, 21, 4),
    createdAt: new Date(2026, 9, 11, 21, 4),
    status: 'pendente',
    commissionPercent: AFFILIATE_PROGRAM.commissionPercent,
    payoutMethod: 'pix',
  },
];
