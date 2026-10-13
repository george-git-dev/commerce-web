import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BRAND_ICONS, BrandIconName } from '../../core/config/brand-icons';

/**
 * Ícone de marca em SVG inline (Instagram, Visa…). Usa `currentColor` por padrão;
 * com `colored`, pinta na cor oficial da marca. Decorativo: quem usa dá o rótulo.
 */
@Component({
  selector: 'app-brand-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path [attr.d]="icon().path" [attr.fill]="colored() ? icon().color : 'currentColor'" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 20px;
      height: 20px;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandIcon {
  readonly name = input.required<BrandIconName>();
  readonly colored = input(false);

  protected readonly icon = computed(() => BRAND_ICONS[this.name()]);
}
