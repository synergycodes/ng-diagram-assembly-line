import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { AlarmFilterService } from '../../shared';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { ExportMenuComponent } from '../export-menu/export-menu.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { DiagramStore } from '../../state/diagram-store.service';
import { ModeService } from '../../state/mode.service';
import { DataConnectionService } from '../../state/data-connection.service';

@Component({
  selector: 'app-header',
  imports: [ThemeToggleComponent, ExportMenuComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
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
