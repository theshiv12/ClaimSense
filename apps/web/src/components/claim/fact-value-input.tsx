'use client';
import type { FactKey, FactValue, RoomCategory } from '@claimsense/shared';
import { rupeesToPaise } from '@/lib/format';
import { FACT_KIND, ROOM_LABELS } from '@/lib/labels';
import { inputClass } from '../ui/field';

/** Text in the form → the typed value the server expects (paise, YYYY-MM-DD, boolean…), or null. */
export const parseInput = (key: FactKey, text: string): FactValue => {
  const t = text.trim();
  if (t === '') return null;
  switch (FACT_KIND[key]) {
    case 'money':
      return rupeesToPaise(t);
    case 'int':
      return /^\d+$/.test(t) ? Number(t) : null;
    case 'bool':
      return t === 'yes' ? true : t === 'no' ? false : null;
    default:
      return t;
  }
};

/** The starting text for an existing value. */
export const toInput = (key: FactKey, value: FactValue): string => {
  if (value === null) return '';
  if (FACT_KIND[key] === 'money') return String((value as number) / 100);
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
};

export function FactValueInput({ id, factKey, value, onChange }: { id: string; factKey: FactKey; value: string; onChange: (v: string) => void }) {
  const kind = FACT_KIND[factKey];
  if (kind === 'bool')
    return (
      <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  if (kind === 'room')
    return (
      <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {(Object.keys(ROOM_LABELS) as RoomCategory[]).map((c) => (
          <option key={c} value={c}>
            {ROOM_LABELS[c]}
          </option>
        ))}
      </select>
    );
  return (
    <input
      id={id}
      className={inputClass}
      type={kind === 'date' ? 'date' : 'text'}
      inputMode={kind === 'money' || kind === 'int' ? 'decimal' : undefined}
      placeholder={kind === 'money' ? 'Amount in ₹' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
