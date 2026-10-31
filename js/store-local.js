// Demo backend: everything lives in this browser's localStorage.
// Mirrors FirebaseStore's interface and visibility rules so the app code is identical.
import { SEED } from './seed.js';
import { cpOf, normalizeCoins, ledgerLine } from './backpack-data.js';

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
    this.db.sales ||= {};
    this.db.accounts ||= {};
    this.db.journal ||= {};
    this.db.haggles ||= {};
    this.db.players ||= {};
    for (const k of ['loot', 'lootTruth', 'lootLog', 'caches', 'magicItems', 'magicPublic', 'backpacks', 'backpackLog', 'holidays', 'calendarLog', 'roster']) this.db[k] ||= {};
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
    this.handlers.festivals?.(this.db.config.festivals || {});
    this.handlers.calendar?.(this.db.config.calendar || null);
    this.handlers.holidays?.(rows(this.db.holidays).filter((x) => dm || !x.hidden));
    if (dm) this.handlers.calendarLog?.(rows(this.db.calendarLog));
    this.handlers.shops?.(rows(this.db.shops).filter((x) => dm || !x.hidden));
    this.handlers.purchases?.(rows(this.db.purchases));
    this.handlers.sales?.(rows(this.db.sales));
    this.handlers.accounts?.(rows(this.db.accounts).filter((x) => dm || x.uid === this.uid));
    this.handlers.scribes?.(this.db.config.scribes?.emails || []);
    this.handlers.journal?.(rows(this.db.journal).filter((x) => dm || !x.draft));
    this.handlers.haggles?.(rows(this.db.haggles).filter((x) => dm || x.uid === this.uid));
    this.handlers.players?.(rows(this.db.players).filter((x) => dm || x.id === this.uid));
    this.handlers.backpacks?.(rows(this.db.backpacks).filter((x) => dm || x.id === this.uid));
    this.handlers.backpackLog?.(rows(this.db.backpackLog).filter((x) => dm || x.uid === this.uid));
    this.handlers.backpackCfg?.(this.db.config.backpack || {});
    this.handlers.roster?.(rows(this.db.roster));
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
  async saveFestivals(f) { this.db.config.festivals = f; this.persist(); }

  // ── the calendar (see FirebaseStore: the same calls, kept in this browser)
  async saveCalendar(data) { this.db.config.calendar = { ...this.db.config.calendar, ...data, updatedAt: Date.now() }; this.persist(); }
  async saveHoliday(data, id) {
    if (!id) { id = 'hol-' + rid(); this.db.holidays[id] = { createdAt: Date.now() }; }
    this.db.holidays[id] = { ...(this.db.holidays[id] || {}), ...data };
    this.persist();
    return id;
  }
  async deleteHoliday(id) { delete this.db.holidays[id]; this.persist(); }
  async addCalendarLog(x) { const id = 'cl-' + rid(); this.db.calendarLog[id] = { ...x, at: Date.now(), by: 'The DM' }; this.persist(); return id; }
  async updateCalendarLog(id, data) { Object.assign(this.db.calendarLog[id] || {}, data); this.persist(); }

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
  async addSale(x) { this.db.sales[rid()] = { ...x, buyerUid: this.uid, at: Date.now(), settled: false }; this.persist(); }
  async updateSale(id, data) { Object.assign(this.db.sales[id], data); this.persist(); }
  async deleteSale(id) { delete this.db.sales[id]; this.persist(); }
  async saveAccount(id, data) { this.db.accounts[id] = { ...data }; this.persist(); }
  async deleteAccount(id) { delete this.db.accounts[id]; this.persist(); }
  async saveJournal(data, id) {
    if (!id) { id = 'j-' + rid(); this.db.journal[id] = { createdAt: Date.now() }; }
    Object.assign(this.db.journal[id], data); this.persist(); return id;
  }
  async deleteJournal(id) { delete this.db.journal[id]; this.persist(); }
  async saveScribes(emails) { this.db.config.scribes = { emails }; this.persist(); }

  // one haggle per player, per shop, per week (the id makes a second attempt impossible)
  async addHaggle(x) {
    const id = `${x.shopId}__${this.uid}__${x.week}`;
    if (this.db.haggles[id]) throw new Error('You already haggled here this week.');
    this.db.haggles[id] = { ...x, uid: this.uid, at: Date.now() };
    this.persist();
  }

  async deleteHaggle(id) { delete this.db.haggles[id]; this.persist(); }

  // ── backpacks (see FirebaseStore: the same calls, kept in this browser)
  async ensureBackpack(owner) {
    if (this.isDM) return;
    const name = String(owner || '').trim().slice(0, 60), b = this.db.backpacks[this.uid];
    let changed = false;
    if (!b) { this.db.backpacks[this.uid] = { uid: this.uid, owner: name, coins: normalizeCoins({}), updatedAt: Date.now() }; changed = true; }
    else if (name && b.owner !== name) { b.owner = name; changed = true; }
    if (name && this.db.roster[this.uid]?.name !== name) { this.db.roster[this.uid] = { uid: this.uid, name }; changed = true; }
    if (changed) this.persist();
  }
  async deleteBackpack(uid) { delete this.db.backpacks[uid]; this.persist(); }
  async saveBackpackConfig(data) { this.db.config.backpack = { ...this.db.config.backpack, ...data }; this.persist(); }

  async transact(fn) {
    const writes = [], purses = new Map();
    const t = {
      uid: this.uid,
      newId: () => rid(),
      read: async (col, id) => (this.db[col]?.[id] ? { id, ...this.db[col][id] } : null),
      purse: async (uid = this.uid, owner = '') => {
        if (!purses.has(uid)) { const b = this.db.backpacks[uid]; purses.set(uid, { uid, owner: b?.owner || owner, coins: normalizeCoins(b?.coins), gamble: b?.gamble || {}, exists: !!b }); }
        return purses.get(uid);
      },
      giftCoins: (toUid, toOwner, coins, info = {}) => {
        const give = normalizeCoins(coins), logId = rid(), b = this.db.backpacks[toUid];
        if (!b) throw new Error('No document to update');
        writes.push(['set', 'backpackLog', logId, ledgerLine({ uid: toUid, owner: toOwner, kind: 'gift', deltaCp: cpOf(give), balanceCp: 0, text: info.text, ref: this.uid })]);
        writes.push(['set', 'backpacks', toUid, { coins: Object.fromEntries(['pp', 'gp', 'sp', 'cp'].map((k) => [k, (b.coins?.[k] || 0) + give[k]])), lastLog: logId, updatedAt: Date.now() }, true]);
        return logId;
      },
      setCoins: (purse, coins, info = {}) => {
        const next = normalizeCoins(coins), logId = rid(), owner = info.owner || purse.owner || '';
        const line = ledgerLine({ uid: purse.uid, owner, kind: info.kind, deltaCp: cpOf(next) - cpOf(purse.coins), balanceCp: cpOf(next), text: info.text, ref: info.ref });
        writes.push(['set', 'backpackLog', logId, line]);
        const gamble = info.gamble || purse.gamble;
        writes.push(['set', 'backpacks', purse.uid, { uid: purse.uid, owner: String(owner).slice(0, 60), coins: next, lastLog: logId, updatedAt: line.at, ...(gamble && Object.keys(gamble).length ? { gamble } : {}) }]);
        purse.coins = next; purse.owner = owner; purse.gamble = gamble;
        return logId;
      },
      set: (col, id, data, merge = false) => { writes.push(['set', col, id, data, merge]); return id; },
      add: (col, data) => { const id = rid(); writes.push(['set', col, id, data]); return id; },
      update: (col, id, data) => { writes.push(['set', col, id, data, true]); },
      del: (col, id) => { writes.push(['delete', col, id]); },
    };
    const result = await fn(t);
    for (const [op, col, id, data, merge] of writes) {
      if (op === 'delete') delete this.db[col][id];
      else this.db[col][id] = merge ? { ...this.db[col][id], ...data } : data;
    }
    this.persist();
    return result;
  }

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
    if (this.db.players[uid] && !this.isDM) return this.db.players[uid];
    this.db.players[uid] = { ...this.db.players[uid], ...data };
    this.persist();
    return this.db.players[uid];
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
