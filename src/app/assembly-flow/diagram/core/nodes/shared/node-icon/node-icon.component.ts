import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MODULE_TYPES, type ModuleType } from '../../../../../model';

@Component({
  selector: 'app-node-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './node-icon.component.html',
  styleUrl: './node-icon.component.scss',
})
export class NodeIconComponent {
  type = input.required<ModuleType>();
  active = input<boolean>(true);
  pose = input<'mid' | undefined>(undefined);
  protected readonly MODULE_TYPES = MODULE_TYPES;
}
