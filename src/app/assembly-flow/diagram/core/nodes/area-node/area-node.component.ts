import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  NgDiagramGroupHighlightedDirective,
  NgDiagramNodeResizeAdornmentComponent,
  NgDiagramNodeSelectedDirective,
  type GroupNode,
  type NgDiagramGroupNodeTemplate,
} from 'ng-diagram';
import type { AreaNodeData } from '../../../../model';

// Area nodes are pure visual containers for grouping — they have no ports and
// cannot be linked; only the modules inside them carry flow/rework connections.
@Component({
  selector: 'app-area-node',
  imports: [
    NgDiagramNodeResizeAdornmentComponent,
    NgDiagramNodeSelectedDirective,
    NgDiagramGroupHighlightedDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './area-node.component.html',
  styleUrl: './area-node.component.scss',
})
export class AreaNodeComponent implements NgDiagramGroupNodeTemplate<AreaNodeData> {
  node = input.required<GroupNode<AreaNodeData>>();
}
