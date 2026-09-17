import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SECTION_IDS } from '../../../../core/config/navigation';
import { CartStore } from '../../../../core/services/cart-store';
import { CatalogService } from '../../../../core/services/catalog-service';
import { Product } from '../../../../core/models/product';
import { ProductCard } from '../../../../shared/product-card/product-card';

@Component({
  selector: 'app-products-section',
  imports: [ProductCard],
  templateUrl: './products-section.html',
  styleUrl: './products-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsSection {
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartStore);
  private readonly snackBar = inject(MatSnackBar);

  // Teaser da home: só os 8 primeiros. O catálogo completo (com paginação/filtro)
  // vira uma página própria em breve — hoje a API ainda não pagina.
  protected readonly products = computed(() => this.catalog.products().slice(0, 8));
  protected readonly sections = SECTION_IDS;

  /** O card apenas emite a intenção; quem decide o efeito é esta seção (container). */
  protected onAddToCart(product: Product): void {
    this.cart.add(product);
    this.snackBar.open(`${product.name} foi adicionado ao carrinho.`, 'Fechar', {
      duration: 3000,
    });
  }
}
