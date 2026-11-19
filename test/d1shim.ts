// Tiny D1-compatible adapter over node:sqlite so tests run the real migrations without a network or wrangler.
import { createRequire } from 'node:module';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type DatabaseSync = import('node:sqlite').DatabaseSync;
import { readFileSync, readdirSync } from 'node:fs';

class Stmt {
  constructor(private db: DatabaseSync, private sql: string, private args: unknown[] = []) {}
  bind(...a: unknown[]) { return new Stmt(this.db, this.sql, a); }
  private s() { return this.db.prepare(this.sql); }
  async run() { const r = this.s().run(...(this.args as any[])); return { success: true, meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } }; }
  async all<T>() { return { results: this.s().all(...(this.args as any[])) as T[] }; }
  async first<T>() { return (this.s().get(...(this.args as any[])) as T) ?? null; }
}

export function makeDb(): D1Database {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const f of readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort()) db.exec(readFileSync(`migrations/${f}`, 'utf8'));
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    batch: async (stmts: Stmt[]) => { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
    exec: async (sql: string) => { db.exec(sql); return { count: 1, duration: 0 }; },
  } as unknown as D1Database;
}
