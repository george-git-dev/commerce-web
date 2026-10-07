import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminProductStore } from '../../services/admin-product-store';
import { imageProblem, normalizeName } from '../../services/product-rules';

/** Uma camada da pirâmide (topo, coração, fundo): escolher da lista ou criar nota nova. */
@Component({
  selector: 'app-note-layer',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './note-layer.html',
  styleUrl: './note-layer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteLayer {
  protected readonly store = inject(AdminProductStore);

  readonly label = input.required<string>();
  readonly selected = model.required<readonly string[]>();
  readonly readOnly = input(false);

  protected readonly creating = signal(false);
  protected readonly name = signal('');
  protected readonly image = signal('');
  protected readonly error = signal('');

  protected add(note: string): void {
    if (note === '__nova__') {
      this.creating.set(true);
      return;
    }
    if (note && !this.selected().includes(note)) this.selected.update((list) => [...list, note]);
  }

  protected remove(note: string): void {
    this.selected.update((list) => list.filter((item) => item !== note));
  }

  protected pickImage(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const problem = imageProblem(file);
    if (problem) return this.error.set(problem);
    this.error.set('');
    this.image.set(URL.createObjectURL(file));
  }

  /** Nota nova exige nome e imagem; se o nome já existe, só usa a existente. */
  protected create(): void {
    const name = this.name().trim();
    if (name.length < 2) return this.error.set('Informe o nome da nota.');
    const existing = this.store
      .noteNames()
      .find((note) => normalizeName(note) === normalizeName(name));
    if (existing) {
      this.add(existing);
      return this.reset();
    }
    if (!this.image()) return this.error.set('A nota precisa de uma imagem.');
    this.store.addNote(name, this.image());
    this.add(name);
    this.reset();
  }

  protected reset(): void {
    this.creating.set(false);
    this.name.set('');
    this.image.set('');
    this.error.set('');
  }
}
