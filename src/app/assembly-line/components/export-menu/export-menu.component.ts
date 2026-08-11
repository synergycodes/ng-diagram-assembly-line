import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { DiagramExportService } from '../../services/diagram-export';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-export-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './export-menu.component.html',
  styleUrl: './export-menu.component.scss',
})
export class ExportMenuComponent {
  private readonly exportService = inject(DiagramExportService);

  protected readonly canExport = this.exportService.canExport;
  protected readonly menuOpen = signal(false);
  protected readonly exporting = signal(false);

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    if (!this.canExport()) {
      return;
    }
    this.menuOpen.update((v) => !v);
  }

  @HostListener('document:click')
  protected closeMenu() {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.closeMenu();
  }

  async exportPng(event: MouseEvent) {
    event.stopPropagation();
    await this.runExport(() => this.exportService.exportPng());
  }

  async exportSvg(event: MouseEvent) {
    event.stopPropagation();
    await this.runExport(() => this.exportService.exportSvg());
  }

  async exportDxf(event: MouseEvent) {
    event.stopPropagation();
    await this.runExport(async () => this.exportService.exportDxf());
  }

  private async runExport(run: () => Promise<void>) {
    if (!this.canExport() || this.exporting()) {
      return;
    }
    this.menuOpen.set(false);
    this.exporting.set(true);
    try {
      await run();
    } finally {
      this.exporting.set(false);
    }
  }
}
