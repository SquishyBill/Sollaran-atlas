// The backpack: what a character carries (coins and things). All the coin maths lives here, in whole copper
// pieces, so it can be tested on its own and shared with the database rules (which check the same sums).
//
// Coins are kept as the four coin types, because that is how a table counts them (47 gp, 12 sp). Paying
// makes change by itself. Platinum is only ever held, never made: change is given in gold, silver and copper.

export const COIN_KEYS = ['pp', 'gp', 'sp', 'cp'];
export const COIN_CP = { pp: 1000, gp: 100, sp: 10, cp: 1 };
export const MAX_CP = 1000000000;          // the most a backpack can hold (10 million gold)

const whole = (n) => Math.max(0, Math.floor(Number(n) || 0));

// A tidy coin purse: the four coin types, as whole numbers of at least zero.
export const normalizeCoins = (c) => Object.fromEntries(COIN_KEYS.map((k) => [k, whole(c?.[k])]));

// What a purse is worth, in copper.
export const cpOf = (c) => COIN_KEYS.reduce((n, k) => n + whole(c?.[k]) * COIN_CP[k], 0);

// An amount of copper as coins, using gold, silver and copper (and platinum only if asked).
export function coinsOf(cp, withPlatinum = false) {
  let rest = whole(cp);
  const out = { pp: 0, gp: 0, sp: 0, cp: 0 };
  for (const k of withPlatinum ? COIN_KEYS : COIN_KEYS.slice(1)) { out[k] = Math.floor(rest / COIN_CP[k]); rest -= out[k] * COIN_CP[k]; }
  return out;
}

export const addCoins = (a, b) => Object.fromEntries(COIN_KEYS.map((k) => [k, whole(a?.[k]) + whole(b?.[k])]));

// "2 pp, 14 gp, 5 sp" (or "No coins")
export const coinText = (c) => COIN_KEYS.filter((k) => whole(c?.[k])).map((k) => `${whole(c[k]).toLocaleString()} ${k}`).join(', ') || 'No coins';

// A price in gold (which may be fractional: 0.5 gp is 5 sp) as whole copper.
export const gpToCp = (gp) => Math.max(0, Math.round((Number(gp) || 0) * 100));

// Copper as the gold-and-change wording used all over the atlas: "12 gp 5 sp 3 cp".
export const formatCp = (cp) => {
  cp = whole(Math.round(Number(cp) || 0));
  const gp = Math.floor(cp / 100), sp = Math.floor((cp % 100) / 10), c = cp % 10;
  return [gp && `${gp.toLocaleString()} gp`, sp && `${sp} sp`, c && `${c} cp`].filter(Boolean).join(' ') || '0 cp';
};

// Pay a price from a purse. Platinum is spent only when it has to be; any change comes back in gold,
// silver and copper. Returns { ok, coins } with the purse left over, or { ok: false, reason }.
export function pay(purse, costCp) {
  const have = cpOf(purse), cost = whole(costCp);
  if (cost > have) return { ok: false, reason: `That costs ${formatCp(cost)}, and the backpack holds ${formatCp(have)}.`, short: cost - have };
  return { ok: true, coins: leftOver(purse, have - cost) };
}

// Keep as much of the platinum as the new total allows, and give the rest as ordinary coins.
function leftOver(purse, totalCp) {
  const pp = Math.min(whole(purse?.pp), Math.floor(totalCp / COIN_CP.pp));
  return { ...coinsOf(totalCp - pp * COIN_CP.pp), pp };
}

// Receive an amount (in copper) into a purse: it is added as ordinary coins.
export const receive = (purse, cp) => addCoins(normalizeCoins(purse), coinsOf(cp));

// Take a particular set of coins out (the DM's "take 50 gp"). The purse must hold exactly those coins, or
// enough value that change can be made; coins are taken from the matching type first.
export function takeCoins(purse, take) {
  const p = normalizeCoins(purse), t = normalizeCoins(take);
  if (cpOf(t) > cpOf(p)) return { ok: false, reason: `The backpack holds ${coinText(p)}.` };
  if (COIN_KEYS.every((k) => t[k] <= p[k])) return { ok: true, coins: Object.fromEntries(COIN_KEYS.map((k) => [k, p[k] - t[k]])) };
  return pay(p, cpOf(t));
}

// Whole gold only, for places that count nothing smaller (Silvermere): how much of a purse can be handed
// over as whole gold, and what stays behind.
export function wholeGold(purse, wantedGp) {
  const have = Math.floor(cpOf(purse) / COIN_CP.gp);
  const gp = wantedGp == null ? have : Math.min(have, whole(wantedGp));
  const paid = pay(purse, gp * COIN_CP.gp);
  return { gp, left: paid.ok ? paid.coins : normalizeCoins(purse) };
}

// ── the record of every move ────────────────────────────────────────
// Each time coins move, a line is written to the ledger the DM can read. kind is what happened.
export const LEDGER_KINDS = {
  buy: 'Bought', writBuy: 'Bought a writ', repair: 'Repairs', service: 'Paid a fee', sell: 'Sold', writ: 'Cashed a writ',
  deposit: 'Savings deposit', withdraw: 'Savings withdrawal', loot: 'Found', split: 'A share of the coins',
  award: 'Given by the DM', set: 'Set by the DM', take: 'Taken by the DM', identify: 'Identified an item',
  bet: 'Gambling', home: 'Deposited at Silvermere', fromHome: 'Withdrawn from Silvermere', start: 'Starting coins',
};
// Kinds that put coins in (the rest take coins out).
export const INCOME_KINDS = ['sell', 'writ', 'withdraw', 'loot', 'split', 'award', 'fromHome', 'start'];

export function ledgerLine({ uid, owner, kind, deltaCp, balanceCp, text, ref = '' }, at = Date.now()) {
  return { uid, owner: String(owner || '').slice(0, 60), kind, deltaCp: Math.round(deltaCp), balanceCp: Math.round(balanceCp),
    text: String(text || LEDGER_KINDS[kind] || '').slice(0, 240), ref: String(ref || '').slice(0, 120), at };
}

// ── what is in a backpack ───────────────────────────────────────────
const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase() && String(a || '').trim() !== '';
// A loot item is in someone's backpack when they hold it, by account or (for items claimed before backpacks
// existed) by the name the DM claimed it for.
export const heldBy = (item, uid, name) => (!!item.holderUid && item.holderUid === uid) || (!item.holderUid && !!item.claimedBy && sameName(item.claimedBy, name));
