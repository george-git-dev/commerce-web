import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { STORE_CONFIG } from '../../../core/config/store-config';
import {
  RETURN_REASON_LABELS,
  ReturnPhoto,
  ReturnReason,
} from '../../../core/models/return-request';
import { OrderService } from '../../../core/services/order-service';
import { ReturnService } from '../../../core/services/return-service';
import {
  canStillReturn,
  deadlineProblem,
  isWholeOrder,
  needsPhotos,
  photoProblem,
  refundAmount,
  RETURN_PHOTOS_MAX,
  RETURN_DESCRIPTION_MAX,
  returnableQuantity,
  returnDeadline,
  returnDraftProblems,
} from '../../../core/utils/return-rules';

/** `/minha-conta/pedidos/:numero/devolucao` — o cliente pede a devolução de um pedido entregue. */
@Component({
  selector: 'app-return-request',
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './return-request.html',
  styleUrl: './return-request.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnRequestPage {
  private readonly orders = inject(OrderService);
  private readonly returns = inject(ReturnService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });

  protected readonly store = STORE_CONFIG;
  protected readonly descriptionMax = RETURN_DESCRIPTION_MAX;
  protected readonly order = computed(() => this.orders.find(this.params().get('numero')));
  private readonly delivered = computed(() => {
    const at = this.order()?.deliveredAt;
    return at ? new Date(at) : undefined;
  });

  /** Motivos ainda no prazo (arrependimento some depois de 7 dias). */
  protected readonly reasons = computed(() =>
    (Object.keys(RETURN_REASON_LABELS) as ReturnReason[]).map((id) => ({
      id,
      label: RETURN_REASON_LABELS[id],
      until: this.delivered() ? returnDeadline(this.delivered()!, id) : null,
      late: !!deadlineProblem(this.delivered(), id),
    })),
  );

  /** Por que não dá para pedir (ou `null`). */
  protected readonly blocked = computed(() => {
    const order = this.order();
    if (!order) return 'Pedido não encontrado.';
    if (order.status !== 'entregue')
      return 'Só dá para pedir devolução depois que o pedido é entregue.';
    if (this.returns.openFor(order.number))
      return 'Já existe uma devolução em andamento para este pedido.';
    if (!canStillReturn(this.delivered()))
      return 'O prazo para devolução deste pedido (30 dias da entrega) já passou.';
    if (!this.lines().some((line) => line.max > 0))
      return 'Todos os itens deste pedido já foram devolvidos.';
    return null;
  });

  protected readonly quantities = signal<Readonly<Record<string, number>>>({});
  protected readonly reason = signal<ReturnReason | null>(null);
  protected readonly description = signal('');
  protected readonly sealed = signal(false);
  protected readonly photos = signal<readonly ReturnPhoto[]>([]);
  protected readonly photoError = signal<string | null>(null);
  protected readonly photosMax = RETURN_PHOTOS_MAX;
  protected readonly needsPhotos = computed(() => needsPhotos(this.reason()));
  protected readonly tried = signal(false);

  protected readonly lines = computed(() => {
    const order = this.order();
    if (!order) return [];
    const previous = this.returns.forOrder(order.number);
    return order.items.map((item) => ({
      item,
      max: returnableQuantity(item, previous),
      quantity: this.quantities()[item.id] ?? 0,
    }));
  });

  private readonly chosen = computed(() =>
    this.lines()
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        itemId: line.item.id,
        quantity: line.quantity,
        unitPrice: line.item.unitPrice,
      })),
  );

  /** Prévia do estorno (o valor final é confirmado pela loja). */
  protected readonly refund = computed(() => {
    const order = this.order();
    if (!order || !this.chosen().length) return 0;
    const whole = isWholeOrder(order.items, this.chosen(), this.returns.forOrder(order.number));
    return refundAmount(this.chosen(), order, whole);
  });

  protected readonly problems = computed(() => {
    const problems = returnDraftProblems({
      items: this.lines().map((l) => ({ quantity: l.quantity, max: l.max })),
      reason: this.reason(),
      description: this.description(),
      photos: this.photos().length,
      sealedConfirmed: this.sealed(),
    });
    const reason = this.reason();
    const late = reason && deadlineProblem(this.delivered(), reason);
    if (late) problems.push(late);
    return problems;
  });

  /** Fotos ficam só na memória (URL local) — nada vai para o navegador. */
  protected addPhotos(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.photoError.set(null);
    for (const file of files) {
      if (this.photos().length >= RETURN_PHOTOS_MAX) {
        this.photoError.set(`No máximo ${RETURN_PHOTOS_MAX} fotos.`);
        break;
      }
      const problem = photoProblem(file);
      if (problem) {
        this.photoError.set(problem);
        continue;
      }
      const photo: ReturnPhoto = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      };
      this.photos.update((list) => [...list, photo]);
    }
  }

  protected removePhoto(photo: ReturnPhoto): void {
    URL.revokeObjectURL(photo.url);
    this.photos.update((list) => list.filter((p) => p !== photo));
  }

  protected toggle(itemId: string, max: number, on: boolean): void {
    this.setQuantity(itemId, on ? max : 0);
  }

  protected setQuantity(itemId: string, quantity: number): void {
    this.quantities.update((all) => ({ ...all, [itemId]: quantity }));
  }

  protected range(max: number): number[] {
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  protected submit(): void {
    this.tried.set(true);
    const order = this.order();
    if (!order || this.problems().length) return;
    const result = this.returns.request(order, {
      items: this.chosen(),
      reason: this.reason(),
      description: this.description(),
      photos: this.needsPhotos() ? this.photos() : [],
      sealedConfirmed: this.sealed(),
    });
    if (!result.ok) {
      this.snackBar.open(result.message, 'Fechar', { duration: 4000 });
      return;
    }
    this.snackBar.open('Pedido de devolução enviado.', 'Fechar', { duration: 3500 });
    this.router.navigate(['/minha-conta/pedidos', order.number]);
  }
}
