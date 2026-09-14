import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CategoriesSection } from './sections/categories-section/categories-section';
import { CtaSection } from './sections/cta-section/cta-section';
import { HeroSection } from './sections/hero-section/hero-section';
import { HighlightsSection } from './sections/highlights-section/highlights-section';
import { ProductsSection } from './sections/products-section/products-section';

@Component({
  selector: 'app-home',
  imports: [HeroSection, HighlightsSection, CategoriesSection, ProductsSection, CtaSection],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
