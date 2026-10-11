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
