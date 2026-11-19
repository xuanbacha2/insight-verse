// Web Crypto helpers: AES-GCM token encryption, PKCE, random ids. No secrets are logged.
const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlDecode(s: string): Uint8Array {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(p);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  return b64urlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256b64url(input: string): Promise<string> {
  return b64urlEncode(await crypto.subtle.digest('SHA-256', enc.encode(input)));
}

/** PKCE (RFC 7636): verifier 43+ unreserved chars, challenge = BASE64URL(SHA256(verifier)). */
export async function makePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomToken(48); // 64 chars
  return { verifier, challenge: await sha256b64url(verifier) };
}

async function importKey(keyB64: string | undefined): Promise<CryptoKey> {
  if (!keyB64) throw new Error('TOKEN_ENC_KEY is not set');
  const raw = b64urlDecode(keyB64.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  if (raw.length !== 32) throw new Error('TOKEN_ENC_KEY must be 32 random bytes, base64-encoded');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Output format: v1.<iv>.<ciphertext+tag>, both base64url. */
export async function encryptToken(plain: string, keyB64: string | undefined): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  return `v1.${b64urlEncode(iv)}.${b64urlEncode(ct)}`;
}

export async function decryptToken(blob: string, keyB64: string | undefined): Promise<string> {
  const [v, iv, ct] = blob.split('.');
  if (v !== 'v1' || !iv || !ct) throw new Error('bad token blob');
  const key = await importKey(keyB64);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64urlDecode(iv) }, key, b64urlDecode(ct));
  return dec.decode(pt);
}
