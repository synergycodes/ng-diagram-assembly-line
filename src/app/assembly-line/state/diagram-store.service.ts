import { Injectable, signal } from '@angular/core';
import type { Edge } from 'ng-diagram';
import type { AssemblyNode } from '../model';
import initialDiagram from './initial-diagram.json';

interface DiagramSeed {
  nodes: AssemblyNode[];
  edges: Edge[];
}

const SEED: DiagramSeed = initialDiagram as unknown as DiagramSeed;

@Injectable()
export class DiagramStore {
  private readonly _nodes = signal<AssemblyNode[]>(SEED.nodes);
  private readonly _edges = signal<Edge[]>(SEED.edges);
  readonly nodes = this._nodes.asReadonly();
  readonly edges = this._edges.asReadonly();

  setNodes(nodes: AssemblyNode[]) {
    this._nodes.set(nodes);
  }

  setEdges(edges: Edge[]) {
    this._edges.set(edges);
  }
}
