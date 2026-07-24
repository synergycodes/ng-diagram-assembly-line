import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
} from 'ng-diagram';
import type { AutoAssemblyModule } from '../../../../model';
import { formatCount, formatDuration, formatHoursMinutes } from '../../../../shared/format';
import { BaseModuleNode } from '../shared/base-module-node';
import { NodeIconComponent } from '../shared/node-icon/node-icon.component';

@Component({
  selector: 'app-auto-assembly-node',
  imports: [NgDiagramPortComponent, NodeIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  host: {
    '[class.ng-diagram-port-hoverable-over-node]': 'true',
    '[class.dimmed]': 'isDimmed()',
    '[attr.data-status]': 'data().status',
    '[attr.data-type]': 'data().type',
  },
  templateUrl: './auto-assembly-node.component.html',
  styleUrl: './auto-assembly-node.component.scss',
})
export class AutoAssemblyNodeComponent
  extends BaseModuleNode<AutoAssemblyModule>
  implements NgDiagramNodeTemplate<AutoAssemblyModule>
{
  readonly node = input.required<Node<AutoAssemblyModule>>();

  protected readonly formattedRemaining = computed(() => formatCount(this.data().partsRemaining));

  // Exposed for the template (pure formatters from shared/format).
  protected readonly formatDuration = formatDuration;
  protected readonly formatHoursMinutes = formatHoursMinutes;
}
