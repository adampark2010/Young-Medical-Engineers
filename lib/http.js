/* Small request and response helpers shared by the server functions in api/. */
export const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

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

/* Logs only the database's diagnostic code (never connection strings or form contents) and answers kindly. */
export function databaseFailure(error, message) {
  console.error('Database failure:', /^[A-Z\d]{5}$/.test(error?.code) ? error.code : 'unavailable');
  if (error?.code === '42P01') return json(503, { error: 'A database table is missing. Run db/schema.sql in the connected Neon database.' });
  return json(503, { error: message });
}
