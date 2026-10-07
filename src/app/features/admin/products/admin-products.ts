import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BRANDS } from '../../../core/config/brands';
import { Product, ProductStatus } from '../../../core/models/product';
import { AuthService } from '../../../core/services/auth-service';
import { lowestPrice } from '../../../core/utils/product-pricing';
import { LOW_STOCK_THRESHOLD } from '../data/admin-orders-mock';
import { AdminProductStore } from '../services/admin-product-store';

/** `/admin/produtos` — catálogo com busca e filtros. */
@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProducts {
  protected readonly store = inject(AdminProductStore);
  protected readonly auth = inject(AuthService);

  protected readonly brands = BRANDS.map((brand) => brand.name);
  protected readonly lowestPrice = lowestPrice;

  protected readonly search = signal('');
  protected readonly brand = signal('todas');
  protected readonly category = signal('todas');
  protected readonly status = signal<ProductStatus | 'todos'>('todos');
  protected readonly onlyLowStock = signal(false);

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.store
      .products()
      .filter(
        (product) =>
          (this.brand() === 'todas' || product.brandName === this.brand()) &&
          (this.category() === 'todas' || product.category === this.category()) &&
          (this.status() === 'todos' || product.status === this.status()) &&
          (!this.onlyLowStock() || this.lowStock(product)) &&
          (!term ||
            product.name.toLowerCase().includes(term) ||
            product.brandName.toLowerCase().includes(term) ||
            product.variants.some((variant) => variant.id.toLowerCase().includes(term))),
      );
  });

  protected stock(product: Product): number {
    return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  }

  /** Alguma variante no limite de estoque baixo. */
  protected lowStock(product: Product): boolean {
    return product.variants.some((variant) => variant.stock <= LOW_STOCK_THRESHOLD);
  }
}
