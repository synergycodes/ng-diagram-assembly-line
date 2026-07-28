import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type SimpleNode,
} from 'ng-diagram';
import { NODE_TYPES, type AssemblyNodeData } from '../../../../model';
import { HistoryService } from '../../../../services/history.service';
import { deriveBufferLevel, deriveMetrics, statusFooter } from '../../../../shared/node-view';
import { BaseNode } from '../shared/base-node';
import { SparklineComponent } from '../shared/sparkline/sparkline.component';
import { NodeIconComponent } from '../shared/node-icon/node-icon.component';

@Component({
  selector: 'app-assembly-node',
  imports: [NgDiagramPortComponent, SparklineComponent, NodeIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  host: {
    '[class.ng-diagram-port-hoverable-over-node]': 'true',
    '[class.dimmed]': 'isDimmed()',
    '[attr.data-status]': 'data().status',
    '[attr.data-type]': 'type()',
  },
  templateUrl: './assembly-node.component.html',
  styleUrl: './assembly-node.component.scss',
})
export class AssemblyNodeComponent
  extends BaseNode<AssemblyNodeData>
  implements NgDiagramNodeTemplate<AssemblyNodeData>
{
  private readonly history = inject(HistoryService);

  readonly node = input.required<SimpleNode<AssemblyNodeData>>();

  protected readonly NODE_TYPES = NODE_TYPES;
  protected readonly showIcon = computed(() => this.type() !== NODE_TYPES.AREA);
  protected readonly kpis = computed(() => {
    const node = this.node();
    return deriveMetrics(this.type(), node.data, this.propCfg(), (key) =>
      this.history.read(node.id, key),
    );
  });
  protected readonly kpiColumns = computed(() =>
    Math.min(2, Math.max(1, this.kpis().length > 1 ? 2 : 1)),
  );
  protected readonly bufferLevel = computed(() =>
    deriveBufferLevel(this.type(), this.node().data, this.propCfg()),
  );
  protected readonly footer = computed(() => statusFooter(this.type(), this.node().data));
}
