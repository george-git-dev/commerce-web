import { Injectable, signal } from '@angular/core';

/** Um registro de auditoria: quem fez o quê, quando, e o antes → depois. */
export interface AuditEntry {
  at: Date;
  by: string;
  action: string;
  entity: string;
  entityId: string;
  changes: readonly { field: string; before: string; after: string }[];
}

/**
 * Registro de auditoria do backoffice (em memória; a tela é a sessão 7).
 * No back (B7) é uma tabela só de inclusão gravada na mesma transação da
 * alteração — o front nunca é a fonte da auditoria, isto é só para a tela.
 */
@Injectable({ providedIn: 'root' })
export class AdminAudit {
  private readonly log = signal<readonly AuditEntry[]>([]);
  readonly entries = this.log.asReadonly();

  record(entry: Omit<AuditEntry, 'at'>): void {
    this.log.update((list) => [{ ...entry, at: new Date() }, ...list]);
  }
}
