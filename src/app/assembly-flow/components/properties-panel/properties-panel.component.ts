import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormlyForm, type FormlyFieldConfig } from '@ngx-formly/core';
import { NgDiagramModelService } from 'ng-diagram';
import { type Module } from '../../model';
import {
  DEFAULT_DANGER_COLOR,
  DEFAULT_OK_COLOR,
  DEFAULT_WARN_COLOR,
  ViewConfigService,
} from '../../shared';
import { DiagramStore } from '../../state/diagram-store.service';
import { ModeService } from '../../state/mode.service';
import { SelectionService } from '../../state/selection.service';
import { fieldsForModuleType, thresholdProps } from './formly/field-from-property-def';
import type { ThresholdConfig } from './formly/flow-threshold.type';

type PanelModel = Record<string, unknown>;

/**
 * The form is rebuilt only when the selected node's identity changes (so an
 * in-place edit never drops focus).
 */
@Component({
  selector: 'app-properties-panel',
  imports: [FormlyForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './properties-panel.component.html',
  styleUrl: './properties-panel.component.scss',
})
export class PropertiesPanelComponent {
  private readonly selection = inject(SelectionService);
  private readonly store = inject(DiagramStore);
  private readonly viewConfig = inject(ViewConfigService);
  private readonly modelService = inject(NgDiagramModelService);
  private readonly mode = inject(ModeService).mode;

  protected readonly form = signal(new FormGroup({}));
  protected readonly fields = signal<FormlyFieldConfig[]>([]);
  protected readonly model = signal<PanelModel>({});
  protected readonly hasThresholds = computed(() =>
    this.fields().some((f) => f.type === 'flow-threshold'),
  );

  protected readonly selectedData = computed<Module | null>(() => {
    const id = this.selection.selectedNodeId();
    if (!id) {
      return null;
    }
    return (this.store.nodes().find((n) => n.id === id)?.data as Module) ?? null;
  });

  private currentId: string | null = null;

  constructor() {
    effect(() => {
      const id = this.selection.selectedNodeId();
      if (id === this.currentId) {
        return;
      }
      this.currentId = id;
      if (id) {
        this.rebuild(id);
      } else {
        this.clear();
      }
    });
  }

  private rebuild(id: string): void {
    const data = this.store.nodes().find((n) => n.id === id)?.data as Module | undefined;
    if (!data) {
      this.clear();
      return;
    }
    this.form.set(new FormGroup({}));
    this.fields.set(fieldsForModuleType(data.type));
    this.model.set(this.seedModel(id, data));
  }

  private clear(): void {
    this.form.set(new FormGroup({}));
    this.fields.set([]);
    this.model.set({});
  }

  private seedModel(id: string, data: Module): PanelModel {
    const cfg = this.viewConfig.propertiesFor(id);
    const model: PanelModel = { name: data.name };
    for (const m of thresholdProps(data.type)) {
      const p = cfg[m.key] ?? {};
      const config: ThresholdConfig = {
        warnAt: p.warnAt ?? m.defaultWarnAt!,
        criticalAt: p.criticalAt ?? m.defaultCriticalAt!,
        okColor: p.okColor ?? DEFAULT_OK_COLOR,
        warnColor: p.warnColor ?? DEFAULT_WARN_COLOR,
        dangerColor: p.dangerColor ?? DEFAULT_DANGER_COLOR,
        visible: m.alwaysVisible ? true : p.visible !== false,
      };
      model[m.key] = config;
    }
    return model;
  }

  onModelChange(model: PanelModel): void {
    // The editor only renders in edit mode, but guard writes anyway so the panel
    // can never mutate node/view state while the app is a read-only monitor.
    if (this.mode() !== 'edit') {
      return;
    }
    const id = this.currentId;
    if (!id) {
      return;
    }
    const data = this.store.nodes().find((n) => n.id === id)?.data as Module | undefined;
    if (!data) {
      return;
    }

    const name = String(model['name'] ?? '').trim();
    if (name && name !== data.name) {
      this.modelService.updateNodeData<Module>(id, { ...data, name });
    }

    for (const m of thresholdProps(data.type)) {
      const config = model[m.key] as ThresholdConfig | undefined;
      if (config) {
        this.viewConfig.setProperty(id, m.key, config);
      }
    }
  }

  resetAll(): void {
    if (this.mode() !== 'edit') {
      return;
    }
    const id = this.currentId;
    if (!id) {
      return;
    }
    this.viewConfig.resetNode(id);
    this.rebuild(id);
  }
}
