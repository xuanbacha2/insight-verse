import demo from './demo-data.json';
import { logFinish, logStart, nowIso } from './db';
import type { Agency, LastYear, M, Plan } from './analysis';

export const DEMO_ACCOUNT = 'demo:brand-x';
export const DEMO_VERSION = '3';
export const DEMO_LABEL = 'SYNTHETIC';
export const SAMPLE_BRIEF: string = (demo as { sampleBrief: string }).sampleBrief;

type D = typeof demo;

async function runChunks(db: D1Database, stmts: D1PreparedStatement[]) {
  for (let i = 0; i < stmts.length; i += 90) await db.batch(stmts.slice(i, i + 90));
}

/** Seeds the fictional BRAND X dataset. Versioned: an older seed is wiped (synthetic rows only) and replaced. */
export async function seedDemo(db: D1Database): Promise<number> {
  const cur = await db.prepare(`SELECT v FROM kv WHERE k='demo_version'`).first<{ v: string }>();
  if (cur?.v === DEMO_VERSION) return 0;
  const d = demo as D;
  const at = nowIso();
  await db.batch([
    db.prepare(`DELETE FROM metrics_daily WHERE is_synthetic=1`), db.prepare(`DELETE FROM learnings WHERE is_synthetic=1`),
    db.prepare(`DELETE FROM plan_weekly`), db.prepare(`DELETE FROM agency_weekly`), db.prepare(`DELETE FROM lastyear_weekly`),
    db.prepare(`DELETE FROM refresh_log WHERE source='demo'`),
  ]);
  const id = await logStart(db, 'demo');
  const st: D1PreparedStatement[] = [];
  for (const m of d.metrics)
    st.push(db.prepare(`INSERT INTO metrics_daily (date,source,account_id,campaign,spend,impressions,clicks,conversions,currency,is_synthetic,pulled_at) VALUES (?,?,?,?,?,?,?,?, 'VND',1,?)
      ON CONFLICT(date,source,account_id,campaign) DO UPDATE SET spend=excluded.spend, impressions=excluded.impressions, clicks=excluded.clicks, conversions=excluded.conversions`)
      .bind(m.date, m.source, DEMO_ACCOUNT, m.campaign, m.spend, m.impressions, m.clicks, m.conversions, at));
  for (const p of d.plan)
    st.push(db.prepare(`INSERT OR REPLACE INTO plan_weekly (week_index,week_start,source,campaign,campaign_type,budget,target_impressions,target_clicks,target_conversions,kpi_definition,line_no) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(p.week_index, p.week_start, p.source, p.campaign, p.campaign_type, p.budget, p.target_impressions, p.target_clicks, p.target_conversions, p.kpi_definition, p.line));
  for (const a of d.agency)
    st.push(db.prepare(`INSERT OR REPLACE INTO agency_weekly (line_no,week_start,period_start,period_end,source,campaign,spend,impressions,clicks,conversions,kpi_definition) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(a.line, a.week_start, a.period_start, a.period_end, a.source, a.campaign, a.spend, a.impressions, a.clicks, a.conversions, a.kpi_definition));
  for (const l of d.lastYear)
    st.push(db.prepare(`INSERT OR REPLACE INTO lastyear_weekly (week_index,source,campaign_type,spend,impressions,clicks,conversions) VALUES (?,?,?,?,?,?,?)`)
      .bind(l.week_index, l.source, l.campaign_type, l.spend, l.impressions, l.clicks, l.conversions));
  for (const l of d.learnings)
    st.push(db.prepare(`INSERT OR REPLACE INTO learnings (id,status,source,source_ref,date,approver,channel,topic,lesson,decision_taken,patterns,outcome,is_synthetic,session_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,NULL)`)
      .bind(l.id, l.status, l.source, l.source_ref, l.date, l.approver, l.channel, l.topic, l.lesson, l.decision_taken, l.patterns, l.outcome));
  await runChunks(db, st);
  await db.prepare(`INSERT OR REPLACE INTO kv (k,v) VALUES ('demo_version',?)`).bind(DEMO_VERSION).run();
  await logFinish(db, id, 'seed', d.metrics.length, 'SYNTHETIC seed: static fictional data, no platform latency applies');
  return d.metrics.length;
}

export async function loadDemo(db: D1Database): Promise<{ metrics: M[]; plan: Plan[]; agency: Agency[]; ly: LastYear[] }> {
  const q = async <T>(sql: string) => ((await db.prepare(sql).all<T>()).results ?? []) as T[];
  return {
    metrics: await q<M>(`SELECT date, source, campaign, spend, impressions, clicks, conversions FROM metrics_daily WHERE is_synthetic=1 ORDER BY date`),
    plan: await q<Plan>(`SELECT * FROM plan_weekly ORDER BY week_index, source, campaign`),
    agency: await q<Agency>(`SELECT * FROM agency_weekly ORDER BY line_no`),
    ly: await q<LastYear>(`SELECT * FROM lastyear_weekly`),
  };
}
