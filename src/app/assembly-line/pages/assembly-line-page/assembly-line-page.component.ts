import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { provideNgDiagram } from 'ng-diagram';
import { provideFormlyCore } from '@ngx-formly/core';
import { ASSEMBLY_LINE_CONFIG, provideAssemblyLineConfig } from '../../assembly-line.config';
import { AlarmFilterService, HistoryService, ViewConfigService } from '../../shared';
import { DiagramComponent } from '../../diagram/canvas/diagram.component';
import { HeaderComponent } from '../../components/header/header.component';
import { PaletteComponent } from '../../components/palette/palette.component';
import { PropertiesPanelComponent } from '../../components/properties-panel/properties-panel.component';
import { NodeInspectorComponent } from '../../components/node-inspector/node-inspector.component';
import { MinimapPanelComponent } from '../../components/minimap-panel/minimap-panel.component';
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
    MinimapPanelComponent,
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
  host: {
    '[style.--header-height]': 'headerHeightPx',
    '[style.--left-panel-width]': 'leftPanelWidthPx',
    '[style.--right-panel-width]': 'rightPanelWidthPx',
    '[style.--al-space-float]': 'gapPx',
  },
})
export class AssemblyLinePageComponent {
  private readonly modeService = inject(ModeService);
  private readonly layout = inject(ASSEMBLY_LINE_CONFIG).layout;

  protected readonly mode = this.modeService.mode;

  protected readonly headerHeightPx = `${this.layout.headerHeight}px`;
  protected readonly leftPanelWidthPx = `${this.layout.leftPanelWidth}px`;
  protected readonly rightPanelWidthPx = `${this.layout.rightPanelWidth}px`;
  protected readonly gapPx = `${this.layout.gap}px`;
}
