import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NAV_LINKS } from '../../core/config/navigation';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the five sections', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.hero')).toBeTruthy();
    expect(compiled.querySelector('.highlights')).toBeTruthy();
    expect(compiled.querySelector('.categories__grid')).toBeTruthy();
    expect(compiled.querySelector('.products__grid')).toBeTruthy();
    expect(compiled.querySelector('.cta')).toBeTruthy();
  });

  // Garante que nenhum item de menu aponte para uma âncora que não existe.
  it('should expose a real anchor for every nav link', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    for (const link of NAV_LINKS) {
      expect(compiled.querySelector(`#${link.fragment}`)).toBeTruthy();
    }
  });
});
