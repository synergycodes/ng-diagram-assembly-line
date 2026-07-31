import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { provideNgDiagram } from 'ng-diagram';
import { provideFormlyCore } from '@ngx-formly/core';
import { AlarmFilterService } from '../../shared';
import { DiagramComponent } from '../../diagram/canvas/diagram.component';
import { PaletteComponent } from '../../components/palette/palette.component';
import { PropertiesPanelComponent } from '../../components/properties-panel/properties-panel.component';
import { NodeInspectorComponent } from '../../components/node-inspector/node-inspector.component';
import { FlowFormlyInputType } from '../../components/properties-panel/formly/flow-input.type';
import { FlowFormlyThresholdType } from '../../components/properties-panel/formly/flow-threshold.type';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { ExportMenuComponent } from '../../components/export-menu/export-menu.component';
import { DiagramStore } from '../../state/diagram-store.service';
import { ModeService } from '../../state/mode.service';
import { DataConnectionService } from '../../state/data-connection.service';
import { DiagramExportService } from '../../services/diagram-export';

@Component({
  selector: 'app-assembly-flow-page',
  imports: [
    DiagramComponent,
    PaletteComponent,
    PropertiesPanelComponent,
    NodeInspectorComponent,
    ThemeToggleComponent,
    ExportMenuComponent,
  ],
  providers: [
    provideNgDiagram(),
    provideFormlyCore({
      types: [
        { name: 'flow-input', component: FlowFormlyInputType },
        { name: 'flow-threshold', component: FlowFormlyThresholdType },
      ],
    }),
    DiagramExportService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assembly-flow-page.component.html',
  styleUrl: './assembly-flow-page.component.scss',
})
export class AssemblyFlowPageComponent {
  private readonly modeService = inject(ModeService);
  private readonly connection = inject(DataConnectionService);
  private readonly alarmFilter = inject(AlarmFilterService);
  private readonly store = inject(DiagramStore);

  protected readonly mode = this.modeService.mode;
  protected readonly connected = this.connection.connected;
  protected readonly alarmFilterActive = this.alarmFilter.active;
  protected readonly errorsEnabled = this.alarmFilter.errorsEnabled;
  protected readonly warningsEnabled = this.alarmFilter.warningsEnabled;
  protected readonly filterMenuOpen = signal(false);
  protected readonly alarmCount = computed(() => {
    // re-run when category toggles change
    this.alarmFilter.errorsEnabled();
    this.alarmFilter.warningsEnabled();
    return this.store.nodes().filter((n) => this.alarmFilter.isAlarmStatus(n.data.status)).length;
  });

  toggleAlarmFilter() {
    this.alarmFilter.toggle();
  }

  toggleFilterMenu(event: MouseEvent) {
    event.stopPropagation();
    this.filterMenuOpen.update((v) => !v);
  }

  toggleErrors(event: MouseEvent) {
    event.stopPropagation();
    this.alarmFilter.toggleErrors();
  }

  toggleWarnings(event: MouseEvent) {
    event.stopPropagation();
    this.alarmFilter.toggleWarnings();
  }

  @HostListener('document:click')
  protected closeFilterMenu() {
    if (this.filterMenuOpen()) {
      this.filterMenuOpen.set(false);
    }
  }

  setMode(next: 'edit' | 'monitor') {
    this.modeService.setMode(next);
  }
}
