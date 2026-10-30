// Firebase backend. Players are signed in anonymously (no account needed);
// the DM signs in with Google. Access control lives in firestore.rules.
import { firebaseConfig, DM_EMAILS, ENABLE_UPLOADS } from './config.js';
import { cpOf, normalizeCoins, ledgerLine } from './backpack-data.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

export class FirebaseStore {
  mode = 'firebase';

  async init() {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    this.A = A;
    this.F = F;
    // Tests open the page on localhost with ?emulators, which points it at the Firebase emulators under a demo
    // project, so it can never touch the real data.
    const emulated = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('emulators');
    const app = initializeApp(emulated ? { ...firebaseConfig, projectId: 'demo-atlas' } : firebaseConfig);
    this.auth = A.getAuth(app);
    this.fs = F.getFirestore(app);
    if (emulated) {
      A.connectAuthEmulator(this.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      F.connectFirestoreEmulator(this.fs, '127.0.0.1', 8080);
    }
    this.canUpload = ENABLE_UPLOADS;
    if (ENABLE_UPLOADS) {
      this.S = await import(`${SDK}/firebase-storage.js`);
      this.storage = this.S.getStorage(app);
    }

    const existing = await new Promise((resolve) => {
      const off = A.onAuthStateChanged(this.auth, (u) => { off(); resolve(u); });
    });
    // Everyone signs in with Google; the app shows a sign-in screen until they do.
    this.needsSignIn = !existing || existing.isAnonymous;
    if (this.needsSignIn) return;
    this.user = existing;
    this.uid = existing.uid;
    this.signedIn = true;
    this.email = (existing.email || '').toLowerCase();
    this.displayName = existing.displayName || '';
    this.isDM = DM_EMAILS.some((e) => e.toLowerCase() === this.email);
  }

  col(name) { return this.F.collection(this.fs, name); }
  ref(name, id) { return this.F.doc(this.fs, name, id); }

  subscribe(h) {
    const { query, where, onSnapshot } = this.F;
    const list = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const err = (e) => h.error?.(e);

    onSnapshot(this.isDM ? this.col('pages') : query(this.col('pages'), where('hidden', '==', false)),
      (s) => h.pages(list(s)), err);
    onSnapshot(this.isDM ? this.col('pins')
      : query(this.col('pins'), where('hidden', '==', false), where('pageHidden', '==', false)),
      (s) => h.pins(list(s)), err);

    // Shared notes + my own (which includes my private ones). Rules forbid reading others' private notes.
    let shared = [], mine = [];
    const merge = () => h.notes([...new Map([...shared, ...mine].map((n) => [n.id, n])).values()]);
    onSnapshot(query(this.col('notes'), where('private', '==', false)), (s) => { shared = list(s); merge(); }, err);
    onSnapshot(query(this.col('notes'), where('uid', '==', this.uid)), (s) => { mine = list(s); merge(); }, err);

    // Renown: standings per place/group, their change log, and the tier definitions.
    onSnapshot(this.isDM ? this.col('renown') : query(this.col('renown'), where('hidden', '==', false)),
      (s) => h.renown?.(list(s)), err);
    onSnapshot(this.isDM ? this.col('renownLog') : query(this.col('renownLog'), where('hidden', '==', false)),
      (s) => h.renownLog?.(list(s)), err);
    onSnapshot(this.ref('config', 'renown'), (s) => h.renownTiers?.(s.exists() ? s.data().tiers : null), err);
    onSnapshot(this.ref('config', 'festivals'), (s) => h.festivals?.(s.exists() ? s.data() : {}), err);

    // Shops (hidden ones are the DM's) and every purchase made in them.
    onSnapshot(this.isDM ? this.col('shops') : query(this.col('shops'), where('hidden', '==', false)),
      (s) => h.shops?.(list(s)), err);
    onSnapshot(this.col('purchases'), (s) => h.purchases?.(list(s)), err);
    onSnapshot(this.col('sales'), (s) => h.sales?.(list(s)), err);
    // The session journal. Who may write is a list of emails the DM keeps (config/scribes). Scribes and the DM
    // get every entry, drafts included; everyone else gets published entries only. The listener is
    // re-made when the list shows you are (or are no longer) a scribe.
    onSnapshot(this.ref('config', 'scribes'), (s) => {
      const emails = s.exists() ? (s.data().emails || []) : [];
      h.scribes?.(emails);
      const mayWrite = this.isDM || emails.includes(String(this.email || '').toLowerCase());
      if (this._journalUnsub && this._journalMayWrite === mayWrite) return;
      this._journalUnsub?.();
      this._journalMayWrite = mayWrite;
      const src = mayWrite ? this.col('journal') : query(this.col('journal'), where('draft', '==', false));
      this._journalUnsub = onSnapshot(src, (snap) => h.journal?.(list(snap)), err);
    }, err);
    // G.E.C. savings accounts and deposit boxes: yours alone (the DM sees everyone's)
    onSnapshot(this.isDM ? this.col('accounts') : query(this.col('accounts'), where('uid', '==', this.uid)), (s) => h.accounts?.(list(s)), err);
    onSnapshot(this.isDM ? this.col('haggles') : query(this.col('haggles'), where('uid', '==', this.uid)),
      (s) => h.haggles?.(list(s)), err);
    // Backpacks: your own coins (the DM sees everyone's) and the ledger of every move of them.
    if (this.isDM) onSnapshot(this.col('backpacks'), (s) => h.backpacks?.(list(s)), err);
    else onSnapshot(this.ref('backpacks', this.uid), (s) => h.backpacks?.(s.exists() ? [{ id: s.id, ...s.data() }] : []), err);
    onSnapshot(this.isDM ? this.col('backpackLog') : query(this.col('backpackLog'), where('uid', '==', this.uid)), (s) => h.backpackLog?.(list(s)), err);
    // The DM's switches for backpacks: { on } (players pay and are paid through them) and { home } (the party is at Silvermere).
    onSnapshot(this.ref('config', 'backpack'), (s) => h.backpackCfg?.(s.exists() ? s.data() : {}), err);
    // Loot: the party's stash, its history and coins (everyone), plus homebrew items allowed in shops.
    // The truth about unidentified items, hidden caches and the homebrew library are the DM's alone.
    onSnapshot(this.col('loot'), (s) => h.loot?.(list(s)), err);
    onSnapshot(this.col('lootLog'), (s) => h.lootLog?.(list(s)), err);
    onSnapshot(this.ref('party', 'coins'), (s) => h.partyCoins?.(s.exists() ? s.data() : { cp: 0, sp: 0, gp: 0, pp: 0 }), err);
    onSnapshot(this.col('magicPublic'), (s) => h.magicPublic?.(list(s)), err);
    if (this.isDM) {
      onSnapshot(this.col('lootTruth'), (s) => h.lootTruth?.(list(s)), err);
      onSnapshot(this.col('caches'), (s) => h.caches?.(list(s)), err);
      onSnapshot(this.col('magicItems'), (s) => h.magicItems?.(list(s)), err);
    }

    // players' Persuasion bonuses: the DM sees everyone's, a player only their own
    if (this.isDM) onSnapshot(this.col('players'), (s) => h.players?.(list(s)), err);
    else onSnapshot(this.ref('players', this.uid), (s) => h.players?.(s.exists() ? [{ id: s.id, ...s.data() }] : []), err);

    onSnapshot(this.isDM ? this.col('people') : query(this.col('people'), where('hidden', '==', false)),
      (s) => h.people?.(list(s)), err);

    // DM-only secrets live in their own collection; rules refuse it to everyone else.
    if (this.isDM) onSnapshot(this.col('secrets'), (s) => h.secrets(list(s)), err);

    onSnapshot(this.ref('live', 'ping'), (s) => { if (s.exists()) h.ping(s.data()); }, err);
  }

  // One-time import of js/seed.js into an empty Firestore (keeps the same ids so links work).
  async importSeed(seed) {
    const { writeBatch } = this.F;
    const writes = [
      ...Object.entries(seed.pages).map(([id, d]) => ['pages', id, d]),
      ...Object.entries(seed.pins).map(([id, d]) => ['pins', id, d]),
      ...Object.entries(seed.secrets || {}).map(([id, d]) => ['secrets', id, d]),
      ...Object.entries(seed.people || {}).map(([id, d]) => ['people', id, d]),
    ];
    for (let i = 0; i < writes.length; i += 400) {
      const batch = writeBatch(this.fs);
      for (const [col, id, d] of writes.slice(i, i + 400)) batch.set(this.ref(col, id), d);
      await batch.commit();
    }
  }

  async signIn() {
    await this.A.signInWithPopup(this.auth, new this.A.GoogleAuthProvider());
    location.reload();
  }

  async signOut() { await this.A.signOut(this.auth); location.reload(); }

  async savePage(data, id) {
    const { addDoc, setDoc, getDocs, query, where, writeBatch } = this.F;
    if (!id) return (await addDoc(this.col('pages'), { hidden: false, createdAt: Date.now(), ...data })).id;
    await setDoc(this.ref('pages', id), data, { merge: true });
    if ('hidden' in data) {
      // Pins carry their page's visibility so rules can hide them from players too.
      const snap = await getDocs(query(this.col('pins'), where('pageId', '==', id)));
      const batch = writeBatch(this.fs);
      snap.forEach((d) => batch.update(d.ref, { pageHidden: !!data.hidden }));
      await batch.commit();
    }
    return id;
  }

  async deletePage(id) {
    const { getDocs, query, where, writeBatch } = this.F;
    const snap = await getDocs(query(this.col('pins'), where('pageId', '==', id)));
    const batch = writeBatch(this.fs);
    snap.forEach((d) => batch.delete(d.ref));
    batch.delete(this.ref('pages', id));
    await batch.commit();
  }

  async savePin(data, id) {
    const { addDoc, setDoc } = this.F;
    if (!id) {
      return (await addDoc(this.col('pins'), { hidden: false, pageHidden: false, createdAt: Date.now(), ...data })).id;
    }
    await setDoc(this.ref('pins', id), data, { merge: true });
    return id;
  }

  saveSecret(id, text) {
    return text.trim() ? this.F.setDoc(this.ref('secrets', id), { text }) : this.F.deleteDoc(this.ref('secrets', id));
  }

  deletePin(id) { return this.F.deleteDoc(this.ref('pins', id)); }

  async savePerson(data, id) {
    const { addDoc, setDoc } = this.F;
    if (!id) return (await addDoc(this.col('people'), { hidden: false, createdAt: Date.now(), ...data })).id;
    await setDoc(this.ref('people', id), data, { merge: true });
    return id;
  }

  // Pictures for pins and pages live in their own collection and are fetched only when
  // someone opens that pin or page, so a picture-heavy atlas still loads fast.
  // ── renown ("page:<id>" / "group:<path>" keys; the record id is the encoded key)
  async logsFor(key) {
    const { getDocs, query, where } = this.F;
    return getDocs(query(this.col('renownLog'), where('key', '==', key)));
  }

  async saveRenown(key, data) {
    const { getDoc, setDoc, writeBatch } = this.F;
    const ref = this.ref('renown', encodeURIComponent(key));
    const exists = (await getDoc(ref)).exists();
    await setDoc(ref, { key, ...(exists ? {} : { hidden: false, score: 0 }), ...data }, { merge: true });
    if ('hidden' in data) {
      // log entries follow their standing's visibility
      const batch = writeBatch(this.fs);
      (await this.logsFor(key)).forEach((d) => batch.update(d.ref, { hidden: !!data.hidden }));
      await batch.commit();
    }
  }

  async deleteRenown(key) {
    const batch = this.F.writeBatch(this.fs);
    (await this.logsFor(key)).forEach((d) => batch.delete(d.ref));
    batch.delete(this.ref('renown', encodeURIComponent(key)));
    await batch.commit();
  }

  logRenown(entry) { return this.F.addDoc(this.col('renownLog'), entry); }

  async moveRenown(oldKey, newKey) {
    const { getDoc, writeBatch } = this.F;
    const oldRef = this.ref('renown', encodeURIComponent(oldKey));
    const snap = await getDoc(oldRef);
    if (!snap.exists()) return;
    const batch = writeBatch(this.fs);
    batch.set(this.ref('renown', encodeURIComponent(newKey)), { ...snap.data(), key: newKey });
    batch.delete(oldRef);
    (await this.logsFor(oldKey)).forEach((d) => batch.update(d.ref, { key: newKey }));
    await batch.commit();
  }

  saveRenownTiers(tiers) { return this.F.setDoc(this.ref('config', 'renown'), { tiers }); }
  // which festivals are on (everyone reads it; only the DM can change it)
  saveFestivals(f) { return this.F.setDoc(this.ref('config', 'festivals'), f); }

  // ── shops and their purchase ledger
  async saveShop(data, id) {
    const { addDoc, setDoc } = this.F;
    if (!id) return (await addDoc(this.col('shops'), { hidden: false, createdAt: Date.now(), ...data })).id;
    await setDoc(this.ref('shops', id), data, { merge: true });
    return id;
  }

  deleteShop(id) { return this.F.deleteDoc(this.ref('shops', id)); }
  addPurchase(p) { return this.F.addDoc(this.col('purchases'), { ...p, buyerUid: this.uid, at: Date.now(), settled: false }); }
  updatePurchase(id, data) { return this.F.updateDoc(this.ref('purchases', id), data); }
  deletePurchase(id) { return this.F.deleteDoc(this.ref('purchases', id)); }
  // sales: a player selling the party's trade goods to a shop; the DM settles up like a purchase
  addSale(x) { return this.F.addDoc(this.col('sales'), { ...x, buyerUid: this.uid, at: Date.now(), settled: false }); }
  updateSale(id, data) { return this.F.updateDoc(this.ref('sales', id), data); }
  deleteSale(id) { return this.F.deleteDoc(this.ref('sales', id)); }
  // journal entries: { n, date, title, body, draft, author, createdAt, editedAt }
  async saveJournal(data, id) {
    if (!id) return (await this.F.addDoc(this.col('journal'), { createdAt: Date.now(), ...data })).id;
    await this.F.setDoc(this.ref('journal', id), data, { merge: true });
    return id;
  }
  deleteJournal(id) { return this.F.deleteDoc(this.ref('journal', id)); }
  saveScribes(emails) { return this.F.setDoc(this.ref('config', 'scribes'), { emails }); }
  saveAccount(id, data) { return this.F.setDoc(this.ref('accounts', id), data); }
  deleteAccount(id) { return this.F.deleteDoc(this.ref('accounts', id)); }

  // ── backpacks ───────────────────────────────────────────────────
  // Every player has one backpack document (their coins; the rules let only them and the DM see it). It is
  // made when they first open the atlas, so the DM can see who is in the party.
  async ensureBackpack(owner) {
    if (this.isDM) return;
    const { getDoc, setDoc, updateDoc } = this.F;
    const ref = this.ref('backpacks', this.uid), name = String(owner || '').trim().slice(0, 60);
    const snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, { uid: this.uid, owner: name, coins: normalizeCoins({}), updatedAt: Date.now() });
    else if (name && snap.data().owner !== name) await updateDoc(ref, { owner: name, updatedAt: Date.now() });
  }
  deleteBackpack(uid) { return this.F.deleteDoc(this.ref('backpacks', uid)); }
  saveBackpackConfig(data) { return this.F.setDoc(this.ref('config', 'backpack'), data, { merge: true }); }

  // Several changes as one all-or-nothing step, so a purchase can never take the coins and lose the item (or
  // the other way round). fn(t) gets:
  //   t.purse(uid?, owner?)   a backpack: { uid, owner, coins, exists } (all reads happen first)
  //   t.setCoins(purse, coins, { kind, text, ref, owner? })   change the coins AND write the ledger line the
  //                           rules require; returns the ledger line's id
  //   t.read(col, id)         one document, or null
  //   t.newId(col)            an id for a document you are about to write
  //   t.set(col, id, data, merge?) / t.add(col, data) / t.update(col, id, data) / t.del(col, id)
  async transact(fn) {
    const { runTransaction, doc } = this.F;
    return runTransaction(this.fs, async (tx) => {
      const writes = [], purses = new Map();
      const t = {
        uid: this.uid,
        newId: (col) => doc(this.col(col)).id,
        read: async (col, id) => { const s = await tx.get(this.ref(col, id)); return s.exists() ? { id: s.id, ...s.data() } : null; },
        purse: async (uid = this.uid, owner = '') => {
          if (!purses.has(uid)) {
            const s = await tx.get(this.ref('backpacks', uid));
            purses.set(uid, { uid, owner: s.data()?.owner || owner, coins: normalizeCoins(s.data()?.coins), gamble: s.data()?.gamble || {}, exists: s.exists() });
          }
          return purses.get(uid);
        },
        setCoins: (purse, coins, info = {}) => {
          const next = normalizeCoins(coins), logId = doc(this.col('backpackLog')).id, owner = info.owner || purse.owner || '';
          const line = ledgerLine({ uid: purse.uid, owner, kind: info.kind, deltaCp: cpOf(next) - cpOf(purse.coins), balanceCp: cpOf(next), text: info.text, ref: info.ref });
          writes.push(['set', this.ref('backpackLog', logId), line]);
          const gamble = info.gamble || purse.gamble;     // what has been won or lost at each gaming house today
          writes.push(['set', this.ref('backpacks', purse.uid), { uid: purse.uid, owner: String(owner).slice(0, 60), coins: next, lastLog: logId, updatedAt: line.at, ...(gamble && Object.keys(gamble).length ? { gamble } : {}) }]);
          purse.coins = next; purse.owner = owner; purse.gamble = gamble;
          return logId;
        },
        set: (col, id, data, merge = false) => { writes.push(['set', this.ref(col, id), data, merge]); return id; },
        add: (col, data) => { const id = doc(this.col(col)).id; writes.push(['set', this.ref(col, id), data]); return id; },
        update: (col, id, data) => { writes.push(['update', this.ref(col, id), data]); },
        del: (col, id) => { writes.push(['delete', this.ref(col, id)]); },
      };
      const result = await fn(t);
      for (const [op, ref, data, merge] of writes) {
        if (op === 'set') merge ? tx.set(ref, data, { merge: true }) : tx.set(ref, data);
        else if (op === 'update') tx.update(ref, data);
        else tx.delete(ref);
      }
      return result;
    });
  }

  // one haggle per player, per shop, per week: the fixed id means the rules refuse a second one
  async addHaggle(x) {
    const ref = this.ref('haggles', `${x.shopId}__${this.uid}__${x.week}`);
    if ((await this.F.getDoc(ref)).exists()) throw new Error('You already haggled here this week.');
    await this.F.setDoc(ref, { ...x, uid: this.uid, at: Date.now() });
  }

  deleteHaggle(id) { return this.F.deleteDoc(this.ref('haggles', id)); }

  // ── loot
  async saveLoot(data, id) {
    const { addDoc, setDoc } = this.F;
    if (!id) return (await addDoc(this.col('loot'), { foundAt: Date.now(), ...data })).id;
    await setDoc(this.ref('loot', id), data, { merge: true });
    return id;
  }

  async deleteLoot(id) {
    await this.F.deleteDoc(this.ref('loot', id));
    await this.F.deleteDoc(this.ref('lootTruth', id)).catch(() => {});
  }

  saveLootTruth(id, data) { return this.F.setDoc(this.ref('lootTruth', id), data); }
  addLootLog(text) { return this.F.addDoc(this.col('lootLog'), { text, at: Date.now() }); }
  savePartyCoins(coins) { return this.F.setDoc(this.ref('party', 'coins'), coins); }
  // a player may only move an unidentified item to "being studied" (see firestore.rules)
  requestIdentify(id, data) { return this.F.updateDoc(this.ref('loot', id), { status: 'pending', ...data }); }

  async saveCache(data, id) {
    const { addDoc, setDoc } = this.F;
    if (!id) return (await addDoc(this.col('caches'), data)).id;
    await setDoc(this.ref('caches', id), data, { merge: true });
    return id;
  }

  deleteCache(id) { return this.F.deleteDoc(this.ref('caches', id)); }

  async saveMagicItem(data, id) {
    const { addDoc, setDoc, deleteDoc } = this.F;
    if (!id) id = (await addDoc(this.col('magicItems'), data)).id;
    else await setDoc(this.ref('magicItems', id), data, { merge: true });
    // items allowed in shops get a public copy (name, rarity, price) so players' stock matches yours
    if (data.inShops) await setDoc(this.ref('magicPublic', id), { name: data.name, rarity: data.rarity, type: data.type || '', value: Number(data.value) || 0, detail: data.detail || '' });
    else await deleteDoc(this.ref('magicPublic', id)).catch(() => {});
    return id;
  }

  async deleteMagicItem(id) {
    await this.F.deleteDoc(this.ref('magicItems', id));
    await this.F.deleteDoc(this.ref('magicPublic', id)).catch(() => {});
  }

  // a player's own record (their Persuasion bonus); players create it once, the DM can change it
  async savePlayer(data, uid = this.uid) {
    if (!this.isDM) {
      // already on record (e.g. the page hadn't caught up yet): use that rather than overwrite it
      const snap = await this.F.getDoc(this.ref('players', uid));
      if (snap.exists()) return snap.data();
    }
    await this.F.setDoc(this.ref('players', uid), data, { merge: this.isDM });
    return data;
  }

  async getPicture(id) {
    try {
      const snap = await this.F.getDoc(this.ref('pictures', id));
      return snap.exists() ? snap.data().data : null;
    } catch {
      return null; // e.g. the pin is hidden from this player
    }
  }

  savePicture(id, kind, data) {
    return data ? this.F.setDoc(this.ref('pictures', id), { kind, data }) : this.F.deleteDoc(this.ref('pictures', id));
  }

  async deletePerson(id) {
    await this.F.deleteDoc(this.ref('people', id));
    await this.F.deleteDoc(this.ref('secrets', id)).catch(() => {});
  }

  addNote(note) {
    return this.F.addDoc(this.col('notes'), { ...note, uid: this.uid, createdAt: Date.now() });
  }

  updateNote(id, text) { return this.F.updateDoc(this.ref('notes', id), { text, editedAt: Date.now() }); }
  deleteNote(id) { return this.F.deleteDoc(this.ref('notes', id)); }

  sendPing(p) { return this.F.setDoc(this.ref('live', 'ping'), { ...p, uid: this.uid, at: Date.now() }); }

  async uploadImage(file) {
    if (!this.storage) throw new Error('Uploads are turned off (ENABLE_UPLOADS in js/config.js).');
    const { ref, uploadBytes, getDownloadURL } = this.S;
    const safe = file.name.replace(/[^\w.-]+/g, '-').slice(-80);
    const r = ref(this.storage, `maps/${Date.now()}-${safe}`);
    await uploadBytes(r, file, { contentType: file.type });
    return getDownloadURL(r);
  }
}
