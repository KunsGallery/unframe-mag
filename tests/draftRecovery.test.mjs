import assert from 'node:assert/strict';
import test from 'node:test';
import { browserRecoveryStorage, draftSnapshot, nextEdition, readRecovery, recoveryKey, removeRecovery, writeRecovery } from '../src/lib/draftRecovery.js';

function storage() {
  const data = new Map();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}

test('recovery keys isolate users and documents and do not allow separator collisions', () => {
  assert.notEqual(recoveryKey('a', 'b:c'), recoveryKey('a:b', 'c'));
  assert.notEqual(recoveryKey('a', 'draft'), recoveryKey('b', 'draft'));
  assert.notEqual(recoveryKey('a', null), recoveryKey('a', 'draft'));
  assert.notEqual(recoveryKey('a', null), recoveryKey('a', 'new'));
  assert.equal(recoveryKey(''), null);
});

test('recovery preserves metadata, image markup, and deliberately emptied fields', () => {
  const local = storage();
  const snapshot = draftSnapshot({ title: '', subtitle: 'Only metadata', category: 'ART', cover: 'a.jpg', coverMedium: 'b.jpg' }, '<img src="c.jpg">');
  const record = writeRecovery(local, 'key', snapshot);
  assert.deepEqual(readRecovery(local, 'key'), record);
  assert.deepEqual(record.snapshot, snapshot);
  assert.equal(record.snapshot.contentHTML, '<img src="c.jpg">');
});

test('cleanup uses compare-and-delete so a delayed save cannot delete newer recovery', () => {
  const local = storage();
  const old = writeRecovery(local, 'key', draftSnapshot({}, '<p>old</p>'));
  const newer = writeRecovery(local, 'key', draftSnapshot({}, '<p>new</p>'));
  assert.equal(removeRecovery(local, 'key', old.token), false);
  assert.equal(readRecovery(local, 'key').token, newer.token);
  assert.equal(removeRecovery(local, 'key', newer.token), true);
  assert.equal(readRecovery(local, 'key'), null);
});

test('unavailable, corrupt, unsupported and malformed recovery fails safely', () => {
  const local = storage();
  for (const value of ['{', 'null', '{"version":2}', JSON.stringify({ version: 1, savedAt: 1, token: 'a', snapshot: {} })]) {
    local.setItem('key', value);
    assert.equal(readRecovery(local, 'key'), null);
  }
  assert.equal(writeRecovery(null, 'key', {}), null);
  assert.equal(removeRecovery(local, 'key'), false);
  assert.equal(browserRecoveryStorage(), null);
  const denied = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.equal(readRecovery(denied, 'key'), null);
  assert.equal(writeRecovery(denied, 'key', {}), null);
});

test('edition allocation uses the larger trusted counter or legacy maximum without a three-digit cap', () => {
  assert.deepEqual(nextEdition(null, [{ sortIndex: 49 }, { sortIndex: 7 }]), { nextIndex: 50, nextEditionNo: '050' });
  assert.deepEqual(nextEdition({ lastIndex: 999 }, []), { nextIndex: 1000, nextEditionNo: '1000' });
  assert.throws(() => nextEdition({ lastIndex: '8' }, []), /Invalid/);
  assert.throws(() => nextEdition({ lastIndex: Number.MAX_SAFE_INTEGER }, []), /exhausted/);
});
