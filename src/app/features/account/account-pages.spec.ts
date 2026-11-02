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
import { AddressBook } from '../../core/services/address-book';
import { AffiliateProgram } from '../../core/services/affiliate-program';
import { AuthService } from '../../core/services/auth-service';
import { StoreCredit } from '../../core/services/store-credit';
import { Account } from './account';
import { Addresses } from './addresses/addresses';
import { DeleteAccount } from './delete-account/delete-account';
import { Orders } from './orders/orders';
import { Profile } from './profile/profile';
import { AUTH_MODE } from '../../core/config/auth-mode';
import { Profile as ProfileData, ProfileService } from '../../core/services/profile-service';
import { of, Subject, throwError } from 'rxjs';
import { ApiError } from '../../core/http/api-errors';

const ANA_PROFILE: ProfileData = {
  name: 'Ana Souza',
  email: 'ana@email.com',
  cpf: '***.444.444-**',
  phone: '11987654321',
};
import { StoreCreditPage } from './store-credit/store-credit-page';

const titles = (fixture: { nativeElement: HTMLElement }) =>
  Array.from(fixture.nativeElement.querySelectorAll('.card h2')).map((h) => h.textContent?.trim());

describe('Minha conta', () => {
  beforeEach(() => localStorage.clear());

  it('cliente vê os atalhos sem backoffice; sair volta para a loja', async () => {
    const { fixture } = await renderAt('/minha-conta', Account, {
      setup: () => loginAs('customer'),
    });
    expect(textOf(fixture)).toContain('ana@email.com');
    expect(titles(fixture)).toContain('Pedidos');
    expect(titles(fixture)).not.toContain('Backoffice');
    buttonByText(fixture, 'Sair da conta').click();
    await settle(fixture);
    expect(TestBed.inject(AuthService).user()).toBeNull();
    expect(currentUrl()).toBe('/');
  });

  it('equipe ganha o Backoffice; afiliado vê o card mesmo com o programa pausado', async () => {
    const staff = await renderAt('/minha-conta', Account, { setup: () => loginAs('admin') });
    expect(titles(staff.fixture)).toContain('Backoffice');
    TestBed.resetTestingModule();
    const affiliate = await renderAt('/minha-conta', Account, {
      setup: () => {
        loginAs('affiliate');
        const program = TestBed.inject(AffiliateProgram);
        program.save({ ...program.settings(), active: false });
      },
    });
    expect(titles(affiliate.fixture)).toContain('Afiliado');
  });

  it('crédito na loja aparece só para quem tem', async () => {
    const { fixture } = await renderAt('/minha-conta', Account, {
      setup: () => loginAs('affiliate'),
    });
    const hasCredit = TestBed.inject(StoreCredit).mine().length > 0;
    expect(titles(fixture).includes('Crédito na loja')).toBe(hasCredit);
  });
});

describe('Meus pedidos e crédito', () => {
  beforeEach(() => localStorage.clear());

  it('lista os pedidos da conta com link para o detalhe', async () => {
    const { fixture } = await renderAt('/minha-conta/pedidos', Orders, {
      setup: () => loginAs('customer'),
    });
    expect($$(fixture, '.order').length).toBeGreaterThan(0);
    expect(textOf(fixture)).toContain('NP100258');
  });

  it('extrato do crédito: vazio explica; com entradas mostra o saldo', async () => {
    const empty = await renderAt('/minha-conta/credito', StoreCreditPage, {
      setup: () => loginAs('customer'),
    });
    expect(textOf(empty.fixture)).toContain('Você ainda não tem crédito');
    TestBed.resetTestingModule();
    const { fixture } = await renderAt('/minha-conta/credito', StoreCreditPage, {
      setup: () => {
        loginAs('customer');
        TestBed.inject(StoreCredit).addCommission('ana@email.com', 50, 999);
      },
    });
    expect($$(fixture, '.scp__in').length).toBe(1);
    expect(textOf(fixture)).toContain('Comissão de afiliado');
  });
});

describe('Endereços', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  const open = () =>
    renderAt('/minha-conta/enderecos', Addresses, { setup: () => loginAs('customer') });

  it('cadastra com o CEP preenchendo a rua e vira principal', async () => {
    const { fixture } = await open();
    const book = TestBed.inject(AddressBook);
    const before = book.addresses().length;
    buttonByText(fixture, 'Adicionar endereço').click();
    await settle(fixture);
    // Formulário vazio não salva.
    type($(fixture, '[formControlName="recipient"]'), '');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect($$(fixture, '.f-error').length).toBeGreaterThan(0);

    type($(fixture, '[formControlName="recipient"]'), 'Ana Souza');
    type($(fixture, '[formControlName="cep"]'), '80010-000');
    await settle(fixture);
    type($(fixture, '[formControlName="number"]'), '45');
    ($(fixture, '[formControlName="makeDefault"]') as HTMLInputElement).click();
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);

    expect(book.addresses()).toHaveLength(before + 1);
    expect(book.defaultAddress()?.city).toBe('Curitiba');
    expect(textOf(fixture)).toContain('Meus endereços');
  });

  it('edita, torna principal, remove e cancela', async () => {
    const { fixture } = await open();
    const book = TestBed.inject(AddressBook);
    book.add({ ...book.addresses()[0], number: '999' });
    await settle(fixture);

    buttonByText(fixture, 'Tornar principal').click();
    await settle(fixture);
    expect(book.defaultAddress()?.number).toBe('999');

    buttonByText(fixture, 'Editar').click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Editar endereço');
    type($(fixture, '[formControlName="complement"]'), 'Apto 12');
    $(fixture, 'form').dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(book.defaultAddress()?.complement).toBe('Apto 12');

    buttonByText(fixture, 'Adicionar endereço').click();
    await settle(fixture);
    buttonByText(fixture, 'Cancelar').click();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Meus endereços');

    const count = book.addresses().length;
    $$(fixture, '.address__remove').at(-1)!.click();
    await settle(fixture);
    expect(book.addresses()).toHaveLength(count - 1);
  });
});

describe('Dados pessoais', () => {
  beforeEach(() => localStorage.clear());

  const open = () => renderAt('/minha-conta/dados', Profile, { setup: () => loginAs('customer') });

  it('salva nome, celular e CPF (que depois fica só leitura)', async () => {
    const { fixture } = await open();
    const auth = TestBed.inject(AuthService);
    type($(fixture, '[formControlName="name"]'), 'Ana Lima');
    type($(fixture, '[formControlName="phone"]'), '(11) 98765-4321');
    type($(fixture, '[formControlName="cpf"]'), '529.982.247-25');
    $$(fixture, 'form')[0].dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(auth.user()?.name).toBe('Ana Lima');
    expect(auth.user()?.cpf).toBeTruthy();
    expect($$(fixture, '[formControlName="cpf"]')).toHaveLength(0);
  });

  it('dados vêm do back: carregando, falha com "tentar de novo" e depois o formulário', async () => {
    const answers = [throwError(() => new Error('fora do ar')), of(ANA_PROFILE)];
    const { fixture } = await renderAt('/minha-conta/dados', Profile, {
      setup: () => loginAs('customer'),
      providers: [{ provide: ProfileService, useValue: { load: () => answers.shift()! } }],
    });
    expect(textOf(fixture)).toContain('Não conseguimos carregar seus dados agora.');
    (
      $$(fixture, 'button').find((b) => b.textContent?.includes('Tentar de novo')) as HTMLElement
    ).click();
    await settle(fixture);
    expect(($(fixture, '[formControlName="name"]') as HTMLInputElement).value).toBe('Ana Souza');
    expect(($(fixture, '[formControlName="phone"]') as HTMLInputElement).value).toBe(
      '(11) 98765-4321',
    );
    expect(textOf(fixture)).not.toContain('Carregando');
    expect($$(fixture, 'input[readonly]').map((i) => (i as HTMLInputElement).value)).toContain(
      '***.444.444-**',
    );
  });

  it('login de verdade: trocar senha e alterar nome levam às telas do Keycloak', async () => {
    const { fixture } = await renderAt('/minha-conta/dados', Profile, {
      setup: () => loginAs('customer'),
      providers: [
        { provide: AUTH_MODE, useValue: 'bff' },
        { provide: ProfileService, useValue: { load: () => of(ANA_PROFILE) } },
      ],
    });
    const go = vi
      .spyOn(TestBed.inject(AuthService), 'startPasswordChange')
      .mockImplementation(() => undefined);
    expect($$(fixture, '[formControlName="current"]')).toHaveLength(0);
    (
      $$(fixture, 'button').find((b) => b.textContent?.includes('Trocar senha')) as HTMLElement
    ).click();
    expect(go).toHaveBeenCalledWith('/minha-conta/dados');

    const editName = vi
      .spyOn(TestBed.inject(AuthService), 'startProfileEdit')
      .mockImplementation(() => undefined);
    expect(($(fixture, '[formControlName="name"]') as HTMLInputElement).readOnly).toBe(true);
    (
      $$(fixture, 'button').find((b) => b.textContent?.includes('Alterar nome')) as HTMLElement
    ).click();
    expect(editName).toHaveBeenCalledWith('/minha-conta/dados');
  });

  it('salvar: "Aguarde…" enquanto o back responde e erro do back no formulário', async () => {
    const answer = new Subject<ProfileData>();
    const { fixture } = await renderAt('/minha-conta/dados', Profile, {
      setup: () => loginAs('customer'),
      providers: [
        {
          provide: ProfileService,
          useValue: { load: () => of({ ...ANA_PROFILE, cpf: null }), save: () => answer },
        },
      ],
    });
    type($(fixture, '[formControlName="cpf"]'), '390.533.447-05');
    $$(fixture, 'form')[0].dispatchEvent(new Event('submit'));
    await settle(fixture);
    const button = () => $$(fixture, 'button[type="submit"]')[0] as HTMLButtonElement;
    expect(button().disabled).toBe(true);
    expect(button().textContent).toContain('Aguarde');

    answer.error(
      new ApiError('validation', 409, 'X', {
        code: 'CPF_IN_USE',
        detail: 'Este CPF já está em outra conta. Fale com o nosso atendimento.',
        errors: { cpf: 'CPF já usado.' },
      }),
    );
    await settle(fixture);
    expect(button().disabled).toBe(false);
    expect(textOf(fixture)).toContain('Este CPF já está em outra conta.');
    expect(textOf(fixture)).toContain('CPF já usado.');
  });

  it('dados inválidos não salvam', async () => {
    const { fixture } = await open();
    type($(fixture, '[formControlName="name"]'), '');
    $$(fixture, 'form')[0].dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(textOf(fixture)).toContain('Informe seu nome.');
  });

  it('troca de senha: confere confirmação, mostra erro do serviço e troca', async () => {
    const { fixture } = await open();
    const form = () => $$(fixture, 'form')[1];
    form().dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(textOf(fixture)).toContain('Informe a senha atual.');

    type($(fixture, '[formControlName="current"]'), '12345678');
    type($(fixture, '[formControlName="next"]'), '12345678');
    type($(fixture, '[formControlName="confirm"]'), '87654321');
    $(fixture, '[formControlName="confirm"]').dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(textOf(fixture)).toContain('As senhas não conferem.');

    type($(fixture, '[formControlName="confirm"]'), '12345678');
    form().dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect($$(fixture, '[role="alert"]')).toHaveLength(1);

    type($(fixture, '[formControlName="next"]'), 'novaSenha123');
    type($(fixture, '[formControlName="confirm"]'), 'novaSenha123');
    form().dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect($$(fixture, '[role="alert"]')).toHaveLength(0);
    expect(($(fixture, '[formControlName="current"]') as HTMLInputElement).value).toBe('');

    const show = $(fixture, '.profile__check input') as HTMLInputElement;
    show.click();
    await settle(fixture);
    expect(($(fixture, '[formControlName="next"]') as HTMLInputElement).type).toBe('text');
  });
});

describe('Excluir minha conta (tela)', () => {
  beforeEach(() => localStorage.clear());

  it('exige marcar o aviso e a senha; depois exclui e volta para a loja', async () => {
    const { fixture } = await renderAt('/minha-conta/excluir-conta', DeleteAccount, {
      setup: () => loginAs('maria@email.com'),
    });
    const submit = () => $(fixture, 'form').dispatchEvent(new Event('submit'));
    submit();
    await settle(fixture);
    expect(textOf(fixture)).toContain('Marque que você entende');

    ($(fixture, '.del__check--strong input') as HTMLInputElement).click();
    await settle(fixture);
    submit();
    await settle(fixture);
    expect($$(fixture, '[role="alert"]')).toHaveLength(1);

    ($$(fixture, '.del__check input')[0] as HTMLInputElement).click();
    const select = $(fixture, 'select') as HTMLSelectElement;
    select.value = 'Outro motivo';
    select.dispatchEvent(new Event('change'));
    type($(fixture, 'input[autocomplete="current-password"]'), '12345678');
    submit();
    await settle(fixture);
    expect(TestBed.inject(AuthService).user()).toBeNull();
    expect(currentUrl()).toBe('/');
  });

  it('conta Google confirma com o e-mail; equipe é bloqueada', async () => {
    const google = await renderAt('/minha-conta/excluir-conta', DeleteAccount, {
      setup: () => TestBed.inject(AuthService).loginWithGoogle(),
    });
    expect(textOf(google.fixture)).toContain('Digite seu e-mail para confirmar');
    TestBed.resetTestingModule();
    const staff = await renderAt('/minha-conta/excluir-conta', DeleteAccount, {
      setup: () => loginAs('viewer'),
    });
    expect($$(staff.fixture, 'form')).toHaveLength(0);
    expect(textOf(staff.fixture)).toContain('Conta da equipe');
  });
});
