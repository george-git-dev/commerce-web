import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      // provideHttpClientTesting: o CatalogService (categorias/highlights) é injetado
      // via CatalogService só para reaproveitar o mock existente; nada aqui bate na rede.
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should render every section of the redesigned home', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.hero')).toBeTruthy();
    expect(compiled.querySelector('.categories__grid')).toBeTruthy();
    expect(compiled.querySelectorAll('.products__grid').length).toBe(2);
    expect(compiled.querySelector('.highlights')).toBeTruthy();
    expect(compiled.querySelector('.brands')).toBeTruthy();
    expect(compiled.querySelector('#historia')).toBeTruthy();
    expect(compiled.querySelector('.newsletter')).toBeTruthy();
  });

  it('should render the featured products as product cards', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('app-product-card').length).toBeGreaterThan(0);
  });
});
