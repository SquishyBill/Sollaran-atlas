// Backup and restore (DM): one file holding everything in the atlas, and a careful way to put things back.
//
// A restore never wipes anything. It compares the backup with the atlas as it is now and offers two lists: what is
// MISSING now (deleted by mistake) and what has CHANGED since (edited by mistake). You tick what you want back;
// only those items are written, and everything else is left exactly as it is.

// Every collection that makes up the atlas, in the order they are shown. (Live pings are not kept.)
export const SECTIONS = [
  { label: 'Pages and people', cols: ['pages', 'pins', 'pictures', 'people', 'secrets', 'renown', 'renownLog', 'journal', 'notes'] },
  { label: 'Shops and money', cols: ['shops', 'purchases', 'sales', 'haggles', 'accounts', 'players', 'magicItems', 'magicPublic'] },
  { label: 'Loot', cols: ['loot', 'lootLog', 'lootTruth', 'caches', 'party'] },
  { label: 'Backpacks', cols: ['backpacks', 'backpackLog', 'roster'] },
  { label: 'The calendar', cols: ['holidays', 'calendarLog', 'reminders'] },
  { label: 'Settings', cols: ['config'] },
];
export const COLLECTIONS = SECTIONS.flatMap((s) => s.cols);

export const LABELS = {
  pages: 'Pages', pins: 'Pins', pictures: 'Pictures', people: 'People', secrets: 'DM secrets', renown: 'Renown', renownLog: 'Renown history', journal: 'Journal entries',
  notes: 'Notes', shops: 'Shops', purchases: 'Purchases', sales: 'Sales', haggles: 'Haggles', accounts: 'Savings accounts', players: 'Persuasion bonuses',
  magicItems: 'My magic items', magicPublic: 'Magic items in shops', loot: 'Loot', lootLog: 'Loot history', lootTruth: 'What unidentified items really are', caches: 'Hidden caches',
  party: 'The party’s coins', backpacks: 'Backpacks', backpackLog: 'Backpack history', roster: 'The party’s names', holidays: 'Holidays', calendarLog: 'Calendar history',
  reminders: 'Reminders', config: 'Settings (calendar, festivals, scribes…)',
};

// Where a changed copy may be put back over the top of a newer one. Money, stock and history move all the time, so an
// old copy of those is only ever offered when the thing itself has been deleted.
export const OVERWRITABLE = ['pages', 'pins', 'pictures', 'people', 'secrets', 'renown', 'journal', 'shops', 'magicItems', 'magicPublic', 'holidays', 'reminders'];
// Put back by default when missing (the rest are history and transactions, offered but not ticked).
export const TICKED_WHEN_MISSING = COLLECTIONS.filter((c) => !['purchases', 'sales', 'haggles', 'backpackLog', 'calendarLog', 'lootLog', 'renownLog'].includes(c));

export const FORMAT = 'atlas-backup';
export const VERSION = 1;

// Key order must not matter when comparing two copies of a document.
export function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return JSON.stringify(v === undefined ? null : v);
}
export const same = (a, b) => stable(a) === stable(b);

export function makeBackup(data, meta = {}) {
  const out = {};
  for (const col of COLLECTIONS) out[col] = data?.[col] || {};
  return { format: FORMAT, version: VERSION, createdAt: meta.createdAt || Date.now(), project: meta.project || '', by: meta.by || '',
    counts: Object.fromEntries(COLLECTIONS.map((c) => [c, Object.keys(out[c]).length])), data: out };
}

// Is this a backup this atlas can read? Returns { ok: true, counts } or { ok: false, error }.
export function checkBackup(b) {
  if (!b || typeof b !== 'object' || b.format !== FORMAT) return { ok: false, error: 'That does not look like an atlas backup file.' };
  if (b.version !== VERSION) return { ok: false, error: `That backup is version ${b.version}, and this atlas reads version ${VERSION}.` };
  if (!b.data || typeof b.data !== 'object') return { ok: false, error: 'That backup file has no data in it.' };
  for (const col of Object.keys(b.data)) {
    if (!COLLECTIONS.includes(col)) return { ok: false, error: `That backup holds something this atlas does not know (${col}).` };
    const docs = b.data[col];
    if (!docs || typeof docs !== 'object' || Array.isArray(docs)) return { ok: false, error: `The ${col} part of that backup is damaged.` };
    for (const [id, d] of Object.entries(docs)) if (!d || typeof d !== 'object' || Array.isArray(d) || !id || id.includes('/')) return { ok: false, error: `An item in ${col} is damaged.` };
  }
  return { ok: true, counts: Object.fromEntries(COLLECTIONS.map((c) => [c, Object.keys(b.data[c] || {}).length])) };
}

// What a document is called, for the list.
export function labelOf(col, id, d) {
  const name = d?.title || d?.name || d?.itemName || d?.owner || d?.text || d?.label || '';
  return String(name).replace(/\s+/g, ' ').trim().slice(0, 70) || id;
}

// Compare a backup with the atlas as it is now.
//   missing: in the backup, not in the atlas now.
//   changed: in both, different (only for the collections where an old copy may be put back).
export function planRestore(backup, current) {
  const missing = [], changed = [];
  for (const col of COLLECTIONS) {
    const old = backup.data?.[col] || {}, now = current?.[col] || {};
    for (const [id, data] of Object.entries(old)) {
      if (!(id in now)) missing.push({ col, id, data, label: labelOf(col, id, data) });
      else if (OVERWRITABLE.includes(col) && !same(data, now[id])) changed.push({ col, id, data, label: labelOf(col, id, data), now: labelOf(col, id, now[id]) });
    }
  }
  return { missing, changed };
}

export const chunk = (list, n = 400) => { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; };

export const backupFileName = (when = new Date(), tag = 'backup') => `atlas-${tag}-${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}-${String(when.getHours()).padStart(2, '0')}${String(when.getMinutes()).padStart(2, '0')}.json`;
