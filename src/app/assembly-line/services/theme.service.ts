import { Injectable, effect, signal } from '@angular/core';
import { writeStorageRaw } from '../shared/browser-storage';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'assembly-line-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.readInitial());
  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const theme = this._theme();
      if (typeof document !== 'undefined') {
        document.documentElement.dataset['theme'] = theme;
      }
      // Raw string (not JSON) so index.html's pre-paint script can read it.
      writeStorageRaw(STORAGE_KEY, theme);
    });
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }

  toggle(): void {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  private readInitial(): Theme {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.dataset['theme'];
      if (attr === 'light' || attr === 'dark') {
        return attr;
      }
    }
    return 'dark';
  }
}
