// Battle maps: a picture with a square grid, a fog laid over it, and tokens that stand on it.
//
// They are the DM's alone (battlemaps/{id}, with the picture kept in pieces in pictures/{id}~{n}). What is on the table's
// screen is the same map, drawn by a window of its own that the DM opens on the TV. The fog is a light one: the picture
// is never sent to a player, so there is nothing to look under. This file has the parts that need no browser:
// tidying a map out of the database, painting fog, placing and moving tokens, and working out how each token looks.
import * as CD from './combat-data.js';

export const MIN_COLS = 4;
export const MAX_COLS = 80;
export const MAX_TOKENS = 120;
export const PART = 800_000;          // characters of picture in one database document

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const int = (v) => { const n = Math.floor(Number(v)); return v === null || v === '' || v === undefined || !Number.isFinite(n) ? null : n; };
const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
const text = (v, n) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n);
const rid = () => Math.random().toString(36).slice(2, 10);
const COLOR_IDS = new Set(CD.COLORS.map((c) => c.id));
const KINDS = ['player', 'enemy', 'other'];

export const rowsOf = (m) => clamp(Math.round(m.cols * m.ih / m.iw), 1, 300);

// ── the picture, in pieces ──
export const splitData = (s) => { const out = []; for (let i = 0; i < s.length; i += PART) out.push(s.slice(i, i + PART)); return out; };
export const joinData = (parts) => (Array.isArray(parts) ? parts.join('') : '');

// ── fog ──
// One character for each square of the grid, row by row: "1" is fog, "0" is clear.
export const newFog = (cols, rows, fogged = true) => (fogged ? '1' : '0').repeat(cols * rows);
export function resampleFog(fog, oc, orows, nc, nr) {
  let out = '';
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
    const oldC = Math.min(oc - 1, Math.floor((c + 0.5) * oc / nc)), oldR = Math.min(orows - 1, Math.floor((r + 0.5) * orows / nr));
    out += fog[oldR * oc + oldC] === '1' ? '1' : '0';
  }
  return out;
}
export const inGrid = (m, c, r) => Number.isInteger(c) && Number.isInteger(r) && c >= 0 && r >= 0 && c < m.cols && r < rowsOf(m);
export const isFogged = (m, c, r) => inGrid(m, c, r) && m.fog[r * m.cols + c] === '1';
export const fogCount = (m) => { let n = 0; for (const ch of m.fog) if (ch === '1') n++; return n; };

// Put fog on (hidden) or take it off, for these squares [[col, row], ...].
export function paintFog(m, cells, hidden) {
  const a = m.fog.split(''), v = hidden ? '1' : '0';
  for (const [c, r] of cells) if (inGrid(m, c, r)) a[r * m.cols + c] = v;
  return { ...m, fog: a.join('') };
}
export const fogAll = (m, hidden) => ({ ...m, fog: newFog(m.cols, rowsOf(m), hidden) });
// The squares under a brush that is `size` squares across, with (c, r) near its middle.
export function brushCells(m, c, r, size) {
  const n = clamp(int(size) ?? 1, 1, 12), off = Math.floor((n - 1) / 2), out = [];
  for (let dr = 0; dr < n; dr++) for (let dc = 0; dc < n; dc++) if (inGrid(m, c - off + dc, r - off + dr)) out.push([c - off + dc, r - off + dr]);
  return out;
}
export function boxCells(m, c0, r0, c1, r1) {
  const out = [];
  for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) if (inGrid(m, c, r)) out.push([c, r]);
  return out;
}
// Every square a drag passed through between two squares, so a fast stroke leaves no gaps.
export function lineCells(c0, r0, c1, r1) {
  const out = [], n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
  if (!n) return [[c0, r0]];
  for (let i = 0; i <= n; i++) out.push([Math.round(c0 + (c1 - c0) * i / n), Math.round(r0 + (r1 - r0) * i / n)]);
  return out;
}
// A different number of squares across; the fog keeps its shape, tokens stay where they are on the picture.
export function setCols(m, cols) {
  const c = clamp(int(cols) ?? m.cols, MIN_COLS, MAX_COLS);
  if (c === m.cols) return m;
  const next = { ...m, cols: c };
  next.fog = resampleFog(m.fog, m.cols, rowsOf(m), c, rowsOf(next));
  return next;
}

// ── tokens ──
export function normalizeToken(t) {
  const x = t && typeof t === 'object' ? t : {};
  return { id: x.id ? String(x.id) : rid(), name: text(x.name, 60), color: COLOR_IDS.has(x.color) ? x.color : 'grey', kind: KINDS.includes(x.kind) ? x.kind : 'other',
    fx: clamp(num(x.fx, 0.5), 0, 1), fy: clamp(num(x.fy, 0.5), 0, 1), size: clamp(int(x.size) ?? 1, 1, 4), on: x.on !== false, cid: x.cid ? String(x.cid) : '' };
}

// A map out of the database, made safe to use.
export function normalizeMap(raw) {
  const x = raw && typeof raw === 'object' ? raw : {};
  const m = { id: x.id ? String(x.id) : '', name: text(x.name, 80) || 'Battle map', iw: Math.max(1, int(x.iw) ?? 1000), ih: Math.max(1, int(x.ih) ?? 1000),
    cols: clamp(int(x.cols) ?? 24, MIN_COLS, MAX_COLS), grid: x.grid !== false, fog: '', tokens: [], showTokens: x.showTokens !== false,
    parts: clamp(int(x.parts) ?? 0, 0, 12), imgAt: num(x.imgAt), createdAt: num(x.createdAt) };
  const want = m.cols * rowsOf(m);
  m.fog = typeof x.fog === 'string' && x.fog.length === want && /^[01]+$/.test(x.fog) ? x.fog : newFog(m.cols, rowsOf(m), false);
  const seen = new Set();
  m.tokens = (Array.isArray(x.tokens) ? x.tokens : []).filter((t) => t && typeof t === 'object').map(normalizeToken).filter((t) => !seen.has(t.id) && seen.add(t.id)).slice(0, MAX_TOKENS);
  return m;
}

// Where a token of this size comes to rest: its middle on the middle of a square (an odd size) or on a corner (an even one).
export function snap(m, fx, fy, size = 1) {
  const rows = rowsOf(m), s = clamp(int(size) ?? 1, 1, 4);
  const place = (v, n) => { const g = v * n; const at = s % 2 ? Math.floor(g) + 0.5 : Math.round(g); return clamp(at, s / 2, n - s / 2); };
  return { fx: place(fx, m.cols) / m.cols, fy: place(fy, rows) / rows };
}
export function cellOf(m, fx, fy) {
  const rows = rowsOf(m);
  return { c: clamp(Math.floor(fx * m.cols), 0, m.cols - 1), r: clamp(Math.floor(fy * rows), 0, rows - 1) };
}

// A token for something that is not in the fight (a door, an NPC, a boulder), or for a creature in it (give its id as cid).
export const makeToken = ({ name, color = 'grey', kind = 'other', cid = '', size = 1, on = true } = {}) => normalizeToken({ id: rid(), name, color, kind, cid, size, on });

// The first free spot, reading left to right from the top, for a token that has just been added.
export function placeNew(m, token) {
  const rows = rowsOf(m), taken = new Set(m.tokens.map((t) => { const { c, r } = cellOf(m, t.fx, t.fy); return `${c},${r}`; }));
  for (let r = 0; r < rows; r++) for (let c = 0; c < m.cols; c++) {
    if (taken.has(`${c},${r}`)) continue;
    const at = snap(m, (c + 0.5) / m.cols, (r + 0.5) / rows, token.size);
    return { ...token, fx: at.fx, fy: at.fy };
  }
  return token;
}
export function addToken(m, token) {
  if (m.tokens.length >= MAX_TOKENS) return { map: m, token: null };
  const t = placeNew(m, normalizeToken(token));
  return { map: { ...m, tokens: [...m.tokens, t] }, token: t };
}
// A token for each creature in the fight that has none yet (hidden ones start switched off for the table).
export function addFromFight(m, combat) {
  let map = m, added = 0;
  const linked = new Set(m.tokens.map((t) => t.cid).filter(Boolean));
  for (const x of (combat?.combatants || [])) {
    if (linked.has(x.id)) continue;
    const r = addToken(map, { id: rid(), name: x.name, color: x.color, kind: x.kind === 'player' ? 'player' : 'enemy', cid: x.id, size: 1, on: !x.hidden });
    if (r.token) { map = r.map; added++; }
  }
  return { map, added };
}
// Take away the tokens of creatures that have left the fight.
export function dropGone(m, combat) {
  const live = new Set((combat?.combatants || []).map((x) => x.id));
  const keep = m.tokens.filter((t) => !t.cid || live.has(t.cid));
  return { map: { ...m, tokens: keep }, removed: m.tokens.length - keep.length };
}
export function moveToken(m, id, fx, fy, { snapIt = true } = {}) {
  return { ...m, tokens: m.tokens.map((t) => {
    if (t.id !== id) return t;
    const at = snapIt ? snap(m, clamp(fx, 0, 1), clamp(fy, 0, 1), t.size) : { fx: clamp(fx, 0, 1), fy: clamp(fy, 0, 1) };
    return { ...t, fx: at.fx, fy: at.fy };
  }) };
}
export function updateToken(m, id, patch) {
  return { ...m, tokens: m.tokens.map((t) => {
    if (t.id !== id) return t;
    const n = normalizeToken({ ...t, ...patch });
    const at = patch.size != null && n.size !== t.size ? snap(m, n.fx, n.fy, n.size) : { fx: n.fx, fy: n.fy };
    return { ...n, fx: at.fx, fy: at.fy };
  }) };
}
export const removeToken = (m, id) => ({ ...m, tokens: m.tokens.filter((t) => t.id !== id) });

// The letters on a token: "Goblin 2" is G2, "Lyra" is Ly, "Young Red Dragon" is YR.
export function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const num = /^\d+$/.test(words[words.length - 1]) ? words.pop() : '';
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => w[0]).join('') : (words[0] || '').slice(0, num ? 1 : 2);
  const shown = words.length > 1 ? letters.toUpperCase() : letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
  return (shown + num) || num;
}

// How every token looks right now, for the DM's screen and for the table's. A token for a creature in the fight takes its name and
// colour from it, shows when it is that creature's turn, and shows when it is down. `shown` is whether the table sees it: only
// while tokens are on, only if it is switched on, not a creature the DM is hiding, and not an enemy standing in fog.
export function tokenStates(m, combat) {
  const bySlot = combat && combat.started ? (CD.slots(combat).find((sl) => sl.key === combat.turn) || null) : null;
  return m.tokens.map((t) => {
    const x = t.cid ? (combat?.combatants || []).find((c) => c.id === t.cid) : null;
    const name = x ? x.name : t.name, color = x ? x.color : t.color, kind = x ? (x.kind === 'player' ? 'player' : 'enemy') : t.kind;
    const { c, r } = cellOf(m, t.fx, t.fy), fogged = isFogged(m, c, r);
    const down = !!x && (CD.isDown(x) || (x.kind === 'player' && CD.isOut(x)));
    const current = !!x && !!bySlot && bySlot.members.some((mm) => mm.id === x.id);
    const shown = m.showTokens && t.on && !(x && x.hidden) && !(kind !== 'player' && fogged);
    return { id: t.id, cid: t.cid, name, label: initials(name), color, hex: CD.colorHex(color), kind, fx: t.fx, fy: t.fy, size: t.size, on: t.on, linked: !!x, gone: !!t.cid && !x, down, current, fogged, shown };
  });
}
