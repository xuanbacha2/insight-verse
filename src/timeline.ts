// Timeline presets (Today / 3D / 7D / 14D / 30D / Custom). Pure date maths, UTC only.
export const PRESETS = ['today', '3d', '7d', '14d', '30d'] as const;
export type Preset = (typeof PRESETS)[number] | 'custom';
export const PRESET_LABEL: Record<string, string> = { today: 'Today', '3d': '3D', '7d': '7D', '14d': '14D', '30d': '30D', custom: 'Custom' };
const DAYS: Record<string, number> = { today: 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30 };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const isIso = (s: string | null | undefined): s is string => !!s && ISO.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export interface Range { preset: Preset; from: string; to: string; days: number; label: string }

/** Resolve a preset (or custom from/to) to a closed date range that ends on `anchor` (the demo "today").
 *  Custom ranges are clamped to [min, anchor]; swapped bounds are corrected; junk falls back to 7D. */
export function resolveRange(q: { range?: string | null; from?: string | null; to?: string | null }, anchor: string, min = '2000-01-01'): Range {
  const p = (q.range || '').toLowerCase();
  if (p in DAYS) {
    const n = DAYS[p];
    const from = addDays(anchor, -(n - 1));
    return { preset: p as Preset, from, to: anchor, days: n, label: `${PRESET_LABEL[p]} · ${from === anchor ? anchor : `${from} to ${anchor}`}` };
  }
  if (p === 'custom' || (isIso(q.from) && isIso(q.to))) {
    if (isIso(q.from) && isIso(q.to)) {
      let from = q.from, to = q.to;
      if (from > to) [from, to] = [to, from];
      if (to > anchor) to = anchor;
      if (from > anchor) from = anchor;
      if (from < min) from = min;
      if (to < from) to = from;
      const days = daysBetween(from, to) + 1;
      return { preset: 'custom', from, to, days, label: `Custom · ${from} to ${to}` };
    }
  }
  return resolveRange({ range: '7d' }, anchor, min);
}
export const inRange = (date: string, r: { from: string; to: string }) => date >= r.from && date <= r.to;
