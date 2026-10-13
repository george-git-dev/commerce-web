import { config, of, Subject, throwError } from 'rxjs';
import { ApiError } from '../../core/http/api-errors';
import { Busy } from './busy';

describe('Busy (botão ocupado)', () => {
  it('fica ocupado até responder e volta ao normal', () => {
    const busy = new Busy();
    const response = new Subject<number>();
    let value = 0;
    busy.run(response, (v) => (value = v));
    expect(busy.running()).toBe(true);
    response.next(7);
    expect(value).toBe(7);
    expect(busy.running()).toBe(false);
  });

  it('erro do back chama onError; erro de código sobe para o handler global', async () => {
    const busy = new Busy();
    let handled = false;
    busy.run(
      throwError(() => new ApiError('server', 500, 'X')),
      () => {},
      () => (handled = true),
    );
    expect(handled).toBe(true);
    expect(busy.running()).toBe(false);
    const reported: unknown[] = [];
    config.onUnhandledError = (e) => reported.push(e);
    let called = false;
    busy.run(
      throwError(() => new TypeError('bug')),
      () => {},
      () => (called = true),
    );
    await new Promise((r) => setTimeout(r));
    config.onUnhandledError = null;
    expect(called).toBe(false);
    expect((reported[0] as Error).message).toBe('bug');
    expect(busy.running()).toBe(false);
    busy.run(of(1), () => {});
  });
});
