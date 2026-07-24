import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  NgDiagramPaletteItemComponent,
  NgDiagramPaletteItemPreviewComponent,
  type NgDiagramPaletteItem,
} from 'ng-diagram';
import { MODULE_TYPES, MODULE_TYPE_META, createDefaultModule, type ModuleType } from '../../model';
import { NodeIconComponent } from '../../shared';

const FALLBACK_ICONS: Partial<Record<ModuleType, string>> = {
  [MODULE_TYPES.AREA]: '◻',
};

@Component({
  selector: 'app-palette',
  imports: [NgDiagramPaletteItemComponent, NgDiagramPaletteItemPreviewComponent, NodeIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './palette.component.html',
  styleUrl: './palette.component.scss',
})
export class PaletteComponent {
  protected readonly fallbackIcons = FALLBACK_ICONS;
  protected readonly areas = computed(() => MODULE_TYPE_META.filter((m) => m.group === 'Group'));
  protected readonly nodes = computed(() => MODULE_TYPE_META.filter((m) => m.group !== 'Group'));

  paletteItemFor(type: ModuleType): NgDiagramPaletteItem {
    const data = createDefaultModule(type, crypto.randomUUID());
    if (type === MODULE_TYPES.AREA) {
      return {
        type: 'area',
        data: data as never,
        isGroup: true,
        size: { width: 360, height: 220 },
      };
    }
    if (type === MODULE_TYPES.PAINT_SHOP) {
      return {
        type: 'paint-shop',
        data: data as never,
      };
    }
    if (type === MODULE_TYPES.AUTO_ASSEMBLY) {
      return {
        type: 'auto-assembly',
        data: data as never,
      };
    }
    return {
      type: 'module',
      data: data as never,
    };
  }
}
