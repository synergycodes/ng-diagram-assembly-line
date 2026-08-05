import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type SimpleNode,
} from 'ng-diagram';
import type { AutoAssemblyNodeData } from '../../../../model';
import { formatCount, formatDuration, formatHoursMinutes } from '../../../../shared/format';
import { BaseNode } from '../shared/base-node';
import { NodeIconComponent } from '../shared/node-icon/node-icon.component';
import { IconComponent } from '../../../../shared/icon/icon.component';

@Component({
  selector: 'app-auto-assembly-node',
  imports: [NgDiagramPortComponent, NodeIconComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  host: {
    '[class.ng-diagram-port-hoverable-over-node]': 'true',
    '[class.dimmed]': 'isDimmed()',
    '[attr.data-status]': 'data().status',
    '[attr.data-type]': 'type()',
  },
  templateUrl: './auto-assembly-node.component.html',
  styleUrl: './auto-assembly-node.component.scss',
})
export class AutoAssemblyNodeComponent
  extends BaseNode<AutoAssemblyNodeData>
  implements NgDiagramNodeTemplate<AutoAssemblyNodeData>
{
  readonly node = input.required<SimpleNode<AutoAssemblyNodeData>>();

  protected readonly formattedRemaining = computed(() => formatCount(this.data().partsRemaining));

  // Exposed for the template (pure formatters from shared/format).
  protected readonly formatDuration = formatDuration;
  protected readonly formatHoursMinutes = formatHoursMinutes;
}
