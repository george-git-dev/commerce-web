import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ResetLinkDialogData {
  name: string;
  /** Telefone cadastrado (só dígitos, com DDD) — o link só vai para ele. */
  phoneDigits: string | null;
  /** Gera o link (e invalida o anterior); null = não pôde gerar. */
  issue: () => { url: string; expiresAt: Date } | null;
}

/**
 * Plano B quando o e-mail de redefinição não chega. Passo 1: confirmar que é
 * o cliente. Passo 2: o link (uso único, 30 min) para copiar ou mandar pelo
 * WhatsApp do telefone CADASTRADO. O link não fica salvo em lugar nenhum.
 */
@Component({
  selector: 'app-reset-link-dialog',
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Link para redefinir a senha</h2>
    <mat-dialog-content>
      @if (!link()) {
        <p>Use quando o e-mail não chegar. Antes de gerar:</p>
        <ul class="rl__checks">
          <li>
            Confirme que está falando com <strong>{{ data.name }}</strong> (CPF ou número de um
            pedido).
          </li>
          <li>Mande só para o telefone do cadastro, nunca para um número passado na hora.</li>
          <li>Quem cria a senha nova é o cliente. A atual vale até ele trocar.</li>
        </ul>
      } @else {
        @let l = link()!;
        <p>
          Vale até <strong>{{ l.expiresAt | date: 'HH:mm' }}</strong> e só uma vez. Gerar outro
          invalida este.
        </p>
        <input class="rl__url" [value]="l.url" readonly aria-label="Link de redefinição" #url />
        <div class="rl__share">
          <button matButton="outlined" type="button" (click)="copy(url)">
            <mat-icon>content_copy</mat-icon> {{ copied() ? 'Copiado' : 'Copiar' }}
          </button>
          @if (whatsapp(); as wa) {
            <a matButton="filled" [href]="wa" target="_blank" rel="noopener">
              <mat-icon>chat</mat-icon> Enviar pelo WhatsApp
            </a>
          }
        </div>
        @if (!data.phoneDigits) {
          <p class="rl__warn">
            Sem telefone no cadastro: copie e envie por um canal já usado com o cliente.
          </p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>{{ link() ? 'Fechar' : 'Voltar' }}</button>
      @if (!link()) {
        <button matButton="filled" type="button" (click)="generate()">
          Já confirmei, gerar link
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    p {
      margin: 0 0 12px;
      color: var(--muted-foreground);
    }

    .rl__checks {
      display: grid;
      gap: 6px;
      margin: 0;
      padding-left: 18px;
      font-size: 0.875rem;
    }

    .rl__url {
      width: 100%;
      height: 44px;
      padding-inline: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--muted);
      font: inherit;
      font-size: 0.8125rem;
    }

    .rl__share {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .rl__warn {
      margin-top: 12px;
      color: var(--wine);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetLinkDialog {
  protected readonly data = inject<ResetLinkDialogData>(MAT_DIALOG_DATA);
  protected readonly link = signal<{ url: string; expiresAt: Date } | null>(null);
  protected readonly whatsapp = signal<string | null>(null);
  protected readonly copied = signal(false);

  protected generate(): void {
    const link = this.data.issue();
    if (!link) return;
    this.link.set(link);
    if (this.data.phoneDigits) {
      const text =
        `Olá, ${this.data.name.split(' ')[0]}! Aqui é da Nani Perfumes. ` +
        `Para criar uma senha nova, abra este link (vale 30 minutos, uma vez só): ${link.url}`;
      this.whatsapp.set(
        `https://wa.me/55${this.data.phoneDigits}?text=${encodeURIComponent(text)}`,
      );
    }
  }

  protected async copy(input: HTMLInputElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      // Sem permissão de área de transferência: deixa selecionado para Ctrl+C.
      input.select();
      return;
    }
    this.copied.set(true);
  }
}
