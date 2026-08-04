import type { FormlyFieldConfig } from '@ngx-formly/core';
import { getPropertyMeta, type NodeType, type PropertyMeta } from '../../../model';

export function thresholdProps(type: NodeType): PropertyMeta[] {
  return getPropertyMeta(type).filter(
    (m) => Boolean(m.numeric) && m.defaultWarnAt !== undefined && m.defaultCriticalAt !== undefined,
  );
}

export function fieldsForNodeType(type: NodeType): FormlyFieldConfig[] {
  const fields: FormlyFieldConfig[] = [
    { key: 'name', type: 'flow-input', props: { label: 'Name' } },
  ];
  for (const m of thresholdProps(type)) {
    fields.push({
      key: m.key,
      type: 'flow-threshold',
      props: {
        label: m.label,
        unit: m.unit,
        metricKey: m.key,
        meta: m,
        direction: m.direction ?? 'higher-is-worse',
      },
    });
  }
  return fields;
}
