import { inject, Injectable, signal } from '@angular/core';
import { ROLE_LABELS } from '../../../core/config/permissions';
import { AuthService } from '../../../core/services/auth-service';

/** De onde veio a ação (no back: IP da requisição e user agent). */
export interface AuditOrigin {
  ip: string;
  device: 'Celular' | 'Computador';
}

/** Um registro de auditoria: quem fez o quê, quando, e o antes → depois. */
export interface AuditEntry {
  at: Date;
  by: string;
  /**
   * Perfil de quem fez NO MOMENTO da ação (gravado junto, não lido do cadastro
   * atual: tirar o acesso depois não muda o que o registro mostra).
   */
  role: string;
  action: string;
  entity: string;
  entityId: string;
  changes: readonly { field: string; before: string; after: string }[];
  origin: AuditOrigin;
  /** Tela do item no backoffice (quando o código sozinho não basta para achar). */
  link?: string;
}

/** IP FICTÍCIO e estável por pessoa (mock). No back vem da requisição. */
export function mockIp(name: string): string {
  const hash = [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 997, 7);
  return `189.40.${hash % 200}.${(hash * 7) % 250}`;
}

/**
 * Registro de auditoria do backoffice (em memória; a tela é `/admin/auditoria`).
 * No back (B7) é uma tabela só de inclusão gravada na mesma transação da
 * alteração — o front nunca é a fonte da auditoria, isto é só para a tela.
 * Quem chama passa o que mudou; perfil, IP e dispositivo entram aqui.
 */
@Injectable({ providedIn: 'root' })
export class AdminAudit {
  private readonly auth = inject(AuthService);
  private readonly log = signal<readonly AuditEntry[]>([]);
  readonly entries = this.log.asReadonly();

  record(entry: Omit<AuditEntry, 'at' | 'role' | 'origin'>): void {
    const roles = (this.auth.user()?.roles ?? []).filter((role) => role !== 'ROLE_CUSTOMER');
    const mobile = /Mobi|Android|iPhone/i.test(globalThis.navigator?.userAgent ?? '');
    const full: AuditEntry = {
      ...entry,
      at: new Date(),
      role: roles.map((role) => ROLE_LABELS[role]).join(', ') || '—',
      origin: { ip: mockIp(entry.by), device: mobile ? 'Celular' : 'Computador' },
    };
    this.log.update((list) => [full, ...list]);
  }

  /** Histórico FICTÍCIO para a tela não nascer vazia (só uma vez; some na Fase 2). */
  seedOnce(entries: readonly AuditEntry[]): void {
    if (this.seeded) return;
    this.seeded = true;
    this.log.update((list) =>
      [...list, ...entries].sort((a, b) => b.at.getTime() - a.at.getTime()),
    );
  }

  private seeded = false;
}
