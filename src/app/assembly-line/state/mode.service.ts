import { Injectable, signal } from '@angular/core';

export type AppMode = 'edit' | 'monitor';

@Injectable()
export class ModeService {
  private readonly _mode = signal<AppMode>('edit');
  readonly mode = this._mode.asReadonly();

  setMode(mode: AppMode) {
    this._mode.set(mode);
  }
}
