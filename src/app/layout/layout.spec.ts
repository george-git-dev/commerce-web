import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { $, $$, loginAs, productBySlug, render, textOf, type } from '../../testing/test-helpers';
import { FailureSimulator } from '../core/http/failure-simulator';
import { AffiliateProgram } from '../core/services/affiliate-program';
import { CartStore } from '../core/services/cart-store';
import { OnlineStatus } from '../core/services/online-status';
import { App } from '../app';
import { ConnectionBanner } from './connection-banner/connection-banner';
import { Footer } from './footer/footer';
import { Header } from './header/header';

@Component({ template: '' })
class Blank {}

describe('Header', () => {
  beforeEach(() => localStorage.clear());

  it('menu do celular abre e fecha; ícone de conta muda ao entrar', async () => {
    const f = await render(Header);
    const burger = $(f, '.bar__burger');
    burger.click();
    f.detectChanges();
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect($(f, '#mobile-menu').classList).toContain('mobile-menu--open');
    $(f, '.mobile-menu__account').click();
    f.detectChanges();
    expect(burger.getAttribute('aria-expanded')).toBe('false');
    expect($(f, '.bar__account').getAttribute('aria-label')).toBe('Entrar ou criar conta');
    loginAs('customer');
    f.detectChanges();
    expect($(f, '.bar__account').getAttribute('aria-label')).toMatch(/^Minha conta de /);
  });

  it('busca leva ao catálogo com o termo; vazia só abre o catálogo', async () => {
    const f = await render(Header);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    $(f, '[aria-label="Buscar perfumes"]').click();
    f.detectChanges();
    expect($(f, '#search-panel').classList).toContain('search-panel--open');
    type($(f, 'input[type=search]'), '  asad ');
    $(f, 'form').dispatchEvent(new Event('submit'));
    expect(navigate).toHaveBeenCalledWith(['/produtos'], { queryParams: { busca: 'asad' } });
    type($(f, 'input[type=search]'), '');
    $(f, 'form').dispatchEvent(new Event('submit'));
    expect(navigate).toHaveBeenLastCalledWith(['/produtos'], { queryParams: {} });
  });

  it('"Seja afiliado" some com o programa fora do ar', async () => {
    const f = await render(Header);
    expect($$(f, '.nav__affiliate')).toHaveLength(1);
    const program = TestBed.inject(AffiliateProgram);
    program.save({ ...program.settings(), active: false });
    f.detectChanges();
    expect($$(f, '.nav__affiliate')).toHaveLength(0);
    expect($$(f, '.mobile-menu__affiliate')).toHaveLength(0);
  });

  it('contador da sacola e sombra ao rolar', async () => {
    const f = await render(Header);
    const asad = productBySlug('lattafa-asad');
    TestBed.inject(CartStore).add(asad, asad.variants[0], 2);
    f.detectChanges();
    expect(textOf(f)).toContain('2');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 40 });
    window.dispatchEvent(new Event('scroll'));
    f.detectChanges();
    expect($(f, '.bar').classList).toContain('bar--scrolled');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });
});

describe('Footer', () => {
  it('grupos de links; "Seja afiliado" some com o programa fora do ar', async () => {
    const f = await render(Footer);
    expect(textOf(f)).toContain('Seja afiliado');
    expect($$(f, 'details').length).toBeGreaterThanOrEqual(3);
    const program = TestBed.inject(AffiliateProgram);
    program.save({ ...program.settings(), active: false });
    f.detectChanges();
    expect(textOf(f)).not.toContain('Seja afiliado');
  });
});

describe('ConnectionBanner', () => {
  it('faixa "sem conexão" e aviso do simulador (com Desligar)', async () => {
    const f = await render(ConnectionBanner);
    expect(textOf(f)).toBe('');
    TestBed.inject(OnlineStatus).online.set(false);
    TestBed.inject(FailureSimulator).mode.set('erro');
    f.detectChanges();
    expect(textOf(f)).toContain('Você está sem conexão');
    expect(textOf(f)).toContain('Erro no servidor (500)');
    $(f, 'button').click();
    f.detectChanges();
    expect(TestBed.inject(FailureSimulator).mode()).toBeNull();
  });
});

describe('App (casca)', () => {
  it('no backoffice some o header/rodapé da loja; título rola na aba', async () => {
    vi.useFakeTimers();
    const f = await render(App, {
      routes: [
        { path: 'admin', component: Blank },
        { path: '**', component: Blank },
      ],
    });
    expect($$(f, 'app-header')).toHaveLength(1);
    await TestBed.inject(Router).navigateByUrl('/admin');
    f.detectChanges();
    expect($$(f, 'app-header')).toHaveLength(0);
    const first = document.title;
    vi.advanceTimersByTime(400);
    expect(document.title).not.toBe(first);
    f.destroy();
    vi.useRealTimers();
  });
});
