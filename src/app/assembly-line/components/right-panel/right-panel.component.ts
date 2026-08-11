import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ModeService } from '../../state/mode.service';
import { PropertiesPanelComponent } from '../properties-panel/properties-panel.component';
import { NodeInspectorComponent } from '../node-inspector/node-inspector.component';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-right-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PropertiesPanelComponent, NodeInspectorComponent, IconComponent],
  templateUrl: './right-panel.component.html',
  styleUrl: './right-panel.component.scss',
  host: {
    '[class.collapsed]': 'collapsed()',
  },
})
export class RightPanelComponent {
  private readonly modeService = inject(ModeService);

  protected readonly mode = this.modeService.mode;

  readonly collapsed = input<boolean>(false);
  readonly collapsedChange = output<boolean>();

  toggle(): void {
    this.collapsedChange.emit(!this.collapsed());
  }
}
