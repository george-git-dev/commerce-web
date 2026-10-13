import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Notifier } from './notifier';

describe('Notifier (avisos)', () => {
  let opened: { text: string; config: { duration?: number; panelClass?: string } }[];

  beforeEach(() => {
    opened = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MatSnackBar,
          useValue: {
            open: (text: string, _a: string, config: object) => opened.push({ text, config }),
          },
        },
      ],
    });
  });

  it('sucesso curto; erro em vinho, mais longo e com o código', async () => {
    const notifier = TestBed.inject(Notifier);
    notifier.success('Salvo.');
    notifier.error('Falhou.', 'AB12CD34');
    await vi.waitFor(() => expect(opened).toHaveLength(2));
    expect(opened[0]).toEqual({
      text: 'Salvo.',
      config: { duration: 3000, panelClass: undefined },
    });
    expect(opened[1].text).toBe('Falhou. Código: AB12CD34.');
    expect(opened[1].config.panelClass).toBe('snack--error');
  });

  it('não repete a mesma mensagem em cascata', async () => {
    const notifier = TestBed.inject(Notifier);
    notifier.error('Sem conexão.');
    notifier.error('Sem conexão.');
    notifier.error('Outra.');
    await vi.waitFor(() => expect(opened).toHaveLength(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(opened.map((o) => o.text)).toEqual(['Sem conexão.', 'Outra.']);
  });
});
