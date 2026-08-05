import { Injectable, signal } from '@angular/core';

const MAX_SAMPLES = 24;

type Series = number[];
type NodeHistory = Record<string, Series>;
type HistoryMap = Record<string, NodeHistory>;

@Injectable()
export class HistoryService {
  private readonly _map = signal<HistoryMap>({});

  /** Snapshot accessor — read inside a component's own computed to stay reactive. */
  read(nodeId: string, prop: string): Series {
    return this._map()[nodeId]?.[prop] ?? [];
  }

  pushTick(nodeId: string, props: Record<string, number>) {
    this._map.update((map) => {
      const node = { ...(map[nodeId] ?? {}) };
      for (const [k, v] of Object.entries(props)) {
        const existing = node[k] ?? [];
        node[k] = [...existing.slice(-(MAX_SAMPLES - 1)), v];
      }
      return { ...map, [nodeId]: node };
    });
  }
}
