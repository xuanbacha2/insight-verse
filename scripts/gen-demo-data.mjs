// Usage: node scripts/gen-demo-data.mjs <data_dir> <brief.md> > src/demo-data.json
// Reads the fictional BRAND X synthetic CSVs (platform_export, media_plan, agency_report, last_year, learnings)
// and writes the JSON the Worker seeds from. Set RENAME_FROM to a campaign-prefix to rename it to BX (numbers are untouched).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rename = (s) => (process.env.RENAME_FROM ? s.split(process.env.RENAME_FROM).join('BX') : s);

function parse(text) {
  text = rename(text.replace(/^﻿/, ''));
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...r] = rows;
  return r.filter((x) => x.length === h.length).map((x, i) => ({ _line: i + 2, ...Object.fromEntries(h.map((k, j) => [k, x[j]])) }));
}
const [dir, briefPath] = process.argv.slice(2);
const csv = (n) => parse(readFileSync(join(dir, n), 'utf8'));
const n = (v) => Number(v);

const out = {
  label: 'SYNTHETIC DATA - for demo only (fictional brand BRAND X)',
  metrics: csv('platform_export.csv').map((r) => ({
    date: r.date, source: r.platform.toLowerCase(), campaign: r.campaign_name,
    spend: n(r.spend_vnd), impressions: n(r.impressions), clicks: n(r.clicks), conversions: n(r.conversions) })),
  plan: csv('media_plan.csv').map((r) => ({
    line: r._line, week_index: n(r.week_index), week_start: r.week_start, source: r.platform.toLowerCase(), campaign: r.campaign_name,
    campaign_type: r.campaign_type, budget: n(r.budget_vnd), target_impressions: n(r.target_impressions),
    target_clicks: n(r.target_clicks), target_conversions: n(r.target_conversions), kpi_definition: r.kpi_definition })),
  agency: csv('agency_report.csv').map((r) => ({
    line: r._line, week_start: r.week_start, period_start: r.period_start, period_end: r.period_end,
    source: r.platform.toLowerCase(), campaign: r.campaign_name, spend: n(r.spend_vnd), impressions: n(r.impressions),
    clicks: n(r.clicks), conversions: n(r.conversions), kpi_definition: r.kpi_definition })),
  lastYear: csv('last_year.csv').map((r) => ({
    week_index: n(r.week_index), source: r.platform.toLowerCase(), campaign_type: r.campaign_type,
    spend: n(r.spend_vnd), impressions: n(r.impressions), clicks: n(r.clicks), conversions: n(r.conversions) })),
  learnings: csv('learnings.csv').map((r) => ({
    id: r.learning_id, status: r.status, source: r.source_campaign, source_ref: r.source_ref, date: r.date_approved,
    approver: r.approved_by, channel: r.channel, topic: r.topic, lesson: r.lesson, decision_taken: r.decision_taken,
    patterns: r.patterns,
    outcome: r.status === 'confirmed' ? 'Synthetic example outcome: ' + (r.decision_taken || 'n/a') : null })),
  sampleBrief: rename(readFileSync(briefPath, 'utf8').replace(/^﻿/, '')),
};
process.stdout.write(JSON.stringify(out));
