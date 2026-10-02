'use strict';
/**
 * stub_providers.js — stub providers modeling REAL provider semantics.
 *
 * No network, no live platforms, no touch of the engagement machinery.
 * Every mutating call is appended to `log` so the proof can assert exact
 * provider-side counts (the key evidence: one logical op never causes two
 * provider mutations merely because PING lost an acknowledgement).
 *
 * Modeled semantics (from the class specs + adapter sources):
 *  - Threads publish: create-only, byte-preserved text, NO provider
 *    idempotency key. A repeated publish of identical content creates a
 *    SECOND post. No delete endpoint exists.
 *  - Instagram publish: create-only with caption+media fingerprint
 *    identity; per-account daily publish limit (limit 25). Publishing at
 *    the limit throws.
 *  - Engagement (FB-like): like is TOGGLE/INVERT on repeat — a second
 *    toggle call on an already-liked post UNLIKES it. Comments are
 *    additive (re-post = second comment). Delete is idempotent
 *    (already-gone = ok, never an error, never resurrects). Update is
 *    version-bound (expected-version mismatch = conflict, never applied).
 *  - Page publish: always throws RestrictedError (PAUSED under the silent
 *    restriction; the adapter must never unpause it).
 */

class StubThreads {
  constructor() {
    this.posts = []; // {id, account, text, mediaManifest}
    this.log = [];   // {op, ...} — the provider-side audit trail
    this.listFail = false; // degraded provider: topPosts throws
    this._n = 0;
  }
  publish({ account, text, mediaManifest }) {
    this._n += 1;
    const post = { id: `thr-${this._n}`, account, text, mediaManifest: mediaManifest.slice() };
    this.posts.push(post);
    this.log.push({ op: 'publish', id: post.id, account });
    return { post_id: post.id };
  }
  topPosts({ account } = {}) {
    this.log.push({ op: 'list', account });
    if (this.listFail) throw new Error('threads provider degraded: list failed');
    return {
      posts: this.posts
        .filter((p) => p.account === account)
        .map((p) => ({ post_id: p.id, text: p.text })),
    };
  }
  publishCount(account) {
    return this.log.filter((e) => e.op === 'publish' && (!account || e.account === account)).length;
  }
}

class StubInstagram {
  constructor() {
    this.posts = []; // {id, account, kind, caption, mediaManifest}
    this.log = [];
    this.daily = { limit: 25, used: 0 };
    this.listFail = false; // degraded CLI read path
    this._n = 0;
  }
  get remaining() { return this.daily.limit - this.daily.used; }
  publish({ account, kind, caption, mediaManifest }) {
    if (this.remaining <= 0) {
      this.log.push({ op: 'publish-rejected', account, kind });
      throw new Error('instagram daily publish limit exhausted');
    }
    this.daily.used += 1;
    this._n += 1;
    const post = { id: `ig-${this._n}`, account, kind, caption, mediaManifest: mediaManifest.slice() };
    this.posts.push(post);
    this.log.push({ op: 'publish', id: post.id, account, kind });
    return { id: post.id };
  }
  grid({ account } = {}) {
    this.log.push({ op: 'grid', account });
    if (this.listFail) throw new Error('instagram CLI read path failed');
    return {
      posts: this.posts
        .filter((p) => p.account === account)
        .map((p) => ({ id: p.id, caption: p.caption, mediaManifest: p.mediaManifest.slice() })),
    };
  }
  publishCount() {
    return this.log.filter((e) => e.op === 'publish').length;
  }
}

class StubEngagement {
  constructor() {
    this.likeState = new Map(); // postRef -> boolean
    this.comments = new Map();  // postRef -> [text]
    this.posts = new Map();     // postRef -> {content, version, deleted}
    this.pagePublishCalls = 0;
    this.log = [];
    this.likeReadFail = false;   // readLikeState returns {liked: null}
    this.commentReadFail = false;
    this.stateReadFail = false;  // readPost returns null (unreadable)
  }
  seedPost(postRef, { content = '', version = 1 } = {}) {
    this.posts.set(postRef, { content, version, deleted: false });
    if (!this.comments.has(postRef)) this.comments.set(postRef, []);
    if (!this.likeState.has(postRef)) this.likeState.set(postRef, false);
  }
  readLikeState(postRef) {
    this.log.push({ op: 'read-like', postRef });
    if (this.likeReadFail) return { liked: null };
    return { liked: this.likeState.get(postRef) === true };
  }
  toggleLike(postRef) {
    // REAL provider semantics: repeat call INVERTS. No idempotency key.
    const next = !(this.likeState.get(postRef) === true);
    this.likeState.set(postRef, next);
    this.log.push({ op: 'toggle-like', postRef, nowLiked: next });
    return { liked: next };
  }
  toggleCount(postRef) {
    return this.log.filter((e) => e.op === 'toggle-like' && e.postRef === postRef).length;
  }
  readComments(postRef) {
    this.log.push({ op: 'read-comments', postRef });
    if (this.commentReadFail) return null;
    return (this.comments.get(postRef) || []).slice();
  }
  addComment(postRef, text) {
    const list = this.comments.get(postRef) || [];
    list.push(text);
    this.comments.set(postRef, list);
    const id = `cmt-${list.length}`;
    this.log.push({ op: 'add-comment', postRef, id });
    return { id };
  }
  commentCount(postRef) {
    return (this.comments.get(postRef) || []).length;
  }
  readPost(postRef) {
    this.log.push({ op: 'read-post', postRef });
    if (this.stateReadFail) return null;
    const p = this.posts.get(postRef);
    if (!p || p.deleted) return { exists: false };
    return { exists: true, version: p.version, content: p.content };
  }
  deletePost(postRef) {
    const p = this.posts.get(postRef);
    if (!p || p.deleted) {
      // Idempotent: already-gone is ok, never an error, never resurrects.
      this.log.push({ op: 'delete', postRef, alreadyGone: true });
      return { ok: true, alreadyGone: true };
    }
    p.deleted = true;
    this.log.push({ op: 'delete', postRef, alreadyGone: false });
    return { ok: true, alreadyGone: false };
  }
  deleteCount(postRef) {
    return this.log.filter((e) => e.op === 'delete' && e.postRef === postRef && !e.alreadyGone).length;
  }
  updatePost(postRef, content, expectedVersion) {
    const p = this.posts.get(postRef);
    if (!p || p.deleted) throw new Error('update target missing');
    if (p.version !== expectedVersion) {
      const e = new Error(`version conflict: expected ${expectedVersion}, provider at ${p.version}`);
      e.code = 'VERSION_CONFLICT';
      throw e;
    }
    p.content = content;
    p.version += 1;
    this.log.push({ op: 'update', postRef, version: p.version });
    return { ok: true, version: p.version };
  }
  updateCount(postRef) {
    return this.log.filter((e) => e.op === 'update' && e.postRef === postRef).length;
  }
  pagePublish() {
    this.pagePublishCalls += 1;
    const e = new Error('page publishing PAUSED under silent restriction');
    e.code = 'PAGE_PUBLISH_PAUSED';
    throw e;
  }
}

/** Route the adapters' CLI-shaped exec(argv) calls to the stubs. */
function makeStubExec({ threads, instagram }) {
  const flag = (argv, name) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : '';
  };
  return async (argv) => {
    const [cmd, sub] = argv;
    if (cmd === 'threads-cli' && sub === 'top-posts') {
      return { stdout: JSON.stringify(threads.topPosts({ account: flag(argv, '--account-id') })), stderr: '' };
    }
    if (cmd === 'instagram-cli' && sub === 'posts') {
      return { stdout: JSON.stringify(instagram.grid({ account: flag(argv, '--username') })), stderr: '' };
    }
    throw new Error(`stub exec: unknown command ${cmd} ${sub}`);
  };
}

module.exports = { StubThreads, StubInstagram, StubEngagement, makeStubExec };
