import { InjectionToken } from '@angular/core';

/**
 * Central tuning surface for the Assembly Line template — the "official" place to
 * tweak the canvas, layout and mock-feed knobs. Injected via {@link ASSEMBLY_LINE_CONFIG};
 * override the defaults with {@link provideAssemblyLineConfig}.
 */
export interface AssemblyLineConfig {
  viewport: { zoomStep: number };
  snapping: { gridSize: number };
  area: { padding: number; paddingTop: number };
  layout: {
    headerHeight: number;
    leftPanelWidth: number;
    rightPanelWidth: number;
    gap: number;
  };
  feed: {
    generateIntervalMs: number;
    statusIntervalMs: number;
    tickIntervalMs: number;
  };
}

export const ASSEMBLY_LINE_DEFAULTS: AssemblyLineConfig = {
  viewport: { zoomStep: 0.1 },
  snapping: { gridSize: 20 },
  area: { padding: 16, paddingTop: 28 },
  layout: { headerHeight: 56, leftPanelWidth: 280, rightPanelWidth: 320, gap: 16 },
  feed: { generateIntervalMs: 100, statusIntervalMs: 10000, tickIntervalMs: 1000 },
};

export const ASSEMBLY_LINE_CONFIG = new InjectionToken<AssemblyLineConfig>('ASSEMBLY_LINE_CONFIG', {
  factory: () => ASSEMBLY_LINE_DEFAULTS,
});

export type PartialAssemblyLineConfig = {
  [K in keyof AssemblyLineConfig]?: Partial<AssemblyLineConfig[K]>;
};

/** Provide the config (optionally overriding individual defaults). */
export function provideAssemblyLineConfig(overrides: PartialAssemblyLineConfig = {}) {
  return {
    provide: ASSEMBLY_LINE_CONFIG,
    useValue: mergeConfig(ASSEMBLY_LINE_DEFAULTS, overrides),
  };
}

function mergeConfig(
  defaults: AssemblyLineConfig,
  overrides: PartialAssemblyLineConfig,
): AssemblyLineConfig {
  return {
    viewport: { ...defaults.viewport, ...overrides.viewport },
    snapping: { ...defaults.snapping, ...overrides.snapping },
    area: { ...defaults.area, ...overrides.area },
    layout: { ...defaults.layout, ...overrides.layout },
    feed: { ...defaults.feed, ...overrides.feed },
  };
}
