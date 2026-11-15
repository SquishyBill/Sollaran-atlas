// The combat tracker (DM): who is in the fight, in what order, and whose turn it is.
// Everything here is plain data in and plain data out, so it can be tested without a page.
//
// A fight is { round, started, turn, groups, combatants, log, level, share, showHealth, xpEarned }.
//   combatant: { id, kind: 'enemy' | 'player', name, color, ac, hp, max, temp, mod, init, group, attacks, text, ref, cr,
//                conds: [{ name, rounds, note }], react, saves: { on, ok, bad }, uses: [{ id, name, max, used, recharge, reset }], hidden }
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

// What can be put on a combatant, for the picker. Anything else can be typed in.
export const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Exhaustion', 'Concentrating', 'Hasted', 'Slowed', 'Blessed', 'Marked'];

const rid = () => Math.random().toString(36).slice(2, 9);
export const modText = (n) => (n == null ? '' : n < 0 ? `−${-n}` : `+${n}`);
export const d20 = (rng = Math.random) => 1 + Math.floor(rng() * 20);

const int = (v) => { const n = Math.floor(Number(String(v ?? '').replace(/−/g, '-'))); return String(v ?? '').trim() === '' || !Number.isFinite(n) ? null : n; };
const text = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// ── dice ────────────────────────────────────────────────────────────
// "2d8+4", "2d8 + 4", "1d4-1": the dice, and the number added.
export function parseDice(expr) {
  const m = String(expr ?? '').replace(/[−–]/g, '-').trim().match(/^(\d{1,3})d(\d{1,3})\s*(?:([+-])\s*(\d{1,4}))?$/i);
  if (!m || !Number(m[1]) || !Number(m[2])) return null;
  return { n: Number(m[1]), sides: Number(m[2]), bonus: m[3] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0 };
}
export const diceText = (expr) => { const d = parseDice(expr); return d ? `${d.n}d${d.sides}${d.bonus ? (d.bonus < 0 ? '-' : '+') + Math.abs(d.bonus) : ''}` : ''; };
export const diceAverage = (expr) => { const d = parseDice(expr); return d ? Math.floor(d.n * (d.sides + 1) / 2 + d.bonus) : null; };
export function rollDice(expr, rng = Math.random) {
  const d = parseDice(expr);
  if (!d) return null;
  const rolls = Array.from({ length: d.n }, () => 1 + Math.floor(rng() * d.sides));
  return { rolls, bonus: d.bonus, total: rolls.reduce((a, b) => a + b, 0) + d.bonus };
}

// ── challenge ratings and experience ────────────────────────────────
export const CR_XP = { '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000,
  '10': 5900, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000,
  '22': 41000, '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000 };
export const crText = (v) => { const t = String(v ?? '').trim(); return Object.prototype.hasOwnProperty.call(CR_XP, t) ? t : ''; };
export const xpOf = (cr) => { const t = crText(cr); return t ? CR_XP[t] : null; };

// XP a party of this level needs to reach each level of difficulty, per character.
export const THRESHOLDS = {
  1: [25, 50, 75, 100], 2: [50, 100, 150, 200], 3: [75, 150, 225, 400], 4: [125, 250, 375, 500], 5: [250, 500, 750, 1100], 6: [300, 600, 900, 1400],
  7: [350, 750, 1100, 1700], 8: [450, 900, 1400, 2100], 9: [550, 1100, 1600, 2400], 10: [600, 1200, 1900, 2800], 11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500], 13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700], 15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500], 19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700],
};
const MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4];
// More monsters hit harder together: the multiplier for this many, moved a step for a small or a big party.
export function multiplierFor(monsters, players) {
  let i = monsters <= 1 ? 1 : monsters === 2 ? 2 : monsters <= 6 ? 3 : monsters <= 10 ? 4 : monsters <= 14 ? 5 : 6;
  if (players && players < 3) i = Math.min(6, i + 1);
  else if (players >= 6) i = Math.max(0, i - 1);
  return MULTIPLIERS[i];
}

// ── finding things the tracker can count in a stat block ─────────────
// "Fire Breath (Recharge 5–6)", "Legendary Resistance (3/Day)", "can take 3 legendary actions".
export function findUses(...texts) {
  const t = texts.filter(Boolean).join('\n').replace(/\r/g, '');
  const out = [], add = (u) => { if (!out.some((x) => x.name.toLowerCase() === u.name.toLowerCase())) out.push({ id: rid(), used: 0, ...u }); };
  for (const m of t.matchAll(/^[ \t]*([A-Z][^\n.(]{1,40}?)[ \t]*\(Recharge (\d)(?:[ \t]*[-–][ \t]*6)?\)/gm)) add({ name: m[1].trim(), max: 1, recharge: Number(m[2]), reset: '' });
  const leg = t.match(/can take (\d) legendary actions/i); if (leg) add({ name: 'Legendary actions', max: Number(leg[1]), recharge: null, reset: 'turn' });
  for (const m of t.matchAll(/^[ \t]*([A-Z][^\n.(]{1,40}?)[ \t]*\((\d)\/[Dd]ay\)/gm)) add({ name: m[1].trim(), max: Number(m[2]), recharge: null, reset: '' });
  return out;
}

// ── making things safe ──────────────────────────────────────────────
const normConds = (a) => (Array.isArray(a) ? a : []).filter((c) => c && c.name).slice(0, 16).map((c) => {
  const r = int(c.rounds);
  return { name: text(c.name, 40), rounds: r != null && r > 0 ? Math.min(r, 999) : null, note: text(c.note, 80) };
});
const normUses = (a) => (Array.isArray(a) ? a : []).filter((u) => u && u.name).slice(0, 12).map((u) => {
  const max = clamp(int(u.max) ?? 1, 1, 99), rc = int(u.recharge);
  return { id: u.id ? String(u.id) : rid(), name: text(u.name, 60), max, used: clamp(int(u.used) ?? 0, 0, max), recharge: rc != null && rc >= 2 && rc <= 6 ? rc : null, reset: u.reset === 'turn' ? 'turn' : '' };
});
const normSaves = (s) => ({ on: !!s?.on, ok: clamp(int(s?.ok) ?? 0, 0, 3), bad: clamp(int(s?.bad) ?? 0, 0, 3) });

export const newCombat = () => ({ round: 0, started: false, turn: null, groups: [], combatants: [], log: [], level: null, share: false, showHealth: true, xpEarned: 0 });

// A blank combatant, with everything it can have.
const blank = (o) => ({ id: rid(), kind: 'enemy', name: '', color: 'grey', ac: null, hp: null, max: null, temp: 0, mod: 0, init: null, group: null, attacks: '', text: '', ref: '',
  cr: '', conds: [], react: false, saves: { on: false, ok: 0, bad: 0 }, uses: [], hidden: false, ...o });

// Whatever came out of the database, made safe to use.
export function normalizeCombat(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const combatants = (Array.isArray(c.combatants) ? c.combatants : []).filter((x) => x && x.id && x.name).map((x) => ({
    id: String(x.id), kind: x.kind === 'player' ? 'player' : 'enemy', name: text(x.name, 80), color: colorId(x.color),
    ac: int(x.ac), hp: int(x.hp), max: int(x.max), temp: Math.max(0, int(x.temp) ?? 0), mod: int(x.mod) ?? 0, init: int(x.init), group: x.group ? String(x.group) : null,
    attacks: text(x.attacks, 4000), text: text(x.text, 8000), ref: x.ref ? String(x.ref) : '', cr: crText(x.cr),
    conds: normConds(x.conds), react: !!x.react, saves: normSaves(x.saves), uses: normUses(x.uses), hidden: !!x.hidden,
  }));
  const ids = new Set();
  const groups = (Array.isArray(c.groups) ? c.groups : []).filter((g) => g && g.id && !ids.has(g.id) && ids.add(g.id)).map((g) => ({
    id: String(g.id), name: text(g.name, 60) || 'Group', color: colorId(g.color), init: int(g.init), mod: int(g.mod) ?? 0 }));
  for (const x of combatants) if (x.group && !ids.has(x.group)) x.group = null;
  const log = (Array.isArray(c.log) ? c.log : []).filter((l) => l && l.t).slice(-300).map((l) => ({ r: Math.max(0, int(l.r) ?? 0), t: text(l.t, 200) }));
  const level = int(c.level);
  return { round: Math.max(0, int(c.round) ?? 0), started: !!c.started, turn: typeof c.turn === 'string' ? c.turn : null, groups, combatants, log,
    level: level != null && level >= 1 && level <= 20 ? level : null, share: !!c.share, showHealth: c.showHealth !== false, xpEarned: Math.max(0, int(c.xpEarned) ?? 0) };
}

// An enemy typed in (or pasted in) for the library, tidied, or { error }.
export function enemyFrom(input) {
  const name = text(input?.name, 80);
  if (!name) return { error: 'Give the enemy a name.' };
  const ac = int(input.ac), hp = int(input.hp), mod = int(input.mod);
  if (ac != null && (ac < 0 || ac > 40)) return { error: 'Armor Class should be between 0 and 40.' };
  if (hp != null && (hp < 1 || hp > 9999)) return { error: 'Hit points should be between 1 and 9999.' };
  if (mod != null && (mod < -10 || mod > 30)) return { error: 'The initiative bonus should be between -10 and +30.' };
  const rawCr = String(input.cr ?? '').trim(), cr = crText(rawCr);
  if (rawCr && !cr) return { error: 'Challenge rating should be 0, 1/8, 1/4, 1/2, or a number from 1 to 30.' };
  const rawDice = String(input.hpDice ?? '').trim(), hpDice = diceText(rawDice);
  if (rawDice && !hpDice) return { error: 'Hit dice should look like 2d8+4.' };
  return { name, ac, hp, mod: mod ?? 0, color: colorId(input.color), attacks: text(input.attacks, 4000), text: text(input.text, 8000), cr, hpDice };
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
  const dice = t.match(/\b(?:hit points|hp)\b[:\s]*\d{1,4}\s*\(\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*\)/i); if (dice) out.hpDice = diceText(dice[1]);
  const cr = t.match(/\b(?:challenge|cr)\b[:\s]*(\d{1,2}\/\d|\d{1,2})\b/i); if (cr && crText(cr[1])) out.cr = crText(cr[1]);
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
// A line in the fight's log, but only once the fight has started.
const say = (s, t) => { if (s.started) { s.log.push({ r: s.round, t: text(t, 200) }); if (s.log.length > 300) s.log.splice(0, s.log.length - 300); } };
const own = (n) => (/s$/i.test(n) ? `${n}’` : `${n}’s`);

// Put copies of a library enemy into the fight. Several copies are numbered ("Goblin 1", "Goblin 2"), carrying on from
// any already there. As a group they share one initiative. rollHp gives each its own hit points rolled from its hit dice,
// where the enemy has them. Returns { state, ids }.
export function addEnemies(state, enemy, count = 1, { asGroup = false, groupName = '', color = null, rollHp = false, rng = Math.random } = {}) {
  const s = clone(state), n = Math.max(1, Math.min(40, Math.floor(Number(count)) || 1));
  const taken = s.combatants.filter((x) => baseName(x.name) === enemy.name).map((x) => Number((x.name.match(/\s(\d+)$/) || [])[1]) || 1);
  const alone = n === 1 && !taken.length;
  let next = Math.max(0, ...taken);
  const ids = [], uses = findUses(enemy.attacks, enemy.text);
  const defs = Array.isArray(enemy.uses) && enemy.uses.length ? normUses(enemy.uses) : uses;
  for (let i = 0; i < n; i++) {
    const id = rid();
    ids.push(id);
    let hp = enemy.hp ?? null;
    if (rollHp && enemy.hpDice) { const r = rollDice(enemy.hpDice, rng); if (r) hp = Math.max(1, r.total); }
    s.combatants.push(blank({ id, kind: 'enemy', name: alone ? enemy.name : `${enemy.name} ${++next}`, color: colorId(color || enemy.color), ac: enemy.ac ?? null, hp, max: hp,
      mod: enemy.mod ?? 0, attacks: enemy.attacks || '', text: enemy.text || '', ref: enemy.id || '', cr: crText(enemy.cr), uses: defs.map((u) => ({ ...u, id: rid(), used: 0 })) }));
  }
  say(s, `${n === 1 ? s.combatants[s.combatants.length - 1].name : `${n} ${enemy.name}s`} join${n === 1 ? 's' : ''} the fight`);
  if (asGroup && n > 1) return { state: makeGroup(s, ids, groupName || `${enemy.name}s`, color || enemy.color), ids };
  return { state: s, ids };
}

export function addPlayer(state, name, init = null) {
  const s = clone(state), clean = text(name, 80);
  if (!clean || s.combatants.some((x) => x.kind === 'player' && x.name.toLowerCase() === clean.toLowerCase())) return { state: s, id: null };
  const id = rid();
  s.combatants.push(blank({ id, kind: 'player', name: clean, color: nextColor(s.combatants.filter((x) => x.kind === 'player').map((x) => x.color)), init: int(init), saves: { on: true, ok: 0, bad: 0 } }));
  say(s, `${clean} joins the fight`);
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
  if (isDown(x) && xpOf(x.cr) != null) s.xpEarned += xpOf(x.cr);                    // a defeated enemy still counts when taken off the list
  say(s, `${x.name} leaves the fight`);
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
const slotLabel = (sl) => (sl.group ? sl.group.name : sl.members[0].name);

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
  if (rolled.length) say(s, 'Initiative rolled: ' + rolled.map((r) => `${r.name} ${r.total}`).join(', '));
  return { state: s, rolled };
}

// ── the rounds ──────────────────────────────────────────────────────

export const missingInit = (state) => slots(state).filter((s) => s.init == null).map((s) => (s.group ? s.group.name : s.members[0].name));

// What happens when it becomes someone's turn: their reaction is ready again, legendary actions come back, and a spent ability
// that recharges is rolled for.
function enterTurn(s, key, rng) {
  const sl = slots(s).find((x) => x.key === key);
  if (!sl) return;
  for (const x of sl.members) {
    const c = s.combatants.find((y) => y.id === x.id);
    c.react = false;
    for (const u of c.uses) {
      if (u.reset === 'turn') u.used = 0;
      else if (u.recharge && u.used > 0) {
        const roll = 1 + Math.floor(rng() * 6);
        if (roll >= u.recharge) { u.used = 0; say(s, `${own(c.name)} ${u.name} recharges (rolled ${roll})`); }
        else say(s, `${own(c.name)} ${u.name} has not recharged (rolled ${roll}, needs ${u.recharge})`);
      }
    }
  }
}
// What happens when someone's turn ends: timed conditions count down, and clear when they reach nothing.
function leaveTurn(s, key) {
  const sl = slots(s).find((x) => x.key === key);
  if (!sl) return;
  for (const x of sl.members) {
    const c = s.combatants.find((y) => y.id === x.id);
    for (const cond of c.conds) if (cond.rounds != null) cond.rounds -= 1;
    for (const cond of c.conds.filter((k) => k.rounds === 0)) say(s, `${c.name} is no longer ${cond.name}`);
    c.conds = c.conds.filter((k) => k.rounds !== 0);
  }
}

// Begin: round 1, and the top of the order has the turn.
export function start(state, { rng = Math.random } = {}) {
  const s = clone(state);
  const order = slots(s);
  if (!order.length) return { state: s, error: 'Add someone to the fight first.' };
  const missing = missingInit(s);
  if (missing.length) return { state: s, error: `No initiative yet for ${missing.join(', ')}.` };
  const first = order.find((x) => !x.down) || order[0];
  s.log = []; s.xpEarned = 0;
  s.started = true; s.round = 1; s.turn = first.key;
  say(s, `Combat begins. ${slotLabel(first)} goes first`);
  enterTurn(s, first.key, rng);
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
export function advance(state, dir = 1, { rng = Math.random } = {}) {
  const s = clone(state);
  if (!s.started) return s;
  const next = advanceFrom(s, s.turn, dir);
  if (!next) return s;
  if (dir > 0 && s.turn) leaveTurn(s, s.turn);
  const newRound = next.round > s.round;
  s.turn = next.turn; s.round = next.round;
  if (newRound) say(s, `Round ${s.round} begins`);
  if (dir > 0) enterTurn(s, next.turn, rng);
  return s;
}
export function jumpTo(state, key) { const s = clone(state); if (s.started && slots(s).some((x) => x.key === key)) s.turn = key; return s; }

// The experience for a fight: what every enemy is worth, what has been earned so far, and how many have no challenge rating.
export function fightXp(state) {
  const enemies = state.combatants.filter((x) => x.kind === 'enemy');
  const rated = enemies.filter((x) => xpOf(x.cr) != null);
  const sum = (list) => list.reduce((t, x) => t + xpOf(x.cr), 0);
  return { total: sum(rated) + (state.xpEarned || 0), earned: (state.xpEarned || 0) + sum(rated.filter(isDown)), unrated: enemies.length - rated.length, rated: rated.length };
}
// How hard the fight is for a party of this level, by the standard guideline: Easy, Medium, Hard or Deadly. Or null until the
// level is set and there are players and rated enemies.
export function difficulty(state) {
  const players = state.combatants.filter((x) => x.kind === 'player').length;
  const rated = state.combatants.filter((x) => x.kind === 'enemy' && xpOf(x.cr) != null && !(state.started && isDown(x)));
  const level = state.level;
  if (!level || !THRESHOLDS[level] || !players || !rated.length) return null;
  const xp = rated.reduce((t, x) => t + xpOf(x.cr), 0), mult = multiplierFor(rated.length, players), adjusted = Math.floor(xp * mult);
  const [easy, medium, hard, deadly] = THRESHOLDS[level].map((n) => n * players);
  const label = adjusted >= deadly ? 'Deadly' : adjusted >= hard ? 'Hard' : adjusted >= medium ? 'Medium' : adjusted >= easy ? 'Easy' : 'Trivial';
  return { label, xp, mult, adjusted, easy, medium, hard, deadly, level, players, monsters: rated.length };
}

// Take the fight apart: the enemies and groups go, the players stay (without an initiative), and the rounds start over.
// The log stays after a real fight, so it can be read afterwards.
export function endCombat(state, { keepPlayers = true } = {}) {
  const s = clone(state);
  if (s.started) say(s, `Combat ends after ${s.round} round${s.round === 1 ? '' : 's'}`); else s.log = [];
  s.combatants = keepPlayers ? s.combatants.filter((x) => x.kind === 'player').map((x) => ({ ...x, init: null, group: null, conds: [], react: false, temp: 0, saves: { ...x.saves, ok: 0, bad: 0 } })) : [];
  s.groups = []; s.round = 0; s.started = false; s.turn = null; s.xpEarned = 0;
  return s;
}

// ── hit points ──────────────────────────────────────────────────────
// delta is negative for damage and positive for healing. Hit points stay between 0 and the maximum, and temporary hit points
// soak up damage first.
export function hit(state, id, delta) {
  const s = clone(state), x = s.combatants.find((c) => c.id === id), d = int(delta);
  if (!x || d == null || x.hp == null) return s;
  const before = x.hp;
  if (d < 0) {
    const soak = Math.min(x.temp || 0, -d);
    x.temp -= soak;
    x.hp = Math.max(0, x.hp - (-d - soak));
    say(s, `${x.name} takes ${-d}${soak ? ` (${soak} soaked by temporary hit points)` : ''}`);
    if (before > 0 && x.hp === 0 && x.kind === 'enemy') say(s, `${x.name} goes down`);
  } else {
    x.hp = Math.min(x.max ?? Infinity, x.hp + d);
    if (x.hp > before) say(s, `${x.name} heals ${x.hp - before}`);
  }
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
export function setTemp(state, id, n) { const s = clone(state), x = s.combatants.find((c) => c.id === id); if (x) x.temp = Math.max(0, int(n) ?? 0); return s; }

// ── conditions, reactions, death saves and abilities with uses ───────
const find = (s, id) => s.combatants.find((c) => c.id === id);

// A condition, for this many rounds (or until it is taken off). Giving the same one again replaces it.
export function addCondition(state, id, name, rounds, note) {
  const s = clone(state), x = find(s, id), n = text(name, 40);
  if (!x || !n) return s;
  const r = int(rounds), c = { name: n, rounds: r != null && r > 0 ? Math.min(r, 999) : null, note: text(note, 80) };
  const at = x.conds.findIndex((k) => k.name.toLowerCase() === n.toLowerCase());
  if (at >= 0) x.conds[at] = c; else if (x.conds.length < 16) x.conds.push(c);
  say(s, `${x.name} is ${n}${c.rounds ? ` for ${c.rounds} round${c.rounds === 1 ? '' : 's'}` : ''}${c.note ? ` (${c.note})` : ''}`);
  return s;
}
export function removeCondition(state, id, name) {
  const s = clone(state), x = find(s, id);
  if (!x) return s;
  const had = x.conds.some((k) => k.name === name);
  x.conds = x.conds.filter((k) => k.name !== name);
  if (had) say(s, `${x.name} is no longer ${name}`);
  return s;
}
export function setReaction(state, id, used) { const s = clone(state), x = find(s, id); if (x) x.react = !!used; return s; }
export function setHidden(state, id, hidden) { const s = clone(state), x = find(s, id); if (x) x.hidden = !!hidden; return s; }

// Death saves: successes and failures, up to three each. Three failures is the end; three successes is stable.
export const dying = (x) => (x.saves.bad >= 3 ? 'dead' : x.saves.ok >= 3 ? 'stable' : x.saves.on && (x.saves.ok || x.saves.bad) ? 'dying' : '');
export function setSaves(state, id, patch) {
  const s = clone(state), x = find(s, id);
  if (!x) return s;
  const was = dying(x);
  if (patch.on != null) x.saves.on = !!patch.on;
  if (patch.ok != null) x.saves.ok = clamp(int(patch.ok) ?? 0, 0, 3);
  if (patch.bad != null) x.saves.bad = clamp(int(patch.bad) ?? 0, 0, 3);
  const now = dying(x);
  if (now !== was && (now === 'dead' || now === 'stable')) say(s, `${x.name} ${now === 'dead' ? 'has died (three failed death saves)' : 'is stable (three successful death saves)'}`);
  return s;
}

// An ability with limited uses (legendary actions, "3/Day", Recharge 5–6). delta is +1 to spend one, -1 to give one back.
export function addUse(state, id, { name, max = 1, recharge = null, reset = '' }) {
  const s = clone(state), x = find(s, id), n = text(name, 60);
  if (!x || !n || x.uses.length >= 12) return s;
  x.uses.push(...normUses([{ name: n, max, recharge, reset, used: 0 }]));
  return s;
}
export function removeUse(state, id, useId) { const s = clone(state), x = find(s, id); if (x) x.uses = x.uses.filter((u) => u.id !== useId); return s; }
export function spendUse(state, id, useId, delta = 1) {
  const s = clone(state), x = find(s, id), u = x?.uses.find((v) => v.id === useId);
  if (!u) return s;
  const before = u.used;
  u.used = clamp(u.used + (int(delta) ?? 0), 0, u.max);
  if (u.used > before) say(s, `${x.name} uses ${u.name}${u.max > 1 ? ` (${u.max - u.used} left)` : ''}`);
  return s;
}
// Roll for a spent ability by hand: a d6, and it is back on its number or higher.
export function rechargeUse(state, id, useId, { rng = Math.random } = {}) {
  const s = clone(state), x = find(s, id), u = x?.uses.find((v) => v.id === useId);
  if (!u || !u.recharge) return { state: s, roll: null };
  const roll = 1 + Math.floor(rng() * 6), back = roll >= u.recharge;
  if (back) u.used = 0;
  say(s, `${own(x.name)} ${u.name} ${back ? 'recharges' : 'has not recharged'} (rolled ${roll}, needs ${u.recharge})`);
  return { state: s, roll, back };
}

// ── settings that belong to the fight ───────────────────────────────
export function setLevel(state, level) { const s = clone(state), n = int(level); s.level = n != null && n >= 1 && n <= 20 ? n : null; return s; }
export function setShare(state, { on, health } = {}) { const s = clone(state); if (on != null) s.share = !!on; if (health != null) s.showHealth = !!health; return s; }

// ── saved fights ────────────────────────────────────────────────────
// Keep the enemies of a fight (and how they are grouped) under a name, to bring back another time. Hit points are full again.
export function encounterFrom(state, name) {
  const s = clone(state), n = text(name, 60), enemies = s.combatants.filter((x) => x.kind === 'enemy');
  if (!n) return { error: 'Give the fight a name.' };
  if (!enemies.length) return { error: 'There are no enemies in the fight to save.' };
  const usedGroups = s.groups.filter((g) => enemies.some((x) => x.group === g.id));
  return { name: n, groups: usedGroups.map((g) => ({ id: g.id, name: g.name, color: g.color })),
    items: enemies.map((x) => ({ name: x.name, color: x.color, ac: x.ac, hp: x.max ?? x.hp, mod: x.mod, attacks: x.attacks, text: x.text, cr: x.cr, group: x.group,
      uses: x.uses.map((u) => ({ name: u.name, max: u.max, recharge: u.recharge, reset: u.reset })) })) };
}
export function normalizeEncounter(raw) {
  const e = raw && typeof raw === 'object' ? raw : {};
  const gids = new Set();
  const groups = (Array.isArray(e.groups) ? e.groups : []).filter((g) => g && g.id && !gids.has(String(g.id)) && gids.add(String(g.id))).slice(0, 30)
    .map((g) => ({ id: String(g.id), name: text(g.name, 60) || 'Group', color: colorId(g.color) }));
  const items = (Array.isArray(e.items) ? e.items : []).filter((x) => x && x.name).slice(0, 80).map((x) => ({
    name: text(x.name, 80), color: colorId(x.color), ac: int(x.ac), hp: int(x.hp), mod: int(x.mod) ?? 0, attacks: text(x.attacks, 4000), text: text(x.text, 8000),
    cr: crText(x.cr), group: x.group && gids.has(String(x.group)) ? String(x.group) : null,
    uses: normUses(x.uses).map(({ name, max, recharge, reset }) => ({ name, max, recharge, reset })) }));
  return { name: text(e.name, 60), groups, items };
}
// Bring a saved fight into the current one: fresh copies, numbered if the same enemy is already there, with the same groups.
export function loadEncounter(state, enc, { rollHp = false, rng = Math.random } = {}) {
  const e = normalizeEncounter(enc);
  let s = clone(state);
  const mapped = new Map();     // index in the saved fight -> id in this one
  const bases = [];
  e.items.forEach((it, i) => { const b = baseName(it.name); let row = bases.find((r) => r.base === b); if (!row) bases.push(row = { base: b, at: [] }); row.at.push(i); });
  for (const row of bases) {
    const first = e.items[row.at[0]];
    const r = addEnemies(s, { ...first, name: row.base }, row.at.length, { rollHp, rng });
    s = r.state;
    row.at.forEach((i, k) => mapped.set(i, r.ids[k]));
  }
  for (const g of e.groups) {
    const ids = e.items.map((it, i) => (it.group === g.id ? mapped.get(i) : null)).filter(Boolean);
    if (ids.length) s = makeGroup(s, ids, g.name, g.color);
  }
  return s;
}

// ── what the players are shown ──────────────────────────────────────
// The turn order with nothing the DM wants to keep back: no armor, no attacks, no notes. Enemy health shows only as a word
// (when the DM allows it), and enemies marked hidden are left out.
export const healthWord = (x) => (x.hp == null || x.max == null ? '' : x.hp <= 0 ? 'Down' : x.hp * 2 <= x.max ? 'Bloodied' : x.hp < x.max ? 'Hurt' : 'Unhurt');
export function publicView(state) {
  const s = normalizeCombat(state);
  if (!s.share || !s.started) return { on: false };
  const order = [];
  for (const sl of slots(s)) {
    const seen = sl.members.filter((x) => !x.hidden);
    if (!seen.length) continue;
    const conds = (list) => list.flatMap((x) => x.conds.map((c) => c.name)).filter((v, i, a) => a.indexOf(v) === i);
    const row = { name: slotLabel(sl), kind: sl.members.some((x) => x.kind === 'player') ? 'player' : 'enemy', color: sl.group ? sl.group.color : sl.members[0].color, init: sl.init, current: s.turn === sl.key,
      count: sl.group ? seen.length : 0, down: seen.every(isDown), conds: conds(seen) };
    if (row.kind === 'enemy' && s.showHealth) {
      row.health = sl.group ? `${seen.filter((x) => !isDown(x)).length} of ${seen.length} standing` : healthWord(seen[0]);
    }
    order.push(row);
  }
  const cur = order.find((r) => r.current);
  return { on: true, round: s.round, turn: cur ? cur.name : '', order };
}
