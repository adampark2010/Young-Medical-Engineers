/**
 * Post-build audit for the hard rules. Run after `astro build`:
 *   npm run audit
 * Exits non-zero on any failure.
 *
 * Checks, against dist/ (the finished build) and src/:
 *   1. No em dashes anywhere (U+2014), in the build or the source.
 *   2. No Latin placeholder text (lorem, ipsum, dolor sit amet).
 *   3. No numbers on the Impact page beyond the approved paragraph's "2026".
 *   4. Only the approved contact channels: one email, one Instagram handle.
 *   5. No emoji.
 *   6. Every approved copy block appears verbatim in the build.
 *   7. Clean URLs: no ".html" in any internal link; internal links end in "/".
 *   8. Each page has lang, title, description, OG tags, a main landmark,
 *      a skip link and exactly one h1.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

async function walk(dir, ext) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const p = path.join(dir, entry);
    const s = await stat(p);
    if (s.isDirectory()) {
      if (['node_modules', '.git', '_old_site', 'dist', '.astro'].includes(entry) && dir !== DIST) continue;
      out.push(...(await walk(p, ext)));
    } else if (ext.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

// Visible text: inline tags (links, emphasis) vanish so "at <a>x</a>." reads
// "at x."; block tags become a space so adjacent blocks do not merge.
const textOf = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/?(a|span|em|strong|i|b|abbr)\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();

const hrefsOf = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => decode(m[1]));

const norm = (s) => decode(s).replace(/\s+/g, ' ').trim();

const htmlFiles = await walk(DIST, ['.html']);
if (htmlFiles.length === 0) fail('No HTML in dist/. Run `astro build` first.');
const srcFiles = await walk('src', ['.astro', '.ts', '.css', '.mjs']);

const pages = {};
for (const f of htmlFiles) pages[f] = await readFile(f, 'utf8');

// 1. Em dashes
for (const [f, html] of Object.entries(pages)) {
  const n = (html.match(/\u2014/g) || []).length;
  if (n) fail(`${f}: ${n} em dash(es)`);
}
for (const f of srcFiles) {
  const s = await readFile(f, 'utf8');
  const n = (s.match(/\u2014/g) || []).length;
  if (n) fail(`${f}: ${n} em dash(es) in source`);
}
notes.push(`em dash scan: ${htmlFiles.length} built pages, ${srcFiles.length} source files`);

// 2. Lorem
for (const [f, html] of Object.entries(pages)) {
  if (/lorem|ipsum|dolor sit amet/i.test(textOf(html))) fail(`${f}: Latin placeholder text`);
}

// 3. Impact numbers
const impactFile = htmlFiles.find((f) => /[\\/]impact[\\/]index\.html$/.test(f));
if (impactFile) {
  const t = textOf(pages[impactFile]).replace(/\b2026\b/g, '');
  const digits = t.match(/\d+/g);
  if (digits) fail(`${impactFile}: numbers present: ${digits.join(', ')}`);
} else fail('impact page missing');

// 4. Contact channels
const allowedEmail = 'youngmedicalengineers@gmail.com';
for (const [f, html] of Object.entries(pages)) {
  const visible = textOf(html);
  const t = visible + ' ' + hrefsOf(html).join(' ');
  for (const email of new Set(t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [])) {
    if (email !== allowedEmail) fail(`${f}: unexpected email ${email}`);
  }
  if (/\b\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(t)) fail(`${f}: phone number pattern`);
  for (const host of ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com', 'youtube.com', 'discord']) {
    if (t.includes(host)) fail(`${f}: unexpected channel ${host}`);
  }
  const handles = new Set(visible.match(/@[a-z0-9_]+(?:\.[a-z0-9_]+)*/gi) || []);
  for (const h of handles) if (h !== '@ym_engineers' && !h.includes('gmail')) fail(`${f}: unexpected handle ${h}`);
}

// 5. Emoji
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
for (const [f, html] of Object.entries(pages)) if (emoji.test(html)) fail(`${f}: emoji present`);

// 6. Approved copy present verbatim
// The demonstrations block is expected only while the provisional flag is on.
const provisionalSrc = await readFile('src/content/provisional-demonstrations.ts', 'utf8');
const showDemos = /SHOW_DEMONSTRATIONS\s*=\s*true/.test(provisionalSrc);
const approved = JSON.parse(await readFile('scripts/approved-copy.json', 'utf8')).filter(
  (b) => showDemos || !/^Hands-on demonstrations\./.test(b.name || ''),
);
if (!showDemos) notes.push('demonstrations flag is off: its copy block is not expected');
const corpus = Object.values(pages).map(textOf).join('\n');
const headCorpus = Object.values(pages).map((h) => norm(h)).join('\n');
let present = 0;
for (const block of approved) {
  const text = norm(block.text);
  const isMeta = block.label === 'Page meta description:';
  const isList = text.includes(' · ') && !block.label?.startsWith('Top strip') && !block.label?.startsWith('Subline');
  const options = isList
    ? text.split(' · ').filter((opt) => showDemos || opt !== 'Request a talk or demo')
    : [];
  const ok = isMeta ? headCorpus.includes(text) : isList ? options.every((opt) => corpus.includes(norm(opt))) : corpus.includes(text);
  if (!ok) fail(`approved copy missing: "${text.slice(0, 70)}..."`);
  else present++;
  if (block.name) {
    const label = norm(block.name).replace(/\.$/, '');
    if (!corpus.includes(label)) fail(`approved label missing: "${label}"`);
  }
}
notes.push(`approved copy: ${present}/${approved.length} blocks found verbatim`);

// 7. Clean URLs
for (const [f, html] of Object.entries(pages)) {
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|#|data:)/.test(href)) continue;
    if (href.endsWith('.html')) fail(`${f}: link to .html: ${href}`);
    if (/^\/[^?#]*[^\/]$/.test(href) && !/\.[a-z0-9]+$/i.test(href)) fail(`${f}: internal link without trailing slash: ${href}`);
  }
}

// 8. Per-page essentials
for (const [f, html] of Object.entries(pages)) {
  const checks = {
    'lang="en"': /<html[^>]*lang="en"/.test(html),
    '<title>': /<title>[^<]+<\/title>/.test(html),
    'meta description': /<meta name="description" content="[^"]+"/.test(html),
    'og:title': /property="og:title"/.test(html),
    'og:image': /property="og:image"/.test(html),
    '<main>': /<main[\s>]/.test(html),
    'skip link': /class="skip-link"/.test(html),
    'one h1': (html.match(/<h1[\s>]/g) || []).length === 1,
  };
  for (const [name, ok] of Object.entries(checks)) if (!ok) fail(`${f}: missing ${name}`);
}

// Report
console.log('AUDIT');
for (const n of notes) console.log('  ' + n);
if (failures.length) {
  console.log(`\n${failures.length} FAILURE(S):`);
  for (const m of failures) console.log('  - ' + m);
  process.exit(1);
}
console.log('  all checks passed');
