import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../http/api-errors';
import { Notifier } from '../services/notifier';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let errors: string[];
  let handler: GlobalErrorHandler;

  beforeEach(() => {
    errors = [];
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: Notifier, useValue: { error: (m: string) => errors.push(m) } },
      ],
    });
    handler = TestBed.inject(GlobalErrorHandler);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('erro de código no front: registra e avisa', () => {
    handler.handleError(new TypeError('x is undefined'));
    expect(console.error).toHaveBeenCalled();
    expect(errors[0]).toContain('Algo deu errado');
  });

  it('erro do back (já avisado pelo interceptor) não avisa de novo', () => {
    handler.handleError(new ApiError('server', 500, 'X'));
    handler.handleError({ rejection: new ApiError('timeout', 0, 'Y') });
    handler.handleError(new HttpErrorResponse({ status: 500 }));
    expect(errors).toHaveLength(0);
  });

  it('se nem o aviso funcionar, não quebra', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        {
          provide: Notifier,
          useValue: {
            error: () => {
              throw new Error('sem snackbar');
            },
          },
        },
      ],
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => TestBed.inject(GlobalErrorHandler).handleError(new Error('x'))).not.toThrow();
  });
});
