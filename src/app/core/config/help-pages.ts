import { STORE_CONFIG } from './store-config';
import { HelpGroup, HelpPage } from '../models/help-page';

const store = STORE_CONFIG;
const FREE_SHIPPING = 'R$ 599';

/**
 * Conteúdo das páginas de ajuda e políticas. Fica no front (texto estático,
 * versionado com o código); se um dia mudar com frequência, vira CMS.
 *
 * ⚠ RASCUNHO (dívida técnica): textos-base escritos a partir do CDC e da LGPD,
 * para o layout ter conteúdo real. Antes do lançamento, revisar com advogado e
 * ajustar às regras do gateway, da transportadora e da operação de verdade.
 */
export const HELP_PAGES: readonly HelpPage[] = [
  {
    slug: 'contato',
    title: 'Contato',
    group: 'institucional',
    summary: 'Fale com a gente pelo canal que preferir.',
    updatedAt: '2026-10-02',
    sections: [
      {
        heading: 'Canais de atendimento',
        items: [
          `WhatsApp: ${store.whatsapp}`,
          `Telefone: ${store.phone}`,
          `E-mail: ${store.email}`,
          `Horário: ${store.hours}`,
        ],
      },
      {
        heading: 'Antes de chamar',
        paragraphs: [
          'Para falar sobre um pedido, tenha em mãos o número dele (está no e-mail de confirmação e em Minha conta → Pedidos). Assim o atendimento é mais rápido.',
        ],
      },
      {
        heading: 'Dados da empresa',
        items: [store.legalName, `CNPJ ${store.cnpj}`, store.address],
      },
    ],
  },
  {
    slug: 'envio-e-prazos',
    title: 'Envio e prazos',
    group: 'suporte',
    summary: 'Como, quando e por quanto o seu pedido chega.',
    updatedAt: '2026-10-02',
    sections: [
      {
        heading: 'Prazo de entrega',
        paragraphs: [
          'O prazo e o valor do frete aparecem no carrinho e no checkout, calculados pelo seu CEP, antes de você pagar.',
          'O prazo começa a contar depois da aprovação do pagamento. Pedidos aprovados em dia útil até as 14h são despachados no mesmo dia.',
        ],
      },
      {
        heading: 'Frete grátis',
        paragraphs: [`Compras acima de ${FREE_SHIPPING} têm frete grátis para todo o Brasil.`],
      },
      {
        heading: 'Rastreamento',
        paragraphs: [
          'Assim que o pedido sai, você recebe o código de rastreio por e-mail. Ele também fica em Minha conta → Pedidos.',
        ],
      },
      {
        heading: 'Embalagem',
        paragraphs: [
          'Os frascos seguem lacrados, em embalagem reforçada para evitar danos no transporte.',
          'Se a encomenda chegar violada ou danificada, recuse o recebimento ou fotografe a caixa e fale com a gente em até 7 dias.',
        ],
      },
    ],
  },
  {
    slug: 'pagamento',
    title: 'Pagamento',
    group: 'suporte',
    summary: 'Formas de pagamento aceitas e como funciona a aprovação.',
    updatedAt: '2026-10-02',
    sections: [
      {
        heading: 'Formas aceitas',
        items: [
          'Pix: aprovação na hora.',
          'Cartão de crédito (Visa, Mastercard, American Express, Elo, Hipercard): parcelamento conforme as condições exibidas no checkout.',
          'Boleto: compensação em até 3 dias úteis.',
        ],
      },
      {
        heading: 'Segurança do pagamento',
        paragraphs: [
          'O pagamento é processado diretamente pelo nosso parceiro de pagamentos. Os dados do cartão não passam nem ficam guardados na Nani Perfumes.',
        ],
      },
      {
        heading: 'Pedido não aprovado',
        paragraphs: [
          'Se o pagamento não for aprovado, o pedido é cancelado automaticamente e nenhum valor é cobrado. Você pode tentar de novo com outra forma de pagamento.',
        ],
      },
    ],
  },
  {
    slug: 'trocas-e-devolucoes',
    title: 'Trocas e devoluções',
    group: 'suporte',
    summary: 'Seus direitos e o passo a passo para trocar ou devolver.',
    updatedAt: '2026-10-02',
    sections: [
      {
        heading: 'Arrependimento (até 7 dias)',
        paragraphs: [
          'Pelo artigo 49 do Código de Defesa do Consumidor, você pode desistir da compra em até 7 dias corridos a partir do recebimento, sem precisar justificar.',
          'Nesse caso devolvemos o valor integral pago, incluindo o frete, na mesma forma de pagamento usada na compra.',
        ],
      },
      {
        heading: 'Produto com defeito',
        paragraphs: [
          'Perfumes e cosméticos são produtos não duráveis: você tem até 30 dias a partir do recebimento para nos avisar sobre um defeito aparente (artigo 26 do CDC).',
          'Após a análise, você escolhe entre a troca por um produto igual, outro produto ou o reembolso.',
        ],
      },
      {
        heading: 'Como solicitar',
        items: [
          `Fale com a gente pelo WhatsApp ${store.whatsapp} ou pelo e-mail ${store.email}, informando o número do pedido.`,
          'Enviamos as instruções e o código de postagem, sem custo para você.',
          'O produto deve voltar com a embalagem e os itens que acompanharam a entrega.',
          'O reembolso ou a troca acontece em até 10 dias úteis depois que o produto chega até nós.',
        ],
      },
    ],
  },
  {
    slug: 'perguntas-frequentes',
    title: 'Perguntas frequentes',
    group: 'suporte',
    summary: 'Respostas rápidas para as dúvidas mais comuns.',
    updatedAt: '2026-10-02',
    faq: true,
    sections: [
      {
        heading: 'Os perfumes são originais?',
        paragraphs: [
          'Sim. Todos os produtos são originais, comprados de importadores e distribuidores oficiais, e chegam lacrados.',
        ],
      },
      {
        heading: 'Qual o prazo de entrega?',
        paragraphs: [
          'Depende do seu CEP. O prazo aparece no carrinho antes do pagamento e começa a contar depois da aprovação.',
        ],
      },
      {
        heading: 'Como acompanho meu pedido?',
        paragraphs: [
          'O código de rastreio chega por e-mail assim que o pedido é despachado e também fica em Minha conta → Pedidos.',
        ],
      },
      {
        heading: 'Posso trocar se não gostar do perfume?',
        paragraphs: [
          'Sim, em até 7 dias após o recebimento (direito de arrependimento). Veja o passo a passo em Trocas e devoluções.',
        ],
      },
      {
        heading: 'Vocês emitem nota fiscal?',
        paragraphs: ['Sim. A nota fiscal eletrônica é enviada por e-mail junto com o despacho.'],
      },
      {
        heading: 'O que significam família olfativa e notas?',
        paragraphs: [
          'A família olfativa é o "estilo" do perfume (oriental, floral, amadeirado…). As notas mostram como ele evolui na pele: as de topo aparecem primeiro, as de coração em seguida e as de fundo são as que ficam por mais tempo.',
        ],
      },
    ],
  },
  {
    slug: 'termos-de-uso',
    title: 'Termos de uso',
    group: 'politicas',
    summary: 'As regras para usar o site e comprar na Nani Perfumes.',
    updatedAt: '2026-10-02',
    sections: [
      {
        heading: 'Sobre estes termos',
        paragraphs: [
          `Este site é operado por ${store.legalName}, CNPJ ${store.cnpj}, com sede em ${store.address}. Ao usar o site ou fazer um pedido, você concorda com estes termos.`,
        ],
      },
      {
        heading: 'Cadastro',
        paragraphs: [
          'Para comprar é preciso ter cadastro com dados verdadeiros. Você é responsável por manter sua senha em sigilo.',
        ],
      },
      {
        heading: 'Preços e disponibilidade',
        paragraphs: [
          'Preços e estoque podem mudar sem aviso. Vale o preço exibido no momento da finalização do pedido.',
          'Se houver erro evidente de preço ou falta de estoque após a compra, entraremos em contato para oferecer a correção ou o cancelamento com reembolso integral.',
        ],
      },
      {
        heading: 'Conteúdo do site',
        paragraphs: [
          'Textos, fotos e marca da Nani Perfumes não podem ser copiados sem autorização. As marcas dos perfumes pertencem aos seus fabricantes.',
        ],
      },
      {
        heading: 'Legislação',
        paragraphs: [
          'Estes termos seguem a legislação brasileira, em especial o Código de Defesa do Consumidor.',
        ],
      },
    ],
  },
  {
    slug: 'privacidade',
    title: 'Política de privacidade',
    group: 'politicas',
    summary: 'Quais dados coletamos, para quê e como você controla isso (LGPD).',
    updatedAt: '2026-10-02',
    sections: [
      {
        heading: 'Dados que coletamos',
        items: [
          'Cadastro: nome, e-mail, CPF e telefone.',
          'Entrega: endereço.',
          'Pedidos: produtos comprados, valores e status.',
          'Navegação: cookies essenciais para o carrinho e o login funcionarem.',
        ],
      },
      {
        heading: 'Para que usamos',
        paragraphs: [
          'Para processar e entregar pedidos, emitir nota fiscal, prestar atendimento e cumprir obrigações legais. Comunicações de marketing só com o seu consentimento, e você pode cancelar quando quiser.',
        ],
      },
      {
        heading: 'Com quem compartilhamos',
        paragraphs: [
          'Somente com quem é necessário para concluir a compra: o parceiro de pagamentos e a transportadora. Não vendemos dados.',
          'Os dados do cartão são tratados diretamente pelo parceiro de pagamentos e não ficam guardados conosco.',
        ],
      },
      {
        heading: 'Seus direitos',
        paragraphs: [
          `Pela LGPD, você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, e revogar consentimentos. Para isso, escreva para ${store.email}.`,
        ],
      },
      {
        heading: 'Segurança e retenção',
        paragraphs: [
          'Os dados ficam em ambiente protegido, com acesso restrito. Guardamos apenas pelo tempo necessário para as finalidades acima ou exigido por lei.',
        ],
      },
    ],
  },
  {
    slug: 'seguranca',
    title: 'Segurança',
    group: 'politicas',
    summary: 'Como protegemos a sua compra e como evitar golpes.',
    updatedAt: '2026-10-02',
    sections: [
      {
        heading: 'Site protegido',
        items: [
          'Conexão criptografada (HTTPS) em todas as páginas.',
          'Pagamento processado pelo parceiro de pagamentos: os dados do cartão não passam pela loja.',
          'Senhas guardadas de forma criptografada.',
        ],
      },
      {
        heading: 'Cuidado com golpes',
        items: [
          'Nunca pedimos sua senha ou código de verificação por WhatsApp, e-mail ou telefone.',
          'Não enviamos links de pagamento fora do site.',
          `Na dúvida, confirme pelos canais oficiais: ${store.whatsapp} ou ${store.email}.`,
        ],
      },
    ],
  },
];

export const HELP_GROUP_LABELS: Record<HelpGroup, string> = {
  institucional: 'Institucional',
  suporte: 'Ajuda e suporte',
  politicas: 'Termos e políticas',
};
