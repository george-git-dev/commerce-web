import { TestBed } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  currentUrl,
  loginAs,
  renderAt,
  settle,
  textOf,
  type,
} from '../../../testing/test-helpers';
import { ReturnService } from '../../core/services/return-service';
import { ReviewService } from '../../core/services/review-service';
import { OrderDetail } from './order-detail/order-detail';
import { ReturnRequestPage } from './return-request/return-request';

const BIA = 'bia@email.com';

describe('Detalhe do pedido', () => {
  beforeEach(() => localStorage.clear());

  const open = (number: string, email = BIA) =>
    renderAt(`/minha-conta/pedidos/${number}`, OrderDetail, {
      path: 'minha-conta/pedidos/:numero',
      setup: () => loginAs(email),
    });

  it('aguardando Pix mostra o Pix e a linha do tempo; inexistente avisa', async () => {
    const { fixture } = await open('NP100258');
    expect($$(fixture, 'app-pix-payment')).toHaveLength(1);
    expect($$(fixture, '.od__step--done').length).toBeGreaterThan(0);
    TestBed.resetTestingModule();
    const missing = await open('NP000001');
    expect(textOf(missing.fixture)).toContain('Pedido não encontrado');
  });

  it('entregue há 15 dias: avalia o item e pode pedir devolução', async () => {
    const { fixture } = await open('NP100231');
    expect(buttonByText(fixture, 'Solicitar devolução')).toBeTruthy();
    const avaliar = buttonByText(fixture, 'Avaliar');
    avaliar.click();
    await settle(fixture);
    expect($$(fixture, 'app-review-form')).toHaveLength(1);

    // Sem nota nem comentário: avisa.
    $(fixture, 'app-review-form form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(textOf(fixture)).toContain('Escolha de 1 a 5 estrelas.');

    $(fixture, '[aria-label="5 estrelas"]').click();
    type($(fixture, 'app-review-form textarea'), 'Fixação ótima, dura o dia todo.');
    $(fixture, 'app-review-form form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect($$(fixture, 'app-review-form')).toHaveLength(0);
    expect(textOf(fixture)).toContain('Avaliação em análise');
    expect(TestBed.inject(ReviewService).of('NP100231', 'NP100231-1')?.rating).toBe(5);
  });

  it('entregue há 2 dias: avaliação espera o prazo de devolução', async () => {
    const { fixture } = await open('NP100238');
    expect(textOf(fixture)).toMatch(/Você poderá avaliar a partir de/);
  });

  it('devolução em andamento trava a avaliação e mostra o status', async () => {
    const { fixture } = await open('NP100238', 'ana@email.com');
    expect(textOf(fixture)).toContain('quando a devolução for finalizada');
    expect(textOf(fixture)).toContain('Devolução ·');
    expect($$(fixture, '.od__return-btn')).toHaveLength(0);
  });

  it('mostra cada desfecho da devolução (aprovada, concluída, recusada após avaliação)', async () => {
    const { fixture } = await open('NP100231', 'ana@email.com');
    const returns = TestBed.inject(ReturnService);
    const created = returns.add({
      ...returns.forOrder('NP100238', 'ana@email.com')[0],
      orderNumber: 'NP100231',
    });
    for (const [change, text] of [
      [{ status: 'aprovada' }, 'Pode enviar o produto'],
      [
        { status: 'concluida', completion: { by: 'Admin', at: new Date() } },
        'Produto recebido e estorno',
      ],
      [
        {
          status: 'recusada',
          decision: { by: 'Admin', at: new Date(), reason: 'Frasco usado', afterReview: true },
        },
        'Avaliamos o produto',
      ],
      [{ status: 'recusada', decision: { by: 'Admin', at: new Date() } }, 'Devolução não aceita.'],
    ] as const) {
      returns.update(created.id, change as never);
      await settle(fixture);
      expect(textOf(fixture)).toContain(text);
    }
  });
});

describe('Solicitar devolução', () => {
  beforeEach(() => {
    localStorage.clear();
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
  });

  const open = (number: string, email = BIA) =>
    renderAt(`/minha-conta/pedidos/${number}/devolucao`, ReturnRequestPage, {
      path: 'minha-conta/pedidos/:numero/devolucao',
      setup: () => loginAs(email),
    });

  const submit = async (fixture: Parameters<typeof settle>[0]) => {
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
  };

  const radio = (fixture: Parameters<typeof settle>[0], label: string) =>
    $$(fixture, '.rr__radio')
      .find((el) => el.textContent?.includes(label))!
      .querySelector('input')!;

  it('travas: não entregue, inexistente e devolução em andamento', async () => {
    expect(textOf((await open('NP100245')).fixture)).toContain('depois que o pedido é entregue');
    TestBed.resetTestingModule();
    expect(textOf((await open('NP000001')).fixture)).toContain('Pedido não encontrado.');
    TestBed.resetTestingModule();
    expect(textOf((await open('NP100238', 'ana@email.com')).fixture)).toContain(
      'Já existe uma devolução em andamento',
    );
  });

  it('desistência: exige item e lacre; envia e volta para o pedido', async () => {
    const { fixture } = await open('NP100238');
    await submit(fixture);
    expect($$(fixture, '.rr__problems li').length).toBeGreaterThan(0);

    ($(fixture, '.rr__pick input') as HTMLInputElement).click();
    radio(fixture, 'Desisti').click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Valor a estornar');
    await submit(fixture);
    expect($$(fixture, '.rr__problems li').length).toBeGreaterThan(0);

    ($(fixture, '.rr__seal input') as HTMLInputElement).click();
    await settle(fixture);
    await submit(fixture);
    expect(TestBed.inject(ReturnService).openFor('NP100238', BIA)?.reason).toBe('arrependimento');
    expect(currentUrl()).toBe('/minha-conta/pedidos/NP100238');
  });

  it('defeito depois de 7 dias: desistência fechada, pede fotos, quantidade e descrição', async () => {
    const { fixture } = await open('NP100231');
    expect(radio(fixture, 'Desisti').disabled).toBe(true);
    radio(fixture, 'defeito').click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Conte o que aconteceu');

    // Item com 2 unidades: escolhe a quantidade.
    const picks = $$(fixture, '.rr__pick input') as HTMLInputElement[];
    picks[1].click();
    await settle(fixture);
    const select = $(fixture, '.rr__qty select') as HTMLSelectElement;
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    type($(fixture, 'textarea'), 'A válvula não borrifa.');

    const input = $(fixture, '.rr__add input') as HTMLInputElement;
    const add = (files: File[]) => {
      Object.defineProperty(input, 'files', { value: files, configurable: true });
      input.dispatchEvent(new Event('change'));
    };
    add([new File(['x'], 'nota.pdf', { type: 'application/pdf' })]);
    await settle(fixture);
    expect($$(fixture, '.rr__photos [role="alert"]')).toHaveLength(1);
    add([new File(['x'], 'foto.jpg', { type: 'image/jpeg' })]);
    await settle(fixture);
    expect($$(fixture, '.rr__photos li')).toHaveLength(1);
    $(fixture, '.rr__remove').click();
    await settle(fixture);
    expect($$(fixture, '.rr__photos li')).toHaveLength(0);
    add(Array.from({ length: 6 }, (_, i) => new File(['x'], `f${i}.png`, { type: 'image/png' })));
    await settle(fixture);
    expect(textOf(fixture)).toContain('No máximo 5 fotos.');

    await submit(fixture);
    const created = TestBed.inject(ReturnService).openFor('NP100231', BIA)!;
    expect(created.items).toEqual([expect.objectContaining({ quantity: 1 })]);
    expect(created.photos).toHaveLength(5);
  });
});
