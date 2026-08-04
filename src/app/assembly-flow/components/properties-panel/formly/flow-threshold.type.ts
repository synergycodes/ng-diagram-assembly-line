import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import {
  computeTone,
  getPropertyValue,
  type AssemblyNodeData,
  type PropertyMeta,
  type Tone,
} from '../../../model';
import {
  DEFAULT_DANGER_COLOR,
  DEFAULT_OK_COLOR,
  DEFAULT_WARN_COLOR,
} from '../../../services/view-config.service';
import { SelectionService } from '../../../state/selection.service';
import { DiagramStore } from '../../../state/diagram-store.service';
import { IconComponent } from '../../../shared/icon/icon.component';

export interface ThresholdConfig {
  warnAt: number;
  criticalAt: number;
  okColor: string;
  warnColor: string;
  dangerColor: string;
  visible: boolean;
}

type DragType = 'warn' | 'critical';

/**
 * The editable config lives in `formControl.value` (a {@link ThresholdConfig});
 * a local signal mirrors it so pointer-driven edits re-render under zoneless
 * change detection. The LIVE current metric value is read reactively from the
 * diagram model (not part of the form model), so ticks update the readout
 * without rebuilding the form.
 */
@Component({
  selector: 'flow-formly-threshold',
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flow-threshold.type.html',
  styleUrl: './flow-threshold.type.scss',
})
export class FlowFormlyThresholdType extends FieldType<FieldTypeConfig> implements OnInit {
  private readonly selection = inject(SelectionService);
  private readonly store = inject(DiagramStore);

  protected readonly bar = viewChild<ElementRef<HTMLDivElement>>('bar');
  private readonly drag = signal<DragType | null>(null);
  protected readonly expanded = signal(false);

  // Mirror of formControl.value so pointer edits re-render (signal-driven CD).
  protected readonly cfg = signal<ThresholdConfig>({
    warnAt: 0,
    criticalAt: 0,
    okColor: DEFAULT_OK_COLOR,
    warnColor: DEFAULT_WARN_COLOR,
    dangerColor: DEFAULT_DANGER_COLOR,
    visible: true,
  });

  ngOnInit(): void {
    const value = this.formControl.value as ThresholdConfig | null;
    if (value) {
      this.cfg.set(value);
    }
  }

  protected get meta(): PropertyMeta {
    return this.props['meta'] as PropertyMeta;
  }
  protected get metricKey(): string {
    return this.props['metricKey'] as string;
  }
  protected get direction(): 'higher-is-worse' | 'lower-is-worse' {
    return (this.props['direction'] as 'higher-is-worse' | 'lower-is-worse') ?? 'higher-is-worse';
  }
  protected get unit(): string | undefined {
    return this.props['unit'] as string | undefined;
  }
  protected get alwaysVisible(): boolean {
    return Boolean(this.meta.alwaysVisible);
  }

  protected readonly current = computed<number>(() => {
    const id = this.selection.selectedNodeId();
    const data = this.store.nodes().find((n) => n.id === id)?.data as AssemblyNodeData | undefined;
    if (!data) {
      return 0;
    }
    return Number(getPropertyValue(data, this.metricKey) ?? 0);
  });

  protected readonly tone = computed<Tone>(() => {
    const c = this.cfg();
    return computeTone(this.current(), this.meta, c.warnAt, c.criticalAt);
  });

  /** The configured color for the zone the live reading currently sits in. */
  protected readonly zoneColor = computed<string>(() => {
    const c = this.cfg();
    return this.tone() === 'danger'
      ? c.dangerColor
      : this.tone() === 'warn'
        ? c.warnColor
        : c.okColor;
  });

  protected zoneLabel(): string {
    const tone = this.tone();
    return tone === 'danger'
      ? 'within critical zone'
      : tone === 'warn'
        ? 'within warning zone'
        : 'within OK zone';
  }

  private patch(p: Partial<ThresholdConfig>): void {
    const next = { ...this.cfg(), ...p };
    this.cfg.set(next);
    this.formControl.setValue(next);
    this.formControl.markAsDirty();
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  toggleWidget(visible: boolean): void {
    this.patch({ visible });
  }

  pct(value: number): number {
    const min = this.meta.min ?? 0;
    const max = this.meta.max ?? 100;
    if (max === min) {
      return 0;
    }
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  midOf(): number {
    return Math.round(((this.meta.min ?? 0) + (this.meta.max ?? 100)) / 2);
  }

  rgba(hex: string, alpha: number): string {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) {
      return hex;
    }
    const v = parseInt(m[1], 16);
    return `rgba(${(v >> 16) & 0xff}, ${(v >> 8) & 0xff}, ${v & 0xff}, ${alpha})`;
  }

  setWarn(value: number): void {
    if (Number.isNaN(value)) {
      return;
    }
    const clamped = this.clampToRange(value);
    const c = this.cfg();
    const final =
      this.direction === 'higher-is-worse'
        ? Math.min(clamped, c.criticalAt)
        : Math.max(clamped, c.criticalAt);
    this.patch({ warnAt: final });
  }

  setCritical(value: number): void {
    if (Number.isNaN(value)) {
      return;
    }
    const clamped = this.clampToRange(value);
    const c = this.cfg();
    const final =
      this.direction === 'higher-is-worse'
        ? Math.max(clamped, c.warnAt)
        : Math.min(clamped, c.warnAt);
    this.patch({ criticalAt: final });
  }

  private clampToRange(value: number): number {
    const min = this.meta.min ?? 0;
    const max = this.meta.max ?? 100;
    return Math.max(min, Math.min(max, value));
  }

  startDrag(event: PointerEvent, type: DragType): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.drag.set(type);

    const move = (e: PointerEvent) => this.onDrag(e, type);
    const up = (e: PointerEvent) => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      this.drag.set(null);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  private onDrag(event: PointerEvent, type: DragType): void {
    const bar = this.bar()?.nativeElement;
    if (!bar) {
      return;
    }
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const min = this.meta.min ?? 0;
    const max = this.meta.max ?? 100;
    const value = Math.round(min + ratio * (max - min));
    if (type === 'warn') {
      this.setWarn(value);
    } else {
      this.setCritical(value);
    }
  }

  pickColor(zone: 'ok' | 'warn' | 'danger', event: MouseEvent): void {
    const swatch = event.currentTarget as HTMLElement;
    const input = document.createElement('input');
    input.type = 'color';
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    const rect = swatch.getBoundingClientRect();
    input.style.left = `${rect.left}px`;
    input.style.top = `${rect.bottom}px`;
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const color = input.value;
      this.patch(
        zone === 'ok'
          ? { okColor: color }
          : zone === 'warn'
            ? { warnColor: color }
            : { dangerColor: color },
      );
      input.remove();
    });
    input.addEventListener('blur', () => input.remove(), { once: true });
    input.click();
  }
}
