import { MOCK_PRODUCTS } from '../../../core/data/mock-products';
import { AuditEntry, AuditOrigin, mockIp } from '../services/admin-audit';
import { statusLabel } from '../services/admin-order-flow';
import { AdminOrder } from './admin-orders-mock';

const DAY = 86_400_000;

/** Perfil de cada pessoa da equipe fictícia (na hora da ação). */
const ROLE_OF: Record<string, string> = {
  George: 'Admin',
  Admin: 'Admin',
  'Super Admin': 'Super admin',
};

/** Origem fictícia: IP fixo por pessoa; dispositivo alterna pelo minuto. */
function origin(by: string, at: Date): AuditOrigin {
  return { ip: mockIp(by), device: at.getMinutes() % 3 === 0 ? 'Computador' : 'Celular' };
}

type Draft = Omit<AuditEntry, 'role' | 'origin'>;
const complete = (draft: Draft): AuditEntry => ({
  ...draft,
  role: ROLE_OF[draft.by] ?? 'Admin',
  origin: origin(draft.by, draft.at),
});

/**
 * Histórico FICTÍCIO de auditoria dos últimos 30 dias, para a tela não nascer
 * vazia. As mudanças de status saem do histórico dos próprios pedidos do mock
 * (batem com a tela do pedido); o resto são exemplos de cada área. Some na
 * Fase 2 — a auditoria vem de `GET /admin/audit`.
 */
export function auditMock(orders: readonly AdminOrder[], now: Date): AuditEntry[] {
  const since = now.getTime() - 30 * DAY;
  const fromOrders = orders.flatMap((order) =>
    order.history.flatMap((event, index): Draft[] => {
      if (event.by === 'Sistema' || index === 0) return [];
      // Só o que já aconteceu nos últimos 30 dias.
      if (event.at.getTime() < since || event.at.getTime() > now.getTime()) return [];
      const previous = order.history[index - 1].status;
      return [
        {
          at: event.at,
          by: event.by,
          action: event.status === 'cancelado' ? 'Cancelou pedido' : 'Alterou status do pedido',
          entity: 'Pedido',
          entityId: order.number,
          changes: [
            {
              field: 'Status',
              before: statusLabel(previous, order.shipping),
              after: statusLabel(event.status, order.shipping),
            },
            ...(event.status === 'enviado' && order.trackingCode
              ? [{ field: 'Rastreio', before: '—', after: order.trackingCode }]
              : []),
            ...(event.status === 'cancelado' && order.cancelReason
              ? [{ field: 'Motivo', before: '', after: order.cancelReason }]
              : []),
          ],
        },
      ];
    }),
  );

  const ago = (days: number, hour: number) => {
    const date = new Date(now.getTime() - days * DAY);
    date.setHours(hour, 17, 0, 0);
    return date;
  };
  const [asad, yara, khamrah, , , cdnim] = MOCK_PRODUCTS;
  const sku = (index: number) => MOCK_PRODUCTS[index].variants[0].id;

  const extras: Draft[] = [
    {
      at: ago(27, 10),
      by: 'Admin',
      action: 'Editou produto',
      entity: 'Produto',
      entityId: khamrah.name,
      link: `/admin/produtos/${khamrah.slug}`,
      changes: [
        { field: `Preço ${khamrah.variants[0].id}`, before: 'R$ 319,90', after: 'R$ 299,90' },
      ],
    },
    {
      at: ago(25, 16),
      by: 'Admin',
      action: 'Ajustou estoque',
      entity: 'Estoque',
      entityId: sku(0),
      changes: [
        { field: 'Saldo', before: '26', after: '24' },
        { field: 'Motivo', before: '', after: 'Avaria (frasco quebrado no transporte)' },
      ],
    },
    {
      at: ago(21, 11),
      by: 'Super Admin',
      action: 'Recebeu entrada de mercadoria',
      entity: 'Entrada',
      entityId: 'NF 1.902',
      link: '/admin/estoque/entradas/3',
      changes: [
        { field: `Estoque ${sku(0)}`, before: '—', after: '+12' },
        { field: `Estoque ${sku(1)}`, before: '—', after: '+6' },
      ],
    },
    {
      at: ago(18, 9),
      by: 'Super Admin',
      action: 'Alterou configurações',
      entity: 'Configurações',
      entityId: 'loja',
      changes: [{ field: 'Frete grátis acima de', before: 'R$ 499,00', after: 'R$ 599,00' }],
    },
    {
      at: ago(14, 15),
      by: 'Admin',
      action: 'Alterou banner',
      entity: 'Banner',
      entityId: '1',
      changes: [{ field: 'Período', before: 'sem fim', after: 'até 31/10/2026' }],
    },
    {
      at: ago(12, 10),
      by: 'Admin',
      action: 'Aprovou avaliação',
      entity: 'Avaliação',
      entityId: `219 · ${yara.name}`,
      changes: [{ field: 'Situação', before: 'Pendente', after: 'Aprovada' }],
    },
    {
      at: ago(12, 10),
      by: 'Admin',
      action: 'Reprovou avaliação',
      entity: 'Avaliação',
      entityId: `8811 · ${asad.name}`,
      changes: [
        { field: 'Situação', before: 'Pendente', after: 'Reprovada' },
        { field: 'Motivo', before: '', after: 'Spam ou propaganda' },
      ],
    },
    {
      at: ago(9, 14),
      by: 'Admin',
      action: 'Alterou estoque mínimo',
      entity: 'Estoque',
      entityId: sku(5),
      changes: [{ field: 'Estoque mínimo', before: '3', after: '5' }],
    },
    {
      at: ago(6, 17),
      by: 'Super Admin',
      action: 'Criou aviso',
      entity: 'Aviso',
      entityId: '4',
      changes: [{ field: 'Texto', before: '', after: 'Frete grátis acima de {freteGratis}' }],
    },
    {
      at: ago(4, 11),
      by: 'Admin',
      action: 'Editou produto',
      entity: 'Produto',
      entityId: cdnim.name,
      link: `/admin/produtos/${cdnim.slug}`,
      changes: [{ field: 'Status', before: 'Rascunho', after: 'Publicado' }],
    },
    {
      at: ago(2, 9),
      by: 'Super Admin',
      action: 'Registrou entrada de mercadoria',
      entity: 'Entrada',
      entityId: 'NF 7.388',
      link: '/admin/estoque/entradas/4',
      changes: [],
    },
  ];
  return [...fromOrders, ...extras].map(complete);
}
