import { replyProblem, reviewerName, reviewFlags } from './review-text';

describe('textos das avaliações', () => {
  it('nome do autor: primeiro nome + inicial do último', () => {
    expect(reviewerName('maria silva souza')).toBe('Maria S.');
    expect(reviewerName('Bruno')).toBe('Bruno');
    expect(reviewerName('  ')).toBe('Cliente');
  });

  it('destaca link, telefone e e-mail', () => {
    expect(reviewFlags('Muito bom, fixação ótima.')).toEqual([]);
    expect(reviewFlags('compre em www.barato.com')).toEqual(['link']);
    expect(reviewFlags('chama no (11) 98888-7777')).toEqual(['telefone']);
    expect(reviewFlags('fala comigo: ana@x.com')).toEqual(['e-mail']);
  });

  it('resposta da loja: tamanho, sem HTML e sem link', () => {
    expect(replyProblem('Obrigado pelo retorno!')).toBeNull();
    expect(replyProblem('oi'), 'curta').toContain('pelo menos');
    expect(replyProblem('<b>oi</b> tudo bem'), 'html').toContain('<');
    expect(replyProblem('veja em www.loja.com'), 'link').toContain('link');
  });
});
