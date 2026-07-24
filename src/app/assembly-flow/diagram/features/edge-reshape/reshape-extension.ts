import { InjectionToken } from '@angular/core';
import type { Edge, Point } from 'ng-diagram';
import type { ReshapeEndpointKind } from './edge-reshape';

export interface ReshapeExtension<TSnapshot = unknown> {
  classifyEndpoint(nodeId: string): ReshapeEndpointKind;

  snapshot(edge: Edge, ctx: ReshapeDragContext): TSnapshot | null;

  /**
   * Invoked inside the reshape transaction so any dependent edits (moving the
   * free node, re-routing siblings) commit atomically with the edge.
   */
  apply(snapshot: TSnapshot, ctx: ReshapeDragContext, newPoints: readonly Point[]): void;
}

export interface ReshapeDragContext {
  readonly edgeId: string;
  readonly axis: 'horizontal' | 'vertical';
  readonly segmentIndex: number;
  readonly propagateToFreeEnd: 'source' | 'target' | null;
  readonly initialPoints: readonly Point[];
}

export const EDGE_RESHAPE_EXTENSION = new InjectionToken<ReshapeExtension>(
  'EDGE_RESHAPE_EXTENSION',
);
