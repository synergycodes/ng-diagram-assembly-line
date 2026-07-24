import { Injectable, signal } from '@angular/core';
import type { Edge, Node } from 'ng-diagram';
import type { Module } from '../model';
import initialDiagram from './initial-diagram.json';

interface DiagramSeed {
  nodes: Node<Module>[];
  edges: Edge[];
}

const SEED: DiagramSeed = initialDiagram as unknown as DiagramSeed;

@Injectable({ providedIn: 'root' })
export class DiagramStore {
  private readonly _nodes = signal<Node<Module>[]>(SEED.nodes);
  private readonly _edges = signal<Edge[]>(SEED.edges);
  readonly nodes = this._nodes.asReadonly();
  readonly edges = this._edges.asReadonly();

  setNodes(nodes: Node<Module>[]) {
    this._nodes.set(nodes);
  }

  setEdges(edges: Edge[]) {
    this._edges.set(edges);
  }
}
