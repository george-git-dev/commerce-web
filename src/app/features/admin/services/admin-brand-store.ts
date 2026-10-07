import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/auth-service';
import { AdminAudit } from './admin-audit';
import { AdminProductStore } from './admin-product-store';
import { AdminPurchaseStore } from './admin-purchase-store';
import { brandProblems } from './brand-rules';

/**
 * Marcas no backoffice: criadas no próprio cadastro ("+ Nova marca") e
 * renomeadas ali mesmo — produtos e fornecedores acompanham o novo nome.
 * Logo e faixa da home continuam manuais (`core/config/brands.ts`).
 */
@Injectable({ providedIn: 'root' })
export class AdminBrandStore {
  private readonly products = inject(AdminProductStore);
  private readonly purchases = inject(AdminPurchaseStore);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  /** Onde a marca é usada (aviso antes de renomear). */
  usage(name: string): { products: number; suppliers: number } {
    return {
      products: this.products.productCount(name),
      suppliers: this.purchases.supplierCount(name),
    };
  }

  problems(from: string, to: string): string[] {
    return brandProblems(
      to,
      this.products.brandNames().filter((brand) => brand !== from),
    );
  }

  add(name: string): void {
    if (this.products.brandNames().includes(name)) return;
    this.products.addBrand(name);
    this.record('Cadastrou marca', name, [{ field: 'Marca', before: '—', after: name }]);
  }

  /** Renomeia em todo lugar; quem chama valida antes (`problems`). */
  rename(from: string, to: string): void {
    const name = to.trim();
    if (!name || name === from) return;
    this.products.renameBrand(from, name);
    this.purchases.renameBrand(from, name);
    this.record('Renomeou marca', name, [{ field: 'Nome', before: from, after: name }]);
  }

  private record(
    action: string,
    name: string,
    changes: { field: string; before: string; after: string }[],
  ): void {
    this.audit.record({
      by: this.auth.user()?.name ?? 'Equipe',
      action,
      entity: 'Marca',
      entityId: name,
      changes,
    });
  }
}
