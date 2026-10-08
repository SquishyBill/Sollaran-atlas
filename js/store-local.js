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
    this.db.renown ||= {};
    this.db.renownLog ||= {};
    this.db.config ||= {};
    this.db.shops ||= {};
    this.db.purchases ||= {};
    this.db.haggles ||= {};
    this.db.players ||= {};
    for (const k of ['loot', 'lootTruth', 'lootLog', 'caches', 'magicItems', 'magicPublic']) this.db[k] ||= {};
    this.db.party ||= { coins: { cp: 0, sp: 0, gp: 0, pp: 0 } };
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
    this.handlers.renown?.(rows(this.db.renown).filter((r) => dm || !r.hidden));
    this.handlers.renownLog?.(rows(this.db.renownLog).filter((l) => dm || !l.hidden));
    this.handlers.renownTiers?.(this.db.config.renown?.tiers || null);
    this.handlers.shops?.(rows(this.db.shops).filter((x) => dm || !x.hidden));
    this.handlers.purchases?.(rows(this.db.purchases));
    this.handlers.haggles?.(rows(this.db.haggles).filter((x) => dm || x.uid === this.uid));
    this.handlers.players?.(rows(this.db.players).filter((x) => dm || x.id === this.uid));
    this.handlers.loot?.(rows(this.db.loot));
    this.handlers.lootLog?.(rows(this.db.lootLog));
    this.handlers.partyCoins?.(this.db.party.coins);
    this.handlers.magicPublic?.(rows(this.db.magicPublic));
    if (dm) {
      this.handlers.lootTruth?.(rows(this.db.lootTruth));
      this.handlers.caches?.(rows(this.db.caches));
      this.handlers.magicItems?.(rows(this.db.magicItems));
    }
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
  // ── renown: one record per place/group ("page:<id>" / "group:<path>"), plus a change log
  async saveRenown(key, data) {
    const id = encodeURIComponent(key);
    this.db.renown[id] = { key, hidden: false, score: 0, ...this.db.renown[id], ...data };
    if ('hidden' in data) for (const l of Object.values(this.db.renownLog)) if (l.key === key) l.hidden = !!data.hidden;
    this.persist();
  }

  async deleteRenown(key) {
    delete this.db.renown[encodeURIComponent(key)];
    for (const [id, l] of Object.entries(this.db.renownLog)) if (l.key === key) delete this.db.renownLog[id];
    this.persist();
  }

  async logRenown(entry) { this.db.renownLog[rid()] = entry; this.persist(); }

  async moveRenown(oldKey, newKey) {
    const old = this.db.renown[encodeURIComponent(oldKey)];
    if (!old) return;
    delete this.db.renown[encodeURIComponent(oldKey)];
    this.db.renown[encodeURIComponent(newKey)] = { ...old, key: newKey };
    for (const l of Object.values(this.db.renownLog)) if (l.key === oldKey) l.key = newKey;
    this.persist();
  }

  async saveRenownTiers(tiers) { this.db.config.renown = { tiers }; this.persist(); }

  // ── shops and their purchase ledger
  async saveShop(data, id) {
    if (!id) { id = 'shop-' + rid(); this.db.shops[id] = { hidden: false, createdAt: Date.now() }; }
    Object.assign(this.db.shops[id], data);
    this.persist();
    return id;
  }

  async deleteShop(id) { delete this.db.shops[id]; this.persist(); }
  async addPurchase(p) { this.db.purchases[rid()] = { ...p, buyerUid: this.uid, at: Date.now(), settled: false }; this.persist(); }
  async updatePurchase(id, data) { Object.assign(this.db.purchases[id], data); this.persist(); }
  async deletePurchase(id) { delete this.db.purchases[id]; this.persist(); }

  // one haggle per player, per shop, per week (the id makes a second attempt impossible)
  async addHaggle(x) {
    const id = `${x.shopId}__${this.uid}__${x.week}`;
    if (this.db.haggles[id]) throw new Error('You already haggled here this week.');
    this.db.haggles[id] = { ...x, uid: this.uid, at: Date.now() };
    this.persist();
  }

  async deleteHaggle(id) { delete this.db.haggles[id]; this.persist(); }

  // ── loot: the party's stash, the hidden truth about unidentified items, caches, homebrew
  async saveLoot(data, id) {
    if (!id) { id = 'loot-' + rid(); this.db.loot[id] = { foundAt: Date.now() }; }
    Object.assign(this.db.loot[id], data);
    this.persist();
    return id;
  }

  async deleteLoot(id) { delete this.db.loot[id]; delete this.db.lootTruth[id]; this.persist(); }
  async saveLootTruth(id, data) { this.db.lootTruth[id] = data; this.persist(); }
  async addLootLog(text) { this.db.lootLog[rid()] = { text, at: Date.now() }; this.persist(); }
  async savePartyCoins(coins) { this.db.party.coins = coins; this.persist(); }

  async requestIdentify(id, data) {
    const item = this.db.loot[id];
    if (!item || item.status !== 'unidentified') throw new Error('That item isn\u2019t waiting to be identified.');
    Object.assign(item, { status: 'pending', ...data });
    this.persist();
  }

  async saveCache(data, id) {
    if (!id) id = 'cache-' + rid();
    this.db.caches[id] = { ...this.db.caches[id], ...data };
    this.persist();
    return id;
  }

  async deleteCache(id) { delete this.db.caches[id]; this.persist(); }

  async saveMagicItem(data, id) {
    if (!id) id = 'magic-' + rid();
    this.db.magicItems[id] = { ...this.db.magicItems[id], ...data };
    const m = this.db.magicItems[id];
    if (m.inShops) this.db.magicPublic[id] = { name: m.name, rarity: m.rarity, type: m.type || '', value: Number(m.value) || 0, detail: m.detail || '' };
    else delete this.db.magicPublic[id];
    this.persist();
    return id;
  }

  async deleteMagicItem(id) { delete this.db.magicItems[id]; delete this.db.magicPublic[id]; this.persist(); }

  // a player's own record (their Persuasion bonus); players set it once, the DM can change it
  async savePlayer(data, uid = this.uid) {
    if (this.db.players[uid] && !this.isDM) throw new Error('Only the DM can change that now.');
    this.db.players[uid] = { ...this.db.players[uid], ...data };
    this.persist();
  }

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
