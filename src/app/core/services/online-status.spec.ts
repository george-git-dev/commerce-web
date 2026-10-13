import { TestBed } from '@angular/core/testing';
import { OnlineStatus } from './online-status';

describe('OnlineStatus', () => {
  it('acompanha os eventos online/offline do navegador', () => {
    const status = TestBed.inject(OnlineStatus);
    window.dispatchEvent(new Event('offline'));
    expect(status.online()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(status.online()).toBe(true);
  });
});
