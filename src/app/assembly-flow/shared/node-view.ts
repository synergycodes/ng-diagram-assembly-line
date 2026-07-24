import {
  computeTone,
  getPropertyMeta,
  getPropertyValue,
  MODULE_TYPES,
  type Module,
  type ModuleStatus,
  type Tone,
} from '../model';
import {
  DEFAULT_OK_COLOR,
  DEFAULT_WARN_COLOR,
  DEFAULT_DANGER_COLOR,
  type PropertyViewConfig,
} from '../services/view-config.service';

export const STATUS_GLYPH: Record<ModuleStatus, string> = {
  disconnected: '–',
  working: '✓',
  idle: '!',
  error: '✕',
};

const SHORT_ID_PREFIX: Record<Module['type'], string> = {
  [MODULE_TYPES.AREA]: 'AR',
  [MODULE_TYPES.BUFFER]: 'B',
  [MODULE_TYPES.SERVO_PRESS]: 'P',
  [MODULE_TYPES.WELDING_CELL]: 'WC',
  [MODULE_TYPES.AUTO_ASSEMBLY]: 'AA',
  [MODULE_TYPES.PAINT_SHOP]: 'PS',
  [MODULE_TYPES.QUALITY_CONTROL]: 'QC',
};

export function nodeShortId(type: Module['type'], nodeId: string): string {
  return `${SHORT_ID_PREFIX[type]}-${nodeId.slice(0, 4).toUpperCase()}`;
}

export type StatusTone = 'ok' | 'warn' | 'danger';

/**
 * Always returns a value so the caller can render a constant footer row whose
 * appearance never resizes the node — only text and tone change with status.
 */
export function statusFooter(data: Module): { text: string; tone: StatusTone } {
  if (data.status === 'disconnected') {
    return { text: 'DISCONNECTED · awaiting data feed', tone: 'ok' };
  }
  if (data.status === 'error') {
    return { text: 'BROKEN · check operator console', tone: 'danger' };
  }
  if (data.status === 'idle') {
    return { text: 'WAITING · No upstream material', tone: 'warn' };
  }
  if (
    data.type === MODULE_TYPES.SERVO_PRESS &&
    data.oeePercent !== undefined &&
    data.oeePercent < 70
  ) {
    return { text: 'Running · OEE below 70% target', tone: 'warn' };
  }
  return { text: 'RUNNING · nominal', tone: 'ok' };
}

export interface MetricView {
  key: string;
  label: string;
  value: string;
  unit?: string;
  tone: Tone;
  color: string;
  /**
   * Threshold color for the value text (ok/warn/danger → the configured
   * OK/Warning/Critical color). Undefined for metrics with no thresholds, so
   * they keep the neutral theme text color instead of being painted green.
   */
  valueColor?: string;
  series: number[];
  isNumeric: boolean;
  /** Metric can carry a sparkline (per its meta) — reserve chart space even while N/A. */
  chartable: boolean;
}

type PropCfgMap = Record<string, PropertyViewConfig>;

function resolveColor(tone: Tone, cfg?: PropertyViewConfig): string {
  return tone === 'danger'
    ? (cfg?.dangerColor ?? DEFAULT_DANGER_COLOR)
    : tone === 'warn'
      ? (cfg?.warnColor ?? DEFAULT_WARN_COLOR)
      : (cfg?.okColor ?? DEFAULT_OK_COLOR);
}

/** Color for the value text, or undefined when the tone carries no health range. */
function valueColorFor(tone: Tone, cfg?: PropertyViewConfig): string | undefined {
  return tone === 'default' ? undefined : resolveColor(tone, cfg);
}

/**
 * Threshold color for a single named metric's value, used by the bespoke node
 * templates (paint shop, auto-assembly) that lay values out by hand instead of
 * through `deriveMetrics`. Undefined when the metric is non-numeric, absent, or
 * has no thresholds — so it renders in the default theme color.
 */
export function deriveValueColor(
  data: Module,
  key: string,
  cfg?: PropertyViewConfig,
): string | undefined {
  const meta = getPropertyMeta(data.type).find((m) => m.key === key);
  if (!meta?.numeric) {
    return undefined;
  }
  const num = Number(getPropertyValue(data, key));
  if (Number.isNaN(num)) {
    return undefined;
  }
  return valueColorFor(computeTone(num, meta, cfg?.warnAt, cfg?.criticalAt), cfg);
}

/**
 * The visible metrics for a node — value, unit, threshold-derived tone/color and
 * sparkline series. `readSeries` is injected so this stays pure (callers pass
 * `HistoryService.read`), and reading it inside a computed keeps output reactive.
 */
export function deriveMetrics(
  data: Module,
  propCfg: PropCfgMap,
  readSeries: (key: string) => number[],
): MetricView[] {
  return getPropertyMeta(data.type)
    .filter((m) => propCfg[m.key]?.visible !== false)
    .map((m) => {
      const raw = getPropertyValue(data, m.key);
      const numericVal = Number(raw);
      const chartable = Boolean(m.numeric);
      const isNumeric = chartable && !Number.isNaN(numericVal);
      const tone: Tone = isNumeric
        ? computeTone(numericVal, m, propCfg[m.key]?.warnAt, propCfg[m.key]?.criticalAt)
        : 'default';
      return {
        key: m.key,
        label: m.label.toUpperCase(),
        value: raw === undefined || raw === null ? 'N/A' : String(raw),
        unit: m.unit,
        tone,
        color: resolveColor(tone, propCfg[m.key]),
        valueColor: valueColorFor(tone, propCfg[m.key]),
        series: isNumeric ? readSeries(m.key) : [],
        isNumeric,
        chartable,
      };
    });
}

export interface BufferLevel {
  current: number | undefined;
  capacity: number | undefined;
  pct: number;
  tone: Tone;
  color: string;
  valueColor?: string;
  /** True only when both current and capacity are known — see `text`. */
  available: boolean;
  /** Ready-to-render reading: `current/capacity`, or `N/A` when unavailable. */
  text: string;
}

const BUFFER_UNAVAILABLE: BufferLevel = {
  current: undefined,
  capacity: undefined,
  pct: 0,
  tone: 'default',
  color: DEFAULT_OK_COLOR,
  valueColor: undefined,
  available: false,
  text: 'N/A',
};

/**
 * The `currentCount` meta ranges 0–100, so `pct` (current/capacity × 100) is fed
 * into `computeTone`, making the user-configurable thresholds act as percentages.
 * The reading is only shown when both current and capacity are known; otherwise
 * the whole value reads `N/A` (never a half-reading like `N/A/30`).
 */
export function deriveBufferLevel(data: Module, propCfg: PropCfgMap): BufferLevel {
  if (data.type !== MODULE_TYPES.BUFFER) {
    return { ...BUFFER_UNAVAILABLE };
  }
  const rawCapacity = data.capacity;
  const capacity = Number.isFinite(rawCapacity) ? Math.max(0, rawCapacity) : undefined;
  const rawCurrent = data.currentCount;
  const current =
    rawCurrent === undefined || !Number.isFinite(rawCurrent)
      ? undefined
      : Math.max(0, capacity === undefined ? rawCurrent : Math.min(capacity, rawCurrent));

  if (capacity === undefined || current === undefined) {
    return { ...BUFFER_UNAVAILABLE };
  }

  const pct = capacity > 0 ? (current / capacity) * 100 : 0;
  const meta = getPropertyMeta(data.type).find((m) => m.key === 'currentCount');
  const cfg = propCfg['currentCount'];
  const tone: Tone = meta ? computeTone(pct, meta, cfg?.warnAt, cfg?.criticalAt) : 'default';

  return {
    current,
    capacity,
    pct,
    tone,
    color: resolveColor(tone, cfg),
    valueColor: valueColorFor(tone, cfg),
    available: true,
    text: `${current}/${capacity}`,
  };
}
