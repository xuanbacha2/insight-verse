// Small dependency-free inline SVG charts. Colours come from CSS classes so light/dark themes both work.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const colorClass = (source: string) => (['meta', 'tiktok', 'google'].includes(source) ? source : 'other');
const niceMax = (v: number) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
const short = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(Math.round(n)));

export interface Series { name: string; cls: string; values: Array<number | null>; dashed?: boolean }
const W = 860, H = 300, L = 62, R = 16, T = 14, B = 44;

function frame(labels: string[], max: number, unit: string): string {
  let s = '';
  for (let i = 0; i <= 4; i++) {
    const y = T + (H - T - B) * (1 - i / 4);
    s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 8}" y="${y + 4}" text-anchor="end" class="axis">${short(max * i / 4)}</text>`;
  }
  const step = (W - L - R) / labels.length;
  labels.forEach((l, i) => { s += `<text x="${L + step * (i + 0.5)}" y="${H - B + 18}" text-anchor="middle" class="axis">${esc(l)}</text>`; });
  return s + `<text x="${L}" y="${H - 6}" class="axis">${esc(unit)}</text>`;
}

export function stackedBars(labels: string[], series: Series[], unit: string, title: string): string {
  const totals = labels.map((_, i) => series.reduce((s, x) => s + (x.values[i] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 1));
  const step = (W - L - R) / labels.length, bw = Math.min(54, step * 0.62);
  let bars = '';
  labels.forEach((_, i) => {
    let y = H - B;
    for (const s of series) {
      const v = s.values[i] ?? 0, h = (v / max) * (H - T - B);
      if (h > 0) bars += `<rect x="${L + step * i + (step - bw) / 2}" y="${y - h}" width="${bw}" height="${h}" class="f-${s.cls}"><title>${esc(s.name)}: ${Math.round(v).toLocaleString('en-US')}</title></rect>`;
      y -= h;
    }
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}" class="chart">${frame(labels, max, unit)}${bars}</svg>`;
}

export function lineChart(labels: string[], series: Series[], unit: string, title: string): string {
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null))));
  const step = (W - L - R) / labels.length;
  const X = (i: number) => L + step * (i + 0.5), Y = (v: number) => T + (H - T - B) * (1 - v / max);
  let out = '';
  for (const s of series) {
    let d = '', pen = false;
    s.values.forEach((v, i) => { if (v === null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `; pen = true; });
    out += `<path d="${d}" class="l-${s.cls}${s.dashed ? ' dashed' : ''}" fill="none"/>`;
    if (!s.dashed) s.values.forEach((v, i) => { if (v !== null) out += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.5" class="f-${s.cls}"><title>${esc(s.name)} ${esc(labels[i])}: ${Math.round(v).toLocaleString('en-US')}</title></circle>`; });
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}" class="chart">${frame(labels, max, unit)}${out}</svg>`;
}

export function legend(items: Array<{ name: string; cls: string; dashed?: boolean }>): string {
  return `<div class="legend">${items.map((i) => `<span><i class="sw f-${i.cls}${i.dashed ? ' sw-dash' : ''}"></i>${esc(i.name)}</span>`).join('')}</div>`;
}
