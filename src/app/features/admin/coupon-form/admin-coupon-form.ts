import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Coupon, CouponDraft, CouponKind } from '../../../core/models/coupon';
import {
  COUPON_STATUS_LABELS,
  couponStatus,
  normalizeCode,
} from '../../../core/utils/coupon-rules';
import { AdminCoupons } from '../services/admin-coupons';
import { ActionDialog, ActionDialogData } from '../shared/action-dialog/action-dialog';

const KINDS: readonly { id: CouponKind; label: string }[] = [
  { id: 'percent', label: '% de desconto' },
  { id: 'fixed', label: 'R$ de desconto' },
  { id: 'shipping', label: 'Frete grátis' },
];

/** Texto do campo → número (aceita vírgula); vazio = `undefined`. */
function optional(text: string): number | undefined {
  const clean = text.trim().replace(/\./g, '').replace(',', '.');
  return clean ? Number(clean) : undefined;
}

const toText = (n?: number) => (n == null ? '' : String(n).replace('.', ','));

/** `/admin/promocoes/cupons/novo` e `/:id` — regras do cupom e uso até agora. */
@Component({
  selector: 'app-admin-coupon-form',
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './admin-coupon-form.html',
  styleUrls: ['../storefront/storefront-form.scss', '../promotion-form/admin-promotion-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCouponForm {
  protected readonly store = inject(AdminCoupons);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly readOnly = !this.store.canEdit();
  protected readonly kinds = KINDS;
  protected readonly statusLabels = COUPON_STATUS_LABELS;

  protected readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  protected readonly original: Coupon | undefined = this.id ? this.store.find(this.id) : undefined;
  /** Cupom já usado: o código fica travado (está nos pedidos) e não pode ser excluído. */
  protected readonly used = (this.original?.uses ?? 0) > 0;

  private readonly o = this.original;
  protected readonly code = signal(this.o?.code ?? '');
  protected readonly kind = signal<CouponKind>(this.o?.kind ?? 'percent');
  protected readonly valueText = signal(
    this.o && this.o.kind !== 'shipping' ? toText(this.o.value) : '',
  );
  protected readonly maxDiscountText = signal(toText(this.o?.maxDiscount));
  protected readonly minText = signal(toText(this.o?.minSubtotal));
  protected readonly startsOn = signal(this.o?.startsOn ?? '');
  protected readonly endsOn = signal(this.o?.endsOn ?? '');
  protected readonly maxUsesText = signal(toText(this.o?.maxUses));
  /** Padrão: 1 uso por cliente. Vazio = sem limite. */
  protected readonly perCustomerText = signal(this.o ? toText(this.o.perCustomer) : '1');
  protected readonly firstPurchaseOnly = signal(this.o?.firstPurchaseOnly ?? false);
  protected readonly allowOnPromo = signal(this.o?.allowOnPromo ?? false);
  protected readonly active = signal(this.o?.active ?? true);
  protected readonly tried = signal(false);

  protected readonly draft = computed<CouponDraft>(() => {
    const kind = this.kind();
    const shipping = kind === 'shipping';
    return {
      code: normalizeCode(this.code()),
      kind,
      value: shipping ? 0 : (optional(this.valueText()) ?? NaN),
      maxDiscount: kind === 'percent' ? optional(this.maxDiscountText()) : undefined,
      minSubtotal: optional(this.minText()),
      startsOn: this.startsOn() || undefined,
      endsOn: this.endsOn() || undefined,
      maxUses: optional(this.maxUsesText()),
      perCustomer: optional(this.perCustomerText()),
      firstPurchaseOnly: this.firstPurchaseOnly(),
      allowOnPromo: shipping ? true : this.allowOnPromo(),
      active: this.active(),
    };
  });

  protected readonly problems = computed(() => this.store.problems(this.id, this.draft()));
  protected readonly summary = computed(() => this.store.summary(this.draft()));
  protected readonly status = computed(() =>
    couponStatus(
      { ...this.draft(), id: 0, uses: this.o?.uses ?? 0, discountGiven: 0 },
      this.store.today(),
    ),
  );

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length) return;
    const id = this.store.save(this.id, this.draft());
    this.snackBar.open(
      this.status() === 'no-ar' ? 'Cupom salvo — já vale no carrinho.' : 'Cupom salvo.',
      'Fechar',
      { duration: 3000 },
    );
    if (!this.id) this.router.navigate(['/admin/promocoes/cupons', id], { replaceUrl: true });
  }

  protected remove(): void {
    if (!this.id || !this.o || this.used) return;
    const data: ActionDialogData = {
      title: 'Excluir cupom?',
      message: `${this.o.code} deixa de existir e o código fica livre. Para só pausar, desmarque "Ativo".`,
      confirmLabel: 'Excluir',
      danger: true,
    };
    this.dialog
      .open(ActionDialog, { data, width: '420px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed || !this.id || !this.store.remove(this.id)) return;
        this.snackBar.open('Cupom excluído.', 'Fechar', { duration: 3000 });
        this.router.navigate(['/admin/promocoes/cupons']);
      });
  }
}
