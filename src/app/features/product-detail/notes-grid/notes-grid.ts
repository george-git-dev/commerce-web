import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NOTE_IMAGES, OCCASION_LABELS, OlfactoryFamily } from '../../../core/config/fragrance';
import { Occasion, OlfactoryNotes } from '../../../core/models/product';

/**
 * Bloco "Pirâmide olfativa": família e ocasião no topo e as notas em grade de
 * imagens (Topo, Coração e Fundo). Cada nota tem imagem obrigatória (`NOTE_IMAGES`).
 */
@Component({
  selector: 'app-notes-grid',
  imports: [MatIconModule],
  templateUrl: './notes-grid.html',
  styleUrl: './notes-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesGrid {
  readonly notes = input.required<OlfactoryNotes>();
  readonly families = input<readonly OlfactoryFamily[]>([]);
  readonly occasions = input<readonly Occasion[]>([]);

  protected readonly images = NOTE_IMAGES;

  /** "Amadeirado · Especiado". */
  protected readonly familyText = computed(() => this.families().join(' · '));
  /** "Dia e noite". */
  protected readonly occasionText = computed(() =>
    this.occasions()
      .map((occasion) => OCCASION_LABELS[occasion])
      .join(' e '),
  );

  protected readonly layers = computed(() => {
    const notes = this.notes();
    return [
      { title: 'Topo', hint: 'a primeira impressão', notes: notes.top },
      { title: 'Coração', hint: 'o que se revela depois', notes: notes.heart },
      { title: 'Fundo', hint: 'o que fica na pele', notes: notes.base },
    ].filter((layer) => layer.notes.length);
  });
}
