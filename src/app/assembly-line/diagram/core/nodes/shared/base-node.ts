import { computed, inject, type Signal } from '@angular/core';
import type { SimpleNode } from 'ng-diagram';
import type { AssemblyNodeData, NodeType } from '../../../../model';
import { AlarmFilterService } from '../../../../services/alarm-filter.service';
import { ViewConfigService } from '../../../../services/view-config.service';
import { STATUS_GLYPH, deriveValueColor, nodeShortId } from '../../../../shared/node-view';

/**
 * Shared state + behaviour for the ng-diagram node templates (module, paint
 * shop, auto-assembly): live data, node type, short id, status glyph, alarm
 * dimming + reveal, and the per-node view config. Generic over the `data`
 * payload so each concrete node narrows it. ng-diagram types `node.type` as
 * `string`; the `type` computed narrows it to `NodeType`.
 * Not an Angular directive — a plain base whose `inject()` runs in the subclass
 * component's injection context.
 */
export abstract class BaseNode<D extends AssemblyNodeData = AssemblyNodeData> {
  protected readonly viewConfig = inject(ViewConfigService);
  protected readonly alarmFilter = inject(AlarmFilterService);

  abstract readonly node: Signal<SimpleNode<D>>;

  protected readonly data = computed(() => this.node().data);
  protected readonly type = computed(() => this.node().type as NodeType);
  protected readonly shortId = computed(() => nodeShortId(this.type(), this.node().id));
  protected readonly statusGlyph = computed(() => STATUS_GLYPH[this.node().data.status]);
  protected readonly isDimmed = computed(() =>
    this.alarmFilter.isNodeDimmed(this.node().id, this.node().data.status),
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
    return deriveValueColor(this.type(), this.node().data, key, this.propCfg()[key]);
  }
}
