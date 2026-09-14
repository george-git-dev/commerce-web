import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

/** Substitui o redirect silencioso do wildcard: URLs inválidas passam a ser informadas. */
@Component({
  selector: 'app-not-found',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
