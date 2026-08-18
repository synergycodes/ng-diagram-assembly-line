import { Injectable, inject, signal } from '@angular/core';
import {
  Observable,
  concatMap,
  defer,
  finalize,
  ignoreElements,
  interval,
  map,
  merge,
  share,
  tap,
} from 'rxjs';
import {
  toDataUpdate,
  type AssemblyNode,
  type DataUpdate,
  type EdgeFlowState,
  type EdgeType,
  type EdgeState,
} from '../model';
import { DiagramStore } from './diagram-store.service';
import { MockProductionEngine } from './mock-feed/mock-production-engine';
import type { ProductionSnapshot } from './mock-feed/mock-feed-types';
import { getUpdateGenerator } from './mock-feed/generators';
import { ASSEMBLY_LINE_CONFIG } from '../assembly-line.config';

@Injectable()
export class DataConnectionService {
  private readonly store = inject(DiagramStore);
  private readonly feed = inject(ASSEMBLY_LINE_CONFIG).feed;

  readonly connected = signal(false);
  private activeCount = 0;

  updatesFor(nodeIds: Iterable<string>): Observable<DataUpdate> {
    const ids = new Set(nodeIds);
    return defer(() => {
      const engine = new MockProductionEngine();
      engine.init(this.buildScopedSnapshot(ids));
      this.setActive(this.activeCount + 1);

      const generate$ = interval(this.feed.generateIntervalMs).pipe(
        tap(() => engine.generateStep()),
      );
      const status$ = interval(this.feed.statusIntervalMs).pipe(tap(() => engine.statusStep()));
      const tick$ = interval(this.feed.tickIntervalMs).pipe(
        concatMap(() => engine.drain()),
        map((update) => toDataUpdate(update)),
      );

      return merge(generate$.pipe(ignoreElements()), status$.pipe(ignoreElements()), tick$).pipe(
        finalize(() => this.setActive(this.activeCount - 1)),
      );
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
    const nodes: AssemblyNode[] = this.store
      .nodes()
      .filter((node) => ids.has(node.id))
      .filter((node) => getUpdateGenerator(node.type) !== undefined);

    const includedIds = new Set(nodes.map((n) => n.id));
    const edges: EdgeState[] = this.store
      .edges()
      .filter((edge) => includedIds.has(edge.source) && includedIds.has(edge.target))
      .map((edge) => {
        const data = (edge.data ?? {}) as { type?: EdgeType; flowState?: EdgeFlowState };
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: data.type ?? 'flow',
          flowState: data.flowState,
          unitsInTransit: [],
        };
      });

    return { nodes, edges, timestamp: Date.now() };
  }
}
