import { CurrencyPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CONCENTRATIONS,
  Concentration,
  OCCASION_LABELS,
  OLFACTORY_FAMILIES,
  OlfactoryFamily,
} from '../../../core/config/fragrance';
import {
  Gender,
  Occasion,
  Product,
  ProductCategory,
  ProductStatus,
  ProductVariant,
} from '../../../core/models/product';
import { AuthService } from '../../../core/services/auth-service';
import { AdminProductStore } from '../services/admin-product-store';
import {
  DECANT_ON_DEMAND_LIMIT,
  DECANT_SIZES_ML,
  draftProblems,
  MIN_DESCRIPTION,
  validPromo,
  validStock,
  requiredProblems,
  slugify,
  uniqueSlug,
  variantProblems,
} from '../services/product-rules';
import { FormSteps } from './form-steps/form-steps';
import { NonNegative } from '../../../shared/input-mask/non-negative';
import { NamePicker } from './name-picker/name-picker';
import { NoteLayer } from './note-layer/note-layer';
import { ProductImages } from './product-images/product-images';

interface DecantSize {
  ml: number;
  checked: boolean;
  price: number | null;
}

const STEPS = ['Dados', 'Variantes', 'Perfil olfativo', 'Imagens', 'Vitrine'] as const;

/**
 * `/admin/produtos/novo` e `/admin/produtos/:slug` — cadastro em etapas:
 * dados → variantes (frasco com estoque; decant sob demanda) → perfil olfativo
 * → imagens → vitrine e publicação.
 */
@Component({
  selector: 'app-admin-product-form',
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    RouterLink,
    FormSteps,
    NamePicker,
    NonNegative,
    NoteLayer,
    ProductImages,
  ],
  templateUrl: './admin-product-form.html',
  styleUrl: './admin-product-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductForm {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly store = inject(AdminProductStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly document = inject(DOCUMENT);
  protected readonly auth = inject(AuthService);

  /** Produto em edição; `undefined` = cadastro novo. */
  protected readonly original = this.store.find(
    inject(ActivatedRoute).snapshot.paramMap.get('slug'),
  );
  protected readonly readOnly = !this.auth.can('products:edit');

  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly genders: readonly Gender[] = ['Masculino', 'Feminino', 'Unissex'];
  protected readonly concentrations = CONCENTRATIONS;
  protected readonly families = OLFACTORY_FAMILIES;
  protected readonly occasions = Object.entries(OCCASION_LABELS) as [Occasion, string][];
  protected readonly layers = [
    { id: 'top', label: 'Notas de topo' },
    { id: 'heart', label: 'Notas de coração' },
    { id: 'base', label: 'Notas de fundo' },
  ] as const;

  // 1. Dados
  protected readonly brand = signal(this.original?.brandName ?? '');
  protected readonly line = signal(this.original?.line ?? '');
  protected readonly data = this.fb.group({
    subtitle: [this.original?.subtitle ?? ''],
    // Cadastro novo começa vazio: categoria, gênero e concentração são escolhas.
    category: [this.original?.category ?? ('' as ProductCategory)],
    gender: [this.original?.gender ?? ('' as Gender | '')],
    // '' = ainda não escolheu; 'none' = "Não informar" (a loja não mostra).
    concentration: [
      (this.original ? (this.original.concentration ?? 'none') : '') as Concentration | 'none' | '',
    ],
    description: [this.original?.description ?? ''],
    kitItems: [this.original?.kitItems?.join('\n') ?? ''],
  });
  protected readonly category = signal(this.data.controls.category.value);
  protected readonly categoryNames = computed(() =>
    this.store.categories().map((item) => item.label),
  );
  protected readonly categoryName = computed(() => this.store.categoryLabel(this.category()));
  private readonly subtitle = signal(this.data.controls.subtitle.value);
  protected readonly lineOptions = computed(() => this.store.lines(this.brand()));
  protected readonly duplicate = computed(() =>
    this.brand() && this.line()
      ? this.store.findDuplicate(
          this.brand(),
          this.line(),
          this.subtitle(),
          this.original?.id ?? null,
        )
      : undefined,
  );

  // 2. Variantes
  private readonly originalBottle = this.original?.variants.find((v) => v.kind === 'frasco');
  private readonly originalDecants =
    this.original?.variants.filter((v) => v.kind === 'decant') ?? [];
  protected readonly bottle = this.fb.group({
    enabled: [this.original ? !!this.originalBottle : false],
    volumeMl: [this.originalBottle?.volumeMl ?? (null as number | null)],
    price: [this.originalBottle?.price ?? (null as number | null)],
    promoPrice: [this.originalBottle?.promoPrice ?? (null as number | null)],
    stock: [this.originalBottle?.stock ?? (null as number | null)],
  });
  protected readonly bottleOn = signal(this.bottle.controls.enabled.value);
  /** Decant ligado = disponível na loja (sob demanda, sem estoque). */
  protected readonly decantOn = signal(this.originalDecants.some((v) => v.stock > 0));
  protected readonly decantSizes = signal<readonly DecantSize[]>(
    [...new Set([...DECANT_SIZES_ML, ...this.originalDecants.map((v) => v.volumeMl ?? 0)])]
      .filter(Boolean)
      .sort((a, b) => a - b)
      .map((ml) => {
        const existing = this.originalDecants.find((v) => v.volumeMl === ml);
        return { ml, checked: !!existing, price: existing?.price ?? null };
      }),
  );
  protected readonly customSize = signal<number | null>(null);

  // 3. Perfil olfativo
  protected readonly selectedFamilies = signal<readonly OlfactoryFamily[]>(
    this.original?.families ?? [],
  );
  protected readonly selectedOccasions = signal<readonly Occasion[]>(
    this.original?.occasions ?? [],
  );
  protected readonly notes = {
    top: signal<readonly string[]>(this.original?.notes?.top ?? []),
    heart: signal<readonly string[]>(this.original?.notes?.heart ?? []),
    base: signal<readonly string[]>(this.original?.notes?.base ?? []),
  };

  // 4. Imagens / 5. Vitrine
  protected readonly images = signal<readonly string[]>(this.original?.images ?? []);
  protected readonly badge = signal(this.original?.badge ?? '');

  /** Problemas da etapa atual (ou de tudo, ao publicar). */
  protected readonly problems = signal<readonly string[]>([]);
  /** Tentou avançar com pendência: destaca os campos obrigatórios vazios. */
  protected readonly showErrors = signal(false);
  /** Muda a cada digitação nos formulários (eles não são signals). */
  private readonly formTick = signal(0);
  /**
   * Etapas preenchidas corretamente — pinta o indicador de dourado. Só conta
   * se as anteriores também estão: a Vitrine (selo opcional) não fica dourada
   * num cadastro vazio.
   */
  protected readonly done = computed(() => {
    this.formTick();
    const ok = [0, 1, 2, 3, 4].map((step) => !this.stepProblems(step).length);
    return ok.map((_, step) => ok.slice(0, step + 1).every(Boolean));
  });

  constructor() {
    this.data.controls.category.valueChanges.subscribe((value) => this.category.set(value));
    this.data.controls.subtitle.valueChanges.subscribe((value) => this.subtitle.set(value));
    this.bottle.controls.enabled.valueChanges.subscribe((value) => this.bottleOn.set(value));
    this.data.valueChanges.subscribe(() => this.formTick.update((n) => n + 1));
    this.bottle.valueChanges.subscribe(() => this.formTick.update((n) => n + 1));
    // Mudou marca ou linha: os avisos antigos da etapa deixam de valer.
    effect(() => {
      this.brand();
      this.line();
      untracked(() => this.problems.set([]));
    });
    if (this.readOnly) {
      this.data.disable();
      this.bottle.disable();
    }
  }

  protected readonly title = computed(() => this.original?.name ?? 'Novo produto');

  // --- Variantes ---------------------------------------------------------

  protected toggleSize(ml: number, checked: boolean): void {
    this.decantSizes.update((list) => list.map((s) => (s.ml === ml ? { ...s, checked } : s)));
  }

  protected setSizePrice(ml: number, value: string): void {
    const price = value === '' ? null : Number(value);
    this.decantSizes.update((list) => list.map((s) => (s.ml === ml ? { ...s, price } : s)));
  }

  /** Escolheu ou criou uma categoria pelo nome. */
  protected setCategory(label: string): void {
    this.data.controls.category.setValue(this.store.ensureCategory(label));
  }

  protected addSize(): void {
    const ml = Math.round(Number(this.customSize()));
    if (!(ml > 0) || this.decantSizes().some((s) => s.ml === ml)) return;
    this.decantSizes.update((list) =>
      [...list, { ml, checked: true, price: null }].sort((a, b) => a.ml - b.ml),
    );
    this.customSize.set(null);
  }

  /** Variantes montadas a partir das etapas (SKU automático; o existente é mantido). */
  private buildVariants(): ProductVariant[] {
    const base = slugify(`${this.brand()} ${this.line()} ${this.data.controls.subtitle.value}`);
    const variants: ProductVariant[] = [];
    const b = this.bottle.getRawValue();
    if (b.enabled) {
      variants.push({
        id: this.originalBottle?.id ?? `${base}-${b.volumeMl ?? ''}`,
        kind: 'frasco',
        volumeMl: b.volumeMl ?? undefined,
        price: Number(b.price),
        promoPrice: b.promoPrice ? Number(b.promoPrice) : undefined,
        stock: Number(b.stock),
      });
    }
    for (const size of this.decantSizes().filter((s) => s.checked)) {
      variants.push({
        id: this.originalDecants.find((v) => v.volumeMl === size.ml)?.id ?? `${base}-d${size.ml}`,
        kind: 'decant',
        volumeMl: size.ml,
        price: Number(size.price),
        stock: this.decantOn() ? DECANT_ON_DEMAND_LIMIT : 0,
      });
    }
    return variants;
  }

  // --- Validação por etapa ------------------------------------------------

  private draft() {
    const value = this.data.getRawValue();
    const notes = this.notes.top().length + this.notes.heart().length + this.notes.base().length;
    return {
      brand: this.brand(),
      line: this.line(),
      category: value.category,
      gender: value.gender,
      concentration: value.concentration,
      description: value.description,
      kitItems: value.kitItems,
      bottle: this.bottle.getRawValue(),
      decants: this.decantSizes(),
      families: this.selectedFamilies(),
      occasions: this.selectedOccasions(),
      notes,
      images: this.images(),
      badge: this.badge(),
    };
  }

  /** Campo obrigatório vazio — só destaca depois de tentar avançar. */
  protected missing(
    field:
      | 'gender'
      | 'concentration'
      | 'description'
      | 'kitItems'
      | 'volumeMl'
      | 'price'
      | 'promoPrice'
      | 'stock',
  ): boolean {
    if (!this.showErrors()) return false;
    const { description, kitItems, gender, concentration } = this.data.getRawValue();
    const bottle = this.bottle.getRawValue();
    if (field === 'gender') return !gender;
    if (field === 'concentration') return !concentration;
    const value = { ...bottle, description, kitItems }[field];
    if (field === 'description') return `${value}`.trim().length < MIN_DESCRIPTION;
    if (field === 'stock') return !validStock(bottle.stock);
    if (field === 'promoPrice') return !validPromo(bottle.promoPrice, bottle.price);
    return (
      value == null || `${value}`.trim() === '' || (field !== 'kitItems' && !(Number(value) > 0))
    );
  }

  protected missingSizePrice(size: DecantSize): boolean {
    return this.showErrors() && size.checked && !(Number(size.price) > 0);
  }

  private duplicateMessage(): string {
    return `Este produto já está cadastrado: ${this.duplicate()?.name}.`;
  }

  private stepProblems(step: number): string[] {
    const problems = requiredProblems(step, this.draft());
    if (step === 0 && this.duplicate()) problems.push(this.duplicateMessage());
    if (step === 1) {
      return [
        ...problems,
        ...(problems.length
          ? []
          : variantProblems(
              this.buildVariants(),
              this.store.skusExcept(this.original?.id ?? null),
            )),
      ];
    }
    return problems;
  }

  protected next(): void {
    this.go(this.step() + 1);
  }

  /** Voltar é livre; avançar (botão ou indicador) exige as etapas do caminho completas. */
  protected go(target: number): void {
    target = Math.max(0, Math.min(target, STEPS.length - 1));
    if (!this.readOnly) {
      for (let step = this.step(); step < target; step++) {
        if (this.stop(step, this.stepProblems(step))) return;
      }
    }
    this.problems.set([]);
    this.showErrors.set(false);
    this.step.set(target);
    this.scrollTop();
  }

  /** Mostra as pendências da etapa; `true` = parou nela. */
  private stop(step: number, problems: string[]): boolean {
    if (!problems.length) return false;
    this.step.set(step);
    this.problems.set(problems);
    this.showErrors.set(true);
    this.scrollTop();
    return true;
  }

  private scrollTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Salvar -------------------------------------------------------------

  protected save(status: ProductStatus): void {
    // Rascunho só precisa de marca + linha (sem duplicar); publicar exige tudo.
    if (status === 'rascunho') {
      const problems = draftProblems(this.draft());
      if (this.duplicate()) problems.push(this.duplicateMessage());
      if (this.stop(0, problems)) return;
    } else {
      for (const step of [0, 1, 2, 3, 4]) {
        if (this.stop(step, this.stepProblems(step))) return;
      }
    }
    const value = this.data.getRawValue();
    const description = value.description.trim();

    const line = this.line().trim();
    const subtitle = value.subtitle.trim();
    const notes = { top: this.notes.top(), heart: this.notes.heart(), base: this.notes.base() };
    const hasNotes = notes.top.length || notes.heart.length || notes.base.length;
    const product: Product = {
      ...this.original,
      id: this.original?.id ?? this.store.nextId(),
      slug:
        this.original?.slug ??
        uniqueSlug(
          slugify(`${this.brand()} ${line} ${subtitle}`),
          this.store.products().map((item) => item.slug),
        ),
      line,
      subtitle: subtitle || undefined,
      name: subtitle ? `${line} ${subtitle}` : line,
      description,
      brandId: Math.max(1, this.store.brandNames().indexOf(this.brand()) + 1),
      brandName: this.brand(),
      category: value.category,
      // Rascunho pode ficar sem gênero; publicar exige (validado na etapa Dados).
      gender: value.gender as Gender,
      concentration:
        value.category === 'perfume' && value.concentration && value.concentration !== 'none'
          ? value.concentration
          : undefined,
      families: this.selectedFamilies(),
      // Notas novas (criadas aqui) entram na lista do back na Fase 2 (B3).
      notes: hasNotes ? (notes as unknown as Product['notes']) : undefined,
      kitItems:
        value.category === 'kit'
          ? value.kitItems
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
      occasions: this.selectedOccasions().length ? this.selectedOccasions() : undefined,
      status,
      badge: this.badge() || undefined,
      images: this.images(),
      variants: this.buildVariants(),
    };
    this.store.save(product);
    this.snackBar.open(
      status === 'publicado' ? 'Produto publicado.' : 'Rascunho salvo.',
      'Fechar',
      {
        duration: 3000,
      },
    );
    this.router.navigate(['/admin/produtos']);
  }

  protected toggle<T>(
    list: { update: (fn: (items: readonly T[]) => readonly T[]) => void },
    value: T,
  ): void {
    list.update((items) =>
      items.includes(value) ? items.filter((item) => item !== value) : [...items, value],
    );
  }

  /** Resumo da etapa Vitrine. */
  protected readonly summary = computed(() => {
    this.step();
    return this.buildVariants();
  });
}
