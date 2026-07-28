import { NODE_TYPES, type BufferNodeData, type ServoPressNodeData } from '../model';
import {
  deriveBufferLevel,
  deriveMetrics,
  nodeShortId,
  statusFooter,
  STATUS_GLYPH,
} from './node-view';

const servoPress = (overrides: Partial<ServoPressNodeData> = {}): ServoPressNodeData => ({
  name: 'Bodyside Press',
  status: 'working',
  ...overrides,
});

describe('nodeShortId', () => {
  it('prefixes by type and uppercases the first 4 id chars', () => {
    expect(nodeShortId(NODE_TYPES.SERVO_PRESS, 'press-1')).toBe('P-PRES');
    expect(nodeShortId(NODE_TYPES.QUALITY_CONTROL, 'qc-final')).toBe('QC-QC-F');
  });
});

describe('statusFooter', () => {
  it('maps each status to its human-readable line + tone', () => {
    expect(statusFooter(NODE_TYPES.SERVO_PRESS, servoPress({ status: 'disconnected' }))).toEqual({
      text: 'DISCONNECTED · awaiting data feed',
      tone: 'ok',
    });
    expect(statusFooter(NODE_TYPES.SERVO_PRESS, servoPress({ status: 'error' })).tone).toBe(
      'danger',
    );
    expect(statusFooter(NODE_TYPES.SERVO_PRESS, servoPress({ status: 'idle' })).tone).toBe('warn');
    expect(
      statusFooter(NODE_TYPES.SERVO_PRESS, servoPress({ status: 'working', oeePercent: 82 })),
    ).toEqual({ text: 'RUNNING · nominal', tone: 'ok' });
  });

  it('flags a working servo press whose OEE is below the 70% target', () => {
    expect(
      statusFooter(NODE_TYPES.SERVO_PRESS, servoPress({ status: 'working', oeePercent: 62 })),
    ).toEqual({ text: 'Running · OEE below 70% target', tone: 'warn' });
  });

  it('has a glyph for every status', () => {
    expect(STATUS_GLYPH.working).toBe('✓');
    expect(STATUS_GLYPH.disconnected).toBe('∅');
    expect(Object.keys(STATUS_GLYPH).sort()).toEqual(['disconnected', 'error', 'idle', 'working']);
  });
});

describe('deriveMetrics', () => {
  it('derives value/unit/tone and pulls series only for present numeric metrics', () => {
    const data = servoPress({ throughputPerHour: 520, oeePercent: 62, partsPressed: 500 });
    const metrics = deriveMetrics(NODE_TYPES.SERVO_PRESS, data, {}, () => [1, 2, 3]);

    // Throughput 520 with default lower-is-worse thresholds (warn 400) → healthy 'ok'.
    const throughput = metrics.find((m) => m.key === 'throughputPerHour')!;
    expect(throughput.value).toBe('520');
    expect(throughput.unit).toBe('/h');
    expect(throughput.tone).toBe('ok');
    expect(throughput.valueColor).toBeDefined();
    expect(throughput.series).toEqual([1, 2, 3]);

    // OEE 62 with default lower-is-worse thresholds (warn 70, crit 55) → warn.
    expect(metrics.find((m) => m.key === 'oeePercent')!.tone).toBe('warn');

    // A metric with no thresholds stays neutral — no green/orange/red value color.
    const pressed = metrics.find((m) => m.key === 'partsPressed')!;
    expect(pressed.tone).toBe('default');
    expect(pressed.valueColor).toBeUndefined();

    // Absent metric → N/A, non-numeric, no series.
    const pressure = metrics.find((m) => m.key === 'pressureBar')!;
    expect(pressure.value).toBe('N/A');
    expect(pressure.isNumeric).toBe(false);
    expect(pressure.series).toEqual([]);
  });

  it('respects per-metric visibility config', () => {
    const data = servoPress({ throughputPerHour: 50 });
    const metrics = deriveMetrics(
      NODE_TYPES.SERVO_PRESS,
      data,
      { throughputPerHour: { visible: false } },
      () => [],
    );
    expect(metrics.some((m) => m.key === 'throughputPerHour')).toBe(false);
  });
});

describe('deriveBufferLevel', () => {
  it('computes clamped current, pct and tone from capacity', () => {
    const data: BufferNodeData = {
      name: 'Store',
      status: 'working',
      capacity: 40,
      currentCount: 38,
    };
    const level = deriveBufferLevel(NODE_TYPES.BUFFER, data, {});
    expect(level.capacity).toBe(40);
    expect(level.current).toBe(38);
    expect(level.pct).toBe(95);
    expect(level.available).toBe(true);
    expect(level.text).toBe('38/40');
    // 95% with default currentCount thresholds (warn 80, crit 95) → danger.
    expect(level.tone).toBe('danger');
  });

  it('reads N/A until the current count arrives (capacity alone is not enough)', () => {
    const data: BufferNodeData = { name: 'Store', status: 'working', capacity: 40 };
    const level = deriveBufferLevel(NODE_TYPES.BUFFER, data, {});
    expect(level.available).toBe(false);
    expect(level.text).toBe('N/A');
    expect(level.current).toBeUndefined();
    expect(level.valueColor).toBeUndefined();
  });

  it('returns inert defaults for non-buffer types', () => {
    expect(deriveBufferLevel(NODE_TYPES.SERVO_PRESS, servoPress(), {})).toEqual({
      current: undefined,
      capacity: undefined,
      pct: 0,
      tone: 'default',
      color: expect.any(String),
      available: false,
      text: 'N/A',
    });
  });
});
