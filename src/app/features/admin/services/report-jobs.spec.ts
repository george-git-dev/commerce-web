import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth-service';
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
