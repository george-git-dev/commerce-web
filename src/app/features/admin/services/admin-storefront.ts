import { inject, Injectable } from '@angular/core';
import { Announcement, StoreBanner, StoreSettings } from '../../../core/models/storefront';
import { AuthService } from '../../../core/services/auth-service';
import { StorefrontContent } from '../../../core/services/storefront-content';
import { linkToText, moneyLabel } from '../../../core/utils/storefront-rules';
import { AdminAudit } from './admin-audit';

type Change = { field: string; before: string; after: string };

const yesNo = (value: boolean) => (value ? 'Sim' : 'Não');
const period = (item: { startsOn?: string; endsOn?: string }) =>
  `${item.startsOn ?? 'sem início'} → ${item.endsOn ?? 'sem fim'}`;

/** Só os campos que mudaram (auditoria mostra antes → depois). */
function diff(fields: [string, string, string][]): Change[] {
  return fields
    .filter(([, before, after]) => before !== after)
    .map(([field, before, after]) => ({ field, before, after }));
}

/**
 * Edição da vitrine no backoffice: grava em `StorefrontContent` (a loja muda
 * na hora) e registra na auditoria. Quem chama já validou (`storefront-rules`)
 * e só aparece para quem tem `settings:edit`. Fase 2 (B3/B7):
 * `POST/PUT/DELETE /admin/banners`, `/admin/announcements`, `PUT /admin/settings`
 * — o back valida de novo e grava a auditoria na mesma transação.
 */
@Injectable({ providedIn: 'root' })
export class AdminStorefront {
  readonly content = inject(StorefrontContent);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AdminAudit);

  banner(id: number | null): StoreBanner | undefined {
    return id == null ? undefined : this.content.allBanners().find((b) => b.id === id);
  }

  announcement(id: number | null): Announcement | undefined {
    return id == null ? undefined : this.content.allAnnouncements().find((a) => a.id === id);
  }

  saveBanner(id: number | null, data: Omit<StoreBanner, 'id'>): number {
    const before = this.banner(id);
    const savedId = this.content.saveBanner(id, data);
    // Imagem: registra só que foi trocada (o endereço não diz nada na auditoria).
    const imageChanged = (a?: string, b?: string) => (a === b ? 'mesma' : 'trocada');
    this.record(before ? 'Alterou banner' : 'Criou banner', 'Banner', savedId, [
      ['Nome', before?.name ?? '', data.name],
      ['Imagem do celular', 'mesma', imageChanged(before?.image, data.image)],
      ['Imagem do desktop', 'mesma', imageChanged(before?.imageDesktop, data.imageDesktop)],
      ['Descrição', before?.alt ?? '', data.alt],
      ['Link', linkToText(before?.link), linkToText(data.link)],
      ['Ativo', before ? yesNo(before.active) : '', yesNo(data.active)],
      ['Período', before ? period(before) : '', period(data)],
    ]);
    return savedId;
  }

  removeBanner(id: number): void {
    const before = this.banner(id);
    if (!before) return;
    this.content.removeBanner(id);
    this.record('Excluiu banner', 'Banner', id, [['Nome', before.name, '']]);
  }

  moveBanner(id: number, step: -1 | 1): void {
    this.content.moveBanner(id, step);
  }

  saveAnnouncement(id: number | null, data: Omit<Announcement, 'id'>): number {
    const before = this.announcement(id);
    const savedId = this.content.saveAnnouncement(id, data);
    this.record(before ? 'Alterou aviso' : 'Criou aviso', 'Aviso', savedId, [
      ['Texto', before?.text ?? '', data.text],
      ['Link', linkToText(before?.link), linkToText(data.link)],
      ['Ativo', before ? yesNo(before.active) : '', yesNo(data.active)],
      ['Período', before ? period(before) : '', period(data)],
    ]);
    return savedId;
  }

  removeAnnouncement(id: number): void {
    const before = this.announcement(id);
    if (!before) return;
    this.content.removeAnnouncement(id);
    this.record('Excluiu aviso', 'Aviso', id, [['Texto', before.text, '']]);
  }

  moveAnnouncement(id: number, step: -1 | 1): void {
    this.content.moveAnnouncement(id, step);
  }

  saveSettings(settings: StoreSettings): void {
    const before = this.content.settings();
    this.content.saveSettings(settings);
    this.record('Alterou configurações', 'Configurações', 'loja', [
      [
        'Frete grátis acima de',
        moneyLabel(before.freeShippingMin),
        moneyLabel(settings.freeShippingMin),
      ],
      [
        'Aviso de frete grátis na faixa',
        yesNo(before.freeShippingNotice),
        yesNo(settings.freeShippingNotice),
      ],
    ]);
  }

  private record(
    action: string,
    entity: string,
    id: number | string,
    fields: [string, string, string][],
  ): void {
    const changes = diff(fields);
    if (!changes.length) return;
    this.audit.record({
      by: this.auth.user()?.name ?? 'Equipe',
      action,
      entity,
      entityId: String(id),
      changes,
    });
  }
}
