import { computed, inject, type Signal } from '@angular/core';
import type { Node } from 'ng-diagram';
import type { Module } from '../../../../model';
import { AlarmFilterService } from '../../../../services/alarm-filter.service';
import { ViewConfigService } from '../../../../services/view-config.service';
import { STATUS_GLYPH, deriveValueColor, nodeShortId } from '../../../../shared/node-view';

/**
 * Shared state + behaviour for the ng-diagram node templates (module, paint
 * shop, auto-assembly): live data, short id, status glyph, alarm dimming +
 * reveal, and the per-node view config. Each concrete node declares its own
 * `node` input so the module type narrows; that field satisfies the abstract
 * accessor here. Not an Angular directive — a plain base whose `inject()` runs
 * in the subclass component's injection context.
 */
export abstract class BaseModuleNode<M extends Module> {
  protected readonly viewConfig = inject(ViewConfigService);
  protected readonly alarmFilter = inject(AlarmFilterService);

  abstract readonly node: Signal<Node<M>>;

  protected readonly data = computed(() => this.node().data);
  protected readonly shortId = computed(() => nodeShortId(this.data().type, this.node().id));
  protected readonly statusGlyph = computed(() => STATUS_GLYPH[this.data().status]);
  protected readonly isDimmed = computed(() =>
    this.alarmFilter.isNodeDimmed(this.node().id, this.data().status),
  );
  protected readonly propCfg = computed(() => this.viewConfig.propertiesFor(this.node().id));

  reveal(event: MouseEvent): void {
    event.stopPropagation();
    this.alarmFilter.whitelistNode(this.node().id);
  }

  protected visible(key: string): boolean {
    return this.propCfg()[key]?.visible !== false;
  }

  /** Threshold color for a metric's value, or undefined when it has no range. */
  protected metricColor(key: string): string | undefined {
    return deriveValueColor(this.data(), key, this.propCfg()[key]);
  }
}
