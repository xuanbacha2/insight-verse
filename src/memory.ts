// Brand memory: learnings store + brief check (ported from the Python demo's --check-brief, same semantics).
import { nowIso } from './db';
import { randomToken } from './crypto';

export interface Learning {
  id: string; status: 'trial' | 'confirmed' | 'retired'; source: string; source_ref: string | null; date: string; approver: string;
  channel: string | null; topic: string | null; lesson: string; decision_taken: string | null; patterns: string | null;
  outcome: string | null; is_synthetic: number; session_hash: string | null;
}

// A negation word before the matched phrase in the same clause means the brief says "do not do that": no flag.
const NEG = /\b(not|no|never|avoid|without|don't|dont|won't|instead of|rather than|stop)\b|không|khong|đừng|tránh|cấm|thay vì|chứ không|exclud\w*|except\w*|ngoại trừ|loại trừ|loại bỏ/i;
const NEG_AFTER = /exclud|separate|not (counted|included)|không tính|tách riêng|loại trừ/i;
const CLAUSE_SPLIT = /[.;:,/!?()]|\s[-–—]\s/;

function negated(text: string, start: number, end: number): boolean {
  const before = text.slice(0, start).split(CLAUSE_SPLIT).pop()!.slice(-45);
  if (NEG.test(before)) return true;
  const after = text.slice(end).split(CLAUSE_SPLIT)[0].slice(0, 45);
  return NEG_AFTER.test(after);
}

function matchLine(pattern: string, text: string): { pos: boolean; neg: boolean } {
  let pos = false, neg = false;
  let re: RegExp;
  try { re = new RegExp(pattern, 'gi'); } catch { return { pos, neg }; }
  for (const m of text.matchAll(re)) {
    if (m[0] === '') continue;
    if (negated(text, m.index!, m.index! + m[0].length)) neg = true; else pos = true;
  }
  return { pos, neg };
}

export interface BriefHit { line: number; text: string; learning: Learning }
export interface BriefResult {
  flags: BriefHit[]; trial: BriefHit[]; negated: BriefHit[]; ignored: Array<{ learning: Learning; why: string }>;
  scanned: number; confirmedCount: number; trialCount: number; draftDate: string | null;
}

export function checkBrief(brief: string, learnings: Learning[]): BriefResult {
  const lines = brief.split(/\r?\n/);
  const dm = brief.match(/draft[^\n]*?(\d{4}-\d{2}-\d{2})/i);
  const draft = dm ? dm[1] : null;
  const res: BriefResult = { flags: [], trial: [], negated: [], ignored: [], scanned: lines.length, confirmedCount: 0, trialCount: 0, draftDate: draft };
  const usable: Learning[] = [];
  for (const l of learnings) {
    if (l.status === 'retired') res.ignored.push({ learning: l, why: 'retired' });
    else if (draft && l.date > draft) res.ignored.push({ learning: l, why: `recorded ${l.date}, after the brief draft date ${draft}` });
    else usable.push(l);
  }
  res.confirmedCount = usable.filter((l) => l.status === 'confirmed').length;
  res.trialCount = usable.filter((l) => l.status === 'trial').length;
  lines.forEach((text, i) => {
    if (!text.trim() || text.trimStart().startsWith('#')) return;
    for (const l of usable) {
      if (!l.patterns) continue;
      const { pos, neg } = matchLine(l.patterns, text);
      const hit = { line: i + 1, text: text.trim(), learning: l };
      if (pos) (l.status === 'confirmed' ? res.flags : res.trial).push(hit);
      else if (neg) res.negated.push(hit);
    }
  });
  return res;
}

// ---------------------------------------------------------------- storage
const MAX_PER_SESSION = 50;
export class MemoryError extends Error {}

const clip = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listLearnings(db: D1Database, hash: string): Promise<Learning[]> {
  const r = await db.prepare(`SELECT * FROM learnings WHERE session_hash IS NULL OR session_hash=? ORDER BY date DESC, id`).bind(hash).all<Learning>();
  return r.results ?? [];
}

/** Approve a decision as a TRIAL (not yet a lesson). Keywords are plain phrases, escaped, never user-supplied regex. */
export async function approveAsTrial(db: D1Database, hash: string, f: Record<string, string>): Promise<string> {
  const lesson = clip(f.lesson, 1000), approver = clip(f.approver, 80);
  if (lesson.length < 10) throw new MemoryError('Describe the decision in at least 10 characters.');
  if (!approver) throw new MemoryError('Approver name is required.');
  const n = await db.prepare(`SELECT COUNT(*) AS n FROM learnings WHERE session_hash=?`).bind(hash).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_PER_SESSION) throw new MemoryError('Limit reached for this session.');
  const kws = clip(f.keywords, 300).split(',').map((k) => k.trim()).filter((k) => k.length >= 3).slice(0, 10);
  const id = 'T-' + randomToken(4).replace(/[^A-Za-z0-9]/g, 'x').slice(0, 6).toUpperCase();
  await db.prepare(`INSERT INTO learnings (id,status,source,source_ref,date,approver,channel,topic,lesson,decision_taken,patterns,outcome,is_synthetic,session_hash)
    VALUES (?, 'trial', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?)`)
    .bind(id, clip(f.source, 120) || 'manual entry', clip(f.source_ref, 200) || null, nowIso().slice(0, 10), approver, clip(f.channel, 40) || 'All',
      clip(f.topic, 80) || 'decision', 'Trial decision, result not yet evaluated. ' + lesson, lesson,
      kws.length ? kws.map(escapeRe).join('|') : null, hash).run();
  return id;
}

/** Promote a trial to a confirmed lesson. Refuses without a recorded outcome (also enforced by a DB CHECK). */
export async function confirmWithOutcome(db: D1Database, hash: string, id: string, outcome: string, approver: string): Promise<void> {
  const out = clip(outcome, 1000), by = clip(approver, 80);
  if (out.length < 5) throw new MemoryError('An outcome (the measured result) is required to confirm a lesson.');
  if (!by) throw new MemoryError('Approver name is required.');
  const row = await db.prepare(`SELECT status, approver, lesson FROM learnings WHERE id=? AND session_hash=?`).bind(id, hash).first<{ status: string; approver: string; lesson: string }>();
  if (!row || row.status !== 'trial') throw new MemoryError('Only your own trial decisions can be confirmed.');
  await db.prepare(`UPDATE learnings SET status='confirmed', outcome=?, approver=?, lesson=? WHERE id=?`)
    .bind(out, `${row.approver}; confirmed by ${by}`, row.lesson.replace('Trial decision, result not yet evaluated. ', '') + ` Measured result: ${out}`, id).run();
}
