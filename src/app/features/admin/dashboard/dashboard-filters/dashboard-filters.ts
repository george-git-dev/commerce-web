import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Gender } from '../../../../core/models/product';
import { AdminDashboard } from '../../services/admin-dashboard';
import { DashboardPeriod, MIN_DAY, PERIOD_LABELS } from '../../services/admin-metrics';
import { AdminProductStore } from '../../services/admin-product-store';
import { AdminPurchaseStore } from '../../services/admin-purchase-store';

/** Visão (hoje, últimos 7/30 dias, mês ou de/até) e filtros: categoria, destaque, gênero, marca e fornecedor. */
@Component({
  selector: 'app-dashboard-filters',
  imports: [MatIconModule],
  templateUrl: './dashboard-filters.html',
  styleUrl: './dashboard-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardFilters {
  protected readonly data = inject(AdminDashboard);
  private readonly products = inject(AdminProductStore);
  protected readonly suppliers = inject(AdminPurchaseStore).suppliers;

  protected readonly periods = Object.entries(PERIOD_LABELS) as [DashboardPeriod, string][];
  /** Data mais antiga aceita no personalizado. */
  protected readonly minDay = MIN_DAY;
  protected readonly genders: readonly Gender[] = ['Masculino', 'Feminino', 'Unissex'];
  protected readonly categories = this.products.categories;
  protected readonly brands = computed(() =>
    [...this.products.brandNames()].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  );

  protected setSupplier(value: string): void {
    this.data.supplierId.set(value ? Number(value) : null);
  }
}
