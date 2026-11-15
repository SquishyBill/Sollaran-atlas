// The combat tracker (DM): who is in the fight, in what order, and whose turn it is.
// Everything here is plain data in and plain data out, so it can be tested without a page.
//
// A fight is { round, started, turn, groups, combatants }.
//   combatant: { id, kind: 'enemy' | 'player', name, color, ac, hp, max, mod, init, group, attacks, text }
//   group:     { id, name, color, init, mod }   (one initiative for everyone in it)
// A "slot" is one place in the turn order: a group (all together) or a combatant on their own.

export const COLORS = [
  { id: 'red', name: 'Red', hex: '#b5372b' }, { id: 'orange', name: 'Orange', hex: '#c8691f' }, { id: 'gold', name: 'Gold', hex: '#b8932b' },
  { id: 'green', name: 'Green', hex: '#4f7a35' }, { id: 'teal', name: 'Teal', hex: '#2f7a76' }, { id: 'blue', name: 'Blue', hex: '#3a62a8' },
  { id: 'purple', name: 'Purple', hex: '#7a4a9a' }, { id: 'pink', name: 'Pink', hex: '#b24a7a' }, { id: 'brown', name: 'Brown', hex: '#7a5230' },
  { id: 'grey', name: 'Grey', hex: '#6b6b6b' },
];
export const colorId = (c) => (COLORS.some((x) => x.id === c) ? c : 'grey');
export const colorHex = (c) => (COLORS.find((x) => x.id === c) || COLORS[COLORS.length - 1]).hex;
// A different colour for each new group, in turn.
export const nextColor = (used = []) => (COLORS.find((c) => !used.includes(c.id)) || COLORS[used.length % COLORS.length]).id;

const rid = () => Math.random().toString(36).slice(2, 9);
export const modText = (n) => (n == null ? '' : n < 0 ? `−${-n}` : `+${n}`);
export const d20 = (rng = Math.random) => 1 + Math.floor(rng() * 20);

const int = (v) => { const n = Math.floor(Number(String(v ?? '').replace(/−/g, '-'))); return String(v ?? '').trim() === '' || !Number.isFinite(n) ? null : n; };
const text = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);

export const newCombat = () => ({ round: 0, started: false, turn: null, groups: [], combatants: [] });

// Whatever came out of the database, made safe to use.
export function normalizeCombat(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const combatants = (Array.isArray(c.combatants) ? c.combatants : []).filter((x) => x && x.id && x.name).map((x) => ({
    id: String(x.id), kind: x.kind === 'player' ? 'player' : 'enemy', name: text(x.name, 80), color: colorId(x.color),
    ac: int(x.ac), hp: int(x.hp), max: int(x.max), mod: int(x.mod) ?? 0, init: int(x.init), group: x.group ? String(x.group) : null,
    attacks: text(x.attacks, 4000), text: text(x.text, 8000), ref: x.ref ? String(x.ref) : '',
  }));
  const ids = new Set();
  const groups = (Array.isArray(c.groups) ? c.groups : []).filter((g) => g && g.id && !ids.has(g.id) && ids.add(g.id)).map((g) => ({
    id: String(g.id), name: text(g.name, 60) || 'Group', color: colorId(g.color), init: int(g.init), mod: int(g.mod) ?? 0 }));
  for (const x of combatants) if (x.group && !ids.has(x.group)) x.group = null;
  return { round: Math.max(0, int(c.round) ?? 0), started: !!c.started, turn: typeof c.turn === 'string' ? c.turn : null, groups, combatants };
}

// An enemy typed in (or pasted in) for the library, tidied, or { error }.
export function enemyFrom(input) {
  const name = text(input?.name, 80);
  if (!name) return { error: 'Give the enemy a name.' };
  const ac = int(input.ac), hp = int(input.hp), mod = int(input.mod);
  if (ac != null && (ac < 0 || ac > 40)) return { error: 'Armor Class should be between 0 and 40.' };
  if (hp != null && (hp < 1 || hp > 9999)) return { error: 'Hit points should be between 1 and 9999.' };
  if (mod != null && (mod < -10 || mod > 30)) return { error: 'The initiative bonus should be between -10 and +30.' };
  return { name, ac, hp, mod: mod ?? 0, color: colorId(input.color), attacks: text(input.attacks, 4000), text: text(input.text, 8000) };
}

// Read the numbers out of a pasted stat block. Anything it cannot find is left out, and the pasted text is kept as the notes.
export function parseStatBlock(raw) {
  const t = String(raw || '').replace(/\r/g, '').replace(/[−–]/g, '-');
  const out = {};
  const lines = t.split('\n').map((l) => l.trim());
  const first = lines.find((l) => l);
  if (first && first.length <= 60 && !/^(armor class|ac\b|hit points|hp\b|speed|size|str\b)/i.test(first) && !/\d{2,}/.test(first)) out.name = first.replace(/[:.]+$/, '');
  const ac = t.match(/\b(?:armor class|ac)\b[:\s]*(\d{1,2})\b/i); if (ac) out.ac = Number(ac[1]);
  const hp = t.match(/\b(?:hit points|hp)\b[:\s]*(\d{1,4})\b/i); if (hp) out.hp = Number(hp[1]);
  const ini = t.match(/\binitiative\b[:\s]*([+-]\s?\d+)/i);
  if (ini) out.mod = Number(ini[1].replace(/\s/g, ''));
  else {
    let dex = t.match(/\bdex(?:terity)?\b[:\s]*(\d{1,2})\s*(?:\(\s*([+-]?\d+)\s*\))?/i);
    if (dex) out.mod = dex[2] != null ? Number(dex[2]) : Math.floor((Number(dex[1]) - 10) / 2);
    else {
      // the old layout: a row of STR DEX CON ... and, under it, a row of "8 (-1) 14 (+2) ..."
      const at = lines.findIndex((l) => /^str\s+dex\s+con/i.test(l));
      const row = at >= 0 ? [...(lines[at + 1] || '').matchAll(/(\d{1,2})\s*\(\s*([+-]?\d+)\s*\)/g)] : [];
      if (row[1]) out.mod = Number(row[1][2]);
    }
  }
  // the Actions part becomes the attacks; the rest stays as the notes
  const heading = (name) => new RegExp(`^[ \t]*${name}[ \t]*:?[ \t]*$`, 'im');
  const start = heading('actions').exec(t);
  if (start) {
    const bodyStart = start.index + start[0].length;
    const rest = t.slice(bodyStart);
    const stop = heading('(?:bonus actions|reactions|legendary actions|lair actions|mythic actions)').exec(rest);
    out.attacks = (stop ? rest.slice(0, stop.index) : rest).trim();
    out.text = (t.slice(0, start.index) + (stop ? rest.slice(stop.index) : '')).trim();
  } else out.text = t.trim();
  return out;
}

// ── building the fight ──────────────────────────────────────────────

const clone = (s) => normalizeCombat(JSON.parse(JSON.stringify(s)));
const baseName = (n) => n.replace(/\s+\d+$/, '');

// Put copies of a library enemy into the fight. Several copies are numbered ("Goblin 1", "Goblin 2"), carrying on from
// any already there. As a group they share one initiative. Returns { state, ids }.
export function addEnemies(state, enemy, count = 1, { asGroup = false, groupName = '', color = null } = {}) {
  const s = clone(state), n = Math.max(1, Math.min(40, Math.floor(Number(count)) || 1));
  const taken = s.combatants.filter((x) => baseName(x.name) === enemy.name).map((x) => Number((x.name.match(/\s(\d+)$/) || [])[1]) || 1);
  const alone = n === 1 && !taken.length;
  let next = Math.max(0, ...taken);
  const ids = [];
  for (let i = 0; i < n; i++) {
    const id = rid();
    ids.push(id);
    s.combatants.push({ id, kind: 'enemy', name: alone ? enemy.name : `${enemy.name} ${++next}`, color: colorId(color || enemy.color), ac: enemy.ac ?? null, hp: enemy.hp ?? null, max: enemy.hp ?? null,
      mod: enemy.mod ?? 0, init: null, group: null, attacks: enemy.attacks || '', text: enemy.text || '', ref: enemy.id || '' });
  }
  if (asGroup && n > 1) return { state: makeGroup(s, ids, groupName || `${enemy.name}s`, color || enemy.color), ids };
  return { state: s, ids };
}

export function addPlayer(state, name, init = null) {
  const s = clone(state), clean = text(name, 80);
  if (!clean || s.combatants.some((x) => x.kind === 'player' && x.name.toLowerCase() === clean.toLowerCase())) return { state: s, id: null };
  const id = rid();
  s.combatants.push({ id, kind: 'player', name: clean, color: nextColor(s.combatants.filter((x) => x.kind === 'player').map((x) => x.color)), ac: null, hp: null, max: null, mod: 0, init: int(init), group: null, attacks: '', text: '', ref: '' });
  return { state: s, id };
}

const dropEmptyGroups = (s) => { s.groups = s.groups.filter((g) => s.combatants.some((x) => x.group === g.id)); return s; };

// Give these combatants one place in the turn order. The group's initiative is the highest of theirs (or none yet).
export function makeGroup(state, ids, name, color) {
  const s = clone(state), set = new Set(ids), members = s.combatants.filter((x) => set.has(x.id));
  if (!members.length) return s;
  const inits = members.map((x) => x.group ? (s.groups.find((g) => g.id === x.group)?.init ?? x.init) : x.init).filter((v) => v != null);
  const g = { id: rid(), name: text(name, 60) || 'Group', color: colorId(color || nextColor(s.groups.map((x) => x.color))), init: inits.length ? Math.max(...inits) : null, mod: Math.max(...members.map((x) => x.mod ?? 0)) };
  for (const x of members) { x.group = g.id; x.color = g.color; }   // a group wears one colour (change one member's afterwards if you like)
  s.groups.push(g);
  if (s.turn && !slots(s).some((sl) => sl.key === s.turn)) s.turn = `g:${g.id}`;
  return dropEmptyGroups(s);
}
// Break a group up: everyone keeps the group's initiative as their own.
export function ungroup(state, gid) {
  const s = clone(state), g = s.groups.find((x) => x.id === gid);
  if (!g) return s;
  for (const x of s.combatants) if (x.group === gid) { x.group = null; x.init = g.init; }
  s.groups = s.groups.filter((x) => x.id !== gid);
  if (s.turn === `g:${gid}`) s.turn = null;
  return s;
}
export function removeFromGroup(state, id) {
  const s = clone(state), x = s.combatants.find((c) => c.id === id), g = x && s.groups.find((y) => y.id === x.group);
  if (x && g) { x.group = null; x.init = g.init; }
  return dropEmptyGroups(s);
}
export function removeCombatant(state, id) {
  const s = clone(state), x = s.combatants.find((c) => c.id === id);
  if (!x) return s;
  const key = slotKeyOf(s, x);
  const leaves = s.combatants.filter((c) => slotKeyOf(s, c) === key).length === 1;   // their whole place in the order goes
  const next = s.started && leaves && s.turn === key ? advanceFrom(s, key) : null;  // worked out while they are still in the list
  s.combatants = s.combatants.filter((c) => c.id !== id);
  dropEmptyGroups(s);
  if (leaves && s.turn === key) {
    if (next && next.turn !== key) { s.turn = next.turn; s.round = next.round; } else s.turn = null;
  }
  return s;
}
export function renameGroup(state, gid, name) { const s = clone(state), g = s.groups.find((x) => x.id === gid); if (g) g.name = text(name, 60) || g.name; return s; }
export function renameCombatant(state, id, name) { const s = clone(state), x = s.combatants.find((c) => c.id === id); if (x) x.name = text(name, 80) || x.name; return s; }

// A group's colour changes the colour of everyone who still wears the old one.
export function recolorGroup(state, gid, color) {
  const s = clone(state), g = s.groups.find((x) => x.id === gid);
  if (!g) return s;
  const old = g.color;
  g.color = colorId(color);
  for (const x of s.combatants) if (x.group === gid && x.color === old) x.color = g.color;
  return s;
}
export function recolorCombatant(state, id, color) { const s = clone(state), x = s.combatants.find((c) => c.id === id); if (x) x.color = colorId(color); return s; }

// ── initiative ──────────────────────────────────────────────────────

export const slotKeyOf = (state, x) => (x.group && state.groups.some((g) => g.id === x.group) ? `g:${x.group}` : `c:${x.id}`);
export const isDown = (x) => x.kind === 'enemy' && x.hp != null && x.hp <= 0;

// The turn order, highest first. Ties go to the higher bonus, then to whoever was put in first. Nobody with no initiative
// yet is lost: they wait at the bottom.
export function slots(state) {
  const out = [], seen = new Set();
  state.combatants.forEach((x, i) => {
    const key = slotKeyOf(state, x);
    if (seen.has(key)) { out.find((s) => s.key === key).members.push(x); return; }
    seen.add(key);
    const g = key.startsWith('g:') ? state.groups.find((y) => y.id === x.group) : null;
    out.push({ key, group: g, members: [x], init: g ? g.init : x.init, mod: g ? g.mod : x.mod, order: i });
  });
  const rank = (s) => (s.init == null ? -Infinity : s.init);
  out.sort((a, b) => rank(b) - rank(a) || (b.mod ?? 0) - (a.mod ?? 0) || a.order - b.order);
  for (const s of out) s.down = s.members.every(isDown);
  return out;
}

export function setInit(state, key, value) {
  const s = clone(state), v = int(value);
  if (key.startsWith('g:')) { const g = s.groups.find((x) => x.id === key.slice(2)); if (g) g.init = v; }
  else { const x = s.combatants.find((c) => c.id === key.slice(2)); if (x) x.init = v; }
  return s;
}

// Roll a d20 plus the bonus for each enemy (or each group of enemies). only: 'missing' leaves any initiative already set;
// 'all' rolls them all again. Players are never rolled for: type their number in. Returns { state, rolled }.
export function rollInitiative(state, { only = 'missing', rng = Math.random } = {}) {
  const s = clone(state), rolled = [];
  for (const sl of slots(s)) {
    if (sl.members.some((x) => x.kind === 'player')) continue;
    if (only === 'missing' && sl.init != null) continue;
    const roll = d20(rng), total = roll + (sl.mod ?? 0);
    if (sl.group) s.groups.find((g) => g.id === sl.group.id).init = total;
    else s.combatants.find((c) => c.id === sl.members[0].id).init = total;
    rolled.push({ key: sl.key, name: sl.group ? sl.group.name : sl.members[0].name, roll, mod: sl.mod ?? 0, total });
  }
  return { state: s, rolled };
}

// ── the rounds ──────────────────────────────────────────────────────

export const missingInit = (state) => slots(state).filter((s) => s.init == null).map((s) => (s.group ? s.group.name : s.members[0].name));

// Begin: round 1, and the top of the order has the turn.
export function start(state) {
  const s = clone(state);
  const order = slots(s);
  if (!order.length) return { state: s, error: 'Add someone to the fight first.' };
  const missing = missingInit(s);
  if (missing.length) return { state: s, error: `No initiative yet for ${missing.join(', ')}.` };
  const first = order.find((x) => !x.down) || order[0];
  s.started = true; s.round = 1; s.turn = first.key;
  return { state: s };
}

// The next slot (or the one before) that is still standing. Passing the end of the order starts a new round.
function advanceFrom(state, from, dir = 1) {
  const order = slots(state);
  if (!order.length) return null;
  let i = order.findIndex((x) => x.key === from);
  if (i < 0) i = dir > 0 ? -1 : order.length;
  let round = state.round;
  for (let steps = 0; steps < order.length; steps++) {
    i += dir;
    if (i >= order.length) { i = 0; round += 1; }
    else if (i < 0) { i = order.length - 1; round = Math.max(1, round - 1); }
    if (!order[i].down) return { turn: order[i].key, round };
  }
  return null;   // everyone is down
}
export function advance(state, dir = 1) {
  const s = clone(state);
  if (!s.started) return s;
  const next = advanceFrom(s, s.turn, dir);
  if (next) { s.turn = next.turn; s.round = next.round; }
  return s;
}
export function jumpTo(state, key) { const s = clone(state); if (s.started && slots(s).some((x) => x.key === key)) s.turn = key; return s; }

// Take the fight apart: the enemies and groups go, the players stay (without an initiative), and the rounds start over.
export function endCombat(state, { keepPlayers = true } = {}) {
  const s = clone(state);
  s.combatants = keepPlayers ? s.combatants.filter((x) => x.kind === 'player').map((x) => ({ ...x, init: null, group: null })) : [];
  s.groups = []; s.round = 0; s.started = false; s.turn = null;
  return s;
}

// ── hit points ──────────────────────────────────────────────────────
// delta is negative for damage and positive for healing. Hit points stay between 0 and the maximum.
export function hit(state, id, delta) {
  const s = clone(state), x = s.combatants.find((c) => c.id === id), d = int(delta);
  if (!x || d == null || x.hp == null) return s;
  x.hp = Math.max(0, Math.min(x.max ?? Infinity, x.hp + d));
  return s;
}
// hp and max: leave undefined to keep it, or give '' to clear it.
export function setHp(state, id, hp, max) {
  const s = clone(state), x = s.combatants.find((c) => c.id === id);
  if (!x) return s;
  const pick = (v, cur) => (v === undefined ? cur : v === '' || v === null ? null : (int(v) ?? cur));
  x.hp = pick(hp, x.hp); x.max = pick(max, x.max);
  if (x.hp != null) x.hp = Math.max(0, x.hp);
  if (x.hp != null && x.max != null && x.hp > x.max) x.max = x.hp;
  return s;
}
export function setAc(state, id, ac) { const s = clone(state), x = s.combatants.find((c) => c.id === id); if (x) x.ac = int(ac); return s; }
