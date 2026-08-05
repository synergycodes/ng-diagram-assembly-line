import { Injectable, signal } from '@angular/core';
import type { NodeStatus } from '../model';

@Injectable()
export class AlarmFilterService {
  private readonly _active = signal(false);
  private readonly _errorsEnabled = signal(true);
  private readonly _warningsEnabled = signal(true);
  private readonly _whitelisted = signal<Record<string, true>>({});

  readonly active = this._active.asReadonly();
  readonly errorsEnabled = this._errorsEnabled.asReadonly();
  readonly warningsEnabled = this._warningsEnabled.asReadonly();
  readonly whitelisted = this._whitelisted.asReadonly();

  toggle() {
    this._active.update((v) => {
      const next = !v;
      // Clearing the whitelist on disable keeps state predictable on next activation.
      if (!next) {
        this._whitelisted.set({});
      }
      return next;
    });
  }

  toggleErrors() {
    this._errorsEnabled.update((v) => !v);
  }

  toggleWarnings() {
    this._warningsEnabled.update((v) => !v);
  }

  whitelistNode(id: string) {
    this._whitelisted.update((m) => ({ ...m, [id]: true as const }));
  }

  isWhitelisted(id: string): boolean {
    return Boolean(this._whitelisted()[id]);
  }

  isAlarmStatus(status: NodeStatus): boolean {
    if (status === 'error') {
      return this._errorsEnabled();
    }
    if (status === 'idle') {
      return this._warningsEnabled();
    }
    return false;
  }

  isNodeDimmed(id: string, status: NodeStatus): boolean {
    if (!this._active()) {
      return false;
    }
    this._errorsEnabled();
    this._warningsEnabled();
    if (this.isWhitelisted(id)) {
      return false;
    }
    return !this.isAlarmStatus(status);
  }
}
