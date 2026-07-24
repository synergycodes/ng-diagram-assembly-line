import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
} from 'ng-diagram';
import type { PaintShopModule } from '../../../../model';
import { formatCount, formatPct } from '../../../../shared/format';
import { BaseModuleNode } from '../shared/base-module-node';
import { NodeIconComponent } from '../shared/node-icon/node-icon.component';

@Component({
  selector: 'app-paint-shop-node',
  imports: [NgDiagramPortComponent, NodeIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  host: {
    '[class.ng-diagram-port-hoverable-over-node]': 'true',
    '[class.dimmed]': 'isDimmed()',
    '[attr.data-status]': 'data().status',
    '[attr.data-type]': 'data().type',
  },
  templateUrl: './paint-shop-node.component.html',
  styleUrl: './paint-shop-node.component.scss',
})
export class PaintShopNodeComponent
  extends BaseModuleNode<PaintShopModule>
  implements NgDiagramNodeTemplate<PaintShopModule>
{
  readonly node = input.required<Node<PaintShopModule>>();

  protected readonly formattedPassed = computed(() => formatCount(this.data().unitsPassed));
  protected readonly formattedTotal = computed(() => formatCount(this.data().unitsTotal));
  protected readonly formattedYield = computed(() => formatPct(this.data().firstPassYieldPct));

  protected readonly reworkColor = computed(() => this.metricColor('unitsRework'));
  protected readonly yieldColor = computed(() => this.metricColor('firstPassYieldPct'));
}
