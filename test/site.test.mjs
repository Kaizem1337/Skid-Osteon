import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createApp } from '../server.mjs';

test('contact and consultation requests reach the protected staff inbox', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'osteon-test-'));
  const { server, db } = createApp({ dbPath: path.join(directory, 'test.sqlite') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
    if (directory.startsWith(os.tmpdir() + path.sep) && path.basename(directory).startsWith('osteon-test-'))
      await fs.rm(directory, { recursive: true, force: true });
  });

  const homepage = await fetch(base);
  assert.equal(homepage.status, 200);
  assert.match(await homepage.text(), /action="\/api\/enquiries"/);

  const unauthenticated = await fetch(`${base}/api/staff/requests`);
  assert.equal(unauthenticated.status, 401);

  const contactBody = {
    kind: 'contact', name: 'Local Test', email: 'local@example.test',
    message: '<img src=x onerror=alert(1)> Test contact message',
    submissionId: crypto.randomUUID()
  };
  const submit = () => fetch(`${base}/api/enquiries`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactBody)
  });
  const first = await submit();
  assert.equal(first.status, 200);
  const firstResult = await first.json();
  assert.equal(firstResult.ok, true);
  const duplicate = await submit();
  assert.equal((await duplicate.json()).id, firstResult.id);

  const setup = await fetch(`${base}/api/staff/setup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@example.test', password: 'local-test-password-123', confirm: 'local-test-password-123' })
  });
  assert.equal(setup.status, 200);
  const cookie = setup.headers.get('set-cookie').split(';')[0];
  const auth = { Cookie: cookie };

  const inbox = await fetch(`${base}/staff?view=unread`, { headers: auth });
  assert.equal(inbox.status, 200);
  const inboxHtml = await inbox.text();
  assert.match(inboxHtml, /Local Test/);
  assert.match(inboxHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(inboxHtml, /<img src=x onerror/);

  const list = await fetch(`${base}/api/staff/requests?view=unread`, { headers: auth });
  const listResult = await list.json();
  assert.equal(listResult.count, 1);
  assert.equal(listResult.rows[0].id, firstResult.id);

  const patch = async (version, payload) => fetch(`${base}/api/staff/requests/${firstResult.id}`, {
    method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, ...payload })
  });
  const read = await patch(1, { action: 'MARK_READ' });
  assert.equal(read.status, 200);
  const readResult = await read.json();
  assert.equal(readResult.request.is_read, 1);
  const stale = await patch(1, { status: 'CONTACTED' });
  assert.equal(stale.status, 409);
  const status = await patch(2, { status: 'CONTACTED' });
  assert.equal(status.status, 200);
  const trashed = await patch(3, { action: 'TRASH' });
  assert.equal(trashed.status, 200);
  const trashList = await fetch(`${base}/api/staff/requests?view=trash`, { headers: auth });
  assert.equal((await trashList.json()).count, 1);

  const consultation = await fetch(`${base}/api/consultation-requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'consultation', name: 'Consultation Test', email: 'consult@example.test', message: 'Planning question', submissionId: crypto.randomUUID() })
  });
  assert.equal(consultation.status, 200);
  const newUnread = await fetch(`${base}/api/staff/requests?view=unread`, { headers: auth });
  const newUnreadResult = await newUnread.json();
  assert.equal(newUnreadResult.count, 1);
  assert.equal(newUnreadResult.rows[0].kind, 'consultation');

  const badOrigin = await fetch(`${base}/api/enquiries`, {
    method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(contactBody)
  });
  assert.equal(badOrigin.status, 403);
});
