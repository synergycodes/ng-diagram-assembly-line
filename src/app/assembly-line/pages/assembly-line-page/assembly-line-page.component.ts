import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { provideNgDiagram } from 'ng-diagram';
import { provideFormlyCore } from '@ngx-formly/core';
import { provideAssemblyLineConfig } from '../../assembly-line.config';
import { AlarmFilterService, HistoryService, ViewConfigService } from '../../shared';
import { DiagramComponent } from '../../diagram/canvas/diagram.component';
import { HeaderComponent } from '../../components/header/header.component';
import { PaletteComponent } from '../../components/palette/palette.component';
import { PropertiesPanelComponent } from '../../components/properties-panel/properties-panel.component';
import { NodeInspectorComponent } from '../../components/node-inspector/node-inspector.component';
import { FlowFormlyInputType } from '../../components/properties-panel/formly/flow-input.type';
import { FlowFormlyThresholdType } from '../../components/properties-panel/formly/flow-threshold.type';
import { DiagramStore } from '../../state/diagram-store.service';
import { ModeService } from '../../state/mode.service';
import { SelectionService } from '../../state/selection.service';
import { DataConnectionService } from '../../state/data-connection.service';
import { ThemeService } from '../../services/theme.service';
import { DiagramExportService } from '../../services/diagram-export';

@Component({
  selector: 'app-assembly-line-page',
  imports: [
    HeaderComponent,
    DiagramComponent,
    PaletteComponent,
    PropertiesPanelComponent,
    NodeInspectorComponent,
  ],
  providers: [
    provideAssemblyLineConfig(),
    provideNgDiagram(),
    provideFormlyCore({
      types: [
        { name: 'flow-input', component: FlowFormlyInputType },
        { name: 'flow-threshold', component: FlowFormlyThresholdType },
      ],
    }),
    DiagramStore,
    ModeService,
    SelectionService,
    DataConnectionService,
    ThemeService,
    HistoryService,
    AlarmFilterService,
    ViewConfigService,
    DiagramExportService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assembly-line-page.component.html',
  styleUrl: './assembly-line-page.component.scss',
})
export class AssemblyLinePageComponent {
  private readonly modeService = inject(ModeService);

  protected readonly mode = this.modeService.mode;
}
