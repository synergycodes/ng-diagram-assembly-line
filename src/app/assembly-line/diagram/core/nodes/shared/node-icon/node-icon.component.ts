import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NODE_TYPES, type NodeType } from '../../../../../model';

@Component({
  selector: 'app-node-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './node-icon.component.html',
  styleUrl: './node-icon.component.scss',
})
export class NodeIconComponent {
  type = input.required<NodeType>();
  active = input<boolean>(true);
  pose = input<'mid' | undefined>(undefined);
  protected readonly NODE_TYPES = NODE_TYPES;
}
