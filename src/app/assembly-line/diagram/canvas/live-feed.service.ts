import { Injectable, inject } from '@angular/core';
import type { Subscription } from 'rxjs';
import { NgDiagramModelService } from 'ng-diagram';
import { HistoryService } from '../../shared';
import { getPropertyMeta, type AssemblyNodeData, type DataUpdate } from '../../model';
import { DataConnectionService } from '../../state/data-connection.service';

/**
 * Applies the live production feed (monitor mode) onto the ng-diagram model:
 * subscribes to the data bus for a set of node ids, writes each update through
 * `updateNodeData`, and records numeric metrics as history ticks for sparklines.
 *
 * Provided at the diagram-component level so it can inject the diagram-scoped
 * `NgDiagramModelService`. The owner drives {@link start}/{@link stop} from the
 * app mode.
 */
@Injectable()
export class LiveFeedService {
  private readonly modelService = inject(NgDiagramModelService);
  private readonly dataConnection = inject(DataConnectionService);
  private readonly history = inject(HistoryService);

  private sub?: Subscription;

  /**
   * Subscribe to the live data bus for the given node ids and apply each update
   * to the model. Replaces any existing subscription.
   */
  start(nodeIds: string[]): void {
    this.stop();
    this.sub = this.dataConnection
      .updatesFor(nodeIds)
      .subscribe((update) => this.applyUpdate(update));
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

  private applyUpdate(update: DataUpdate): void {
    const current = this.modelService.getNodeById<AssemblyNodeData>(update.nodeId);
    if (!current) {
      return;
    }

    this.modelService.updateNodeData<AssemblyNodeData>(update.nodeId, {
      ...current.data,
      status: update.status,
      ...(update.metrics as Partial<AssemblyNodeData>),
    } as AssemblyNodeData);

    const numeric: Record<string, number> = {};
    for (const meta of getPropertyMeta(update.type)) {
      if (!meta.numeric) {
        continue;
      }
      const value = update.metrics[meta.key];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        numeric[meta.key] = value;
      }
    }
    if (Object.keys(numeric).length) {
      this.history.pushTick(update.nodeId, numeric);
    }
  }
}
