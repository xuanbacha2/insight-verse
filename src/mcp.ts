// Minimal MCP client (Streamable HTTP, JSON-RPC 2.0) for the official TikTok Ads MCP server.
export const TT_BASE = 'https://business-api.tiktok.com/open_mcp/tt-ads-mcp-layer-anthropic';
export const MCP_PROTOCOL_VERSION = '2025-06-18';

export interface McpSession { id: string; version: string; token: string }

/** Pick the JSON-RPC message with matching id from a plain JSON body or an SSE stream. */
export function extractRpcMessage(text: string, id: number): any | null {
  const raw = text.trim();
  if (!raw) return null;
  const cands: any[] = [];
  if (raw[0] === '{' || raw[0] === '[') {
    try { const p = JSON.parse(raw); Array.isArray(p) ? cands.push(...p) : cands.push(p); } catch { /* ignore */ }
  } else {
    for (const block of raw.split(/\r?\n\r?\n/)) {
      const data = block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.replace(/^data:\s?/, ''));
      if (!data.length) continue;
      try { cands.push(JSON.parse(data.join('\n'))); } catch { /* ignore */ }
    }
  }
  return cands.find((c) => c && String(c.id) === String(id)) ?? null;
}

export class McpAuthError extends Error {}

async function post(token: string, body: unknown, session?: McpSession, fetcher: typeof fetch = fetch) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': session?.version ?? MCP_PROTOCOL_VERSION,
  };
  if (session?.id) headers['Mcp-Session-Id'] = session.id;
  const res = await fetcher(TT_BASE, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  if (res.status === 401) throw new McpAuthError('MCP 401');
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 200)}`);
  return { res, text };
}

let rpcId = 1;

export async function mcpOpen(token: string, fetcher: typeof fetch = fetch): Promise<McpSession> {
  const id = rpcId++;
  const { res, text } = await post(token, {
    jsonrpc: '2.0', id, method: 'initialize',
    params: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'unified-media-hub', version: '0.1.0' } },
  }, undefined, fetcher);
  const msg = extractRpcMessage(text, id);
  if (!msg || msg.error || !msg.result) throw new Error('MCP initialize failed');
  const session: McpSession = {
    id: res.headers.get('Mcp-Session-Id') || '',
    version: String(msg.result.protocolVersion || MCP_PROTOCOL_VERSION),
    token,
  };
  await post(token, { jsonrpc: '2.0', method: 'notifications/initialized' }, session, fetcher);
  return session;
}

/** tools/call and unwrap structuredContent / JSON text; TikTok payloads carry {code, message, data}. */
export async function mcpCall(s: McpSession, tool: string, args: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<any> {
  const id = rpcId++;
  const { text } = await post(s.token, { jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args } }, s, fetcher);
  const msg = extractRpcMessage(text, id);
  if (!msg) throw new Error(`MCP ${tool}: no response message`);
  if (msg.error) throw new Error(`MCP ${tool} error: ${String(msg.error.message || '').slice(0, 200)}`);
  const result = msg.result;
  const body = Array.isArray(result?.content) ? result.content.map((c: any) => (c?.type === 'text' ? c.text : '')).join('') : '';
  if (result?.isError) throw new Error(`MCP ${tool} tool error: ${body.slice(0, 200)}`);
  let payload = result?.structuredContent;
  if (!payload || (payload.code === undefined && payload.data === undefined)) {
    try { payload = JSON.parse(body); } catch { /* keep */ }
  }
  if (!payload || typeof payload !== 'object') throw new Error(`MCP ${tool}: non-JSON payload`);
  if (payload.code !== undefined && Number(payload.code) !== 0) throw new Error(`TikTok API code=${payload.code} ${String(payload.message || '').slice(0, 200)}`);
  return payload;
}
