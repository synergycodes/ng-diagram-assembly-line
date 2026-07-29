import { computed, ElementRef, inject, Injectable, signal } from '@angular/core';
import { toCanvas, toSvg } from 'html-to-image';
import type { Options } from 'html-to-image/lib/types';
import { NgDiagramModelService } from 'ng-diagram';
import { HistoryService } from '../history.service';
import { buildAssemblyFlowDxfConfig } from './dxf-assembly-flow/assembly-dxf-config';
import { resolveEdgePoints } from './dxf-assembly-flow/edge-geometry';
import { DxfExporter } from './dxf/dxf-exporter';
import { DxfWriter } from './dxf/dxf-writer';
import { inlineEdgeStrokeStyles } from './inline-edge-stroke-styles';
import { pruneSvgStyles } from './prune-svg-styles';

const EXPORT_PADDING = 50;
const PNG_PIXEL_RATIO = 2;
const DIAGRAM_CANVAS_SELECTOR = 'ng-diagram-canvas';
const FALLBACK_BACKGROUND = '#ffffff';

interface ExportRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Injectable()
export class DiagramExportService {
  private readonly modelService = inject(NgDiagramModelService);
  private readonly history = inject(HistoryService);
  private readonly diagramElement = signal<ElementRef<HTMLElement> | null>(null);

  readonly canExport = computed(
    () => this.diagramElement() !== null && this.modelService.nodes().length > 0,
  );

  setDiagramElement(element: ElementRef<HTMLElement>): void {
    this.diagramElement.set(element);
  }

  clearDiagramElement(): void {
    this.diagramElement.set(null);
  }

  async exportPng(): Promise<void> {
    const canvasEl = this.getDiagramCanvasEl();
    const region = this.computeExportRegion();
    if (!canvasEl || !region) {
      return;
    }

    const restoreEdges = inlineEdgeStrokeStyles(canvasEl);
    try {
      const canvas = await toCanvas(canvasEl, this.buildOptions(canvasEl, region));
      this.downloadDataUrl(canvas.toDataURL('image/png'), 'assembly-flow.png');
    } finally {
      restoreEdges();
    }
  }

  async exportSvg(): Promise<void> {
    const canvasEl = this.getDiagramCanvasEl();
    const region = this.computeExportRegion();
    if (!canvasEl || !region) {
      return;
    }

    const restoreEdges = inlineEdgeStrokeStyles(canvasEl);
    let rawSvg: string;
    try {
      const dataUrl = await toSvg(canvasEl, this.buildOptions(canvasEl, region));
      rawSvg = await (await fetch(dataUrl)).text();
    } finally {
      restoreEdges();
    }

    const svg = pruneSvgStyles(rawSvg);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    this.downloadBlob(blob, 'assembly-flow.svg');
  }

  exportDxf(): void {
    const nodes = this.modelService.nodes();
    if (nodes.length === 0) {
      return;
    }
    const edges = this.modelService.edges();
    const bounds = this.modelService.computePartsBounds(nodes, edges);
    const resolvedEdges = edges.map((edge) => ({
      ...edge,
      points: resolveEdgePoints(edge, nodes),
    }));

    const config = buildAssemblyFlowDxfConfig((nodeId, key) => this.history.read(nodeId, key));
    const doc = new DxfExporter(config).export(nodes, resolvedEdges, bounds);
    const content = new DxfWriter().serialize(doc);

    const blob = new Blob([content], { type: 'application/dxf' });
    this.downloadBlob(blob, 'assembly-flow.dxf');
  }

  private buildOptions(canvasEl: HTMLElement, region: ExportRegion): Options {
    return {
      backgroundColor: this.resolveBackgroundColor(canvasEl),
      width: region.width,
      height: region.height,
      pixelRatio: PNG_PIXEL_RATIO,
      cacheBust: true,
      fetchRequestInit: { mode: 'cors' },
      style: {
        transform: `translate(${-region.x}px, ${-region.y}px) scale(1)`,
        transformOrigin: 'top left',
      },
    };
  }

  private getDiagramCanvasEl(): HTMLElement | null {
    const element = this.diagramElement();
    return element?.nativeElement.querySelector<HTMLElement>(DIAGRAM_CANVAS_SELECTOR) ?? null;
  }

  private computeExportRegion(): ExportRegion | null {
    const nodes = this.modelService.nodes();
    if (nodes.length === 0) {
      return null;
    }

    const edges = this.modelService.edges();
    const bounds = this.modelService.computePartsBounds(nodes, edges);

    return {
      x: bounds.x - EXPORT_PADDING,
      y: bounds.y - EXPORT_PADDING,
      width: bounds.width + EXPORT_PADDING * 2,
      height: bounds.height + EXPORT_PADDING * 2,
    };
  }

  private resolveBackgroundColor(start: HTMLElement): string {
    let el: HTMLElement | null = start;
    while (el) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0')) {
        return bg;
      }
      el = el.parentElement;
    }
    return FALLBACK_BACKGROUND;
  }

  private downloadDataUrl(dataUrl: string, filename: string): void {
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = dataUrl;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = url;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
