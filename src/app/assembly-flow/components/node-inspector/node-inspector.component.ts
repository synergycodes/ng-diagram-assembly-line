import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MODULE_TYPES } from '../../model';
import { SelectionService } from '../../state/selection.service';
import { DiagramStore } from '../../state/diagram-store.service';
import { ViewConfigService } from '../../services/view-config.service';
import { HistoryService } from '../../services/history.service';
import { AlarmFilterService } from '../../services/alarm-filter.service';
import { SparklineComponent } from '../../diagram/core/nodes/shared/sparkline/sparkline.component';
import {
  STATUS_GLYPH,
  deriveBufferLevel,
  deriveMetrics,
  nodeShortId,
  statusFooter,
} from '../../shared/node-view';

/**
 * Read-only companion to the properties panel, shown in Monitor mode: it
 * presents the selected node's live status and metrics (with sparklines) instead
 * of editable settings. Reads the node reactively off `DiagramStore.nodes()`, so
 * it ticks as data-bus updates arrive.
 */
@Component({
  selector: 'app-node-inspector',
  imports: [SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './node-inspector.component.html',
  styleUrl: './node-inspector.component.scss',
})
export class NodeInspectorComponent {
  private readonly selection = inject(SelectionService);
  private readonly store = inject(DiagramStore);
  private readonly viewConfig = inject(ViewConfigService);
  private readonly history = inject(HistoryService);
  private readonly alarmFilter = inject(AlarmFilterService);

  private readonly node = computed(() => {
    const id = this.selection.selectedNodeId();
    if (!id) {
      return null;
    }
    return this.store.nodes().find((n) => n.id === id) ?? null;
  });

  protected readonly data = computed(() => this.node()?.data ?? null);

  protected readonly statusGlyph = computed(() => {
    const d = this.data();
    return d ? STATUS_GLYPH[d.status] : '';
  });

  protected readonly shortId = computed(() => {
    const n = this.node();
    return n ? nodeShortId(n.data.type, n.id) : '';
  });

  protected readonly footer = computed(() => {
    const d = this.data();
    return d ? statusFooter(d) : null;
  });

  protected readonly inAlarm = computed(() => {
    const d = this.data();
    return d ? this.alarmFilter.isAlarmStatus(d.status) : false;
  });

  protected readonly metrics = computed(() => {
    const n = this.node();
    if (!n) {
      return [];
    }
    const propCfg = this.viewConfig.propertiesFor(n.id);
    return deriveMetrics(n.data, propCfg, (key) => this.history.read(n.id, key));
  });

  protected readonly buffer = computed(() => {
    const n = this.node();
    if (!n || n.data.type !== MODULE_TYPES.BUFFER) {
      return null;
    }
    const propCfg = this.viewConfig.propertiesFor(n.id);
    return deriveBufferLevel(n.data, propCfg);
  });

  protected readonly paint = computed(() => {
    const d = this.data();
    return d?.type === MODULE_TYPES.PAINT_SHOP ? d : null;
  });

  protected readonly assembly = computed(() => {
    const d = this.data();
    return d?.type === MODULE_TYPES.AUTO_ASSEMBLY ? d : null;
  });

  protected readonly isArea = computed(() => this.data()?.type === MODULE_TYPES.AREA);
}
