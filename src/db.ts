import type { Env } from './env';
import { sha256b64url } from './crypto';

export const nowIso = () => new Date().toISOString();

export interface MetricRow {
  date: string; source: string; account_id: string; campaign: string;
  spend: number; impressions: number; clicks: number; conversions: number;
  currency?: string | null; is_synthetic?: number;
}

const UPSERT_SQL = `INSERT INTO metrics_daily
 (date, source, account_id, campaign, spend, impressions, clicks, conversions, currency, is_synthetic, pulled_at)
 VALUES (?,?,?,?,?,?,?,?,?,?,?)
 ON CONFLICT(date, source, account_id, campaign) DO UPDATE SET
  spend=excluded.spend, impressions=excluded.impressions, clicks=excluded.clicks,
  conversions=excluded.conversions, currency=excluded.currency, pulled_at=excluded.pulled_at`;

/** Idempotent upsert; re-pulling the same day overwrites it (platform data is restated over time). */
export async function upsertMetrics(db: D1Database, rows: MetricRow[]): Promise<number> {
  const at = nowIso();
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50).map((r) =>
      db.prepare(UPSERT_SQL).bind(r.date, r.source, r.account_id, r.campaign, r.spend, r.impressions,
        r.clicks, r.conversions, r.currency ?? null, r.is_synthetic ?? 0, at));
    await db.batch(chunk);
  }
  return rows.length;
}

export async function logStart(db: D1Database, source: string): Promise<number> {
  const r = await db.prepare(`INSERT INTO refresh_log (source, started, status) VALUES (?,?, 'running')`)
    .bind(source, nowIso()).run();
  return Number((r.meta as { last_row_id?: number }).last_row_id);
}
export async function logFinish(db: D1Database, id: number, status: 'ok' | 'error' | 'seed', rows: number,
  latencyNote: string, error?: string) {
  await db.prepare(`UPDATE refresh_log SET finished=?, status=?, rows=?, latency_note=?, error=? WHERE id=?`)
    .bind(nowIso(), status, rows, latencyNote, error ? error.slice(0, 300) : null, id).run();
}

export async function sessionHash(sessionId: string): Promise<string> {
  return sha256b64url('sess:' + sessionId);
}

export async function connectionsFor(env: Env, hash: string) {
  const r = await env.DB.prepare(`SELECT id, provider, display_name, status, expires_at, created_at FROM connections WHERE session_hash=? ORDER BY created_at`)
    .bind(hash).all<{ id: string; provider: string; display_name: string | null; status: string; expires_at: string | null; created_at: string }>();
  return r.results ?? [];
}
