import { TestBed } from '@angular/core/testing';
import {
  $,
  $$,
  buttonByText,
  loginAs,
  renderAt,
  settle,
  textOf,
  type,
} from '../../../testing/test-helpers';
import { AffiliateProgram } from '../../core/services/affiliate-program';
import { AffiliateService } from '../../core/services/affiliate-service';
import { AffiliateArea } from '../account/affiliate/affiliate-area';
import { AffiliateLanding } from './affiliate-landing';

const pause = () => {
  const program = TestBed.inject(AffiliateProgram);
  program.save({ ...program.settings(), active: false });
};

describe('Área do afiliado', () => {
  beforeEach(() => localStorage.clear());

  const open = (email: string, setup?: () => void) =>
    renderAt('/minha-conta/afiliado', AffiliateArea, {
      setup: () => {
        loginAs(email);
        setup?.();
      },
    });

  it('afiliada aprovada: cupom, copiar, forma de pagamento e vendas', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture } = await open('affiliate');
    expect($$(fixture, 'app-coupon-ticket')).toHaveLength(1);
    expect($(fixture, 'a[href^="https://wa.me/"]').getAttribute('href')).toContain('cupom');

    buttonByText(fixture, 'Copiar cupom').click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());

    const radios = $$(fixture, 'input[name="payout"]') as HTMLInputElement[];
    radios[1].click();
    await settle(fixture);
    expect(TestBed.inject(AffiliateService).mine()?.payoutMethod).toBe('credito');
    radios[0].click();
    await settle(fixture);
    expect(TestBed.inject(AffiliateService).mine()?.payoutMethod).toBe('pix');
    expect($$(fixture, '.afa__kpis div')).toHaveLength(3);
  });

  it('clipboard indisponível mostra o cupom para copiar à mão', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('negado')) },
      configurable: true,
    });
    const { fixture } = await open('affiliate');
    buttonByText(fixture, 'Copiar cupom').click();
    await settle(fixture);
  });

  it('programa pausado: afiliada vê o aviso e o histórico', async () => {
    const { fixture } = await open('affiliate', pause);
    expect(textOf(fixture)).toContain('Sua participação está pausada.');
    expect($$(fixture, 'app-coupon-ticket')).toHaveLength(0);
  });

  it('pedido em análise e aprovado sem sair/entrar', async () => {
    const pending = await open('carla.mendes@email.com');
    expect(textOf(pending.fixture)).toContain('Pedido em análise');
    const service = TestBed.inject(AffiliateService);
    service.decide(service.mine()!.id, { status: 'aprovado', couponCode: 'CARLA5' });
    await settle(pending.fixture);
    expect(textOf(pending.fixture)).toContain('Saia e entre de novo');
  });

  it('não aprovado vê o motivo e o prazo para pedir de novo', async () => {
    const { fixture } = await open('carla.mendes@email.com', () => {
      const service = TestBed.inject(AffiliateService);
      service.decide(service.mine()!.id, {
        status: 'reprovado',
        decision: { by: 'Admin', at: new Date(), reason: 'Perfil sem conteúdo de perfumaria' },
      });
    });
    expect(textOf(fixture)).toContain('Pedido não aprovado');
    expect(textOf(fixture)).toContain('Perfil sem conteúdo de perfumaria');
    expect(textOf(fixture)).toContain('Você pode pedir de novo a partir de');
    expect($$(fixture, 'form')).toHaveLength(0);
  });

  it('cliente pede para participar: valida e envia', async () => {
    const { fixture } = await open('customer');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect($$(fixture, '.afa__problems li').length).toBeGreaterThan(1);

    const select = $(fixture, 'select') as HTMLSelectElement;
    select.value = 'TikTok';
    select.dispatchEvent(new Event('change'));
    type($(fixture, 'input[placeholder^="Ex."]'), '@ana.perfumes');
    type($(fixture, 'textarea'), 'Resenhas semanais nos stories e vídeos comparando fragrâncias.');
    type($(fixture, 'input[placeholder^="CPF"]'), 'ana@email.com');
    ($(fixture, '.afa__check input') as HTMLInputElement).click();
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);

    const mine = TestBed.inject(AffiliateService).mine();
    expect(mine).toMatchObject({ status: 'pendente', channel: 'TikTok' });
    expect(textOf(fixture)).toContain('Pedido em análise');
  });

  it('equipe e programa pausado não veem o formulário', async () => {
    const staff = await open('admin');
    expect(textOf(staff.fixture)).toContain('Contas da equipe não participam');
    TestBed.resetTestingModule();
    const paused = await open('customer', pause);
    expect(textOf(paused.fixture)).toContain('pausado no momento');
    expect($$(paused.fixture, 'form')).toHaveLength(0);
  });
});

describe('Seja afiliado', () => {
  beforeEach(() => localStorage.clear());

  const open = (setup?: () => void) => renderAt('/seja-afiliado', AffiliateLanding, { setup });
  const ctaText = (fixture: Parameters<typeof textOf>[0]) =>
    $$(fixture, '.aff__ctas a').map((a) => a.textContent?.trim());

  it('sem login leva para o login com retorno', async () => {
    const { fixture } = await open();
    const link = $(fixture, '.aff__ctas a');
    expect(link.textContent).toContain('Quero ser afiliado');
    expect(link.getAttribute('href')).toContain('/login');
    expect(link.getAttribute('href')).toContain('retorno');
    // "Como funciona" rola até a seção.
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    document.body.append(fixture.nativeElement);
    $(fixture, '.aff__how-link').click();
    expect(scroll).toHaveBeenCalled();
    fixture.nativeElement.remove();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('o texto do botão segue a situação de quem está logado', async () => {
    expect(ctaText((await open(() => loginAs('affiliate'))).fixture)).toContain('Ver meu cupom');
    TestBed.resetTestingModule();
    expect(ctaText((await open(() => loginAs('carla.mendes@email.com'))).fixture)).toContain(
      'Acompanhar meu pedido',
    );
    TestBed.resetTestingModule();
    expect(ctaText((await open(() => loginAs('customer'))).fixture)).toContain(
      'Quero ser afiliado',
    );
  });

  it('pausado: aviso, sem convite; afiliado ainda acessa a área', async () => {
    const visitor = await open(pause);
    expect($$(visitor.fixture, '.aff__paused')).toHaveLength(1);
    expect(ctaText(visitor.fixture)).toHaveLength(0);
    TestBed.resetTestingModule();
    const affiliate = await open(() => {
      loginAs('affiliate');
      pause();
    });
    expect(ctaText(affiliate.fixture)).toContain('Ir para minha área');
  });
});
