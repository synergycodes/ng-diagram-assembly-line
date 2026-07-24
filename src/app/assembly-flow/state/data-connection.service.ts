import { Injectable, inject, signal } from '@angular/core';
import { Observable, share } from 'rxjs';
import {
  toDataUpdate,
  type DataUpdate,
  type EdgeFlowState,
  type EdgeKind,
  type EdgeState,
  type Module,
  type ProductionSnapshot,
} from '../model';
import { DiagramStore } from './diagram-store.service';
import { MockProductionEngine } from './mock-feed/mock-production-engine';
import { getUpdateGenerator } from './mock-feed/generators';

const GENERATE_INTERVAL_MS = 100;
const STATUS_INTERVAL_MS = 10000;
const TICK_INTERVAL_MS = 1000;

@Injectable({ providedIn: 'root' })
export class DataConnectionService {
  private readonly store = inject(DiagramStore);

  readonly connected = signal(false);
  private activeCount = 0;

  updatesFor(nodeIds: Iterable<string>): Observable<DataUpdate> {
    const ids = new Set(nodeIds);
    return new Observable<DataUpdate>((subscriber) => {
      const engine = new MockProductionEngine();
      engine.init(this.buildScopedSnapshot(ids));
      this.setActive(this.activeCount + 1);

      const generate = setInterval(() => engine.generateStep(), GENERATE_INTERVAL_MS);
      const status = setInterval(() => engine.statusStep(), STATUS_INTERVAL_MS);
      const tick = setInterval(() => {
        for (const update of engine.drain()) {
          subscriber.next(toDataUpdate(update));
        }
      }, TICK_INTERVAL_MS);

      return () => {
        clearInterval(generate);
        clearInterval(status);
        clearInterval(tick);
        this.setActive(this.activeCount - 1);
      };
    }).pipe(share({ resetOnRefCountZero: true }));
  }

  private setActive(next: number): void {
    this.activeCount = Math.max(0, next);
    this.connected.set(this.activeCount > 0);
  }

  /**
   * Edges are included only when both endpoints are in the set, so upstream
   * checks stay valid.
   */
  private buildScopedSnapshot(ids: ReadonlySet<string>): ProductionSnapshot {
    const modules: Module[] = this.store
      .nodes()
      .filter((node) => ids.has(node.id))
      .map((node) => ({
        ...(node.data as Module),
        id: node.id,
        position: node.position,
        groupId: node.groupId,
      }))
      .filter((module) => getUpdateGenerator(module) !== undefined);

    const includedIds = new Set(modules.map((m) => m.id));
    const edges: EdgeState[] = this.store
      .edges()
      .filter((edge) => includedIds.has(edge.source) && includedIds.has(edge.target))
      .map((edge) => {
        const data = (edge.data ?? {}) as { kind?: EdgeKind; flowState?: EdgeFlowState };
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          kind: data.kind ?? 'flow',
          flowState: data.flowState,
          carsInTransit: [],
        };
      });

    return { modules, edges, timestamp: Date.now() };
  }
}
