import { Injectable } from '@angular/core';
import { persistedSignal } from '../shared/browser-storage';

const STORAGE_KEY = 'assembly-line:view-config:v1';

export interface PropertyViewConfig {
  visible: boolean;
  warnAt?: number;
  criticalAt?: number;
  okColor?: string;
  warnColor?: string;
  dangerColor?: string;
}

export const DEFAULT_OK_COLOR = '#4caf50';
export const DEFAULT_WARN_COLOR = '#f4b942';
export const DEFAULT_DANGER_COLOR = '#d64545';

export interface NodeViewConfig {
  properties: Record<string, PropertyViewConfig>;
}

type ViewConfigMap = Record<string, NodeViewConfig>;

@Injectable()
export class ViewConfigService {
  private readonly _config = persistedSignal<ViewConfigMap>(STORAGE_KEY, {});
  readonly config = this._config.asReadonly();

  propertiesFor(nodeId: string): Record<string, PropertyViewConfig> {
    return this._config()[nodeId]?.properties ?? {};
  }

  setProperty(nodeId: string, prop: string, patch: Partial<PropertyViewConfig>) {
    this._config.update((map) => {
      const existing = map[nodeId] ?? { properties: {} };
      const existingProp = existing.properties[prop] ?? { visible: true };
      return {
        ...map,
        [nodeId]: {
          ...existing,
          properties: { ...existing.properties, [prop]: { ...existingProp, ...patch } },
        },
      };
    });
  }

  resetNode(nodeId: string) {
    this._config.update((map) => {
      const next = { ...map };
      delete next[nodeId];
      return next;
    });
  }
}
