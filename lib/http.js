/* Small request and response helpers shared by the handlers that worker.js and server.mjs run. */
export const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Trims typed text and checks its length; with lines, line breaks are kept. Returns null if not allowed. */
export function text(value, max, lines = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.includes('\0')) return null;
  value = lines
    ? value.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : value.trim().replace(/\s+/g, ' ');
  return value.length > max ? null : value;
}

export function json(status, body, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}

/* Changes must come from a page on this website (blocks other sites from posting on a visitor's or admin's behalf). */
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return Boolean(origin) && origin === new URL(request.url).origin;
}

export function isJson(request) {
  return (request.headers.get('content-type') || '').toLowerCase().startsWith('application/json');
}

/* Reads a JSON body of at most 32 KB. */
export async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw Error('Empty request');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32000) { await reader.cancel(); throw Error('Request too large'); }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/* The database's own explanation, for the logs, with any connection string or address removed and
   no form contents: for example 'password authentication failed for user "yme_site"'. */
export function safeMessage(error) {
  return String(error?.message || error || '')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[connection string]')
    .replace(/\b[\w.-]+\.neon\.tech\b/gi, '[database host]')
    .slice(0, 200);
}

/* Logs the database's diagnostic code and a cleaned-up message (never connection strings or form
   contents) and answers kindly. */
export function databaseFailure(error, message) {
  console.error('Database failure:', /^[A-Z\d]{5}$/.test(error?.code) ? error.code : 'unavailable', safeMessage(error));
  if (error?.code === '42P01') return json(503, { error: 'A database table is missing. Run db/schema.sql in the connected Neon database.' });
  if (error?.code === '42501') return json(503, { error: 'The website\'s database login may not use a table. Run db/schema.sql again in the connected Neon database.' });
  return json(503, { error: message });
}
