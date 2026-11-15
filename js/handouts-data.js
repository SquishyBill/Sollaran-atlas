// Handouts: a letter, a map scrap, a riddle or a picture the DM shows to the players during play.
//
// The DM keeps the handouts (handouts/{id}, the DM's alone). Showing one writes a copy for each person it goes to
// (reveals/{id}__{who}, who being "all" or a player's uid), and that copy is what a player can read. Taking it back
// removes the copies. This file has the parts that need no database: tidying what is typed, working out which copies to
// write and remove, and telling a player what is new.

export const ALL = 'all';
export const TITLE_MAX = 120;
export const BODY_MAX = 20000;

const text = (v, n) => String(v ?? '').trim().slice(0, n);
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : 0);

export const revealId = (handoutId, to) => `${handoutId}__${to}`;

// What the DM typed, checked: { title, body } or { error }. A handout can be only a picture, so the words are optional when
// there is one.
export function handoutFrom(input, { hasPicture = false } = {}) {
  const title = text(input?.title, TITLE_MAX + 1), body = String(input?.body ?? '').replace(/\r/g, '').trim();
  if (!title) return { error: 'Give the handout a title.' };
  if (title.length > TITLE_MAX) return { error: `Keep the title under ${TITLE_MAX} letters.` };
  if (body.length > BODY_MAX) return { error: `That is too long for a handout (${BODY_MAX} letters at most).` };
  if (!body && !hasPicture) return { error: 'Write something, or add a picture.' };
  return { title, body };
}

// A handout (or the copy a player gets) out of the database, made safe to use.
const recipients = (v) => {
  const list = [...new Set((Array.isArray(v) ? v : []).map((x) => String(x || '').trim()).filter(Boolean))];
  return list.includes(ALL) ? [ALL] : list.slice(0, 60);
};
export function normalizeHandout(raw) {
  const x = raw && typeof raw === 'object' ? raw : {};
  return {
    id: x.id ? String(x.id) : '', title: text(x.title, TITLE_MAX), body: String(x.body ?? '').slice(0, BODY_MAX),
    picture: !!x.picture, pictureAt: num(x.pictureAt), image: text(x.image, 2000),
    sentTo: recipients(x.sentTo), sentAt: num(x.sentAt), createdAt: num(x.createdAt),
  };
}
export function normalizeReveal(raw) {
  const x = raw && typeof raw === 'object' ? raw : {};
  return {
    id: x.id ? String(x.id) : '', hid: text(x.hid, 80), to: text(x.to, 80), title: text(x.title, TITLE_MAX), body: String(x.body ?? '').slice(0, BODY_MAX),
    picture: !!x.picture, pictureAt: num(x.pictureAt), image: text(x.image, 2000), at: num(x.at),
  };
}

// The copy a player is given.
export function revealDoc(handout, to, at) {
  const h = normalizeHandout(handout);
  return { hid: h.id, to, title: h.title, body: h.body, picture: h.picture, pictureAt: h.pictureAt, image: h.image, at };
}

// Which copies to write and which to take away, to make a handout be shown to exactly `to` (a list of "all" and uids; empty
// takes it back from everyone). `again` gives the copies a new time, so players see it pop up again; without it, copies that
// are already out keep their time (an edit to the words reaches them quietly).
export function revealPlan(handout, to, now, { again = false, existing = [] } = {}) {
  const h = normalizeHandout(handout), want = recipients(to);
  const had = new Map(existing.map((r) => [r.id, normalizeReveal(r)]));
  const write = want.map((who) => {
    const id = revealId(h.id, who), old = had.get(id);
    return { id, doc: revealDoc(h, who, old && !again ? old.at : now) };
  });
  const keep = new Set(write.map((w) => w.id));
  const remove = [...new Set([...had.keys(), ...h.sentTo.map((who) => revealId(h.id, who))])].filter((id) => id.startsWith(`${h.id}__`) && !keep.has(id));
  return { sentTo: want, write, remove };
}

// Who a handout has been shown to, in words. names maps a player's uid to their name.
export function sentLabel(sentTo, names = {}) {
  const list = recipients(sentTo);
  if (!list.length) return 'Not shown';
  if (list[0] === ALL) return 'Everyone';
  const who = list.map((u) => names[u] || 'a player');
  return who.length <= 3 ? who.join(', ') : `${who.slice(0, 2).join(', ')} and ${who.length - 2} more`;
}

// What one player can read: their own copies and the ones for everyone, one line for each handout (the newest copy), newest first.
export function visibleTo(reveals, uid) {
  const best = new Map();
  for (const r of (Array.isArray(reveals) ? reveals : []).map(normalizeReveal)) {
    if (!r.hid || (r.to !== ALL && r.to !== uid)) continue;
    const old = best.get(r.hid);
    if (!old || r.at > old.at) best.set(r.hid, r);
  }
  return [...best.values()].sort((a, b) => b.at - a.at || a.title.localeCompare(b.title));
}

// seen is what this player has already opened: { handoutId: timeOfTheCopyTheyOpened }. Unread is anything new, or sent again since.
export const isUnread = (r, seen) => !(seen && Number(seen[r.hid]) >= r.at);
export const unreadOf = (list, seen) => list.filter((r) => isUnread(r, seen));

// Between two looks at the list, the ones that have just arrived (or were sent again): the ones to show at once.
// known maps handout id to the time of the copy last seen.
export function arrivals(list, known) {
  return list.filter((r) => !(r.hid in known) || r.at > known[r.hid]).sort((a, b) => a.at - b.at);
}
export const timesOf = (list) => Object.fromEntries(list.map((r) => [r.hid, r.at]));

// What goes into the browser's memory of what has been read: only handouts that still exist.
export function tidySeen(seen, list) {
  const out = {};
  for (const r of list) if (seen && seen[r.hid] != null) out[r.hid] = Number(seen[r.hid]) || 0;
  return out;
}
