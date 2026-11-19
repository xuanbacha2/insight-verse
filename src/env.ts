export interface Env {
  DB: D1Database;
  // vars (wrangler.toml)
  DEMO_DATA?: string;
  GRAPH_VERSION?: string;
  META_APP_ID?: string;
  META_SCOPES?: string;
  PULL_DAYS?: string;
  // secrets (wrangler secret put) - never committed
  META_APP_SECRET?: string;
  TOKEN_ENC_KEY?: string;
}

export const demoEnabled = (e: Env) => (e.DEMO_DATA ?? 'true').toLowerCase() !== 'false';
export const graphVersion = (e: Env) => e.GRAPH_VERSION || 'v25.0';
