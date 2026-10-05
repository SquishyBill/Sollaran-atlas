// Demo backend: everything lives in this browser's localStorage.
// Mirrors FirebaseStore's interface and visibility rules so the app code is identical.
import { SEED } from './seed.js';

const KEY = 'atlas-sollara-v3';
const rid = () => Math.random().toString(36).slice(2, 10);
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
const rows = (obj) => Object.entries(obj).map(([id, v]) => ({ id, ...v }));

export class LocalStore {
  mode = 'local';
  canUpload = true;
  handlers = {};

  async init() {
    this.uid = lsGet('atlas-demo-uid');
    if (!this.uid) { this.uid = 'u' + rid(); lsSet('atlas-demo-uid', this.uid); }
    this.isDM = lsGet('atlas-demo-dm') === '1';
    this.signedIn = this.isDM;
    this.load();
    addEventListener('storage', (e) => { if (e.key === KEY) { this.load(); this.emit(); } });
    try {
      this.bc = new BroadcastChannel('atlas-demo-ping');
      this.bc.onmessage = (e) => this.handlers.ping?.(e.data);
    } catch { /* unsupported */ }
  }

  load() {
    try { this.db = JSON.parse(lsGet(KEY)); } catch { this.db = null; }
    if (!this.db) { this.db = structuredClone(SEED); lsSet(KEY, JSON.stringify(this.db)); }
    this.db.secrets ||= {};
    this.db.people ||= {};
    this.db.pictures ||= {};
  }

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.db)); }
    catch { throw new Error('This browser is out of room for demo data. Try a smaller image, or connect Firebase.'); }
    this.emit();
  }

  emit() {
    const dm = this.isDM;
    this.handlers.pages?.(rows(this.db.pages).filter((p) => dm || !p.hidden));
    this.handlers.pins?.(rows(this.db.pins).filter((p) => dm || (!p.hidden && !p.pageHidden)));
    this.handlers.notes?.(rows(this.db.notes).filter((n) => !n.private || n.uid === this.uid));
    this.handlers.people?.(rows(this.db.people).filter((p) => dm || !p.hidden));
    if (dm) this.handlers.secrets?.(rows(this.db.secrets));
  }

  subscribe(handlers) { this.handlers = handlers; queueMicrotask(() => this.emit()); }

  async signIn() { lsSet('atlas-demo-dm', '1'); location.reload(); }
  async signOut() { lsSet('atlas-demo-dm', '0'); location.reload(); }
  reset() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } location.reload(); }

  async savePage(data, id) {
    const pages = this.db.pages;
    if (!id) { id = rid(); pages[id] = { hidden: false, createdAt: Date.now() }; }
    Object.assign(pages[id], data);
    if ('hidden' in data) {
      for (const p of Object.values(this.db.pins)) if (p.pageId === id) p.pageHidden = !!data.hidden;
    }
    this.persist();
    return id;
  }

  async deletePage(id) {
    for (const [pid, p] of Object.entries(this.db.pins)) if (p.pageId === id) delete this.db.pins[pid];
    delete this.db.pages[id];
    this.persist();
  }

  async savePin(data, id) {
    if (!id) { id = rid(); this.db.pins[id] = { hidden: false, pageHidden: false, createdAt: Date.now() }; }
    Object.assign(this.db.pins[id], data);
    this.persist();
    return id;
  }

  async importSeed(seed) {
    Object.assign(this.db.pages, seed.pages);
    Object.assign(this.db.pins, seed.pins);
    Object.assign(this.db.secrets, seed.secrets || {});
    Object.assign(this.db.people, seed.people || {});
    this.persist();
  }

  async saveSecret(id, text) {
    if (text.trim()) this.db.secrets[id] = { text }; else delete this.db.secrets[id];
    this.persist();
  }

  async deletePin(id) { delete this.db.pins[id]; this.persist(); }

  async savePerson(data, id) {
    if (!id) { id = 'person-' + rid(); this.db.people[id] = { hidden: false, createdAt: Date.now() }; }
    Object.assign(this.db.people[id], data);
    this.persist();
    return id;
  }

  // Pictures for pins and pages live apart from them and are fetched only when shown.
  async getPicture(id) { return this.db.pictures[id]?.data ?? null; }

  async savePicture(id, kind, data) {
    if (data) this.db.pictures[id] = { kind, data }; else delete this.db.pictures[id];
    this.persist();
  }

  async deletePerson(id) { delete this.db.people[id]; delete this.db.secrets[id]; this.persist(); }

  async addNote(note) {
    this.db.notes[rid()] = { ...note, uid: this.uid, createdAt: Date.now() };
    this.persist();
  }

  async updateNote(id, text) {
    const n = this.db.notes[id];
    if (n && n.uid === this.uid) { n.text = text; n.editedAt = Date.now(); this.persist(); }
  }

  async deleteNote(id) { delete this.db.notes[id]; this.persist(); }

  async sendPing(p) {
    const msg = { ...p, uid: this.uid, at: Date.now() };
    this.handlers.ping?.(msg);
    this.bc?.postMessage(msg);
  }

  uploadImage(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
}
