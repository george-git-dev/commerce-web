import { AuditEntry } from './admin-audit';
import {
  auditCsv,
  auditLink,
  AuditFilter,
  changeText,
  matchesAudit,
  periodStart,
  sortAudit,
} from './audit-rules';

const now = new Date(2026, 9, 10, 15, 0);
const entry = (over: Partial<AuditEntry>): AuditEntry => ({
  at: new Date(2026, 9, 10, 9, 0),
  by: 'George',
  role: 'Admin',
  origin: { ip: '189.40.1.2', device: 'Celular' },
  action: 'Alterou status do pedido',
  entity: 'Pedido',
  entityId: 'NP101180',
  changes: [],
  ...over,
});
const all: AuditFilter = { period: 'tudo', area: 'todas', by: 'todos', search: '' };

describe('auditoria', () => {
  it('período: hoje desde meia-noite; 7 dias inclui hoje', () => {
    expect(periodStart('hoje', now)).toBe(new Date(2026, 9, 10).getTime());
    expect(periodStart('7', now)).toBe(new Date(2026, 9, 4).getTime());
    const old = entry({ at: new Date(2026, 9, 1) });
    expect(matchesAudit(old, { ...all, period: '7' }, now)).toBe(false);
    expect(matchesAudit(old, { ...all, period: '30' }, now)).toBe(true);
  });

  it('filtra por área, pessoa e busca sem acento', () => {
    expect(matchesAudit(entry({}), { ...all, area: 'pedidos' }, now)).toBe(true);
    expect(matchesAudit(entry({}), { ...all, area: 'estoque' }, now)).toBe(false);
    expect(matchesAudit(entry({}), { ...all, by: 'Admin' }, now)).toBe(false);
    expect(matchesAudit(entry({}), { ...all, search: 'np1011' }, now)).toBe(true);
    expect(
      matchesAudit(
        entry({ action: 'Aprovou avaliação', entity: 'Avaliação' }),
        {
          ...all,
          search: 'avaliacao',
        },
        now,
      ),
    ).toBe(true);
  });

  it('link para a tela do item', () => {
    expect(auditLink(entry({}))).toBe('/admin/pedidos/NP101180');
    expect(auditLink(entry({ entity: 'Estoque', entityId: 'LAT-ASAD-100' }))).toBe(
      '/admin/estoque/LAT-ASAD-100',
    );
    expect(
      auditLink(entry({ entity: 'Banner', action: 'Excluiu banner', entityId: '3' })),
    ).toBeNull();
    expect(auditLink(entry({ entity: 'Produto', link: '/admin/produtos/x' }))).toBe(
      '/admin/produtos/x',
    );
    expect(auditLink(entry({ entity: 'Marca' }))).toBeNull();
  });

  it('ordena por coluna; empate pelo mais recente', () => {
    const a = entry({ by: 'Bia', at: new Date(2026, 9, 9) });
    const b = entry({ by: 'Ana', at: new Date(2026, 9, 8) });
    const c = entry({ by: 'Ana', at: new Date(2026, 9, 10) });
    expect(sortAudit([a, b, c], { column: 'data', desc: true }).map((e) => e.by)).toEqual([
      'Ana',
      'Bia',
      'Ana',
    ]);
    const byName = sortAudit([a, b, c], { column: 'quem', desc: false });
    expect(byName.map((e) => e.at.getDate())).toEqual([10, 8, 9]);
  });

  it('CSV para o Excel: ; , BOM, aspas e sem fórmula', () => {
    const csv = auditCsv([
      entry({ changes: [{ field: 'Motivo', before: '', after: 'disse "oi"' }] }),
      entry({ by: '=HYPERLINK("x")' }),
    ]);
    expect(csv.startsWith('﻿"Data e hora";"Quem"')).toBe(true);
    expect(csv).toContain('"10/10/2026 09:00";"George";"Admin";"Pedidos"');
    expect(csv, 'aspas escapadas').toContain('"Motivo: disse ""oi"""');
    expect(csv, 'fórmula neutralizada').toContain(`"'=HYPERLINK(""x"")"`);
    expect(changeText({ field: 'Status', before: 'Pago', after: 'Enviado' })).toBe(
      'Status: Pago → Enviado',
    );
  });
});
