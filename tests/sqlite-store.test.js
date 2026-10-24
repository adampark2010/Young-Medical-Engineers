import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createSqliteStore } from '../lib/sqlite-store.js';

const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

test('local SQLite store: add, list, keep past ones out of the public list, remove several, and sign-ups', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'yme-'));
  const store = createSqliteStore(join(dir, 'sessions.sqlite'));
  try {
    const base = { type: 'Talk', start: '16:00', end: null, online: true, place: '', street: '', town: '', description: '', createdBy: 'derrick' };
    const soon = { ...base, id: randomUUID(), title: 'Soon', date: day(3) };
    const later = { ...base, id: randomUUID(), title: 'Later', date: day(10), start: '09:30', end: '10:30', online: false, place: 'Library', street: '1 Main St', town: 'Town, IL' };
    const old = { ...base, id: randomUUID(), title: 'Old', date: day(-10) };
    assert.equal(await store.add(later), 'added');
    assert.equal(await store.add(soon), 'added');
    assert.equal(await store.add(old), 'added');
    assert.equal(await store.add(soon), 'exists');
    const upcoming = await store.upcoming();
    assert.deepEqual(upcoming.map(s => s.title), ['Soon', 'Later']);
    assert.equal(upcoming[0].online, true);
    assert.equal(upcoming[0].end, null);
    assert.equal(upcoming[1].end, '10:30');
    assert.equal(upcoming[1].created_by, undefined);
    const recent = await store.recent();
    assert.deepEqual(recent.map(s => s.title), ['Old', 'Soon', 'Later']);
    assert.equal(recent[0].created_by, 'derrick');
    assert.equal(await store.remove([soon.id, old.id, randomUUID()]), 2);
    assert.equal(await store.remove([soon.id]), 0);
    assert.deepEqual((await store.recent()).map(s => s.title), ['Later']);

    // sign-ups: open sessions only, one per email per session, newest first, deleted together
    assert.equal(await store.session(old.id), null, 'a removed session takes no sign-ups');
    assert.deepEqual(await store.session(later.id), { id: later.id, title: 'Later', date: day(10), start: '09:30' });
    const person = { name: 'Ada', grade: '9th', note: '', sessionTitle: 'Later', sessionDate: day(10), sessionStart: '09:30' };
    const one = { ...person, id: randomUUID(), session: later.id, email: 'ada@example.com' };
    const two = { ...person, id: randomUUID(), session: null, email: 'ada@example.com', sessionTitle: '', sessionDate: null, sessionStart: null };
    assert.equal(await store.addSignup(one), 'added');
    assert.equal(await store.addSignup({ ...one, id: randomUUID(), email: 'ADA@example.com' }), 'exists');
    assert.equal(await store.addSignup(two), 'added');
    assert.equal(await store.addSignup({ ...two, id: randomUUID() }), 'exists');
    const list = await store.signups();
    assert.deepEqual(list.map(s => s.id), [two.id, one.id]);
    assert.equal(list[1].session_title, 'Later');
    assert.match(list[0].created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.equal(await store.removeSignups([one.id, two.id, randomUUID()]), 2);
    assert.deepEqual(await store.signups(), []);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
