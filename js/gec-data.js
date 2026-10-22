// The Grand Exchange Consortium (the G.E.C.): coin exchange, writs of exchange, savings accounts and
// safety-deposit boxes. All the money maths lives here, in copper pieces (whole numbers), so it can be
// tested on its own. Time is real time for now: a "month" is 30 days.

export const COIN_CP = { gp: 100, sp: 10, cp: 1 };
export const EXCHANGE_FEE_CP = 5;      // every exchange costs 5 copper
export const WRIT_FEE = 0.05;          // 5% on a Writ of Exchange
export const INTEREST = 0.03;          // savings: 3% a month
export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 240;                // never loop for ever on a very old account

// Boxes rent by the month, paid from the savings account. Capacity is in "units":
// a small box holds 4 small items, or 2 medium, or 1 large (and the bigger boxes hold proportionally more).
export const BOXES = {
  small: { label: 'Small', fee: 500, cap: 4 },
  medium: { label: 'Medium', fee: 1000, cap: 8 },
  large: { label: 'Large', fee: 2000, cap: 16 },
};
export const ITEM_SIZES = {
  small: { label: 'Small', units: 1, hint: 'a potion, ring, scroll or pouch of gems' },
  medium: { label: 'Medium', units: 2, hint: 'a dagger, book, lantern or wand' },
  large: { label: 'Large', units: 4, hint: 'a longsword, shield, armor piece or small chest' },
};

export const formatCp = (cp) => {
  cp = Math.max(0, Math.round(Number(cp) || 0));
  const gp = Math.floor(cp / 100), sp = Math.floor((cp % 100) / 10), c = cp % 10;
  return [gp && `${gp.toLocaleString()} gp`, sp && `${sp} sp`, c && `${c} cp`].filter(Boolean).join(' ') || '0 cp';
};

// ── exchanging coins ────────────────────────────────────────────────
// 1 gp = 10 sp = 100 cp. The fee comes out of what you receive; change is paid in smaller coins.
export function exchangeQuote(from, to, amount) {
  const n = Math.floor(Number(amount));
  if (!(n > 0)) return { ok: false, reason: 'Enter how many coins to change.' };
  if (!COIN_CP[from] || !COIN_CP[to] || from === to) return { ok: false, reason: 'Choose two different coins.' };
  const inCp = n * COIN_CP[from];
  if (inCp <= EXCHANGE_FEE_CP) return { ok: false, reason: `That is too little to cover the ${EXCHANGE_FEE_CP} cp fee.` };
  let rest = inCp - EXCHANGE_FEE_CP;
  const coins = { gp: 0, sp: 0, cp: 0 };
  const order = ['gp', 'sp', 'cp'];
  for (const c of order.slice(order.indexOf(to))) { coins[c] = Math.floor(rest / COIN_CP[c]); rest -= coins[c] * COIN_CP[c]; }
  const text = order.filter((c) => coins[c]).map((c) => `${coins[c].toLocaleString()} ${c}`).join(' ');
  return { ok: true, inCp, fee: EXCHANGE_FEE_CP, coins, text, gave: `${n.toLocaleString()} ${from}` };
}

// ── writs ───────────────────────────────────────────────────────────
export function writQuote(gp) {
  const amount = Math.floor(Number(gp));
  if (!(amount >= 1)) return { ok: false, reason: 'A writ is for at least 1 gp.' };
  if (amount > 50000) return { ok: false, reason: 'The Consortium will not write a single writ for more than 50,000 gp.' };
  const fee = Math.round(amount * WRIT_FEE * 100) / 100;
  return { ok: true, amount, fee, total: Math.round((amount + fee) * 100) / 100 };
}

// ── savings accounts and boxes ──────────────────────────────────────
export const newAccount = (shopId, uid, owner, now) => ({ shopId, uid, owner, balance: 0, since: now, boxes: [], log: [], gamble: {} });

export const boxUsed = (box) => (box.items || []).reduce((n, i) => n + (Number(i.qty) || 0) * (ITEM_SIZES[i.size]?.units || 1), 0);
export const boxFits = (box, size, qty) => boxUsed(box) + qty * (ITEM_SIZES[size]?.units || 1) <= BOXES[box.size].cap;
export const newBox = (size, now, id) => ({ id: id || `b${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, size, rentedAt: now, paidThrough: now + MONTH_MS, locked: false, arrears: 0, items: [] });

const trimLog = (log) => log.slice(-30);

// Bring an account up to date with real time: interest every 30 days, and each box's monthly fee when it falls due.
// Returns a new account object (the original is not changed). A box whose fee can't be paid is locked, with the
// unpaid months counted, until the account is topped up and the arrears are paid.
export function settle(account, now) {
  const acc = JSON.parse(JSON.stringify(account));
  acc.boxes ||= []; acc.log ||= [];
  const events = [];
  for (let t = acc.since + MONTH_MS, i = 0; t <= now && i < MAX_EVENTS; t += MONTH_MS, i++) events.push({ t, kind: 'interest' });
  for (const box of acc.boxes) {
    for (let t = box.paidThrough, i = 0; t <= now && i < MAX_EVENTS; t += MONTH_MS, i++) events.push({ t, kind: 'fee', box });
  }
  events.sort((a, b) => a.t - b.t || (a.kind === 'interest' ? -1 : 1));
  for (const ev of events.slice(0, MAX_EVENTS)) {
    if (ev.kind === 'interest') {
      const add = Math.floor(acc.balance * INTEREST);
      if (add > 0) { acc.balance += add; acc.log.push({ at: ev.t, text: `Interest: +${formatCp(add)}` }); }
      acc.since = ev.t;
    } else {
      const box = ev.box, fee = BOXES[box.size].fee;
      box.paidThrough = ev.t + MONTH_MS;
      if (box.locked) { box.arrears = (box.arrears || 0) + 1; }
      else if (acc.balance >= fee) { acc.balance -= fee; acc.log.push({ at: ev.t, text: `${BOXES[box.size].label} box fee: −${formatCp(fee)}` }); }
      else { box.locked = true; box.arrears = 1; acc.log.push({ at: ev.t, text: `${BOXES[box.size].label} box fee unpaid, so the box is locked` }); }
    }
  }
  acc.log = trimLog(acc.log);
  return acc;
}

// Pay what a locked box owes (from the account) and unlock it.
export function payArrears(acc, boxId, now) {
  const next = JSON.parse(JSON.stringify(acc));
  const box = next.boxes.find((b) => b.id === boxId);
  if (!box || !box.locked) return { ok: false, reason: 'That box is not locked.' };
  const due = (box.arrears || 1) * BOXES[box.size].fee;
  if (next.balance < due) return { ok: false, reason: `You owe ${formatCp(due)} on that box, and the account holds ${formatCp(next.balance)}.`, due };
  next.balance -= due; box.locked = false; box.arrears = 0;
  next.log = trimLog([...next.log, { at: now, text: `Paid ${formatCp(due)} owed on a ${BOXES[box.size].label.toLowerCase()} box; unlocked` }]);
  return { ok: true, acc: next, due };
}

export const daysUntilInterest = (acc, now) => Math.max(0, Math.ceil((acc.since + MONTH_MS - now) / 86400000));
