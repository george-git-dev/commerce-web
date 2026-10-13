import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { CatalogService } from '../../../core/services/catalog-service';
import { AdminAudit } from './admin-audit';
import { AdminPromotions } from './admin-promotions';

describe('promoções (admin)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
  });

  it('prévia: itens atingidos, preço da promoção e "vale outra" quando perde', () => {
    const store = TestBed.inject(AdminPromotions);
    const rows = store.preview(
      {
        name: 'Teste',
        active: true,
        target: { kind: 'itens', skus: ['lattafa-yara-100'] },
        discount: { kind: 'percent', value: 5 },
      },
      null,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].promoPrice).toBeLessThan(rows[0].price);
    // "Seleção da semana" (14%) já vale para o item e dá desconto maior.
    expect(rows[0].beatenBy).toBe('Seleção da semana');
  });

  it('salvar aplica na loja e registra na auditoria; excluir volta o preço', () => {
    const store = TestBed.inject(AdminPromotions);
    const catalog = TestBed.inject(CatalogService);
    const price = () =>
      catalog
        .products()
        .find((p) => p.variants.some((v) => v.id === 'lattafa-yara-100'))!
        .variants.find((v) => v.id === 'lattafa-yara-100')!;
    const id = store.save(null, {
      name: 'Yara 50% teste',
      active: true,
      target: { kind: 'itens', skus: ['lattafa-yara-100'] },
      discount: { kind: 'percent', value: 50 },
    });
    expect(price().promoPrice).toBe(Math.round(price().price * 50) / 100);
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Criou promoção');
    store.remove(id);
    expect(store.find(id)).toBeUndefined();
    expect(TestBed.inject(AdminAudit).entries()[0].action).toBe('Excluiu promoção');
  });
});

describe('promoções (admin): opções, situação e edição', () => {
  beforeEach(() => localStorage.clear());

  const draft = {
    name: 'Decants 10%',
    active: true,
    target: { kind: 'formato', format: 'decant' },
    discount: { kind: 'percent', value: 10 },
  } as const;

  it('opções vêm do catálogo publicado; situação e resumo', () => {
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const store = TestBed.inject(AdminPromotions);
    const { categories, brands, formats } = store.options();
    expect(categories.length).toBeGreaterThan(0);
    expect(brands).toEqual([...brands].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    expect(formats.map((f) => f.id).slice(0, 2)).toEqual(['frasco', 'decant']);
    const promo = store.all()[0];
    expect(store.statusLabel(promo)).toBeTruthy();
    expect(store.summary(promo)).toContain('·');
  });

  it('editar audita só o que mudou (limite de unidades); visualizador não mexe', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('admin@email.com', '12345678');
    const store = TestBed.inject(AdminPromotions);
    const id = store.save(null, draft as never);
    store.save(id, { ...draft, unitLimit: 10, untilSoldOut: true } as never);
    const audit = TestBed.inject(AdminAudit).entries()[0];
    expect(audit.action).toBe('Alterou promoção');
    expect(audit.changes).toEqual([
      expect.objectContaining({ field: 'Quantidade com desconto', before: 'sem limite' }),
    ]);
    store.save(id, { ...draft, unitLimit: 5 } as never);
    expect(TestBed.inject(AdminAudit).entries()[0].changes[0].after).toBe('5');

    auth.logout();
    auth.login('viewer@email.com', '12345678');
    expect(store.save(id, { ...draft, name: 'Outro' } as never)).toBe(id);
    expect(store.save(null, draft as never)).toBe(0);
    store.remove(id);
    expect(store.find(id)?.name).toBe('Decants 10%');
  });
});
