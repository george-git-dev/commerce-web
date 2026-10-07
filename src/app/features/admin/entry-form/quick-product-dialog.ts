import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Gender } from '../../../core/models/product';
import { NonNegative } from '../../../shared/input-mask/non-negative';
import { NamePicker } from '../product-form/name-picker/name-picker';
import { AdminProductStore } from '../services/admin-product-store';

/**
 * Cadastro rápido na entrada de mercadoria: só o que identifica o produto.
 * Vira rascunho em Produtos (preço, fotos e perfil olfativo depois). Fecha
 * com o SKU do frasco.
 */
@Component({
  selector: 'app-quick-product-dialog',
  imports: [MatButtonModule, MatDialogModule, NamePicker, NonNegative],
  template: `
    <h2 mat-dialog-title>Produto novo</h2>
    <form (submit)="$event.preventDefault(); save()" novalidate>
      <mat-dialog-content class="qd">
        <p class="qd__hint">
          Fica como rascunho em Produtos — preço de venda, fotos e perfil olfativo você completa lá.
        </p>
        <app-name-picker
          label="Marca"
          placeholder="Escolha a marca"
          newLabel="Nova marca"
          error="Escolha a marca."
          [showError]="tried()"
          [options]="products.brandNames()"
          [(value)]="brand"
        />
        <app-name-picker
          label="Linha"
          [placeholder]="brand() ? 'Escolha a linha' : 'Escolha a marca primeiro'"
          newLabel="Nova linha"
          error="Escolha ou crie a linha."
          [showError]="tried()"
          [options]="lines()"
          [(value)]="line"
          [disabled]="!brand()"
        />
        <label>
          Versão (opcional)
          <input
            placeholder="Ex.: Bourbon, Elixir"
            [value]="subtitle()"
            (input)="subtitle.set($any($event.target).value)"
          />
        </label>
        <app-name-picker
          label="Categoria"
          placeholder="Escolha a categoria"
          newLabel="Nova categoria"
          error="Escolha a categoria."
          [showError]="tried()"
          [sort]="false"
          [options]="categoryNames()"
          [(value)]="category"
        />
        <div class="qd__row">
          <label>
            Gênero
            <select
              [attr.aria-invalid]="(tried() && !gender()) || null"
              (change)="gender.set($any($event.target).value)"
            >
              <option value="" disabled [selected]="!gender()">Escolha</option>
              @for (item of genders; track item) {
                <option [value]="item" [selected]="item === gender()">{{ item }}</option>
              }
            </select>
          </label>
          <label>
            Volume (ml)
            <input
              type="number"
              inputmode="numeric"
              appNonNegative="integer"
              min="1"
              placeholder="Ex.: 100"
              [value]="volume() ?? ''"
              [attr.aria-invalid]="(tried() && !validVolume()) || null"
              (input)="volume.set($any($event.target).value)"
            />
          </label>
        </div>
        @if (tried() && (problems().length || duplicateSku())) {
          <ul class="qd__problems" role="alert">
            @for (problem of problems(); track problem) {
              <li>{{ problem }}</li>
            }
            @if (duplicateSku(); as sku) {
              <li>
                Já cadastrado: {{ duplicate()!.name }}.
                <button type="button" (click)="close(sku)">Usar este</button>
              </li>
            }
          </ul>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Voltar</button>
        <button matButton="filled" type="submit">Cadastrar e usar</button>
      </mat-dialog-actions>
    </form>
  `,
  styleUrl: './quick-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickProductDialog {
  protected readonly products = inject(AdminProductStore);
  private readonly ref = inject(MatDialogRef<QuickProductDialog, string>);
  protected readonly genders: readonly Gender[] = ['Masculino', 'Feminino', 'Unissex'];

  protected readonly brand = signal('');
  protected readonly line = signal('');
  protected readonly subtitle = signal('');
  protected readonly category = signal('');
  protected readonly gender = signal<Gender | ''>('');
  protected readonly volume = signal<string | null>(null);
  protected readonly tried = signal(false);

  protected readonly lines = computed(() => this.products.lines(this.brand()));
  protected readonly categoryNames = computed(() =>
    this.products.categories().map((item) => item.label),
  );
  protected readonly validVolume = computed(() => {
    const ml = Number(this.volume());
    return !!this.volume() && Number.isInteger(ml) && ml > 0;
  });
  protected readonly duplicate = computed(() =>
    this.brand() && this.line()
      ? this.products.findDuplicate(this.brand(), this.line(), this.subtitle(), null)
      : undefined,
  );
  /** Produto igual já existe: oferece usar o frasco dele em vez de duplicar. */
  protected readonly duplicateSku = computed(
    () => this.duplicate()?.variants.find((v) => v.kind === 'frasco')?.id,
  );
  protected readonly problems = computed(() => {
    const problems: string[] = [];
    if (!this.brand()) problems.push('Escolha a marca.');
    if (!this.line()) problems.push('Escolha ou crie a linha.');
    if (!this.category()) problems.push('Escolha a categoria.');
    if (!this.gender()) problems.push('Escolha o gênero.');
    if (!this.validVolume()) problems.push('Informe o volume do frasco (ml, maior que zero).');
    if (this.duplicate() && !this.duplicateSku()) {
      problems.push(`Já cadastrado: ${this.duplicate()!.name} (sem frasco — ajuste em Produtos).`);
    }
    return problems;
  });

  protected save(): void {
    this.tried.set(true);
    if (this.problems().length || this.duplicateSku()) return;
    const sku = this.products.createDraft({
      brand: this.brand(),
      line: this.line(),
      subtitle: this.subtitle(),
      category: this.products.ensureCategory(this.category()),
      gender: this.gender() as Gender,
      volumeMl: Number(this.volume()),
    });
    this.close(sku);
  }

  protected close(sku: string): void {
    this.ref.close(sku);
  }
}
