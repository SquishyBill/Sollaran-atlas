// Firebase backend. Players are signed in anonymously (no account needed);
// the DM signs in with Google. Access control lives in firestore.rules.
import { firebaseConfig, DM_EMAILS, ENABLE_UPLOADS } from './config.js';

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
    const app = initializeApp(firebaseConfig);
    this.auth = A.getAuth(app);
    this.fs = F.getFirestore(app);
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
