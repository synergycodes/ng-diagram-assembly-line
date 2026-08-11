import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  NgDiagramPaletteItemComponent,
  NgDiagramPaletteItemPreviewComponent,
  type NgDiagramPaletteItem,
} from 'ng-diagram';
import {
  NODE_REGISTRY,
  NODE_TYPES,
  type AssemblyNode,
  type NodeOf,
  type NodeType,
} from '../../model';
import {
  AreaNodeComponent,
  AutoAssemblyNodeComponent,
  AssemblyNodeComponent,
  NodeIconComponent,
  PaintShopNodeComponent,
} from '../../shared';

const FALLBACK_ICONS: Partial<Record<NodeType, string>> = { [NODE_TYPES.AREA]: '◻' };

@Component({
  selector: 'app-palette',
  imports: [
    NgDiagramPaletteItemComponent,
    NgDiagramPaletteItemPreviewComponent,
    NodeIconComponent,
    AssemblyNodeComponent,
    AreaNodeComponent,
    PaintShopNodeComponent,
    AutoAssemblyNodeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './palette.component.html',
  styleUrl: './palette.component.scss',
})
export class PaletteComponent {
  private readonly registry = Object.values(NODE_REGISTRY);
  private readonly previews = new Map<NodeType, AssemblyNode>(
    this.registry.map((m) => [m.type, this.previewNode(m.type)]),
  );

  protected readonly NODE_TYPES = NODE_TYPES;
  protected readonly fallbackIcons = FALLBACK_ICONS;
  protected readonly areas = computed(() =>
    this.registry.filter((m) => m.type === NODE_TYPES.AREA),
  );
  protected readonly nodes = computed(() =>
    this.registry.filter((m) => m.type !== NODE_TYPES.AREA),
  );

  protected paletteItemFor(type: NodeType): NgDiagramPaletteItem {
    const descriptor = NODE_REGISTRY[type];
    const data = descriptor.createDefault() as never;
    if (descriptor.type === NODE_TYPES.AREA) {
      return { type: descriptor.type, data, isGroup: true, size: descriptor.paletteSize };
    }
    return { type: descriptor.type, data };
  }

  protected previewFor<TNodeType extends NodeType>(type: TNodeType): NodeOf<TNodeType> {
    return this.previews.get(type) as NodeOf<TNodeType>;
  }

  private previewNode<TNodeType extends NodeType>(type: TNodeType): NodeOf<TNodeType> {
    const node = {
      id: `preview-${type}`,
      position: { x: 0, y: 0 },
      type,
      data: NODE_REGISTRY[type].createDefault(),
    };
    if (type === NODE_TYPES.AREA) {
      return {
        ...node,
        isGroup: true,
        highlighted: false,
        size: NODE_REGISTRY[NODE_TYPES.AREA].paletteSize,
      } as NodeOf<TNodeType>;
    }
    return node as NodeOf<TNodeType>;
  }
}
