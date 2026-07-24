import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
} from 'ng-diagram';
import { MODULE_TYPES, type Module } from '../../../../model';
import { HistoryService } from '../../../../services/history.service';
import { deriveBufferLevel, deriveMetrics, statusFooter } from '../../../../shared/node-view';
import { BaseModuleNode } from '../shared/base-module-node';
import { SparklineComponent } from '../shared/sparkline/sparkline.component';
import { NodeIconComponent } from '../shared/node-icon/node-icon.component';

@Component({
  selector: 'app-module-node',
  imports: [NgDiagramPortComponent, SparklineComponent, NodeIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  host: {
    '[class.ng-diagram-port-hoverable-over-node]': 'true',
    '[class.dimmed]': 'isDimmed()',
    '[attr.data-status]': 'data().status',
    '[attr.data-type]': 'data().type',
  },
  templateUrl: './module-node.component.html',
  styleUrl: './module-node.component.scss',
})
export class ModuleNodeComponent
  extends BaseModuleNode<Module>
  implements NgDiagramNodeTemplate<Module>
{
  private readonly history = inject(HistoryService);

  readonly node = input.required<Node<Module>>();

  protected readonly MODULE_TYPES = MODULE_TYPES;
  protected readonly showIcon = computed(() => this.data().type !== MODULE_TYPES.AREA);
  protected readonly kpis = computed(() => {
    const node = this.node();
    return deriveMetrics(node.data, this.propCfg(), (key) => this.history.read(node.id, key));
  });
  protected readonly kpiColumns = computed(() =>
    Math.min(2, Math.max(1, this.kpis().length > 1 ? 2 : 1)),
  );
  protected readonly bufferLevel = computed(() => deriveBufferLevel(this.data(), this.propCfg()));
  protected readonly footer = computed(() => statusFooter(this.data()));
}
