import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
import { AdminAudit } from './admin-audit';
import { MAX_PENDING, ReportJobs } from './report-jobs';

describe('relatórios assíncronos', () => {
  beforeEach(() => localStorage.clear());

  it('pedido entra na fila, só aparece para quem pediu e respeita o limite', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('viewer@email.com', '12345678');
    const jobs = TestBed.inject(ReportJobs);
    for (let i = 0; i < MAX_PENDING; i++) {
      expect(jobs.request({ report: 'vendas', period: 'mes', group: 'dia' })).toBeNull();
    }
    expect(jobs.mine()[0].status).toBe('fila');
    expect(jobs.mine()[0].detail).toContain('Por dia');
    expect(jobs.request({ report: 'estoque', period: 'mes' }), 'limite').toContain('Espere');

    auth.logout();
    auth.login('admin@email.com', '12345678');
    expect(jobs.mine().length, 'outra pessoa não vê').toBe(0);
  });

  it('sem login não gera', () => {
    expect(TestBed.inject(ReportJobs).request({ report: 'vendas', period: 'mes' })).toContain(
      'permissão',
    );
  });
});

describe('relatórios: o "worker" gera, baixa e refaz', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it('cada tipo de relatório fica pronto e baixa o CSV (auditado)', async () => {
    TestBed.inject(AuthService).login('superadmin@email.com', '12345678');
    const jobs = TestBed.inject(ReportJobs);
    const audit = TestBed.inject(AdminAudit);
    const requests = [
      { report: 'vendas', period: '30', group: 'mes' },
      { report: 'produtos', period: 'ano' },
      { report: 'estoque', period: 'mes' },
      { report: 'compras', period: '90', group: 'nota' },
      { report: 'pagamentos', period: 'mes-passado' },
      { report: 'clientes', period: 'personalizado', from: new Date(2026, 0, 1), to: new Date() },
    ] as const;
    for (const [i, request] of requests.entries()) {
      expect(jobs.request(request)).toBeNull();
      if (i % 3 === 2) await vi.advanceTimersByTimeAsync(5_000);
    }
    await vi.advanceTimersByTimeAsync(5_000);
    expect(jobs.mine().every((job) => job.status === 'pronto')).toBe(true);
    expect(jobs.mine().find((j) => j.request.report === 'estoque')!.detail).toBe('Posição de hoje');

    const job = jobs.mine()[0];
    jobs.download(job);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(audit.entries()[0].action).toBe('Baixou relatório (CSV)');

    // Vencido não baixa.
    const count = audit.entries().length;
    jobs.download({ ...job, expiresAt: new Date(Date.now() - 1) });
    jobs.download({ ...job, id: 999 });
    expect(audit.entries()).toHaveLength(count);
  });

  it('refazer tira o antigo e pede de novo com os mesmos filtros', async () => {
    TestBed.inject(AuthService).login('admin@email.com', '12345678');
    const jobs = TestBed.inject(ReportJobs);
    jobs.request({ report: 'compras', period: 'mes', group: 'fornecedor' });
    const old = jobs.mine()[0];
    expect(jobs.retry({ ...old, status: 'falhou' })).toBeNull();
    expect(jobs.mine()).toHaveLength(1);
    expect(jobs.mine()[0].id).not.toBe(old.id);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(jobs.mine()[0].status).toBe('pronto');
  });
});
