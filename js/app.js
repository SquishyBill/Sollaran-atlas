import { CAMPAIGN, firebaseConfig } from './config.js';
import { renderMarkdown, esc, htmlToMarkdown } from './markdown.js';
import { COIN_CP, EXCHANGE_FEE_CP, BOXES, ITEM_SIZES, formatCp, exchangeQuote, writQuote, newAccount, newBox, boxUsed, boxFits, settle, payArrears, daysUntilInterest, MONTH_MS } from './gec-data.js';
import { EDGES, edgeById, GAMING_LIMITS, MIN_BET, GAMES, gameById, betOf, multiplier, play, resolveBet, today, PLEASURE_LEVELS, levelById, PLEASURE_SERVICES, visit, CURE } from './gaming-data.js';
import { generateNpc, rollPart, PEOPLES, AFFILIATIONS, GENDERS, AGES, WEALTH, ATTITUDES, affiliationById, OCCUPATIONS } from './npc-data.js';
import { SHOP_TYPES, SIZES, sizeById, generateShop, generateStock, renownTerms, formatPrice, nicePrice, shopWeek, HAGGLE, haggleResult, rng, REPAIR_TYPES, REPAIR_RARITIES, repairQuote, FESTIVALS, festivalStock, sellRate, catalogValue, sellRenown, SELL_LIMIT, SELL_WEEKLY, TRADE_LABEL, tradeCategory, regionProfile, regionMult } from './shop-data.js';
import { generateLoot, rerollLine, SETTINGS, MODES, SRD_MAGIC, RARITIES, coinValue } from './loot-data.js';
import { normalizeCoins, cpOf, coinsOf, receive as receiveCoins, pay as payCoins, takeCoins as takeFromPurse, addCoins as addPurse, splitEvenly, gpToCp, heldBy, LEDGER_KINDS } from './backpack-data.js';

// ─── helpers ────────────────────────────────────────────────────────
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const roman = (i) => ROMAN[i] || String(i + 1);
const safeImg = (u) => (u && /^(https?:|data:image\/|\.?\/?[\w-]+\/|[\w-]+\.(png|jpe?g|webp|gif|svg)$)/i.test(u) ? u : '');

function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  const units = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [604800, 'week'], [2629800, 'month'], [31557600, 'year']];
  let [div, name] = units[0];
  for (const u of units) if (s >= u[0]) [div, name] = u;
  const n = Math.floor(s / div);
  return `${n} ${name}${n > 1 ? 's' : ''} ago`;
}

// ─── pin kinds ──────────────────────────────────────────────────────
const KINDS = {
  city: { label: 'City', color: '#8e2b20', icon: '<path d="M3 21V10l3 1.5V7l3 1.5V4h6v4.5L18 7v4.5l3-1.5v11h-7v-4a2 2 0 0 0-4 0v4z"/>' },
  town: { label: 'Town', color: '#7a4a1c', icon: '<path d="M12 3l9 8h-2.5v10h-5v-6h-3v6h-5V11H3z"/>' },
  tavern: { label: 'Tavern & Inn', color: '#9a5b1e', icon: '<path d="M5 5h10v3h2.5A2.5 2.5 0 0 1 20 10.5v4a2.5 2.5 0 0 1-2.5 2.5H15v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM15 10v5h2.2v-5z" fill-rule="evenodd"/>' },
  temple: { label: 'Temple', color: '#4b5f86', icon: '<path d="M12 2l10 5v2H2V7zM4 10h3v8H4zM10.5 10h3v8h-3zM17 10h3v8h-3zM2 19h20v3H2z"/>' },
  dungeon: { label: 'Dungeon', color: '#2f2a3d', icon: '<path fill-rule="evenodd" d="M12 2.5c-4.7 0-8.5 3.4-8.5 8 0 2.7 1.3 4.8 3.3 6v3.2c0 .7.6 1.3 1.3 1.3h7.8c.7 0 1.3-.6 1.3-1.3v-3.2c2-1.2 3.3-3.3 3.3-6 0-4.6-3.8-8-8.5-8zM8.6 14.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zm6.8 0a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4z"/>' },
  ruin: { label: 'Ruin', color: '#5b5f63', icon: '<path d="M3 20h18v2H3zM4 8h4v11H4zM10 11h4v8h-4zM16 5h4v14h-4zM3 7l3-2 3 2zM15 4l2.5-1.8L21 4.5z"/>' },
  nature: { label: 'Wilds', color: '#3f5b2c', icon: '<path d="M12 2l5.5 7.5H15l4.5 6.5h-6v6h-3v-6h-6L9 9.5H6.5z"/>' },
  danger: { label: 'Danger', color: '#b5451b', icon: '<path d="M12 2c.8 3.6 5.5 5.7 5.5 11a5.5 5.5 0 0 1-11 0c0-2.8 1.6-4.6 2.7-6.3.5 1.8 1.4 2.9 2.6 3.3-.6-2.7-.4-5.3.2-8z"/>' },
  quest: { label: 'Quest', color: '#b8862b', icon: '<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z"/>' },
  camp: { label: 'Camp & Hideout', color: '#6b4f2a', icon: '<path d="M12 3L2 21h7.5L12 15l2.5 6H22z"/>' },
  place: { label: 'Landmark', color: '#6d3b4f', icon: '<circle cx="12" cy="12" r="5.5"/>' },
  shop: { label: 'Shop', color: '#8a5d14', icon: '<path d="M9 3h6l-1.5 3h-3zM6.5 7.5h11c2 2.4 3 5 3 7.8C20.5 19 17 21 12 21s-8.5-2-8.5-5.7c0-2.8 1-5.4 3-7.8zM12 10v8M14.3 11.6c-.6-.6-1.4-.9-2.3-.9-1.3 0-2.3.7-2.3 1.7 0 2.3 4.6 1.2 4.6 3.4 0 1-1 1.7-2.3 1.7-1 0-1.9-.4-2.5-1" fill-rule="evenodd"/>' },
};
const kindOf = (p) => KINDS[p.kind] || KINDS.place;
const glyph = (k, size = 16) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="fill:${k.color}" aria-hidden="true">${k.icon}</svg>`;

// ─── state ──────────────────────────────────────────────────────────
const S = {
  store: null,
  pages: [], pins: [], notes: [], secrets: {}, people: [], peopleQuery: '', pendingPerson: null,
  renown: [], renownLog: [], renownTiers: null, festivals: {}, sales: [], accounts: [], journal: [], scribes: [],
  shops: [], purchases: [], haggles: [], players: [], placeShop: null,
  loot: [], lootTruth: {}, lootLog: [], partyCoins: { cp: 0, sp: 0, gp: 0, pp: 0 }, caches: [], magicItems: [], magicPublic: [],
  backpacks: [], backpackLog: [], backpackCfg: {},
  pageId: null, pinId: null,
  panel: null,            // {type:'pin'|'about'|'editPin'|'editPage', id?, draft?}
  edit: false, pingMode: false, torch: false,
  map: null, overlay: null, markers: new Map(), ghost: null,
  imgSize: null, renderedImage: null, fitZoom: 0,
  turning: false, dropAnim: false,
  pendingPin: null, pendingPage: null, pendingPing: null, lastPing: 0,
};

const pageById = (id) => S.pages.find((p) => p.id === id);
const pinById = (id) => S.pins.find((p) => p.id === id);
const currentPage = () => pageById(S.pageId);
const pinsOn = (pageId) => S.pins.filter((p) => p.pageId === pageId);
const notesFor = (type, id) => S.notes.filter((n) => n.targetType === type && n.targetId === id)
  .sort((a, b) => a.createdAt - b.createdAt);
const myName = () => lsGet('atlas-name') || S.store?.displayName || '';
const isDM = () => !!S.store?.isDM;

function resolveLink(name) {
  const n = name.toLowerCase();
  const pin = S.pins.find((p) => p.title.toLowerCase() === n && pageById(p.pageId));
  if (pin) return { kind: 'pin', id: pin.id };
  const page = S.pages.find((p) => p.title.toLowerCase() === n);
  if (page) return { kind: 'page', id: page.id };
  const person = S.people.find((p) => p.name.toLowerCase() === n);
  return person ? { kind: 'person', id: person.id } : null;
}
const md = (text) => renderMarkdown(text, resolveLink);

// ─── boot ───────────────────────────────────────────────────────────
async function boot() {
  $('#atlasTitle').textContent = CAMPAIGN.title;
  document.title = CAMPAIGN.title;
  startEmbers();

  const configured = firebaseConfig.apiKey && !/^PASTE/.test(firebaseConfig.apiKey);
  try {
    if (configured) {
      const { FirebaseStore } = await import('./store-firebase.js');
      S.store = new FirebaseStore();
    } else {
      const { LocalStore } = await import('./store-local.js');
      S.store = new LocalStore();
    }
    await S.store.init();
  } catch (e) {
    console.error(e);
    $('#mapStatus').textContent = 'Could not open the atlas: ' + (e.message || e);
    $('#mapStatus').classList.add('show');
    return;
  }

  if (S.store.needsSignIn) { showGate(); return; }

  document.body.classList.toggle('is-dm', isDM());
  if (S.store.mode === 'local') $('#demoRibbon').hidden = false;
  updateFestBar();
  setupChrome();
  setupMap();
  S.store.subscribe({ pages: onPages, pins: onPins, notes: onNotes, secrets: onSecrets, people: onPeople, renown: onRenown, renownLog: onRenownLog, renownTiers: onRenownTiers, festivals: onFestivals, sales: onSales, accounts: onAccounts, journal: onJournal, scribes: onScribes, shops: onShops, purchases: onPurchases, haggles: onHaggles, players: onPlayers,
    loot: onLoot, lootTruth: onLootTruth,
    lootLog: (list) => { S.lootLog = list; refreshLootViews(); },
    partyCoins: (c) => { S.partyCoins = c; refreshLootViews(); },
    caches: (list) => { S.caches = list; refreshLootViews(); },
    magicItems: (list) => { S.magicItems = list; if (S.panel?.type === 'magicLib') renderPanel(); },
    magicPublic: (list) => { S.magicPublic = list; if (S.panel?.type === 'shop') renderPanel(); },
    backpacks: onBackpacks, backpackLog: onBackpackLog, backpackCfg: onBackpackCfg,
    ping: onPing, error: onError });
  // every player has a backpack from their first visit, so the DM can see who is in the party
  if (!isDM()) S.store.ensureBackpack(myName()).catch((e) => console.warn('Could not set up the backpack:', e));
}

// Full-screen welcome: sign in with Google, or (when the party list is on) a polite refusal.
function showGate(refused) {
  const gate = $('#gate');
  gate.hidden = false;
  $('#gateTitle').textContent = CAMPAIGN.title;
  const msg = $('#gateMsg'), btn = $('#gateBtn');
  if (refused) {
    msg.textContent = `${S.store.email} isn't on this campaign's party list. Ask your DM to add you, or sign in with a different Google account.`;
    btn.textContent = 'Use a different account';
    btn.onclick = () => S.store.signOut();
  } else {
    msg.textContent = CAMPAIGN.tagline + '. Sign in with your Google account to open the atlas.';
    btn.textContent = 'Sign in with Google';
    btn.onclick = () => S.store.signIn().catch((e) => {
      if (e.code !== 'auth/popup-closed-by-user') msg.textContent = 'Sign-in failed: ' + e.message;
    });
  }
}

let refusedShown = false;
function onError(e) {
  console.error(e);
  if (e.code === 'permission-denied' && !isDM() && !S.pages.length && !refusedShown) {
    refusedShown = true;
    showGate(true);
    return;
  }
  toast(e.code === 'permission-denied'
    ? 'The atlas refused that request. Check firestore.rules and the DM email list.'
    : 'Connection trouble: ' + (e.message || e));
}

// ─── data arrival ───────────────────────────────────────────────────
// Pages form a tree through their `parent` field. S.pages holds them depth-first
// (each page followed by its sub-maps), which is also the page-turning order.
// Each page gets `_depth` and `_parent` (the parent actually used: '' at the top level).
function orderPages(list) {
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0);
  const ids = new Set(list.map((p) => p.id));
  const kids = new Map();
  for (const p of list) {
    const par = p.parent && p.parent !== p.id && ids.has(p.parent) ? p.parent : '';
    if (!kids.has(par)) kids.set(par, []);
    kids.get(par).push(p);
  }
  const out = [], seen = new Set();
  const walk = (par, depth) => {
    for (const p of (kids.get(par) || []).sort(byOrder)) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      Object.assign(p, { _depth: depth, _parent: par });
      out.push(p);
      walk(p.id, depth + 1);
    }
  };
  walk('', 0);
  // pages stuck in a parent loop are never reached from the top: list them at the top level
  for (const p of [...list].sort(byOrder)) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    Object.assign(p, { _depth: 0, _parent: '' });
    out.push(p);
    walk(p.id, 1);
  }
  return out;
}

const childrenOf = (id) => S.pages.filter((p) => p._parent === id);
function ancestorsOf(id) {
  const out = [];
  for (let p = pageById(id); p?._parent; p = pageById(p._parent)) out.push(p._parent);
  return out;
}
const descendantsOf = (id) => S.pages.filter((p) => ancestorsOf(p.id).includes(id)).map((p) => p.id);

function onPages(list) {
  S.pages = orderPages(list);
  renderTOC();
  if (S.pendingPage && pageById(S.pendingPage)) {
    const id = S.pendingPage; S.pendingPage = null;
    goToPage(id, { instant: !S.pageId });
    return;
  }
  if (!S.pageId || !currentPage()) {
    const hash = parseHash();
    const start = pageById(hash.p) ? hash.p : S.pages[0]?.id;
    if (hash.pin) S.pendingPin = hash.pin;
    if (hash.person) S.pendingPerson = hash.person;
    if (start) goToPage(start, { instant: true });
    else renderEmptyAtlas();
    return;
  }
  renderPageChrome();
  const page = currentPage();
  if (page.type === 'map') { if (page.image !== S.renderedImage) loadMap(page); }
  else if (S.panel?.type !== 'editPage') renderDoc(page);
  if (S.panel?.type === 'about') renderPanel();
}

function onPins(list) {
  S.pins = list;
  renderMarkers();
  if (S.pendingPin && pinById(S.pendingPin)?.pageId === S.pageId && S.imgSize) {
    const id = S.pendingPin; S.pendingPin = null; openPin(id, { fly: true });
  }
  if (S.panel?.type === 'pin') {
    if (!pinById(S.panel.id) && !S.panel.saving) closePanel(); else renderPanel();
  }
  const page = currentPage();
  if (page?.type === 'doc' && S.panel?.type !== 'editPage') renderDoc(page); // wiki links may now resolve
}

// Renown changes refresh whichever panel shows it (not the tier editor, so edits aren't lost).
function refreshRenownViews() {
  if (['renown', 'renownDetail', 'about', 'people'].includes(S.panel?.type)) renderPanel();
}
function onRenown(list) { S.renown = list; refreshRenownViews(); if (['shop', 'shopGen'].includes(S.panel?.type)) renderPanel(); }
function onShops(list) {
  S.shops = list;
  if (['shop', 'market', 'pin', 'about'].includes(S.panel?.type)) renderPanel();
}
function onPurchases(list) { S.purchases = list; if (['shop', 'market'].includes(S.panel?.type)) renderPanel(); }
function onJournal(list) { S.journal = list; if (S.panel?.type === 'journal') renderPanel(); }
function onScribes(list) { S.scribes = (list || []).map((e) => String(e).toLowerCase()); if (S.panel?.type === 'journal') renderPanel(); }
function onAccounts(list) { S.accounts = list; if (S.panel?.type === 'shop') renderPanel(); }
function onSales(list) { S.sales = list; if (['shop', 'market', 'sell'].includes(S.panel?.type)) renderPanel(); }
function onHaggles(list) { S.haggles = list; if (['shop', 'market'].includes(S.panel?.type)) renderPanel(); }
function onPlayers(list) { S.players = list; if (S.panel?.type === 'market') renderPanel(); }
function onRenownLog(list) { S.renownLog = list; if (S.panel?.type === 'renownDetail') renderPanel(); }
function onRenownTiers(tiers) { S.renownTiers = tiers; refreshRenownViews(); }

// Festivals the DM has switched on (Market → Festivals). They add specials to shop stock for a while.
const activeFestivals = () => Object.keys(FESTIVALS).filter((id) => S.festivals?.[id]);
function onFestivals(f) {
  S.festivals = f || {};
  updateFestBar();
  if (['shop', 'market'].includes(S.panel?.type)) renderPanel();
}
function updateFestBar() {
  const bar = $('#festBar');
  if (!bar) return;
  const on = activeFestivals();
  bar.hidden = !on.length;
  bar.textContent = on.map((id) => `\u2726 ${FESTIVALS[id].label}`).join('  \u00b7  ');
  bar.onclick = () => openMarket('shops');
}
const festivalNotes = () => activeFestivals().map((id) => h('p', { class: 'fest-note' }, h('strong', { text: `\u2726 ${FESTIVALS[id].label}` }), FESTIVALS[id].blurb));
// The town's market for trade goods: what's cheap here and what it will pay well for.
// The settlement a place belongs to, so a district pin on a city's map, a pin that opens that city's map, and the
// city's own page all count as the same town; inns inside it do too. A pin on a dukedom's own map with no map of
// its own is a town in itself. (Dukedoms are the top level, and cities and towns sit under them.)
const WORLD_MAPS = ['sollara-political', 'sollara'];
function settlementOf(ref) {
  const r = String(ref || '');
  let pageId = null, pin = null;
  if (r.startsWith('pin:')) { pin = pinById(r.slice(4)); if (pin) pageId = pin.linkPage && pageById(pin.linkPage) ? pin.linkPage : pin.pageId; }
  else if (r.startsWith('page:')) pageId = r.slice(5);
  const page = pageId && pageById(pageId);
  if (!page) return { key: r || 'somewhere', label: placeOf(r)?.label || r || 'somewhere' };
  const chain = [...ancestorsOf(pageId).reverse(), pageId];  // root first: dukedom, city, building (the world maps are not a place to live)
  while (chain.length > 1 && WORLD_MAPS.includes(chain[0])) chain.shift();
  if (pin && !pin.linkPage && chain.length <= 1) return { key: `pin:${pin.id}`, label: pin.title };
  const home = pageById(chain[1] || chain[0]);
  return { key: `page:${home.id}`, label: home.title };
}
const placeKeyOf = (shop) => settlementOf(shop.location).label;
function marketNote(shop) {
  const pr = regionProfile(placeKeyOf(shop));
  const list = (cats) => cats.map((c) => TRADE_LABEL[c]).join(', ');
  if (!pr.cheap.length && !pr.dear.length) return null;
  return h('p', { class: 'market-note' }, 'In this market: ',
    pr.cheap.length ? h('span', {}, h('b', { text: 'cheap' }), ` ${list(pr.cheap)}`) : null,
    pr.cheap.length && pr.dear.length ? '; ' : null,
    pr.dear.length ? h('span', {}, h('b', { text: 'dear' }), ` ${list(pr.dear)}`) : null, '.');
}
function festivalControls() {
  return h('div', { class: 'festivals' }, h('strong', { text: 'Festivals' }),
    ...Object.entries(FESTIVALS).map(([id, f]) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !!S.festivals?.[id], onchange: (e) => S.store.saveFestivals({ ...S.festivals, [id]: e.target.checked }).catch((err) => toast('Could not change it: ' + err.message)) }),
      ` ${f.label}`)));
}

function onSecrets(list) {
  S.secrets = Object.fromEntries(list.map((s) => [s.id, s.text]));
  if (['pin', 'about', 'person', 'renownDetail'].includes(S.panel?.type)) renderPanel();
  const page = currentPage();
  if (page?.type === 'doc' && S.panel?.type !== 'editPage') renderDoc(page);
}

// The DM's private box on a pin or page. Only rendered for the DM, and only the DM ever receives the text.
function secretBox(id) {
  const text = isDM() && S.secrets[id];
  return text ? h('aside', { class: 'secret' }, h('h4', { text: 'DM only' }), h('div', { class: 'prose', html: md(text) })) : null;
}

function secretField(id) {
  const ta = h('textarea', { name: 'secret', rows: 5, placeholder: "Plots, true motives, what players don't know yet…" });
  ta.value = (id && S.secrets[id]) || '';
  return field('DM secrets (players never receive this)', ta);
}

async function saveSecret(id, fd) {
  const text = fd.get('secret') || '';
  if ((S.secrets[id] || '') !== text) await S.store.saveSecret(id, text);
}

function onNotes(list) {
  S.notes = list;
  $$('.notes[data-target]').forEach(fillNotes);
  renderMarkers();
}

// ─── table of contents ──────────────────────────────────────────────
// Which branches the reader has opened (remembered per browser). Turning to a page
// opens the branch holding it.
const tocOpen = new Set((() => { try { return JSON.parse(lsGet('atlas-toc-open')) || []; } catch { return []; } })());
function toggleBranch(id) {
  tocOpen.has(id) ? tocOpen.delete(id) : tocOpen.add(id);
  lsSet('atlas-toc-open', JSON.stringify([...tocOpen]));
  renderTOC();
}

function renderTOC() {
  const ol = $('#tocList');
  ol.replaceChildren();
  const isOpen = (id) => tocOpen.has(id);
  let hideBelow = Infinity; // depth under a closed branch
  S.pages.forEach((p, i) => {
    if (p._depth > hideBelow) return;
    hideBelow = Infinity;
    const kids = childrenOf(p.id);
    const open = kids.length && isOpen(p.id);
    if (kids.length && !open) hideBelow = p._depth;

    const sibs = childrenOf(p._parent);
    const si = sibs.indexOf(p);
    const thumb = p.type === 'map' && safeImg(p.image)
      ? h('img', { src: p.image, alt: '', loading: 'lazy' })
      : h('span', { class: 'toc-doc', html: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/></svg>' });
    const toggle = kids.length
      ? h('button', {
        class: `toc-toggle${open ? ' open' : ''}`, 'aria-expanded': open ? 'true' : 'false',
        title: `${open ? 'Hide' : 'Show'} ${kids.length} map${kids.length > 1 ? 's' : ''} inside`,
        'aria-label': `${open ? 'Collapse' : 'Expand'} ${p.title}`, onclick: () => toggleBranch(p.id),
        html: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
      })
      : h('span', { class: 'toc-toggle none' });
    const li = h('li', {
      class: `toc-item${p.id === S.pageId ? ' current' : ''}${p.hidden ? ' hidden-page' : ''}${p._depth ? ' nested' : ''}`,
      style: `--depth:${p._depth}`, 'data-id': p.id,
    },
      toggle,
      h('button', { class: 'toc-link', onclick: () => { closeTOC(); goToPage(p.id); } },
        h('span', { class: 'toc-num', text: roman(i) }),
        h('span', { class: 'toc-thumb' }, thumb),
        h('span', { class: 'toc-text' },
          h('strong', { text: p.title }),
          h('small', { text: (p.hidden ? 'Hidden · ' : '') + (kids.length && !open ? `${kids.length} inside · ` : '') + (p.subtitle || (p.type === 'map' ? 'Map' : 'Document')) }))),
      isDM() ? h('span', { class: 'toc-order' },
        h('button', { title: 'Move up', 'aria-label': 'Move up', disabled: si <= 0, onclick: () => moveSibling(p, -1), text: '▲' }),
        h('button', { title: 'Move down', 'aria-label': 'Move down', disabled: si >= sibs.length - 1, onclick: () => moveSibling(p, 1), text: '▼' })) : null);
    ol.append(li);
  });
}

// ▲/▼ move a page among the pages that share its parent (its sub-maps come along).
async function moveSibling(p, delta) {
  const sibs = childrenOf(p._parent);
  const i = sibs.indexOf(p), j = i + delta;
  if (i < 0 || j < 0 || j >= sibs.length) return;
  [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
  await Promise.all(sibs.map((s, k) => (s.order === k ? null : S.store.savePage({ order: k }, s.id))));
}

function openTOC() { document.body.classList.add('toc-open'); }
function closeTOC() { document.body.classList.remove('toc-open'); }

// ─── page navigation ────────────────────────────────────────────────
function goToPage(id, { dir, instant } = {}) {
  const page = pageById(id);
  if (!page) return;
  if (id === S.pageId) { renderPage(); return; }
  if (S.turning) return;
  const from = S.pages.findIndex((p) => p.id === S.pageId);
  const to = S.pages.findIndex((p) => p.id === id);
  dir ||= to < from ? 'prev' : 'next';

  // keep a pin that's about to open, and a person opened from a link while the first page loads
  if (S.panel && S.pageId != null && !(S.panel.type === 'pin' && S.pendingPin === S.panel.id)) closePanel(true);
  const swap = () => { S.pageId = id; renderPage(); };
  if (instant || reduced || S.pageId == null) { swap(); return; }

  S.turning = true;
  const pv = $('#pageView');
  pv.classList.add(`turn-out-${dir}`);
  setTimeout(() => {
    pv.classList.remove(`turn-out-${dir}`);
    swap();
    pv.classList.add(`turn-in-${dir}`);
    setTimeout(() => {
      pv.classList.remove(`turn-in-${dir}`);
      S.turning = false;
      S.map?.invalidateSize();
    }, 520);
  }, 360);
}

function step(delta) {
  const i = S.pages.findIndex((p) => p.id === S.pageId);
  const next = S.pages[i + delta];
  if (next) goToPage(next.id, { dir: delta > 0 ? 'next' : 'prev' });
}

function renderPageChrome() {
  const page = currentPage();
  if (!page) return;
  const i = S.pages.indexOf(page);
  const parent = page._parent && pageById(page._parent);
  $('#pageTitle').textContent = (parent ? `${parent.title.replace(/^Dukedom of /, '')} › ` : '') + page.title + (page.hidden ? ' (hidden)' : '');
  $('#folio').textContent = `${roman(i)} of ${roman(S.pages.length - 1)}`;
  $('#prevBtn').disabled = $('#cornerPrev').disabled = i <= 0;
  $('#nextBtn').disabled = $('#cornerNext').disabled = i >= S.pages.length - 1;
  document.body.classList.toggle('on-map', page.type === 'map');
  // open the branch holding this page (the reader can still close it afterwards)
  const path = ancestorsOf(page.id).filter((id) => !tocOpen.has(id));
  if (path.length) { path.forEach((id) => tocOpen.add(id)); lsSet('atlas-toc-open', JSON.stringify([...tocOpen])); }
  renderTOC();
  updateHash();
}

function renderPage() {
  const page = currentPage();
  if (!page) return;
  renderPageChrome();
  const tab = $('#aboutTab');
  tab.hidden = !(page.type === 'map' && page.body?.trim());
  tab.textContent = `About ${page.title.replace(/^Dukedom of /, '')}`;
  if (page.type === 'map') {
    $('#docView').hidden = true;
    $('#mapWrap').hidden = false;
    loadMap(page);
  } else {
    $('#mapWrap').hidden = true;
    $('#docView').hidden = false;
    setPingMode(false);
    renderDoc(page);
    if (S.pendingPin) S.pendingPin = null;
  }
}

function renderEmptyAtlas() {
  $('#mapWrap').hidden = true;
  const doc = $('#docView');
  doc.hidden = false;
  doc.replaceChildren(h('div', { class: 'doc-inner empty' },
    h('h1', { class: 'doc-title', text: 'An empty atlas' }),
    h('p', { text: isDM() ? 'Open the contents menu and add your first map.' : 'The Dungeon Master hasn\'t added any pages yet.' }),
    isDM() ? h('div', { class: 'row', style: 'justify-content:center' },
      S.store.importSeed ? h('button', { class: 'btn', text: 'Import the starter atlas', onclick: importSeed }) : null,
      h('button', { class: 'btn ghost', text: 'Add a blank page', onclick: () => openPageEditor(null) })) : null));
  $('#pageTitle').textContent = '';
  $('#folio').textContent = '';
}

async function importSeed(e) {
  const btn = e.currentTarget;
  btn.disabled = true; btn.textContent = 'Importing…';
  try {
    const { SEED } = await import('./seed.js');
    await S.store.importSeed(SEED);
    toast('Starter atlas imported.');
  } catch (err) {
    toast('Import failed: ' + err.message);
    btn.disabled = false; btn.textContent = 'Try the import again';
  }
}

// Adds only what's new in js/seed.js (pages, pins, secrets the atlas doesn't have yet) plus its PATCHES.
// Existing pages, pins, notes and edits are left alone. Runs from the local copy, where seed.js exists.
async function syncSeed(e) {
  const btn = e.currentTarget;
  btn.disabled = true; btn.textContent = 'Importing…';
  try {
    const { SEED, PATCHES = [] } = await import(`./seed.js?v=${Date.now()}`);
    const missing = (obj, has) => Object.fromEntries(Object.entries(obj || {}).filter(([id]) => !has(id)));
    const add = {
      pages: missing(SEED.pages, pageById),
      pins: missing(SEED.pins, pinById),
      secrets: missing(SEED.secrets, (id) => id in S.secrets),
      people: missing(SEED.people, personById),
    };
    const counts = [Object.keys(add.pages).length, Object.keys(add.pins).length, Object.keys(add.secrets).length, Object.keys(add.people).length];
    if (counts.some(Boolean)) await S.store.importSeed(add);
    // Patches only fill in fields that are still unset, so they never undo the DM's own edits.
    let patched = 0;
    for (const { col, id, data } of PATCHES) {
      const target = col === 'pins' ? pinById(id) : col === 'pages' ? pageById(id) : null;
      if (!target) continue;
      const fill = Object.fromEntries(Object.entries(data).filter(([k]) => target[k] === undefined));
      if (!Object.keys(fill).length) continue;
      await (col === 'pins' ? S.store.savePin(fill, id) : S.store.savePage(fill, id));
      patched++;
    }
    toast(`Added ${counts[0]} pages, ${counts[1]} pins, ${counts[3]} people and ${counts[2]} secrets; updated ${patched} existing pins/pages.`);
  } catch (err) {
    toast('Import failed: ' + err.message);
  }
  btn.disabled = false; btn.textContent = 'Import new starter content';
}

// ─── the map ────────────────────────────────────────────────────────
function setupMap() {
  S.map = L.map('map', {
    crs: L.CRS.Simple, zoomSnap: 0.05, zoomDelta: 0.5, wheelPxPerZoomLevel: 90,
    attributionControl: false, zoomControl: false, maxBoundsViscosity: 0.85,
    inertia: true, bounceAtZoomLimits: false,
  });
  L.control.zoom({ position: 'bottomright' }).addTo(S.map);

  S.map.on('click', (e) => {
    if (!S.imgSize) return;
    if (S.pingMode) { ping(e.latlng); return; }
    if (S.placeShop && isDM()) { placeShopPin(fromLatLng(e.latlng)); return; }
    if (S.edit && isDM()) { openPinEditor(null, fromLatLng(e.latlng)); return; }
    if (S.panel?.type === 'pin') closePanel();
  });
  S.map.on('contextmenu', (e) => { if (S.imgSize) ping(e.latlng); });

  const compass = $('#compass');
  let lastCenter = null;
  S.map.on('move', () => {
    const c = S.map.getCenter();
    if (lastCenter) {
      const dx = c.lng - lastCenter.lng;
      const tilt = Math.max(-35, Math.min(35, dx * 0.4));
      compass.style.setProperty('--tilt', `${tilt}deg`);
    }
    lastCenter = c;
  });
  S.map.on('moveend', () => { compass.style.setProperty('--tilt', '0deg'); lastCenter = null; });
  S.map.on('zoomend', () => {
    $('#mapWrap').classList.toggle('far', S.map.getZoom() < S.fitZoom - 0.1);
  });

  const wrap = $('#mapWrap');
  const torch = $('#torch');
  const moveTorch = (x, y) => {
    const r = wrap.getBoundingClientRect();
    torch.style.setProperty('--tx', `${x - r.left}px`);
    torch.style.setProperty('--ty', `${y - r.top}px`);
  };
  wrap.addEventListener('pointermove', (e) => { if (S.torch) moveTorch(e.clientX, e.clientY); });

  new ResizeObserver(() => {
    if (!S.imgSize) return;
    if (S.flying) { S.map.invalidateSize(); return; }
    // never fitted yet (loaded while hidden), or reader hasn't zoomed: keep it fitted
    const wasFit = !S.fitted || Math.abs(S.map.getZoom() - S.fitZoom) < 0.06;
    S.map.invalidateSize();
    fitLimits(wasFit);
  }).observe(wrap);
}

const toLatLng = (x, y) => L.latLng(S.imgSize.h * (1 - y), S.imgSize.w * x);
function fromLatLng(ll) {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  return { x: clamp(ll.lng / S.imgSize.w), y: clamp(1 - ll.lat / S.imgSize.h) };
}

function fitLimits(refit) {
  const size = S.map.getSize();
  if (!size.x || !size.y) return; // hidden (background tab): fit once we have a size
  const b = L.latLngBounds([0, 0], [S.imgSize.h, S.imgSize.w]);
  S.map.options.minZoom = -20; // getBoundsZoom clamps to the current limits, so lift them first
  S.map.options.maxZoom = 20;
  const fit = S.map.getBoundsZoom(b, false, L.point(24, 24));
  if (!Number.isFinite(fit)) return;
  S.fitZoom = fit;
  S.map.setMinZoom(fit - 0.75);
  S.map.setMaxZoom(fit + 3.5);
  S.map.setMaxBounds(b.pad(isPhone() ? 1 : 0.25)); // phones need room to lift pins above the sheet
  if (refit) { S.map.fitBounds(b, { animate: false, padding: [12, 12] }); S.fitted = true; }
  $('#mapWrap').classList.toggle('far', S.map.getZoom() < S.fitZoom - 0.1);
}

function loadMap(page) {
  const status = $('#mapStatus');
  const url = safeImg(page.image);
  $('#mapWrap').classList.toggle('no-labels', !page.labels);
  S.map.invalidateSize();
  if (url && url === S.renderedImage && S.overlay) {
    renderMarkers();
    afterMapReady();
    return;
  }
  S.overlay?.remove(); S.overlay = null;
  S.imgSize = null; S.renderedImage = null; S.fitted = false;
  renderMarkers();
  if (!url) {
    status.textContent = isDM() ? 'This map has no image yet. Open "About" and edit the page to add one.' : 'This map has not been drawn yet.';
    status.classList.add('show');
    return;
  }
  status.textContent = 'Unrolling the map…';
  status.classList.add('show', 'loading');
  const img = new Image();
  img.onload = () => {
    if (S.pageId !== page.id) return;
    status.classList.remove('show', 'loading');
    S.imgSize = { w: img.naturalWidth, h: img.naturalHeight };
    S.overlay = L.imageOverlay(url, [[0, 0], [S.imgSize.h, S.imgSize.w]], { className: 'map-img' }).addTo(S.map);
    S.renderedImage = url;
    S.map.invalidateSize();
    fitLimits(true);
    S.dropAnim = !reduced;
    renderMarkers();
    afterMapReady();
  };
  img.onerror = () => {
    status.textContent = `Couldn't load the image "${page.image}". Check the path or URL.`;
    status.classList.remove('loading');
  };
  img.src = url;
}

function afterMapReady() {
  if (S.pendingPin) {
    const pin = pinById(S.pendingPin);
    if (pin?.pageId === S.pageId) { S.pendingPin = null; openPin(pin.id, { fly: true }); }
  }
  if (S.pendingPing?.pageId === S.pageId) { showRipple(S.pendingPing); S.pendingPing = null; }
}

function pinHTML(p, count, idx) {
  const k = kindOf(p);
  const cls = ['pin', p.hidden && 'is-hidden', p.id === S.pinId && 'is-active', idx >= 0 && 'drop'].filter(Boolean).join(' ');
  return `<div class="${cls}" style="--c:${k.color};--d:${Math.max(0, idx) * 70}ms">
    <svg viewBox="0 0 44 56" class="pin-svg" aria-hidden="true">
      <path class="pin-body" d="M22 54C22 54 4 35 4 21a18 18 0 0 1 36 0c0 14-18 33-18 33z"/>
      <path class="pin-shine" d="M11 13a13 13 0 0 1 9-6"/>
      <circle cx="22" cy="21" r="12.5" class="pin-face"/>
      <g transform="translate(12.4 11.4) scale(.8)" class="pin-glyph">${k.icon}</g>
    </svg>
    ${count ? `<span class="pin-count">${count}</span>` : ''}
    <span class="pin-label">${esc(p.title)}</span>
  </div>`;
}

function renderMarkers() {
  for (const m of S.markers.values()) m.remove();
  S.markers.clear();
  const page = currentPage();
  if (!S.imgSize || page?.type !== 'map') return;
  pinsOn(page.id).forEach((p, i) => {
    const count = notesFor('pin', p.id).length;
    const icon = L.divIcon({ className: 'pin-wrap', html: pinHTML(p, count, S.dropAnim ? i : -1), iconSize: [44, 56], iconAnchor: [22, 54] });
    const m = L.marker(toLatLng(p.x, p.y), { icon, draggable: S.edit && isDM(), title: p.title, riseOnHover: true, keyboard: true }).addTo(S.map);
    m.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (S.pingMode) { ping(m.getLatLng()); return; }
      openPin(p.id);
    });
    m.on('dragend', () => {
      S.store.savePin(fromLatLng(m.getLatLng()), p.id).catch((err) => toast('Could not move the pin: ' + err.message));
    });
    S.markers.set(p.id, m);
  });
  S.dropAnim = false;
}

function highlightPin() {
  for (const [id, m] of S.markers) m.getElement()?.querySelector('.pin')?.classList.toggle('is-active', id === S.pinId);
}

// ─── pings ──────────────────────────────────────────────────────────
function ping(latlng) {
  setPingMode(false);
  const { x, y } = fromLatLng(latlng);
  S.store.sendPing({ pageId: S.pageId, x, y, by: myName() || (isDM() ? 'The DM' : 'Someone') })
    .catch((e) => toast('Ping failed: ' + e.message));
}

function onPing(p) {
  if (!p?.at || p.at <= S.lastPing) return;
  S.lastPing = p.at;
  if (Date.now() - p.at > 60_000) return; // stale ping from a previous session
  const page = pageById(p.pageId);
  if (!page) return;
  if (p.pageId === S.pageId && S.imgSize) { showRipple(p); return; }
  toast(`${p.by} is pointing at something on "${page.title}"`, 'Go there', () => {
    S.pendingPing = p;
    goToPage(p.pageId);
  });
}

function showRipple(p) {
  const ll = toLatLng(p.x, p.y);
  if (!S.map.getBounds().pad(-0.1).contains(ll)) S.map.panTo(ll);
  const icon = L.divIcon({
    className: 'ping-wrap', iconSize: [160, 160], iconAnchor: [80, 80],
    html: `<div class="ping"><i></i><i></i><i></i><b>${esc(p.by)}</b></div>`,
  });
  const m = L.marker(ll, { icon, interactive: false, zIndexOffset: 2000 }).addTo(S.map);
  setTimeout(() => m.remove(), 4200);
}

function setPingMode(on) {
  S.pingMode = on;
  $('#pingBtn').classList.toggle('on', on);
  if (on && S.edit) setEdit(false);
  modeHint();
}

function setEdit(on) {
  S.edit = on && isDM();
  $('#editBtn').classList.toggle('on', S.edit);
  document.body.classList.toggle('editing', S.edit);
  if (S.edit && S.pingMode) setPingMode(false);
  renderMarkers();
  modeHint();
}

function modeHint() {
  const hint = $('#modeHint');
  const text = S.pingMode ? 'Click the map to ping that spot for everyone. Press Esc to cancel.'
    : S.placeShop ? `Click the map where ${shopById(S.placeShop)?.name || 'the shop'} stands. Press Esc to skip.`
    : S.edit ? 'Edit mode: click the map to add a location. Drag pins to move them.' : '';
  hint.textContent = text;
  hint.classList.toggle('show', !!text);
  $('#mapWrap').classList.toggle('crosshair', S.pingMode || S.edit || !!S.placeShop);
}

// ─── the codex panel ────────────────────────────────────────────────
function openPin(id, { fly } = {}) {
  const pin = pinById(id);
  if (!pin) return;
  if (pin.pageId !== S.pageId) {
    S.pendingPin = id;
    goToPage(pin.pageId);
    return;
  }
  S.pinId = id;
  S.panel = pin.shopId && shopById(pin.shopId) ? { type: 'shop', id: pin.shopId } : { type: 'pin', id };
  renderPanel();
  highlightPin();
  updateHash();
  if (fly && S.imgSize) {
    const target = toLatLng(pin.x, pin.y);
    const z = Math.max(S.map.getZoom(), S.fitZoom + 1);
    if (reduced) { S.map.setView(target, z, { animate: false }); keepPinInView(); return; }
    S.flying = true;
    S.map.once('moveend', () => { S.flying = false; keepPinInView(); });
    S.map.flyTo(target, z, { duration: 0.9 });
  }
}

function openAbout() {
  const page = currentPage();
  if (!page) return;
  if (S.panel?.type === 'about') { closePanel(); return; }
  S.pinId = null; highlightPin();
  S.panel = { type: 'about', id: page.id };
  renderPanel();
}

function closePanel(silent) {
  S.panel = null;
  S.pinId = null;
  S.ghost?.remove(); S.ghost = null;
  $('#panel').classList.remove('open');
  document.body.classList.remove('panel-open');
  highlightPin();
  if (!silent) updateHash();
  setTimeout(() => S.map?.invalidateSize(), 380);
}

function renderPanel() {
  const body = $('#panelBody');
  const scroll = body.scrollTop;
  const sameView = body.dataset.view === `${S.panel.type}:${S.panel.id}`;
  body.replaceChildren();
  body.dataset.view = `${S.panel.type}:${S.panel.id}`;
  const views = { pin: pinView, about: aboutView, editPin: pinEditor, editPage: pageEditor, people: peopleView, person: personView, editPerson: personEditor,
    journal: journalView, journalEdit: journalEditView, sell: sellView, npcGen: npcGenView, renown: renownView, renownDetail: renownDetailView, renownTiers: renownTiersView,
    shop: shopView, shopGen: shopGenView, shopEdit: shopEditView, market: marketView, backpack: backpackView,
    lootGen: lootGenView, magicLib: magicLibView, magicEdit: magicEditView };
  body.append(views[S.panel.type]());
  if (sameView) body.scrollTop = scroll; else body.scrollTop = 0;
  const wasOpen = $('#panel').classList.contains('open');
  $('#panel').classList.add('open');
  document.body.classList.add('panel-open');
  if (!wasOpen) setTimeout(() => { S.map?.invalidateSize(); keepPinInView(); }, 400);
}

const isPhone = () => matchMedia('(max-width: 760px)').matches;

function keepPinInView() {
  const pin = S.pinId && pinById(S.pinId);
  if (!pin || !S.imgSize || pin.pageId !== S.pageId || S.flying) return;
  // on phones the codex is a bottom sheet, so keep the pin in the strip above it
  const size = S.map.getSize();
  const pt = S.map.latLngToContainerPoint(toLatLng(pin.x, pin.y));
  const box = { l: 50, t: 70, r: size.x - 50, b: size.y - (isPhone() && S.panel ? $('#panel').offsetHeight + 10 : 80) };
  const dx = pt.x < box.l ? pt.x - box.l : pt.x > box.r ? pt.x - box.r : 0;
  const dy = pt.y < box.t ? pt.y - box.t : pt.y > box.b ? pt.y - box.b : 0;
  if (dx || dy) S.map.panBy([dx, dy], { animate: !reduced });
}

function pinView() {
  const p = pinById(S.panel.id);
  if (!p) return h('p', { class: 'muted', text: 'Inscribing…' });
  const k = kindOf(p);
  const link = p.linkPage && pageById(p.linkPage);
  return h('div', { class: 'codex' },
    pictureImg(p, 'codex-img'),
    h('div', { class: 'codex-kind', style: `--c:${k.color}`, html: `${glyph(k, 18)}<span>${esc(k.label)}${p.hidden ? ' · Hidden from players' : ''}</span>` }),
    h('h2', { class: 'codex-title', text: p.title }),
    h('div', { class: 'codex-actions' },
      link ? h('button', { class: 'btn', onclick: () => goToPage(link.id) }, `Open ${link.type === 'map' ? 'map' : 'page'}: ${link.title} →`) : null,
      h('button', { class: 'btn ghost', text: 'Center on map', onclick: () => openPin(p.id, { fly: true }) }),
      h('button', { class: 'btn ghost', text: 'Copy link', onclick: () => copyLink(p) }),
      isDM() ? h('button', { class: 'btn ghost', text: 'Edit', onclick: () => openPinEditor(p.id) }) : null),
    h('div', { class: 'prose', html: md(p.body) || '<p class="muted">Nothing is known of this place… yet.</p>' }),
    SETTLEMENT_KINDS.includes(p.kind) ? renownCard(`pin:${p.id}`) : null,
    peopleHere(peopleAt('pin', p.id), `pin:${p.id}`),
    shopsHere(shopsAt('pin', p.id), `pin:${p.id}`),
    cachesHere(cachesAt('pin', p.id), `pin:${p.id}`),
    secretBox(p.id),
    h('div', { class: 'ornament', 'aria-hidden': 'true' }),
    notesSection('pin', p.id));
}

function aboutView() {
  const page = currentPage();
  return h('div', { class: 'codex' },
    h('div', { class: 'codex-kind', html: `<span>${page.type === 'map' ? 'Map' : 'Document'} · Page ${roman(S.pages.indexOf(page))}${page.hidden ? ' · Hidden from players' : ''}</span>` }),
    h('h2', { class: 'codex-title', text: page.title }),
    page.subtitle ? h('p', { class: 'codex-sub', text: page.subtitle }) : null,
    renownCard(`page:${page.id}`),
    isDM() ? h('div', { class: 'codex-actions' },
      h('button', { class: 'btn ghost', text: 'Edit page', onclick: () => openPageEditor(page.id) })) : null,
    page.type === 'map' ? h('div', { class: 'prose', html: md(page.body) }) : null,
    peopleHere(peopleAt('page', page.id), `page:${page.id}`),
    shopsHere(shopsAt('page', page.id), `page:${page.id}`),
    cachesHere(cachesAt('page', page.id), `page:${page.id}`),
    secretBox(page.id),
    page.type === 'map' && pinsOn(page.id).length ? legend(page) : null,
    h('div', { class: 'ornament', 'aria-hidden': 'true' }),
    notesSection('page', page.id));
}

function legend(page) {
  const pins = pinsOn(page.id).sort((a, b) => a.title.localeCompare(b.title));
  return h('details', { class: 'legend' },
    h('summary', { text: `Places on this map (${pins.length})` }),
    h('ul', {}, pins.map((p) => h('li', {},
      h('button', { class: 'legend-item', onclick: () => openPin(p.id, { fly: true }), html: `${glyph(kindOf(p))}<span>${esc(p.title)}</span>` })))));
}

async function copyLink(p) {
  const url = `${location.origin}${location.pathname}#p=${p.pageId}&pin=${p.id}`;
  try { await navigator.clipboard.writeText(url); toast('Link copied. Paste it in your group chat.'); }
  catch { toast(url); }
}

// ─── people ─────────────────────────────────────────────────────────
// A register of NPCs, separate from the maps. Each person lists the places they're
// found ("pin:<id>" or "page:<id>"), and those places list them back.
const personById = (id) => S.people.find((p) => p.id === id);
// sort by the name itself, ignoring titles like "Duke" or "The"
const HONORIFIC = /^(The|Duke|Duchess|Lord|Lady|Sir|Dame|Captain|Father|Mother|Brother|Sister)\s+/i;
const byName = (a, b) => a.name.replace(HONORIFIC, '').localeCompare(b.name.replace(HONORIFIC, ''));

function onPeople(list) {
  S.people = list.sort(byName);
  if (S.pendingPerson && personById(S.pendingPerson)) {
    const id = S.pendingPerson; S.pendingPerson = null; openPerson(id);
  } else if (['people', 'person', 'pin', 'about'].includes(S.panel?.type)) {
    if (S.panel.type === 'person' && !personById(S.panel.id) && !S.panel.saving) openPeople(); else renderPanel();
  }
}

// people found at a pin, or anywhere on a page (the page itself or any pin on it)
function peopleAt(type, id) {
  return S.people.filter((p) => (p.places || []).some((ref) => {
    if (ref === `${type}:${id}`) return true;
    return type === 'page' && ref.startsWith('pin:') && pinById(ref.slice(4))?.pageId === id;
  }));
}

function placeInfo(ref) {
  const [type, id] = ref.split(':');
  if (type === 'pin') {
    const pin = pinById(id);
    return pin && pageById(pin.pageId) && { label: pin.title, sub: pageById(pin.pageId).title.replace(/^Dukedom of /, ''), go: () => openPin(id, { fly: true }) };
  }
  const page = pageById(id);
  return page && { label: page.title, sub: page.type === 'map' ? 'Map' : 'Document', go: () => goToPage(id) };
}

function avatarHTML(p, cls = 'avatar') {
  if (safeImg(p.image)) return `<span class="${cls}"><img src="${esc(p.image)}" alt=""></span>`;
  const initials = p.name.replace(HONORIFIC, '')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return `<span class="${cls} seal">${esc(initials || '?')}</span>`;
}

function personRow(p) {
  return h('button', { class: `person-row${p.hidden ? ' is-hidden' : ''}`, onclick: () => openPerson(p.id) },
    h('span', { html: avatarHTML(p) }),
    h('span', { class: 'person-text' },
      h('strong', { text: p.name }),
      h('small', { text: [p.hidden ? 'Hidden' : '', p.title].filter(Boolean).join(' · ') || ' ' })));
}

function peopleHere(list, placeRef) {
  if (!list.length && !isDM()) return null;
  return h('section', { class: 'people-here' },
    h('h3', { class: 'notes-title', text: `People here${list.length ? ` (${list.length})` : ''}` }),
    list.map(personRow),
    isDM() ? h('button', { class: 'btn small ghost', text: '+ Add a person here', onclick: () => openPersonEditor(null, [placeRef]) }) : null);
}

function openPeople() {
  S.pinId = null; highlightPin();
  S.panel = { type: 'people', id: 'all' };
  renderPanel();
  updateHash();
  if (!isPhone()) $('#panelBody .people-search')?.focus();
}

function openPerson(id) {
  if (!personById(id)) return;
  S.pinId = null; highlightPin();
  S.panel = { type: 'person', id };
  renderPanel();
  updateHash();
}

// Which People groups the reader has opened (remembered per browser).
const groupsOpen = new Set((() => { try { return JSON.parse(lsGet('atlas-people-open')) || []; } catch { return []; } })());
function toggleGroup(g) {
  groupsOpen.has(g) ? groupsOpen.delete(g) : groupsOpen.add(g);
  lsSet('atlas-people-open', JSON.stringify([...groupsOpen]));
}

// Groups nest with " / ": "Emmett / The Roosting Crow" sits inside "Emmett".
const GROUP_SEP = ' / ';
const normGroup = (g) => (g || '').split('/').map((s) => s.trim()).filter(Boolean).join(GROUP_SEP);
const groupLabel = (g) => normGroup(g).split(GROUP_SEP).join(' › ');

function groupTree(people) {
  const root = { children: new Map(), people: [] };
  for (const p of people) {
    let node = root;
    const parts = (normGroup(p.group) || 'Others').split(GROUP_SEP);
    parts.forEach((name, i) => {
      if (!node.children.has(name)) node.children.set(name, { name, path: parts.slice(0, i + 1).join(GROUP_SEP), children: new Map(), people: [] });
      node = node.children.get(name);
    });
    node.people.push(p);
  }
  return root;
}
const sortedChildren = (node) => [...node.children.values()]
  .sort((a, b) => (a.name === 'Others') - (b.name === 'Others') || a.name.localeCompare(b.name));
const groupCount = (node) => node.people.length + [...node.children.values()].reduce((n, c) => n + groupCount(c), 0);

// Every group path in use, including parents that only hold other groups.
function allGroupPaths() {
  const paths = new Set();
  for (const p of S.people) {
    const parts = normGroup(p.group).split(GROUP_SEP).filter(Boolean);
    parts.forEach((_, i) => paths.add(parts.slice(0, i + 1).join(GROUP_SEP)));
  }
  return [...paths].sort((a, b) => a.localeCompare(b));
}

// Rename or move a group (and everything inside it) by editing its path.
async function renameGroup(path) {
  const answer = prompt(`Rename or move "${groupLabel(path)}" and everyone in it.\n\nUse / to put it inside another group, e.g. Emmett / The Roosting Crow`, path);
  const next = normGroup(answer);
  if (!next || next === path) return;
  if ((next + GROUP_SEP).startsWith(path + GROUP_SEP)) { toast("A group can't go inside itself."); return; }
  const affected = S.people.filter((p) => { const g = normGroup(p.group); return g === path || g.startsWith(path + GROUP_SEP); });
  try {
    await Promise.all(affected.map((p) => S.store.savePerson({ group: next + normGroup(p.group).slice(path.length) }, p.id)));
    const moving = S.renown.filter((r) => r.key === `group:${path}` || r.key.startsWith(`group:${path}${GROUP_SEP}`));
    await Promise.all(moving.map((r) => S.store.moveRenown(r.key, `group:${next}${r.key.slice(`group:${path}`.length)}`)));
  } catch (e) { toast('Could not move the group: ' + e.message); return; }
  // keep it (and its parents) open in its new spot
  next.split(GROUP_SEP).forEach((_, i, parts) => groupsOpen.add(parts.slice(0, i + 1).join(GROUP_SEP)));
  lsSet('atlas-people-open', JSON.stringify([...groupsOpen]));
  toast(`Moved ${affected.length} ${affected.length === 1 ? 'person' : 'people'} to "${groupLabel(next)}".`);
  if (S.panel?.type === 'people') renderPanel();
}

function peopleView() {
  const list = h('div', { class: 'people-list' });
  const search = h('input', { type: 'search', class: 'people-search', placeholder: 'Search people, titles, groups, places…', value: S.peopleQuery });
  const fill = () => {
    const words = S.peopleQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = S.people.filter((p) => {
      const text = [p.name, p.title, p.group, p.body, ...(p.places || []).map((r) => placeInfo(r)?.label)].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    });
    // groups start closed; a search opens every group with a match
    const searching = words.length > 0;
    const renderGroup = (node, depth) => {
      const open = searching || groupsOpen.has(node.path);
      return h('section', { class: `people-group${open ? ' open' : ''}${depth ? ' sub' : ''}` },
        h('div', { class: 'group-row' },
          h('button', {
            class: 'group-head', 'aria-expanded': open ? 'true' : 'false',
            onclick: () => { toggleGroup(node.path); fill(); },
            html: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg><span>${esc(node.name)}</span>${renownFor(`group:${node.path}`) ? renownBadge(renownFor(`group:${node.path}`)) : ''}<em>${groupCount(node)}</em>`,
          }),
          isDM() && node.path !== 'Others' ? h('button', {
            class: 'group-edit', title: 'Rename or move this group', 'aria-label': `Rename or move ${node.name}`,
            onclick: () => renameGroup(node.path), text: '✎',
          }) : null),
        open ? [
          ...node.people.sort(byName).map(personRow),
          ...sortedChildren(node).map((child) => renderGroup(child, depth + 1)),
        ] : null);
    };
    list.replaceChildren(...(matches.length
      ? sortedChildren(groupTree(matches)).map((node) => renderGroup(node, 0))
      : [h('p', { class: 'muted', text: S.people.length ? 'No one matches that.' : 'No one has been added yet.' })]));
  };
  search.addEventListener('input', () => { S.peopleQuery = search.value; fill(); });
  fill();
  return h('div', { class: 'codex' },
    h('div', { class: 'codex-kind', html: '<span>Dramatis Personae</span>' }),
    h('h2', { class: 'codex-title', text: 'People of the Realm' }),
    h('p', { class: 'codex-sub', text: `${S.people.length} ${S.people.length === 1 ? 'person' : 'people'} known` }),
    isDM() ? h('div', { class: 'codex-actions' },
      h('button', { class: 'btn', text: '+ Add a person', onclick: () => openPersonEditor(null, []) }),
      h('button', { class: 'btn ghost', text: 'Generate an NPC', onclick: () => openNpcGen() })) : null,
    search,
    list);
}

function personView() {
  const p = personById(S.panel.id);
  if (!p) return h('p', { class: 'muted', text: 'Inscribing…' });
  const places = (p.places || []).map((ref) => placeInfo(ref)).filter(Boolean);
  return h('div', { class: 'codex' },
    h('button', { class: 'linklike back', text: '← All people', onclick: openPeople }),
    h('div', { class: 'person-head' },
      h('span', { html: avatarHTML(p, 'avatar big') }),
      h('div', {},
        h('div', { class: 'codex-kind', html: `<span>${esc(groupLabel(p.group) || 'Person')}${p.hidden ? ' · Hidden from players' : ''}</span>` }),
        h('h2', { class: 'codex-title', text: p.name }),
        p.title ? h('p', { class: 'codex-sub', text: p.title }) : null)),
    h('div', { class: 'codex-actions' },
      h('button', { class: 'btn ghost', text: 'Copy link', onclick: () => copyPersonLink(p) }),
      isDM() ? h('button', { class: 'btn ghost', text: 'Edit', onclick: () => openPersonEditor(p.id) }) : null),
    places.length ? h('div', { class: 'found-at' },
      h('h4', { text: 'Found at' }),
      places.map((pl) => h('button', { class: 'place-chip', onclick: pl.go }, h('strong', { text: pl.label }), h('small', { text: pl.sub })))) : null,
    h('div', { class: 'prose', html: md(p.body) || '<p class="muted">Little is known of them… yet.</p>' }),
    secretBox(p.id),
    h('div', { class: 'ornament', 'aria-hidden': 'true' }),
    notesSection('person', p.id));
}

async function copyPersonLink(p) {
  const url = `${location.origin}${location.pathname}#p=${S.pageId}&person=${p.id}`;
  try { await navigator.clipboard.writeText(url); toast('Link copied. Paste it in your group chat.'); }
  catch { toast(url); }
}

function openPersonEditor(id, places) {
  S.panel = { type: 'editPerson', id: id || 'new', places };
  renderPanel();
  $('#panelBody input[name=name]')?.focus();
}

// Chips for the places a person is found, plus a type-ahead to add more.
function placePicker(initial) {
  const refs = [...initial];
  const box = h('div', { class: 'place-picker' });
  const chips = h('div', { class: 'chips' });
  const options = [
    ...S.pages.map((pg) => [`${pg.title} (whole page)`, `page:${pg.id}`]),
    ...S.pins.filter((pin) => pageById(pin.pageId)).map((pin) => [`${pin.title} — ${pageById(pin.pageId).title}`, `pin:${pin.id}`]),
  ];
  const listId = 'place-options';
  const input = h('input', { type: 'text', list: listId, placeholder: 'Type a place or map name…' });
  const draw = () => chips.replaceChildren(...refs.map((ref) => {
    const info = placeInfo(ref);
    return h('span', { class: 'chip' }, info ? `${info.label} · ${info.sub}` : '(deleted place)',
      h('button', { type: 'button', 'aria-label': 'Remove', text: '×', onclick: () => { refs.splice(refs.indexOf(ref), 1); draw(); } }));
  }));
  input.addEventListener('change', () => {
    const hit = options.find(([label]) => label === input.value);
    if (hit && !refs.includes(hit[1])) refs.push(hit[1]);
    input.value = '';
    draw();
  });
  draw();
  box.append(chips, input, h('datalist', { id: listId }, options.map(([label]) => h('option', { value: label }))));
  box.getRefs = () => refs;
  return box;
}

// Square-crop and shrink a picked image so it can live inside the person's record
// (no file storage needed). Crops a little above center, where faces usually are.
async function shrinkPortrait(file, size = 256) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const w = img.naturalWidth, hgt = img.naturalHeight, s = Math.min(w, hgt);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (w - s) / 2, (hgt - s) * 0.3, s, s, 0, 0, size, size);
    const webp = c.toDataURL('image/webp', 0.82);
    return webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function portraitField(value) {
  let current = value || '';
  const hidden = h('input', { type: 'hidden', name: 'image', value: current });
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const box = h('div', { class: 'portrait-drop', tabindex: '0', role: 'button', 'aria-label': 'Choose a portrait image' });
  const remove = h('button', { type: 'button', class: 'btn small ghost', text: 'Remove' });
  const link = h('input', { type: 'text', placeholder: 'or paste an image link', value: current.startsWith('data:') ? '' : current });
  const set = (v) => { current = v; hidden.value = v; draw(); };
  const draw = () => {
    box.innerHTML = current && safeImg(current) ? `<img src="${esc(current)}" alt="">` : '<span>Click or drop<br>a picture</span>';
    remove.hidden = !current;
  };
  const load = async (f) => {
    if (!f || !f.type.startsWith('image/')) { toast("That file isn't an image."); return; }
    box.classList.add('busy');
    try { set(await shrinkPortrait(f)); link.value = ''; }
    catch { toast("Couldn't read that image. Try a PNG or JPG."); }
    box.classList.remove('busy');
  };
  box.addEventListener('click', () => file.click());
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('over'); });
  box.addEventListener('dragleave', () => box.classList.remove('over'));
  box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('over'); load(e.dataTransfer.files[0]); });
  file.addEventListener('change', () => load(file.files[0]));
  remove.addEventListener('click', () => { set(''); link.value = ''; });
  link.addEventListener('change', () => set(link.value.trim()));
  draw();
  return field('Portrait', h('div', { class: 'portrait-field' },
    box,
    h('div', { class: 'portrait-side' },
      h('small', { text: 'Any picture works; it is cropped to a square and shrunk to a small portrait.' }),
      link, remove),
    file, hidden));
}

// Free-text group with the existing groups offered as one-click buttons.
// (Not a <label>: clicking a group button must not focus/trigger anything else.)
function groupField(value, groups) {
  const input = h('input', { name: 'group', maxlength: 120, value: normGroup(value), placeholder: 'Type a new group, e.g. Emmett / The Roosting Crow' });
  const chips = h('div', { class: 'group-chips' });
  const inside = h('button', { type: 'button', class: 'btn small ghost', hidden: true });
  const draw = () => {
    const cur = normGroup(input.value);
    chips.replaceChildren(...groups.map((g) => h('button', {
      type: 'button', class: `group-chip${cur === g ? ' on' : ''}`,
      title: groupLabel(g), text: (g.includes(GROUP_SEP) ? '↳ ' : '') + g.split(GROUP_SEP).pop(),
      onclick: () => { input.value = cur === g ? '' : g; draw(); },
    })));
    // once a group is picked, offer to start a new group inside it
    inside.hidden = !groups.includes(cur);
    inside.textContent = `+ New group inside ${cur.split(GROUP_SEP).pop()}`;
    inside.onclick = () => { input.value = cur + GROUP_SEP; input.focus(); draw(); };
  };
  input.addEventListener('input', draw);
  draw();
  return h('div', { class: 'field' },
    h('span', { text: 'Group' }),
    input,
    groups.length ? h('small', { text: 'Or pick an existing group:' }) : null,
    chips,
    inside,
    h('small', { text: 'Typing a name that isn’t listed creates a new group. Use / to put a group inside another, e.g. "Emmett / The Roosting Crow". Leave it blank to list them under "Others".' }));
}

function personEditor() {
  const isNew = S.panel.id === 'new';
  const p = isNew ? { name: '', title: '', group: '', image: '', body: '', hidden: false, places: S.panel.places || [] } : personById(S.panel.id);
  if (!p) return h('p', { text: 'This person no longer exists.' });
  const groups = allGroupPaths();
  const body = h('textarea', { name: 'body', rows: 8 }); body.value = p.body || '';
  const picker = placePicker(p.places || []);
  const form = h('form', { class: 'editor' },
    h('h2', { class: 'codex-title', text: isNew ? 'Add a person' : 'Edit person' }),
    field('Name', h('input', { name: 'name', required: true, maxlength: 120, value: p.name })),
    field('Title or role', h('input', { name: 'title', maxlength: 160, value: p.title || '', placeholder: 'e.g. Duke of Harthall, "The Gilded Lion"' })),
    groupField(p.group || '', groups),
    portraitField(p.image),
    field('Found at', picker, 'Places this person can be found. They show up in each place\'s "People here".'),
    field('Description', body, 'Formatting: **bold**, *italic*, - list items, &gt; quote, [[Link to a place or person]].'),
    secretField(isNew ? null : p.id),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'hidden', checked: !!p.hidden }), ' Hidden from players (DM only)'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'submit', text: isNew ? 'Add person' : 'Save' }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => (isNew ? openPeople() : openPerson(p.id)) }),
      !isNew ? h('button', { class: 'btn danger', type: 'button', text: 'Delete', onclick: async () => {
        if (!confirm(`Remove ${p.name} from the atlas?`)) return;
        await S.store.deletePerson(p.id).catch((e) => toast(e.message));
        openPeople();
      } }) : null));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      name: fd.get('name').trim(), title: fd.get('title').trim(), group: normGroup(fd.get('group')),
      image: fd.get('image').trim(), body: fd.get('body'), hidden: fd.get('hidden') === 'on', places: picker.getRefs(),
    };
    try {
      if (isNew) {
        S.panel = { type: 'person', id: null, saving: true };
        const id = await S.store.savePerson(data);
        await saveSecret(id, fd);
        openPerson(id);
        if (!personById(id)) S.pendingPerson = id;
      } else {
        await S.store.savePerson(data, p.id);
        await saveSecret(p.id, fd);
        openPerson(p.id);
      }
    } catch (err) { toast('Could not save: ' + err.message); }
  });
  return form;
}

// ─── selling to a shop ──────────────────────────────────────────────
// Anything a player buys goes into the party's Loot as "goods". The DM can give it to a character; until then
// any player can sell it. The DM can also sell found loot. What a shop pays is the item's value times its rate,
// moved by the town's market (cheap where it's made, dear where it's scarce), the party's standing and the seller's
// haggle. A shop can only absorb so much in a sale and in a week. The coins go to the party purse (DM sales)
// or are owed to the player (recorded in the ledger, like a purchase).
const gpToCoins = (gp) => { const cp = Math.round(gp * 100); return { pp: 0, gp: Math.floor(cp / 100), sp: Math.floor((cp % 100) / 10), cp: cp % 10 }; };

// What a purchase becomes in Loot. mine: it goes straight into the buyer's backpack instead of the party stash.
function goodsDoc(shop, item, qty, buyer, mine) {
  const place = placeOf(shop.location), now = Date.now();
  return { kind: 'goods', name: item.name, detail: '', value: item.price, cost: item.cost, qty, status: 'identified',
    source: `Bought at ${shop.name}${place ? ` in ${place.label}` : ''}`, boughtBy: buyer, boughtByUid: S.store.uid, boughtAt: now, foundAt: now,
    cat: tradeCategory(item.name), fromPlace: placeKeyOf(shop),
    ...(mine ? { holderUid: myUid(), claimedBy: buyer, claimedAt: now } : {}) };
}

// Put a purchase into the party stash. Returns true if it landed.
async function stashGoods(shop, item, qty, buyer) {
  try {
    await S.store.saveLoot(goodsDoc(shop, item, qty, buyer, false));
    return true;
  } catch (e) { toast('Bought, but it couldn\u2019t be added to the party\u2019s Loot: ' + e.message); return false; }
}

function openSell(id) {
  S.panel = { type: 'sell', id, shopId: '', qty: 0, unit: '' };
  renderPanel();
}

function sellOffer(shop, x, worth) {
  const rate = sellRate(shop.type, x);
  const rn = renownAt(shop.location);
  const standing = sellRenown(rn?.r.score ?? 0, !!SHOP_TYPES[shop.type]?.inverse);
  const cat = x.cat || tradeCategory(x.name);
  const region = cat ? regionMult(placeKeyOf(shop), cat) : 1;
  const wk = shopWeek(shop).week;
  // a player's own haggle here works both ways: a good roll earns more when selling
  const mine = x.kind === 'goods' && !isDM() ? S.haggles.find((g) => g.shopId === shop.id && g.week === wk && g.uid === S.store.uid) : null;
  const haggle = mine ? Math.min(1.2, Math.max(0.8, 2 - mine.mult)) : 1;
  const soldThisWeek = S.sales.filter((s) => s.shopId === shop.id && s.week === wk).reduce((n, s) => n + (Number(s.total) || 0), 0);
  const room = Math.max(0, (SELL_WEEKLY[shop.size] || SELL_WEEKLY[2]) - soldThisWeek);
  return { rate, standing, region, haggle, room, cat, unit: standing.refuses ? 0 : nicePrice(worth * rate * standing.mult * region * haggle) };
}

function sellView() {
  const P = S.panel, x = S.loot.find((l) => l.id === P.id), dm = isDM();
  const back = h('button', { class: 'linklike back', text: '\u2190 Back to Loot', onclick: () => openMarket('loot') });
  if (!x) return h('div', { class: 'codex' }, back, h('p', { class: 'muted', text: 'That item is no longer in Loot.' }));
  if (!dm && (x.kind !== 'goods' || (x.claimedBy && !heldMine(x)))) return h('div', { class: 'codex' }, back, h('p', { class: 'muted', text: 'Only your DM can sell that.' }));
  const have = x.qty || 1;
  const listed = Number(x.value) || 0, fromCatalog = listed ? null : catalogValue(x.name);
  const base = listed || fromCatalog || (x.kind === 'gear' ? 1 : 0);
  const worth = dm && P.unit !== '' && P.unit != null ? Math.max(0, Number(P.unit) || 0) : base;
  const qty = Math.min(have, Math.max(1, P.qty || have));
  const shops = S.shops.filter((s) => dm || !s.hidden);
  const buyers = shops.map((shop) => ({ shop, o: sellOffer(shop, x, worth) })).filter((b) => b.o.rate > 0)
    .sort((p, q) => q.o.unit - p.o.unit);
  const chosen = buyers.find((b) => b.shop.id === P.shopId) || buyers[0];

  let offer = null;
  if (chosen) {
    const { shop, o } = chosen, place = placeOf(shop.location), limit = SELL_LIMIT[shop.size] || SELL_LIMIT[2];
    const total = Math.round(o.unit * qty * 100) / 100;
    const problem = o.standing.refuses ? `${shop.name} won\u2019t deal with the party.`
      : !worth ? 'Set what it is worth first.'
      : total > limit ? `That\u2019s more than a ${sizeById(shop.size).name.toLowerCase()} shop can pay in one sale (up to ${formatPrice(limit)}). Sell fewer, or find a bigger town.`
      : total > o.room ? `${shop.name} has bought about as much as it can this week (${formatPrice(o.room)} left). Try next week, or another town.` : '';
    const paid = Number(x.cost);
    const gain = x.kind === 'goods' && paid >= 0 && o.unit ? Math.round((o.unit - paid) * qty * 100) / 100 : null;
    const note = [
      `${formatPrice(worth)} each \u00d7 ${Math.round(o.rate * 100)}%`,
      o.region !== 1 ? `\u00d7 ${Math.round(o.region * 100)}% for this market` : '',
      o.standing.mult !== 1 ? `\u00d7 ${Math.round(o.standing.mult * 100)}% for the party\u2019s standing` : '',
      o.haggle !== 1 ? `\u00d7 ${Math.round(o.haggle * 100)}% for your haggle` : '',
    ].filter(Boolean).join(' ') + (qty > 1 ? `, \u00d7 ${qty}` : '') + '.';
    offer = h('div', { class: 'sell-offer' },
      h('div', { class: 'sell-total', text: o.standing.refuses ? '\u2014' : formatPrice(total) }),
      o.standing.refuses ? null : h('small', { class: 'muted', text: note }),
      gain != null && !problem ? h('p', { class: gain >= 0 ? 'muted' : 'repair-no', text: gain >= 0 ? `A profit of ${formatPrice(gain)} on what was paid.` : `A loss of ${formatPrice(-gain)} on what was paid.` }) : null,
      problem ? h('p', { class: 'repair-no', text: problem }) : null,
      dm && x.claimedBy ? h('p', { class: 'muted', text: `${x.claimedBy} claimed this, so the money is theirs${x.holderUid ? ' and goes into their backpack' : ''}. It isn\u2019t added to the party purse.` }) : null,
      !dm ? h('p', { class: 'muted', text: usingBackpack() ? 'The gold goes straight into your backpack.' : 'The gold is paid to you at the table; your DM settles it from the ledger.' }) : null,
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', text: 'Sell it', disabled: !!problem, onclick: () => doSell(x, shop, qty, total, o.unit, place) })));
  }
  const cat = x.cat || tradeCategory(x.name);
  const here = chosen && cat ? regionMult(placeKeyOf(chosen.shop), cat) : 1;

  return h('div', { class: 'codex' },
    back,
    h('div', { class: 'codex-kind', html: '<span>Selling</span>' }),
    h('h2', { class: 'codex-title', text: `${have > 1 ? `${have} \u00d7 ` : ''}${x.name}` }),
    x.detail ? h('p', { class: 'muted', text: x.detail }) : null,
    x.kind === 'goods' && x.cost != null ? h('p', { class: 'muted', text: `Bought for ${formatPrice(x.cost)} each${x.source ? ` (${x.source.replace(/^Bought at /, '')})` : ''}.` }) : null,
    dm
      ? field('Worth each (gold)', h('input', { type: 'number', min: 0, step: 'any', value: worth || '', onchange: (e) => { P.unit = e.target.value; renderPanel(); } }),
        listed ? 'Its listed value.' : fromCatalog ? 'From the shops\u2019 price list.' : x.kind === 'gear' ? 'Mundane finds have no set value, so this is a guess. Change it if you like.' : 'No value set. Enter one.')
      : h('p', { class: 'muted', text: `Standard value: ${formatPrice(worth)} each.` }),
    buyers.length ? [
      field('Sell to', h('select', { onchange: (e) => { P.shopId = e.target.value; renderPanel(); } },
        buyers.map(({ shop, o }) => h('option', { value: shop.id, selected: shop.id === chosen.shop.id,
          text: `${shop.name} \u00b7 ${placeOf(shop.location)?.label || 'elsewhere'} \u00b7 ${sizeById(shop.size).name} \u00b7 ${o.standing.refuses ? 'won\u2019t deal' : `pays ${formatPrice(o.unit)} each`}` })))),
      cat ? h('p', { class: 'market-note', text: `${cap(TRADE_LABEL[cat])} ${here > 1.05 ? 'are wanted here and fetch more' : here < 0.95 ? 'are plentiful here and fetch less' : 'sell at ordinary prices here'}.` }) : null,
      have > 1 ? field(`How many (of ${have})`, h('input', { type: 'number', min: 1, max: have, value: qty, onchange: (e) => { P.qty = parseInt(e.target.value, 10) || have; renderPanel(); } })) : null,
      offer] : h('p', { class: 'muted', text: 'None of the shops you know would buy this. Merchants buy the goods they sell themselves; a general store or imports house will take most things.' }));
}

async function doSell(x, shop, qty, total, unit, place) {
  if (!confirm(`Sell ${qty > 1 ? `${qty} \u00d7 ` : ''}${x.name} to ${shop.name} for ${formatPrice(total)}?`)) return;
  try {
    const left = (x.qty || 1) - qty;
    const buyerName = String(myName() || S.store.displayName || 'A party member').slice(0, 60);
    if (!isDM() && usingBackpack()) {
      // the goods leave, the receipt is written and the gold arrives in the backpack, all in one step
      await earn(gpToCp(total), { kind: 'sell', text: `Sold ${qty > 1 ? `${qty} × ` : ''}${x.name} to ${shop.name}${place ? ` (${place.label})` : ''}`, ref: (t) => t.newId('sales') }, (t, logId, saleId) => {
        if (left <= 0) t.del('loot', x.id); else t.update('loot', x.id, { qty: left });
        t.set('sales', saleId, { shopId: shop.id, week: shopWeek(shop).week, itemName: x.name, qty, unitPrice: unit, total, cost: Math.round((Number(x.cost) || 0) * qty * 100) / 100,
          buyer: buyerName, buyerUid: myUid(), at: Date.now(), settled: true, paid: 'backpack', logId });
      });
      toast(`Sold for ${formatPrice(total)}. It is in your backpack.`);
      openMarket('loot');
      return;
    }
    if (isDM() && x.holderUid) {
      // the DM sells something a character carries: the gold goes into that character's backpack
      await S.store.transact(async (t) => {
        const purse = await t.purse(x.holderUid, x.claimedBy || '');
        if (left <= 0) t.del('loot', x.id); else t.update('loot', x.id, { qty: left });
        t.setCoins(purse, receiveCoins(purse.coins, gpToCp(total)), { kind: 'sell', text: `Sold ${qty > 1 ? `${qty} × ` : ''}${x.name} to ${shop.name}${place ? ` (${place.label})` : ''}`, owner: x.claimedBy || purse.owner });
      });
      await S.store.addLootLog(`${x.claimedBy} sold ${qty > 1 ? `${qty} × ` : ''}${x.name} to ${shop.name}${place ? ` (${place.label})` : ''} for ${formatPrice(total)}, paid into their backpack.`).catch(() => {});
      toast(`Sold for ${formatPrice(total)}. It is in ${x.claimedBy}’s backpack.`);
      openMarket('loot');
      return;
    }
    if (isDM()) {
      if (left <= 0) await S.store.deleteLoot(x.id); else await S.store.saveLoot({ qty: left }, x.id);
      if (!x.claimedBy) await S.store.savePartyCoins(addCoins(S.partyCoins, gpToCoins(total)));
      await S.store.addLootLog(`${x.claimedBy ? `${x.claimedBy} sold` : 'Sold'} ${qty > 1 ? `${qty} \u00d7 ` : ''}${x.name} to ${shop.name}${place ? ` (${place.label})` : ''} for ${formatPrice(total)}${x.claimedBy ? ', paid to them' : ''}.`);
      toast(x.claimedBy ? `Sold. Pay ${x.claimedBy} ${formatPrice(total)}.` : `Sold for ${formatPrice(total)}. It\u2019s in the party purse.`);
    } else {
      // the goods leave the stash first; the sale is then written to the ledger for the DM to settle
      if (left <= 0) await S.store.deleteLoot(x.id); else await S.store.saveLoot({ qty: left }, x.id);
      await S.store.addSale({ shopId: shop.id, week: shopWeek(shop).week, itemName: x.name, qty, unitPrice: unit, total, cost: Math.round((Number(x.cost) || 0) * qty * 100) / 100,
        buyer: String(myName() || S.store.displayName || 'A party member').slice(0, 60) });
      toast(`Sold for ${formatPrice(total)}. It\u2019s on the ledger; your DM pays you.`);
    }
    openMarket('loot');
  } catch (e) { toast('Could not sell it: ' + e.message); }
}

// Ledger: what players have sold (the DM pays them out).
function salesBlock(onlyOpen) {
  const dm = isDM();
  const list = S.sales.filter((x) => (dm ? (!onlyOpen || !x.settled) : x.buyerUid === S.store.uid)).sort((p, q) => q.at - p.at);
  if (!list.length) return null;
  const owed = list.filter((x) => !x.settled).reduce((n, x) => n + x.total, 0);
  return h('div', { class: 'ledger-sales' },
    h('h4', { class: 'market-place', text: dm ? 'Sales (gold the party is owed)' : 'My sales' }),
    h('p', { class: 'ledger-sum', text: `${list.length} sale${list.length === 1 ? '' : 's'}${owed ? ` \u00b7 ${formatPrice(owed)} ${dm ? 'to pay out' : 'owed to you'}` : ''}` }),
    h('ol', { class: 'ledger' }, list.map((x) => {
      const shop = shopById(x.shopId), gain = Number.isFinite(x.cost) && x.cost > 0 ? Math.round((x.total - x.cost) * 100) / 100 : null;
      return h('li', { class: x.settled ? 'settled' : '' },
        h('div', { class: 'ledger-main' },
          h('strong', { text: `${x.qty} \u00d7 ${x.itemName}` }),
          h('span', { class: 'ledger-total', text: formatPrice(x.total) })),
        h('div', { class: 'ledger-meta' },
          h('span', { text: dm ? x.buyer : 'You' }), ' \u00b7 sold to ',
          shop ? h('button', { class: 'linklike', text: shop.name, onclick: () => openShop(shop.id) }) : h('span', { text: '(closed shop)' }),
          ' \u00b7 ', h('time', { text: ago(x.at), title: new Date(x.at).toLocaleString() }),
          gain != null ? h('span', { class: 'tag', text: gain >= 0 ? `profit ${formatPrice(gain)}` : `loss ${formatPrice(-gain)}` }) : null,
          x.settled ? h('span', { class: 'tag settled-tag', text: 'paid' }) : null),
        dm ? h('div', { class: 'ledger-actions' },
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!x.settled, onchange: (e) => S.store.updateSale(x.id, { settled: e.target.checked }).catch((err) => toast(err.message)) }), ' Paid out')) : null);
    })));
}

// ─── the session journal ────────────────────────────────────────────
// A write-up of each session. The scribe (a player the DM names) and the DM write it; the party reads it.
// Entries fold away so the dates are easy to scan. Drafts are seen only by the scribe and the DM.
const canWriteJournal = () => isDM() || S.scribes.includes(String(S.store?.email || '').toLowerCase());

function fmtJournalDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || 'undated';
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function openJournal(entryId) {
  S.pinId = null; highlightPin();
  S.panel = { type: 'journal', id: 'all', open: new Set(entryId ? [entryId] : []) };
  renderPanel();
}

function openJournalEditor(id) {
  S.panel = { type: 'journalEdit', id: id || 'new' };
  renderPanel();
}

function journalView() {
  const P = S.panel, writer = canWriteJournal();
  P.open ||= new Set();
  const entries = [...S.journal].filter((e) => writer || !e.draft)
    .sort((x, y) => (y.n - x.n) || String(y.date || '').localeCompare(String(x.date || '')) || (y.createdAt || 0) - (x.createdAt || 0));

  const fill = (box, e) => {
    if (box.dataset.filled) return;
    box.dataset.filled = '1';
    box.append(
      h('div', { class: 'prose', html: md(e.body || '') || '<p class="muted">(Nothing written yet.)</p>' }),
      h('p', { class: 'j-meta', text: `Written by ${e.author || 'the scribe'}${e.editedAt && e.editedAt - (e.createdAt || 0) > 60000 ? `, edited ${ago(e.editedAt)}` : ''}` }),
      writer ? h('div', { class: 'row' }, h('button', { class: 'btn small ghost', type: 'button', text: 'Edit this entry', onclick: () => openJournalEditor(e.id) })) : null,
      notesSection('journal', e.id));
  };
  const row = (e) => {
    const body = h('div', { class: 'j-body' });
    const d = h('details', { class: 'journal-entry', open: P.open.has(e.id) },
      h('summary', {},
        h('span', { class: 'j-head' }, h('span', { class: 'j-date', text: fmtJournalDate(e.date) }), h('span', { class: 'j-title', text: e.title })),
        h('span', { class: 'j-n' }, `Session ${e.n}`, e.draft ? h('span', { class: 'tag', text: 'draft' }) : null)),
      body);
    if (d.open) fill(body, e);
    d.addEventListener('toggle', () => { d.open ? P.open.add(e.id) : P.open.delete(e.id); if (d.open) fill(body, e); });
    return d;
  };

  const scribeBox = isDM() ? h('details', { class: 'legend' },
    h('summary', { text: 'Who may write the journal' }),
    h('p', { class: 'muted', text: 'The Google addresses of the players who may write entries, separated by commas. They sign in to the atlas with that address. You can always write too.' }),
    (() => {
      const input = h('input', { type: 'text', value: S.scribes.join(', '), placeholder: 'player@gmail.com' });
      return h('div', {}, input, h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', text: 'Save the scribes', onclick: async () => {
        const emails = [...new Set(input.value.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))];
        if (emails.some((x) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))) { toast('One of those does not look like an email address.'); return; }
        try { await S.store.saveScribes(emails); toast(emails.length ? 'Saved. They can write in the journal now.' : 'Saved. Only you can write in the journal.'); }
        catch (err) { toast('Could not save: ' + err.message); }
      } })));
    })()) : null;

  return h('div', { class: 'codex' },
    h('div', { class: 'codex-kind', html: '<span>The Chronicle</span>' }),
    h('h2', { class: 'codex-title', text: 'Session Journal' }),
    h('p', { class: 'codex-sub', text: `${entries.filter((e) => !e.draft).length} session${entries.filter((e) => !e.draft).length === 1 ? '' : 's'} written up` }),
    writer ? h('div', { class: 'codex-actions' },
      h('button', { class: 'btn', type: 'button', text: '+ New entry', onclick: () => openJournalEditor(null) }),
      h('a', { class: 'btn ghost', href: 'scribe-guide.html', target: '_blank', rel: 'noopener', text: 'How to write it' })) : null,
    scribeBox,
    entries.length > 1 ? h('p', { class: 'muted' },
      h('button', { class: 'linklike', type: 'button', text: 'Open all', onclick: () => { entries.forEach((e) => P.open.add(e.id)); renderPanel(); } }), ' \u00b7 ',
      h('button', { class: 'linklike', type: 'button', text: 'Close all', onclick: () => { P.open.clear(); renderPanel(); } })) : null,
    entries.length ? h('div', { class: 'journal-list' }, entries.map(row))
      : h('p', { class: 'muted', text: writer ? 'No entries yet. Press "+ New entry" to write up the first session.' : 'No sessions have been written up yet.' }));
}

function journalEditView() {
  const P = S.panel, isNew = P.id === 'new', e = isNew ? null : S.journal.find((x) => x.id === P.id);
  if (!canWriteJournal()) return h('p', { class: 'muted', text: 'Only the scribe can write in the journal.' });
  if (!isNew && !e) return h('p', { class: 'muted', text: 'That entry no longer exists.' });
  const nextN = S.journal.reduce((m, x) => Math.max(m, x.n || 0), 0) + 1;
  const t = new Date(), today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  const n = h('input', { type: 'number', min: 0, max: 9999, value: e?.n ?? nextN });
  const date = h('input', { type: 'date', value: e?.date || today });
  const title = h('input', { type: 'text', maxlength: 160, value: e?.title || '', placeholder: 'e.g. The Night at the Roosting Crow' });
  const body = h('textarea', { rows: 18, placeholder: 'What happened this session? Who did we meet, where did we go, what did we decide, what is still unresolved?' });
  body.value = e?.body || '';
  const preview = h('div', { class: 'prose journal-preview', hidden: true });
  const tabWrite = h('button', { class: 'btn small on', type: 'button', text: 'Write' });
  const tabPrev = h('button', { class: 'btn small ghost', type: 'button', text: 'Preview' });
  const show = (previewing) => {
    preview.hidden = !previewing; body.hidden = previewing;
    tabWrite.classList.toggle('on', !previewing); tabPrev.classList.toggle('on', previewing);
    tabWrite.classList.toggle('ghost', previewing); tabPrev.classList.toggle('ghost', !previewing);
    if (previewing) preview.innerHTML = md(body.value) || '<p class="muted">Nothing to preview yet.</p>';
  };
  tabWrite.onclick = () => show(false); tabPrev.onclick = () => show(true);

  // pasting from Google Docs (or Word) keeps bold, italics, headings and lists
  body.addEventListener('paste', (ev) => {
    const html = ev.clipboardData?.getData('text/html');
    if (!html || !/<(b|strong|i|em|h[1-6]|li|a)\b|font-weight|font-style/i.test(html)) return;
    const converted = htmlToMarkdown(html);
    if (!converted) return;
    ev.preventDefault();
    body.setRangeText(converted, body.selectionStart, body.selectionEnd, 'end');
    toast('Pasted, keeping bold, italics, headings and lists. (Ctrl+Shift+V pastes plain text instead.)');
  });

  const save = async (draft) => {
    const data = { n: Math.max(0, parseInt(n.value, 10) || 0), date: date.value || today, title: title.value.trim(), body: body.value, draft,
      author: String(myName() || S.store.displayName || 'The scribe').slice(0, 60), editedAt: Date.now() };
    if (!data.title) { toast('Give the entry a title first.'); title.focus(); return; }
    try {
      const id = await S.store.saveJournal(data, e?.id);
      toast(draft ? 'Saved as a draft. Only you and the DM can see it.' : 'Published. The party can read it now.');
      openJournal(id);
    } catch (err) { toast('Could not save: ' + err.message); }
  };

  const published = e && !e.draft;
  return h('form', { class: 'editor journal-form', onsubmit: (ev) => ev.preventDefault() },
    h('h2', { class: 'codex-title', text: isNew ? 'New journal entry' : 'Edit journal entry' }),
    h('div', { class: 'row gen-pickers' }, field('Session number', n), field('Date played', date)),
    field('Title', title),
    h('div', { class: 'field' }, h('span', { text: 'The story so far' }),
      h('div', { class: 'j-tools' }, tabWrite, tabPrev), body, preview,
      h('small', { html: 'Formatting: <b>**bold**</b>, <em>*italic*</em>, <code># Heading</code>, <code>- list item</code>, <code>&gt; quote</code>, and <code>[[Emmett]]</code> to link to a place or person. Paste from Google Docs and the formatting comes with it.' })),
    h('div', { class: 'row' },
      published
        ? [h('button', { class: 'btn', type: 'button', text: 'Save changes', onclick: () => save(false) }),
          h('button', { class: 'btn ghost', type: 'button', text: 'Make it a draft again', onclick: () => save(true) })]
        : [h('button', { class: 'btn', type: 'button', text: 'Publish', onclick: () => save(false) }),
          h('button', { class: 'btn ghost', type: 'button', text: 'Save as a draft', onclick: () => save(true) })],
      h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => openJournal(e?.id) }),
      e ? h('button', { class: 'btn danger', type: 'button', text: 'Delete', onclick: async () => {
        if (!confirm(`Delete "${e.title}" for good? Notes under it will be left without a home.`)) return;
        await S.store.deleteJournal(e.id).catch((err) => toast(err.message));
        openJournal();
      } }) : null));
}

// ─── NPC generator ──────────────────────────────────────────────────
// DM only. Pin as much or as little as you like (people, affiliation, role, age, wealth, attitude);
// everything else is rolled. Every field it makes can be edited or re-rolled before it's saved.
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function npcDraft(npc) { return { ...npc, hidden: true, places: [] }; }

function openNpcGen(opts = {}) {
  S.panel = { type: 'npcGen', id: 'new', opts, d: npcDraft(generateNpc(opts)) };
  renderPanel();
}

function npcGenView() {
  const P = S.panel, o = P.opts, d = P.d;
  const regenerate = () => { P.d = npcDraft(generateNpc(o)); renderPanel(); };

  const pin = (label, key, options) => field(label, h('select', {
    onchange: (e) => { o[key] = e.target.value; if (key === 'affiliation') o.role = ''; renderPanel(); },
  }, [h('option', { value: '', text: 'Random' }), ...options.map(([v, t]) => h('option', { value: v, selected: o[key] === v, text: t }))]));

  const aff = o.affiliation ? affiliationById(o.affiliation) : null;
  const roles = aff ? (aff.cover ? OCCUPATIONS : aff.roles) : [];

  const form = h('form', { class: 'editor npc-form' });
  const sync = () => {
    const fd = new FormData(form);
    for (const k of ['name', 'title', 'ageLine', 'appearance', 'manner', 'trait', 'want', 'secret', 'stat', 'attitude', 'group']) if (fd.has(k)) d[k] = fd.get(k);
    d.hidden = fd.get('hidden') === 'on';
    d.places = picker.getRefs();
  };
  const reroll = (part) => h('button', { type: 'button', class: 'btn small ghost', text: '\u21bb', title: 'Roll this one again', 'aria-label': 'Roll this one again',
    onclick: () => { sync(); d[part] = rollPart(part, d.ctx); renderPanel(); } });
  const row = (label, control, part) => field(label, h('div', { class: 'npc-input' }, control, part ? reroll(part) : null));
  const text = (name) => h('input', { name, type: 'text', maxlength: 200, value: d[name] || '' });
  const area = (name, rows = 2) => { const t = h('textarea', { name, rows }); t.value = d[name] || ''; return t; };
  const picker = placePicker(d.places || []);

  form.append(
    h('h3', { class: 'npc-sub', text: 'What you see' }),
    row('Name', text('name'), 'name'),
    row('Title or role', text('title')),
    row('Who they are', text('ageLine')),
    row('Appearance', area('appearance', 3), 'appearance'),
    row('Manner', area('manner'), 'manner'),
    row('Nature', text('trait'), 'trait'),
    row('Wants', area('want'), 'want'),
    h('h3', { class: 'npc-sub', text: 'DM only' }),
    row('Stat block to look up', text('stat')),
    field('Attitude toward the party', h('select', { name: 'attitude' }, ATTITUDES.map(([v, t]) => h('option', { value: v, selected: d.attitude === v, text: t })))),
    row('Secret', area('secret', 3), 'secret'),
    d.lore ? h('p', { class: 'muted npc-lore', text: `Lore: ${d.lore}` }) : null,
    h('h3', { class: 'npc-sub', text: 'Add to the atlas' }),
    groupField(d.group || '', allGroupPaths()),
    field('Found at', picker, 'Places this person can be found (optional).'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'hidden', checked: d.hidden }), ' Hidden from players (DM only)'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'submit', name: 'save', text: 'Add to People' }),
      h('button', { class: 'btn ghost', type: 'submit', name: 'again', text: 'Add, then roll another' }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => openPeople() })));
  form.addEventListener('input', sync);
  form.addEventListener('change', sync);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    sync();
    const again = e.submitter?.name === 'again';
    const name = (d.name || '').trim();
    if (!name) { toast('Give them a name first.'); return; }
    const body = [`*${d.ageLine}.*`, d.appearance, [d.manner, d.trait].filter(Boolean).join(' '), d.want ? `**Wants:** ${d.want}` : ''].filter(Boolean).join('\n\n');
    const dm = [`**Stat block:** ${d.stat || 'Commoner'}`, `**Attitude toward the party:** ${cap(d.attitude || 'neutral')}`, d.secret ? `**Secret:** ${d.secret}` : '', d.lore ? `**Lore note:** ${d.lore}` : ''].filter(Boolean).join('\n\n');
    try {
      const id = await S.store.savePerson({ name, title: (d.title || '').trim(), group: normGroup(d.group), image: '', body, hidden: d.hidden, places: d.places });
      await S.store.saveSecret(id, dm);
      toast(`${name} is in People.`);
      if (again) { openNpcGen({ ...o }); return; }
      S.panel = { type: 'person', id: null, saving: true };
      openPerson(id);
      if (!personById(id)) S.pendingPerson = id;
    } catch (err) { toast('Could not save: ' + err.message); }
  });

  return h('div', { class: 'codex' },
    h('div', { class: 'codex-kind', html: '<span>Dramatis Personae</span>' }),
    h('h2', { class: 'codex-title', text: 'Generate an NPC' }),
    h('p', { class: 'muted', text: 'Pin anything you want, leave the rest random, then roll. You can edit or re-roll every detail before adding them.' }),
    h('div', { class: 'row gen-pickers' },
      pin('People', 'people', PEOPLES.map((p) => [p.id, p.label])),
      pin('Affiliation', 'affiliation', AFFILIATIONS.map((a) => [a.id, a.label]))),
    aff && roles.length ? h('div', { class: 'row gen-pickers' }, pin('Role', 'role', roles.map((x) => [x.title.replace('{nation}', 'a foreign power'), x.title]))) : null,
    h('div', { class: 'row gen-pickers' },
      pin('Gender', 'gender', GENDERS), pin('Age', 'age', AGES)),
    h('div', { class: 'row gen-pickers' },
      pin('Wealth', 'wealth', WEALTH), pin('Attitude', 'attitude', ATTITUDES)),
    h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', text: '\u21bb Roll a new NPC', onclick: regenerate })),
    form);
}

// ─── renown ─────────────────────────────────────────────────────────
// The party's standing with a place ("page:<id>") or a People group ("group:<path>"):
// a score from -10 to +10 that falls into named tiers. Each tier says what that standing
// means; a place or group can add its own specifics. Every change is logged with a reason.
const RENOWN_MIN = -10, RENOWN_MAX = 10;
const DEFAULT_TIERS = [
  { name: 'Reviled', min: -10, text: 'Guards may arrest you on sight, no one will trade with you, and there may be a price on your heads.' },
  { name: 'Distrusted', min: -6, text: 'Prices are higher, doors close in your faces, and the Watch keeps an eye on you.' },
  { name: 'Disliked', min: -2, text: 'Folk are cool toward you: the worse price, the slower service, and never the benefit of the doubt.' },
  { name: 'Unknown', min: 0, text: 'Nobody knows your names. Ordinary prices and ordinary treatment.' },
  { name: 'Respected', min: 3, text: 'Locals share rumors and lend a hand; small favors come easily.' },
  { name: 'Honored', min: 7, text: 'Discounts, free lodging, and an audience with the local leaders when you ask.' },
  { name: 'Exalted', min: 10, text: 'Heroes here. People will take real risks on your behalf.' },
];
const renownTiers = () => [...(S.renownTiers?.length ? S.renownTiers : DEFAULT_TIERS)].sort((a, b) => a.min - b.min);
function tierFor(score) {
  const tiers = renownTiers();
  let t = tiers[0];
  for (const x of tiers) if (score >= x.min) t = x;
  return t;
}
function tierTone(t) {
  const tiers = renownTiers(), next = tiers[tiers.indexOf(t) + 1];
  const max = next ? next.min - 1 : RENOWN_MAX;
  return max < 0 ? 'neg' : t.min > 0 ? 'pos' : 'neu';
}
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const renownFor = (key) => S.renown.find((r) => r.key === key);
const renownSecretId = (key) => `renown-${encodeURIComponent(key)}`;

function renownTarget(key) {
  const i = key.indexOf(':'), type = key.slice(0, i), id = key.slice(i + 1);
  if (type === 'page') {
    const page = pageById(id);
    return page && { label: page.title, sub: page._parent ? `in ${pageById(page._parent)?.title.replace(/^Dukedom of /, '')}` : 'Place', go: () => { goToPage(id); setTimeout(openAbout, 600); } };
  }
  if (type === 'pin') {
    const pin = pinById(id), page = pin && pageById(pin.pageId);
    return page && { label: pin.title, sub: `in ${page.title.replace(/^Dukedom of /, '')}`, go: () => openPin(id, { fly: true }) };
  }
  const exists = S.people.some((p) => { const g = normGroup(p.group); return g === id || g.startsWith(id + GROUP_SEP); });
  return exists && { label: groupLabel(id), sub: 'Group', go: openPeople };
}

function meterHTML(score) {
  const span = RENOWN_MAX - RENOWN_MIN, pct = (v) => ((v - RENOWN_MIN) / span) * 100;
  const tiers = renownTiers();
  const segs = tiers.map((t, i) => {
    const from = Math.max(t.min, RENOWN_MIN), to = i + 1 < tiers.length ? tiers[i + 1].min : RENOWN_MAX + 1;
    return `<span class="seg ${tierTone(t)}" style="left:${pct(from - 0.5)}%;width:${pct(to - 0.5) - pct(from - 0.5)}%" title="${esc(t.name)}"></span>`;
  }).join('');
  return `<div class="renown-meter" role="img" aria-label="Renown ${signed(score)} on a scale of ${RENOWN_MIN} to +${RENOWN_MAX}">${segs}<i class="zero" style="left:${pct(0)}%"></i><b class="mark" style="left:${pct(score)}%"></b></div>`;
}

function renownBadge(r) {
  const t = tierFor(r.score);
  return `<span class="renown-badge ${tierTone(t)}">${esc(t.name)} <em>${signed(r.score)}</em></span>`;
}

// The card on a place's About panel. DMs can start tracking a place that has none yet.
function renownCard(key) {
  const r = renownFor(key);
  if (!r) {
    return isDM() ? h('section', { class: 'renown-card empty' },
      h('button', { class: 'btn small ghost', text: '+ Track the party’s renown here', onclick: () => startRenown(key) })) : null;
  }
  const t = tierFor(r.score);
  return h('section', { class: `renown-card ${tierTone(t)}` },
    h('div', { class: 'renown-top' },
      h('span', { class: 'renown-label', text: 'Party renown' }),
      h('span', { html: renownBadge(r) }),
      r.hidden && isDM() ? h('span', { class: 'tag', text: 'hidden' }) : null),
    h('div', { html: meterHTML(r.score) }),
    h('p', { class: 'renown-text', text: t.text }),
    r.perks ? h('div', { class: 'prose renown-perks', html: md(r.perks) }) : null,
    h('button', { class: 'linklike', text: isDM() ? 'Adjust, history & details →' : 'History & details →', onclick: () => openRenown(key) }));
}

async function startRenown(key) {
  try {
    await S.store.saveRenown(key, { score: 0, hidden: false, perks: '', updatedAt: Date.now() });
    openRenown(key);
  } catch (e) { toast('Could not start tracking: ' + e.message); }
}

function openRenownList() {
  S.pinId = null; highlightPin();
  S.panel = { type: 'renown', id: 'all' };
  renderPanel();
}
function openRenown(key) {
  S.pinId = null; highlightPin();
  S.panel = { type: 'renownDetail', id: key };
  renderPanel();
}

function renownView() {
  const rows = S.renown.map((r) => ({ r, target: renownTarget(r.key) }))
    .filter((x) => x.target || isDM())
    .sort((a, b) => b.r.score - a.r.score || (a.target?.label || '').localeCompare(b.target?.label || ''));
  const tracked = new Set(S.renown.map((r) => r.key));
  let picker = null;
  if (isDM()) {
    const groups = allGroupPaths();
    const sel = h('select', {},
      h('option', { value: '', text: 'Choose a place or group…' }),
      h('optgroup', { label: 'Places' }, S.pages.filter((p) => !tracked.has(`page:${p.id}`)).map((p) =>
        h('option', { value: `page:${p.id}`, text: `${' '.repeat(p._depth)}${p.title}` }))),
      h('optgroup', { label: 'Towns & cities on maps' }, S.pins
        .filter((p) => SETTLEMENT_KINDS.includes(p.kind) && pageById(p.pageId) && !tracked.has(`pin:${p.id}`))
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((p) => h('option', { value: `pin:${p.id}`, text: `${p.title} (${pageById(p.pageId).title.replace(/^Dukedom of /, '')})` }))),
      groups.length ? h('optgroup', { label: 'Groups' }, groups.filter((g) => !tracked.has(`group:${g}`)).map((g) =>
        h('option', { value: `group:${g}`, text: groupLabel(g) }))) : null);
    picker = h('div', { class: 'renown-start' }, sel,
      h('button', { class: 'btn small', type: 'button', text: 'Start tracking', onclick: () => sel.value && startRenown(sel.value) }));
  }
  return h('div', { class: 'codex' },
    h('div', { class: 'codex-kind', html: '<span>Standing of the party</span>' }),
    h('h2', { class: 'codex-title', text: 'Renown' }),
    h('p', { class: 'codex-sub', text: 'How the realm regards you, place by place.' }),
    rows.length
      ? h('div', { class: 'renown-list' }, rows.map(({ r, target }) => h('button', { class: 'renown-row', onclick: () => openRenown(r.key) },
        h('span', { class: 'renown-row-text' },
          h('strong', { text: target ? target.label : '(deleted)' }),
          h('small', { text: [target?.sub, r.hidden ? 'hidden from players' : ''].filter(Boolean).join(' · ') })),
        h('span', { html: renownBadge(r) }),
        h('span', { class: 'renown-row-meter', html: meterHTML(r.score) }))))
      : h('p', { class: 'muted', text: isDM() ? 'Not tracking renown anywhere yet. Pick a place or group below.' : 'The realm has yet to take notice of you.' }),
    picker,
    h('details', { class: 'legend renown-tiers' },
      h('summary', { text: 'What the tiers mean' }),
      h('ul', {}, renownTiers().map((t, i, all) => {
        const max = i + 1 < all.length ? all[i + 1].min - 1 : RENOWN_MAX;
        return h('li', {}, h('span', { html: `<span class="renown-badge ${tierTone(t)}">${esc(t.name)} <em>${t.min === max ? signed(t.min) : `${signed(t.min)} to ${signed(max)}`}</em></span>` }), h('p', { text: t.text }));
      })),
      isDM() ? h('button', { class: 'btn small ghost', text: 'Edit tiers', onclick: () => { S.panel = { type: 'renownTiers', id: 'tiers' }; renderPanel(); } }) : null));
}

function renownDetailView() {
  const key = S.panel.id, r = renownFor(key), target = renownTarget(key);
  if (!r) return h('p', { class: 'muted', text: 'No longer tracked.' });
  const t = tierFor(r.score);
  const log = S.renownLog.filter((l) => l.key === key).sort((a, b) => b.at - a.at);
  const reason = h('input', { type: 'text', maxlength: 200, placeholder: 'Why? e.g. Returned the miller’s daughter' });
  const amount = h('input', { type: 'number', min: -20, max: 20, step: 1, value: 1, class: 'renown-amount', 'aria-label': 'Amount' });
  const adjust = async (delta) => {
    if (!delta) return;
    const score = Math.max(RENOWN_MIN, Math.min(RENOWN_MAX, r.score + delta));
    const actual = score - r.score;
    if (!actual) { toast(`Already at ${signed(r.score)}.`); return; }
    try {
      await S.store.saveRenown(key, { score, updatedAt: Date.now() });
      await S.store.logRenown({ key, delta: actual, score, reason: reason.value.trim(), at: Date.now(), hidden: !!r.hidden });
      const before = t, after = tierFor(score);
      toast(after.name !== before.name ? `Renown is now ${after.name} (${signed(score)}).` : `Renown ${signed(actual)} → ${signed(score)}.`);
    } catch (e) { toast('Could not change renown: ' + e.message); }
  };
  const perks = h('textarea', { rows: 3, placeholder: 'e.g. Free rooms at the Roosting Crow. The Claytons give you first pick of the flour.' });
  perks.value = r.perks || '';
  const notes = h('textarea', { rows: 3, placeholder: 'e.g. If this drops below -3, the Ashen Eye makes contact.' });
  notes.value = S.secrets[renownSecretId(key)] || '';
  return h('div', { class: 'codex' },
    h('button', { class: 'linklike back', text: '← All renown', onclick: openRenownList }),
    h('div', { class: 'codex-kind', html: `<span>Party renown${r.hidden ? ' · Hidden from players' : ''}</span>` }),
    h('h2', { class: 'codex-title', text: target ? target.label : '(deleted)' }),
    target ? h('button', { class: 'linklike', text: key.startsWith('page:') ? 'Go to this place →' : 'Open People →', onclick: target.go }) : null,
    h('section', { class: `renown-card ${tierTone(t)}` },
      h('div', { class: 'renown-top' }, h('span', { class: 'renown-label', text: 'Standing' }), h('span', { html: renownBadge(r) })),
      h('div', { html: meterHTML(r.score) }),
      h('p', { class: 'renown-text', text: t.text }),
      r.perks ? h('div', { class: 'prose renown-perks', html: md(r.perks) }) : null),
    secretBox(renownSecretId(key)),
    isDM() ? h('section', { class: 'renown-dm' },
      h('h3', { class: 'notes-title', text: 'Adjust' }),
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', text: '− 1', onclick: () => adjust(-1) }),
        h('button', { class: 'btn', type: 'button', text: '+ 1', onclick: () => adjust(1) }),
        h('span', { class: 'muted', text: 'or' }),
        amount,
        h('button', { class: 'btn ghost', type: 'button', text: 'Apply', onclick: () => adjust(parseInt(amount.value, 10) || 0) })),
      reason,
      h('h3', { class: 'notes-title', text: 'Here specifically' }),
      perks,
      h('small', { class: 'muted', text: 'Shown to players under the tier’s usual effects. Formatting and [[links]] work.' }),
      h('h3', { class: 'notes-title', text: 'DM notes' }),
      notes,
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!r.hidden, onchange: (e) => S.store.saveRenown(key, { hidden: e.target.checked }).catch((err) => toast(err.message)) }), ' Hidden from players'),
      h('div', { class: 'row' },
        h('button', { class: 'btn small', type: 'button', text: 'Save details', onclick: async () => {
          try {
            await S.store.saveRenown(key, { perks: perks.value });
            if ((S.secrets[renownSecretId(key)] || '') !== notes.value) await S.store.saveSecret(renownSecretId(key), notes.value);
            toast('Saved.');
          } catch (e) { toast('Could not save: ' + e.message); }
        } }),
        h('button', { class: 'btn danger small', type: 'button', text: 'Stop tracking', onclick: async () => {
          if (!confirm('Stop tracking renown here? Its history is deleted too.')) return;
          await S.store.deleteRenown(key).catch((e) => toast(e.message));
          if (S.secrets[renownSecretId(key)]) S.store.saveSecret(renownSecretId(key), '').catch(() => {});
          openRenownList();
        } }))) : null,
    h('h3', { class: 'notes-title', text: `History${log.length ? ` (${log.length})` : ''}` }),
    log.length
      ? h('ol', { class: 'renown-log' }, log.map((l) => h('li', {},
        h('span', { class: `delta ${l.delta > 0 ? 'pos' : 'neg'}`, text: signed(l.delta) }),
        h('span', { class: 'why', text: l.reason || (l.delta > 0 ? 'Renown gained' : 'Renown lost') }),
        h('time', { text: `${signed(l.score)} · ${ago(l.at)}`, title: new Date(l.at).toLocaleString() }))))
      : h('p', { class: 'muted', text: 'No changes yet.' }));
}

function renownTiersView() {
  const rows = h('div', { class: 'tier-rows' });
  const addRow = (t = { name: '', min: 0, text: '' }) => {
    const row = h('div', { class: 'tier-row' },
      h('div', { class: 'row' },
        h('input', { type: 'text', class: 'tier-name', value: t.name, placeholder: 'Tier name', maxlength: 40 }),
        h('label', { class: 'tier-min' }, 'from ', h('input', { type: 'number', min: RENOWN_MIN, max: RENOWN_MAX, value: t.min })),
        h('button', { type: 'button', class: 'linklike', text: 'remove', onclick: () => row.remove() })),
      h('textarea', { rows: 2, placeholder: 'What this standing means for the party' }));
    row.querySelector('textarea').value = t.text;
    rows.append(row);
  };
  renownTiers().forEach(addRow);
  return h('div', { class: 'codex' },
    h('button', { class: 'linklike back', text: '← All renown', onclick: openRenownList }),
    h('h2', { class: 'codex-title', text: 'Renown tiers' }),
    h('p', { class: 'codex-sub', text: `Each tier runs from its number up to the next tier’s. Scores go from ${RENOWN_MIN} to +${RENOWN_MAX}.` }),
    rows,
    h('div', { class: 'row' },
      h('button', { class: 'btn small ghost', type: 'button', text: '+ Add a tier', onclick: () => addRow() }),
      h('button', { class: 'btn small', type: 'button', text: 'Save tiers', onclick: async () => {
        const tiers = [...rows.querySelectorAll('.tier-row')].map((row) => ({
          name: row.querySelector('.tier-name').value.trim(),
          min: Math.max(RENOWN_MIN, Math.min(RENOWN_MAX, parseInt(row.querySelector('.tier-min input').value, 10) || 0)),
          text: row.querySelector('textarea').value.trim(),
        })).filter((t) => t.name);
        if (!tiers.length) { toast('Keep at least one tier.'); return; }
        if (new Set(tiers.map((t) => t.min)).size !== tiers.length) { toast('Two tiers start at the same number.'); return; }
        tiers.sort((a, b) => a.min - b.min);
        tiers[0].min = RENOWN_MIN; // the lowest tier covers everything below the next
        try { await S.store.saveRenownTiers(tiers); toast('Tiers saved.'); openRenownList(); }
        catch (e) { toast('Could not save: ' + e.message); }
      } }),
      h('button', { class: 'linklike', type: 'button', text: 'Reset to defaults', onclick: () => { rows.replaceChildren(); DEFAULT_TIERS.forEach(addRow); } })));
}

// ─── shops ──────────────────────────────────────────────────────────
// Generated shops live at a place ("pin:<id>" or "page:<id>"). Their stock is generated from
// the shop's seed and the current week (see shop-data.js), so it restocks itself every 7 days
// on every device. Purchases are recorded in a ledger and subtracted from that week's stock.
// The party's renown where the shop is changes its prices and what it will sell.
const shopById = (id) => S.shops.find((s) => s.id === id);
const SETTLEMENT_KINDS = ['city', 'town'];
const shortTitle = (t) => t.replace(/^Dukedom of /, '');
// The great cities: shops here start out as Metropolis (the size can still be changed when generating).
const METROPOLISES = ['Solvarig', 'Saubantch'];

// A place's name, the map it's on, and a sensible settlement size for a new shop there.
function placeOf(ref) {
  if (!ref) return null;
  if (ref.startsWith('pin:')) {
    const pin = pinById(ref.slice(4)), page = pin && pageById(pin.pageId);
    if (!pin || !page) return null;
    const size = METROPOLISES.includes(pin.title) ? 5 : pin.kind === 'city' ? 4 : pin.kind === 'town' ? 2 : 1;
    return { label: pin.title, sub: shortTitle(page.title), pageId: page.id, group: `${shortTitle(page.title)}${GROUP_SEP}${pin.title}`, size, go: () => openPin(pin.id, { fly: true }) };
  }
  const page = pageById(ref.slice(5));
  return page && { label: page.title, sub: page._parent ? shortTitle(pageById(page._parent)?.title || '') : 'Map', pageId: page.id, group: shortTitle(page.title),
    size: METROPOLISES.includes(shortTitle(page.title)) ? 5 : 3, go: () => goToPage(page.id) };
}

// The nearest tracked standing: the place itself, then the map it's on, then that map's parents.
// (Hidden standings aren't sent to players, so they don't affect prices.)
function renownAt(ref) {
  const chain = [ref];
  const pageId = ref.startsWith('pin:') ? pinById(ref.slice(4))?.pageId : ref.slice(5);
  if (pageId) {
    if (ref.startsWith('pin:')) chain.push(`page:${pageId}`);
    chain.push(...ancestorsOf(pageId).map((id) => `page:${id}`));
  }
  for (const key of chain) {
    const r = renownFor(key);
    if (r && (!r.hidden || isDM())) return { r, key };
  }
  return null;
}

function shopsAt(type, id) {
  return S.shops.filter((s) => s.location === `${type}:${id}`
    || (type === 'page' && s.location.startsWith('pin:') && pinById(s.location.slice(4))?.pageId === id));
}

function stockFor(shop) {
  const { week, nextRestock } = shopWeek(shop);
  const sold = new Map();
  for (const p of S.purchases) if (p.shopId === shop.id && p.week === week) sold.set(p.itemKey, (sold.get(p.itemKey) || 0) + p.qty);
  const rn = renownAt(shop.location);
  const score = rn?.r.score ?? 0;
  const inverse = !!SHOP_TYPES[shop.type]?.inverse; // the black market likes those the law doesn't
  const terms = renownTerms(inverse ? -score : score);
  const myHaggle = S.haggles.find((x) => x.shopId === shop.id && x.week === week && x.uid === S.store.uid) || null;
  const haggleMult = myHaggle?.mult ?? 1;
  const overrides = shop.priceOverrides || {};
  const house = (shop.extras || []).filter((x) => x.name).map((x) => ({
    key: `house:${x.name}`, name: x.name, grade: 'standard', price: Number(x.price) || 0,
    qty: x.qty === '' || x.qty == null ? null : Number(x.qty), service: x.qty === '' || x.qty == null, house: true,
  }));
  const homebrew = homebrewStock(shop, week);
  const festive = festivalStock(shop, week, activeFestivals());
  const items = [...house, ...festive, ...generateStock(shop, week), ...homebrew].map((i) => {
    const price = overrides[i.key] != null ? Number(overrides[i.key]) : i.price;
    return {
      ...i, price,
      left: i.qty == null ? Infinity : Math.max(0, i.qty - (sold.get(i.key) || 0)),
      cost: nicePrice(price * (tradeCategory(i.name) ? regionMult(placeKeyOf(shop), tradeCategory(i.name)) : 1) * terms.mult * haggleMult),
      available: !terms.refuses && !!terms.allow[i.grade],
    };
  });
  return { week, nextRestock, items, rn, score, terms, inverse, myHaggle };
}

// Homebrew (the DM's items marked "in shops") sometimes appears under the counter in big-city
// Arcane Curios, Exotic Imports and Black Markets. Seeded by shop and week like the rest of the stock.
function homebrewStock(shop, week) {
  if (!['arcane', 'imports', 'blackmarket'].includes(shop.type) || shop.size < 4 || !S.magicPublic.length) return [];
  const r = rng(`hb:${shop.seed}:${week}`);
  if (r() > (shop.size >= 5 ? 0.4 : 0.25)) return [];
  const m = [...S.magicPublic].sort((a, b) => a.id.localeCompare(b.id))[Math.floor(r() * S.magicPublic.length)];
  return [{ key: `hb:${m.id}|rare`, name: m.name, grade: 'rare', price: nicePrice((Number(m.value) || 100) * (shop.priceMod || 1)), qty: 1 }];
}

const daysUntil = (t) => {
  const d = (t - Date.now()) / 86400000;
  return d < 1 ? `in ${Math.max(1, Math.round(d * 24))} hours` : `in ${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}`;
};

function shopRow(shop) {
  const place = placeOf(shop.location);
  return h('button', { class: `person-row shop-row${shop.hidden ? ' is-hidden' : ''}`, onclick: () => openShop(shop.id) },
    h('span', { class: 'avatar seal shop-seal', html: glyph(KINDS.shop, 20) }),
    h('span', { class: 'person-text' },
      h('strong', { text: shop.name }),
      h('small', { text: [shop.hidden ? 'Hidden' : '', SHOP_TYPES[shop.type]?.label, place?.label].filter(Boolean).join(' · ') })));
}

function shopsHere(list, ref) {
  if (!list.length && !isDM()) return null;
  return h('section', { class: 'people-here' },
    h('h3', { class: 'notes-title', text: `Shops here${list.length ? ` (${list.length})` : ''}` }),
    list.map(shopRow),
    isDM() ? h('button', { class: 'btn small ghost', text: '+ Generate a shop here', onclick: () => openShopGen(ref) }) : null);
}

// A shop panel remembers the screen it was opened from (the Market's list, the ledger, a town's "Shops here"...),
// so its Back link can return you there. Editing a shop and coming back keeps the same Back link.
const BACKABLE = ['market', 'pin', 'about', 'people', 'person', 'journal', 'renown', 'renownDetail'];
function openShop(id) {
  const shop = shopById(id);
  if (!shop) return;
  const prev = S.panel;
  let from = null;
  if (prev && ['shop', 'shopEdit', 'shopGen'].includes(prev.type)) from = prev.from || null;
  else if (prev && BACKABLE.includes(prev.type)) { from = { ...prev }; delete from.from; }
  S.pinId = shop.pinId && pinById(shop.pinId)?.pageId === S.pageId ? shop.pinId : null;
  highlightPin();
  S.panel = { type: 'shop', id, from };
  renderPanel();
}
function goBackFrom(from) {
  if (!from) return;
  if (from.type === 'pin') {
    const pin = pinById(from.id);
    if (!pin) { closePanel(); return; }
    if (pin.pageId !== S.pageId) { openPin(from.id); return; }
    S.pinId = from.id; highlightPin();
  } else if (from.type === 'about' && from.id !== S.pageId) { openMarket('shops'); return; }
  else { S.pinId = null; highlightPin(); }
  S.panel = { ...from };
  renderPanel();
  updateHash();
}
function backLabel(from) {
  if (from.type === 'market') return from.tab === 'ledger' ? '← Back to the ledger' : from.tab === 'loot' ? '← Back to Loot' : '← All shops';
  if (from.type === 'pin') return `← ${pinById(from.id)?.title || 'Back'}`;
  if (from.type === 'about') return '← Back to this page';
  if (from.type === 'person') return `← ${personById(from.id)?.name || 'Back'}`;
  if (from.type === 'people') return '← All people';
  if (from.type === 'journal') return '← Back to the journal';
  return '← Back';
}

function shopView() {
  const shop = shopById(S.panel.id);
  if (!shop) return h('p', { class: 'muted', text: 'This shop has closed its doors.' });
  const t = SHOP_TYPES[shop.type], place = placeOf(shop.location), st = stockFor(shop);
  const person = shop.personId && personById(shop.personId);
  const pct = Math.round(Math.abs(1 - st.terms.mult) * 1000) / 10;
  const sales = S.purchases.filter((p) => p.shopId === shop.id).sort((a, b) => b.at - a.at).slice(0, 8);

  const buy = async (item) => {
    if (item.name === 'Identify an item') { await buyIdentification(shop, st, item); return; }
    const max = Number.isFinite(item.left) ? item.left : 1000;
    const answer = prompt(`How many "${item.name}"? (${Number.isFinite(item.left) ? `${item.left} in stock, ` : ''}${formatPrice(item.cost)} each)`, '1');
    if (answer == null) return;
    const qty = parseInt(answer, 10);
    if (!(qty > 0) || qty > max) { toast(`Enter a number from 1 to ${max}.`); return; }
    const total = Math.round(item.cost * qty * 100) / 100;
    const pack = usingBackpack();
    if (!confirm(`Buy ${qty} × ${item.name} from ${shop.name} for ${formatPrice(total)}?\n\n${pack ? `It comes out of your backpack (you have ${coinText(myPurse())}).` : 'It goes on the ledger; settle the gold with your DM.'}`)) return;
    const buyer = myName() || S.store.displayName || 'A party member';
    try {
      const extra = st.myHaggle && st.myHaggle.mult !== 1 ? { haggle: st.myHaggle.mult } : {};
      if (pack) {
        // coins out, the goods into the backpack and the receipt, all in one step
        await spend(gpToCp(total), { kind: 'buy', text: `Bought ${qty} × ${item.name} at ${shop.name}`, ref: (t) => t.newId('purchases') }, (t, logId, purchaseId) => {
          t.set('purchases', purchaseId, { shopId: shop.id, week: st.week, itemKey: item.key, itemName: item.name, qty, unitPrice: item.cost, total, buyer, buyerUid: myUid(), at: Date.now(), settled: true, paid: 'backpack', logId, ...extra });
          if (!item.service) t.add('loot', goodsDoc(shop, item, qty, buyer, true));
        });
        toast(`Bought ${qty} × ${item.name} for ${formatPrice(total)}.${item.service ? ' Paid from your backpack.' : ' It’s in your backpack.'}`);
        return;
      }
      await S.store.addPurchase({ shopId: shop.id, week: st.week, itemKey: item.key, itemName: item.name, qty, unitPrice: item.cost, total, buyer, ...extra });
      toast(`Bought ${qty} × ${item.name} for ${formatPrice(total)}. It’s on the ledger.${item.service ? '' : await stashGoods(shop, item, qty, buyer) ? ' It’s in the party’s Loot.' : ''}`);
    } catch (e) { toast('Could not buy: ' + e.message); }
  };

  const from = S.panel.from;
  const back = from ? h('button', { class: 'linklike back', type: 'button', text: backLabel(from), onclick: () => goBackFrom(from) }) : null;

  return h('div', { class: 'codex' },
    back,
    h('div', { class: 'codex-kind', html: `${glyph(KINDS.shop, 18)}<span>${esc(t?.label || 'Shop')} · ${esc(sizeById(shop.size).name)}${shop.hidden ? ' · Hidden from players' : ''}</span>` }),
    h('h2', { class: 'codex-title', text: shop.name }),
    place ? h('button', { class: 'linklike', text: `${place.label}${place.sub ? `, ${place.sub}` : ''} →`, onclick: place.go }) : null,
    h('p', { class: 'shop-keeper' },
      'Proprietor: ',
      person ? h('a', { href: '#', class: 'wiki', 'data-kind': 'person', 'data-id': person.id, text: shop.proprietor.name }) : h('strong', { text: shop.proprietor.name }),
      ` (${shop.proprietor.race}). `, h('em', { text: shop.proprietor.quirk })),
    shop.description ? h('div', { class: 'prose', html: md(shop.description) }) : null,
    h('div', { class: `shop-terms ${st.terms.refuses ? 'neg' : st.score > 0 ? 'pos' : st.score < 0 ? 'neg' : 'neu'}` },
      st.rn ? h('span', { html: `Your standing${st.rn.key !== shop.location ? ` in ${esc(renownTarget(st.rn.key)?.label || '')}` : ''}: ${renownBadge(st.rn.r)}` }) : h('span', { text: 'They don’t know you here yet.' }),
      h('span', { text: [
        // only mention held-back goods if something on the shelf is actually held back
        st.terms.refuses || st.items.some((i) => !i.available) ? st.terms.note : '',
        !st.terms.refuses && pct ? `Prices ${pct}% ${st.terms.mult < 1 ? 'lower' : 'higher'}.` : '',
      ].filter(Boolean).join(' ') || 'Ordinary prices; everything on the shelves is for sale.' })),
    marketNote(shop),
    ...festivalNotes(),
    st.inverse ? h('p', { class: 'muted shop-restock', text: 'A black market: the less the law likes you, the better they treat you.' }) : null,
    haggleBox(shop, st),
    repairBox(shop, st),
    gecBox(shop, st),
    gamingBox(shop, st),
    pleasureBox(shop, st),
    h('p', { class: 'muted shop-restock', text: `Stock refreshes ${daysUntil(st.nextRestock)}.` }),
    st.items.length ? h('table', { class: 'stock' },
      h('thead', {}, h('tr', {}, h('th', { text: 'Item' }), h('th', { text: 'Left' }), h('th', { text: 'Price' }), h('th', {}))),
      h('tbody', {}, st.items.map((i) => h('tr', { class: `${i.grade}${i.available ? '' : ' unavailable'}${i.left ? '' : ' sold-out'}` },
        h('td', {}, h('span', { text: i.name }), i.grade !== 'standard' ? h('span', { class: `grade ${i.grade}`, text: i.grade === 'rare' ? 'under the counter' : 'fine' }) : null,
          i.house ? h('span', { class: 'grade house', text: 'house special' }) : null,
          i.festival ? h('span', { class: 'grade house', text: i.festival }) : null,
          !i.available && !st.terms.refuses ? h('small', { text: 'Not for you, not yet' }) : null),
        h('td', { class: 'num', text: !Number.isFinite(i.left) ? (i.service ? 'service' : '\u221e') : i.left || '\u2014' }),
        h('td', { class: 'num' },
          i.cost !== i.price ? h('s', { text: formatPrice(i.price) }) : null,
          h('span', { text: formatPrice(i.cost) })),
        h('td', {}, h('button', { class: 'btn small', type: 'button', text: 'Buy', disabled: !i.available || !i.left, onclick: () => buy(i) })))))) : h('p', { class: 'muted', text: 'The shelves are bare this week.' }),
    isDM() ? h('div', { class: 'codex-actions' },
      h('button', { class: 'btn ghost', type: 'button', text: 'Restock now', onclick: async () => {
        await S.store.saveShop({ restockOffset: (shop.restockOffset || 0) + 1 }, shop.id).catch((e) => toast(e.message));
        toast('Fresh stock is on the shelves.');
      } }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Edit', onclick: () => { S.panel = { type: 'shopEdit', id: shop.id, from: S.panel.from }; renderPanel(); } }),
      !shop.pinId || !pinById(shop.pinId) ? h('button', { class: 'btn ghost', type: 'button', text: 'Place on map', onclick: () => startPlacingShop(shop.id) }) : null) : null,
    sales.length ? h('details', { class: 'legend' },
      h('summary', { text: 'Recent purchases' }),
      h('ul', { class: 'sales' }, sales.map((p) => h('li', { text: `${p.buyer}: ${p.qty} × ${p.itemName}, ${formatPrice(p.total)} · ${ago(p.at)}` })))) : null,
    h('div', { class: 'ornament', 'aria-hidden': 'true' }),
    notesSection('shop', shop.id));
}

// Repairs: a price calculator for damaged weapons and armor (three damage slots each).
// The player says what kind of item, how fine it is (look its rarity up on D&D Beyond) and how many
// slots are used; the smith's size decides whether they can do it, and renown and haggling apply.
function repairBox(shop, st) {
  if (!REPAIR_TYPES.includes(shop.type) || st.terms.refuses) return null;
  const R = (S.panel.repair ||= { kind: 'weapon', rarity: 'common', slots: 1, item: '', renown: true });
  const out = h('div', { class: 'repair-quote' });
  const haggleMult = st.myHaggle?.mult ?? 1;

  const pay = async (q, cost) => {
    const rar = REPAIR_RARITIES.find((x) => x.id === R.rarity);
    const what = `${R.item.trim() ? R.item.trim() + ' \u2014 ' : ''}${rar.label.toLowerCase()} ${R.kind}, ${R.slots} slot${R.slots > 1 ? 's' : ''}${R.slots === 3 ? ' (broken)' : ''}`;
    const pack = usingBackpack();
    if (!confirm(`Pay ${formatPrice(cost)} to have ${what} repaired at ${shop.name}?\n\n${pack ? `It comes out of your backpack (you have ${coinText(myPurse())}).` : 'It goes on the ledger; settle the gold with your DM.'}`)) return;
    const buyer = myName() || S.store.displayName || 'A party member';
    try {
      const extra = st.myHaggle && st.myHaggle.mult !== 1 ? { haggle: st.myHaggle.mult } : {};
      const record = { shopId: shop.id, week: st.week, itemKey: `repair|${R.rarity}|${R.slots}`, itemName: `Repair: ${what}`.slice(0, 160), qty: 1, unitPrice: cost, total: cost, buyer, ...extra };
      if (pack) {
        await spend(gpToCp(cost), { kind: 'repair', text: `Repairs at ${shop.name}`, ref: (t) => t.newId('purchases') }, (t, logId, purchaseId) => {
          t.set('purchases', purchaseId, { ...record, buyerUid: myUid(), at: Date.now(), settled: true, paid: 'backpack', logId });
        });
        toast(`Repaired. ${formatPrice(cost)} came out of your backpack.`);
        return;
      }
      await S.store.addPurchase(record);
      toast(`Repaired. ${formatPrice(cost)} is on the ledger.`);
    } catch (e) { toast('Could not arrange it: ' + e.message); }
  };

  const update = () => {
    const rar = REPAIR_RARITIES.find((x) => x.id === R.rarity) || REPAIR_RARITIES[0];
    const q = repairQuote(R.rarity, R.slots, shop.size);
    if (!q.ok) { out.replaceChildren(h('p', { class: 'repair-no', text: q.reason })); return; }
    const mult = (R.renown ? st.terms.mult : 1) * haggleMult;
    const cost = nicePrice(q.gp * mult);
    out.replaceChildren(...[
      h('p', {},
        h('strong', { class: 'repair-price', text: formatPrice(cost) }),
        mult !== 1 ? h('s', { text: ` ${formatPrice(nicePrice(q.gp))}` }) : null),
      h('small', { class: 'muted', text: `${formatPrice(rar.slot)} for the first slot, rising for each one${R.slots === 3 ? ', plus a bit extra to rebuild a broken piece' : ''}. Done on the spot.${mult !== 1 ? ' Includes your standing and haggling here.' : ''}` }),
      isDM() ? null : h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', text: 'Pay for the repair', onclick: () => pay(q, cost) }))].filter(Boolean));
  };

  const on = (key, num) => (e) => { R[key] = num ? Number(e.target.value) : e.target.value; update(); };
  const kind = h('select', { onchange: on('kind') },
    [['weapon', 'Weapon'], ['armor', 'Armor or shield']].map(([v, t]) => h('option', { value: v, selected: v === R.kind, text: t })));
  const rarity = h('select', { onchange: on('rarity') },
    REPAIR_RARITIES.map((r) => h('option', { value: r.id, selected: r.id === R.rarity, text: `${r.label} \u2014 ${r.hint}` })));
  const slots = h('select', { onchange: on('slots', true) },
    [[1, '1 slot used'], [2, '2 slots used'], [3, '3 slots (broken)']].map(([v, t]) => h('option', { value: v, selected: v === R.slots, text: t })));
  const item = h('input', { type: 'text', maxlength: 60, placeholder: 'Which item? (optional, for the ledger)', value: R.item, oninput: (e) => { R.item = e.target.value; } });
  update();
  return h('details', { class: 'legend repair', open: true },
    h('summary', { text: 'Repairs \u2014 weapons & armor' }),
    h('p', { class: 'muted', text: 'Look up your item\u2019s rarity on D&D Beyond. Finer gear needs a bigger smith.' }),
    h('div', { class: 'row gen-pickers' }, field('Kind', kind), field('Rarity', rarity), field('Damage', slots)),
    item,
    isDM() ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: R.renown, onchange: (e) => { R.renown = e.target.checked; update(); } }), ' Apply the party\u2019s standing here to this quote') : null,
    out);
}

// ─── The G.E.C. (Grand Exchange Consortium) ─────────────────────────
// Four services at the Consortium's counter: exchanging coins (a 5 cp fee each time), Writs of Exchange (5%,
// honored at any other branch), a savings account (3% a month, this branch only) and safety-deposit boxes
// paid from the account. Accounts, boxes and writs belong to the player who opened them. Money changing hands
// goes on the ledger for the DM to settle; interest and fees follow real time (a "month" is 30 days).
function gecBox(shop, st) {
  if (shop.type !== 'gec' || st.terms.refuses) return null;
  const G = (S.panel.gec ||= { from: 'gp', to: 'sp', amt: '', writ: '', dep: '', wd: '', boxes: {} });
  const uid = S.store.uid, now = Date.now(), here = placeKeyOf(shop), where = placeOf(shop.location)?.label || shop.name;
  const accId = `${shop.id}__${uid}`;
  const mine = S.accounts.find((x) => x.id === accId || (x.shopId === shop.id && x.uid === uid));
  const acc = mine ? settle(mine, now) : null;   // brought up to date: interest added, due fees taken
  const who = () => String(myName() || S.store.displayName || 'A party member').slice(0, 60);
  const bill = (name, total, key) => S.store.addPurchase({ shopId: shop.id, week: st.week, itemKey: key, itemName: name.slice(0, 160), qty: 1, unitPrice: total, total, buyer: who() });
  const payOut = (name, total) => S.store.addSale({ shopId: shop.id, week: st.week, itemName: name.slice(0, 200), qty: 1, unitPrice: total, total, cost: 0, buyer: who() });
  const accData = (x) => ({ shopId: shop.id, uid, owner: x.owner || who(), balance: Math.round(x.balance), since: x.since, boxes: x.boxes, log: x.log.slice(-30), gamble: x.gamble || {} });
  const saveAcc = (x) => S.store.saveAccount(accId, accData(x));
  const note = (x, text) => { x.log.push({ at: Date.now(), text }); };
  const pack = usingBackpack();     // with backpacks on, coins come from and go to the backpack, not the DM's table
  // the receipt a service leaves on the player's own ledger (already settled, because the backpack paid it)
  const receipt = (t, purchaseId, logId, name, total, key) => t.set('purchases', purchaseId, { shopId: shop.id, week: st.week, itemKey: key, itemName: name.slice(0, 160), qty: 1, unitPrice: total, total, buyer: who(), buyerUid: uid, at: Date.now(), settled: true, paid: 'backpack', logId });
  const run = (fn) => async (e) => {
    const btn = e?.currentTarget; if (btn) btn.disabled = true;
    try { await fn(); } catch (err) { toast('Could not do that: ' + err.message); }
    if (btn?.isConnected) btn.disabled = false;
  };
  const section = (title, ...kids) => h('details', { class: 'legend gec', open: true }, h('summary', { text: title }), ...kids);
  const numIn = (obj, key, ph, step = '1') => h('input', { type: 'number', min: 0, step, value: obj[key], placeholder: ph, onchange: (e) => { obj[key] = e.target.value; renderPanel(); } });
  const coinSel = (key) => h('select', { onchange: (e) => { G[key] = e.target.value; renderPanel(); } },
    ['gp', 'sp', 'cp'].map((c) => h('option', { value: c, selected: G[key] === c, text: { gp: 'gold', sp: 'silver', cp: 'copper' }[c] })));
  const sizeSel = (obj, key) => h('select', { onchange: (e) => { obj[key] = e.target.value; renderPanel(); } },
    Object.entries(ITEM_SIZES).map(([k, v]) => h('option', { value: k, selected: (obj[key] || 'small') === k, text: `${v.label} (${v.hint})` })));

  // 1. exchanging coins
  const q = exchangeQuote(G.from, G.to, G.amt);
  const exchange = section('Exchange coins',
    h('p', { class: 'muted', text: `1 gp = 10 sp = 100 cp. The Consortium keeps ${EXCHANGE_FEE_CP} cp on every exchange.` }),
    h('div', { class: 'row gen-pickers' }, field('How many', numIn(G, 'amt', 'coins')), field('From', coinSel('from')), field('Into', coinSel('to'))),
    q.ok ? h('p', {}, h('strong', { text: `You hand over ${q.gave} and receive ${q.text}.` })) : h('p', { class: 'muted', text: G.amt ? q.reason : '' }),
    h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', text: 'Exchange', disabled: !q.ok, onclick: run(async () => {
      if (pack) {
        // the coins are changed in the backpack itself, and the fee is taken
        const n = Math.floor(Number(G.amt));
        await S.store.transact(async (t) => {
          const purse = await t.purse(uid, who());
          if ((purse.coins[G.from] || 0) < n) throw new Error(`You do not have ${n} ${G.from} in your backpack (you have ${coinText(purse.coins)}).`);
          const next = { ...purse.coins, [G.from]: purse.coins[G.from] - n };
          for (const c of ['gp', 'sp', 'cp']) next[c] = (next[c] || 0) + (q.coins[c] || 0);
          const purchaseId = t.newId('purchases');
          const logId = t.setCoins(purse, next, { kind: 'service', text: `Exchanged ${q.gave} for ${q.text} at ${where}`, ref: purchaseId });
          receipt(t, purchaseId, logId, `Exchange: ${q.gave} \u2192 ${q.text} (${EXCHANGE_FEE_CP} cp fee)`, EXCHANGE_FEE_CP / 100, `exchange|${G.from}|${G.to}`);
        });
        G.amt = ''; toast('Done. The coins are changed in your backpack, less the fee.'); renderPanel();
        return;
      }
      await bill(`Exchange: ${q.gave} \u2192 ${q.text} (${EXCHANGE_FEE_CP} cp fee)`, EXCHANGE_FEE_CP / 100, `exchange|${G.from}|${G.to}`);
      G.amt = ''; toast('Done. Swap the coins with your DM; the fee is on the ledger.'); renderPanel();
    }) })));

  // 2. writs of exchange
  const wq = writQuote(G.writ);
  // with backpacks, a writ in someone else's backpack is theirs to cash, not yours
  const writs = S.loot.filter((x) => x.kind === 'writ' && (!x.holderUid || x.holderUid === uid || isDM()));
  const writBlock = section('Writs of Exchange',
    h('p', { class: 'muted', text: 'Pay here, and the Consortium writes a paper that any other branch will honor, so you need not carry the gold. It costs 5% more. Whoever holds the writ can cash it, so guard it.' }),
    h('div', { class: 'row gen-pickers' }, field('A writ for (gold)', numIn(G, 'writ', 'gold'))),
    wq.ok ? h('p', {}, h('strong', { text: `The writ is for ${formatPrice(wq.amount)}. The fee is ${formatPrice(wq.fee)}, so you pay ${formatPrice(wq.total)}.` }))
      : h('p', { class: 'muted', text: G.writ ? wq.reason : '' }),
    h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', text: 'Buy a writ', disabled: !wq.ok, onclick: run(async () => {
      const writDoc = { kind: 'writ', name: `Writ of Exchange (${formatPrice(wq.amount)})`,
        detail: `Pay the bearer ${formatPrice(wq.amount)} at any Grand Exchange Consortium outside ${where}. Issued at ${where}.`,
        value: wq.amount, cost: wq.total, qty: 1, status: 'identified', source: `Issued by ${shop.name} in ${where}`,
        boughtBy: who(), boughtByUid: uid, boughtAt: now, cat: '', fromPlace: here, issuedShop: shop.id };
      if (pack) {
        await spend(gpToCp(wq.total), { kind: 'writBuy', text: `Bought a writ for ${formatPrice(wq.amount)} at ${where}`, ref: (t) => t.newId('purchases') }, (t, logId, purchaseId) => {
          receipt(t, purchaseId, logId, `Writ of Exchange: ${formatPrice(wq.amount)} (fee ${formatPrice(wq.fee)})`, wq.total, 'writ|issue');
          t.add('loot', { ...writDoc, foundAt: now, holderUid: uid, claimedBy: who(), claimedAt: now });
        });
        G.writ = ''; toast(`A writ for ${formatPrice(wq.amount)} is in your backpack. ${formatPrice(wq.total)} came out of your coins.`); renderPanel();
        return;
      }
      await bill(`Writ of Exchange: ${formatPrice(wq.amount)} (fee ${formatPrice(wq.fee)})`, wq.total, 'writ|issue');
      await S.store.saveLoot(writDoc);
      G.writ = ''; toast(`A writ for ${formatPrice(wq.amount)} is in the party\u2019s Loot. Pay ${formatPrice(wq.total)} at the table.`); renderPanel();
    }) })),
    writs.length ? h('div', {},
      h('h4', { class: 'market-place', text: 'Writs in the party\u2019s Loot' }),
      h('ul', { class: 'sales' }, writs.map((x) => {
        const sameCity = x.fromPlace === here;
        return h('li', {}, `${x.name}, issued in ${x.fromPlace || 'an unknown city'}${x.claimedBy ? ` (held by ${x.claimedBy})` : ''} `,
          sameCity ? h('small', { class: 'muted', text: 'Cash it at a branch in another city.' }) : h('button', { class: 'linklike', text: 'cash it here', onclick: run(async () => {
            if (!confirm(`Cash ${x.name} at ${shop.name}? The writ is used up, and ${formatPrice(x.value)} ${pack ? 'goes into your backpack' : 'is owed to you'}.`)) return;
            if (pack) {
              // the writ is used up and its value paid into the backpack, in one step
              await earn(gpToCp(x.value), { kind: 'writ', text: `Cashed ${x.name} at ${where} (issued in ${x.fromPlace || 'elsewhere'})`, ref: x.id }, (t) => { t.del('loot', x.id); });
              toast(`Cashed. ${formatPrice(x.value)} is in your backpack.`); renderPanel();
              return;
            }
            await S.store.deleteLoot(x.id);
            await payOut(`Writ of Exchange cashed: ${formatPrice(x.value)} (issued in ${x.fromPlace || 'elsewhere'})`, Number(x.value));
            toast(`Cashed. ${formatPrice(x.value)} is owed to you; your DM pays it out.`); renderPanel();
          }) }));
      }))) : null);

  // 3. savings account
  let savings;
  if (!acc) {
    savings = section('Savings account',
      h('p', { class: 'muted', text: `Keep gold safe and earn 3% a month. The account is yours alone and works only at this branch, in ${where}.` }),
      h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', text: 'Open an account', onclick: run(async () => { await saveAcc(newAccount(shop.id, uid, who(), now)); toast('Account opened.'); }) })));
  } else {
    const depCp = Math.round((parseFloat(G.dep) || 0) * 100), wdCp = Math.round((parseFloat(G.wd) || 0) * 100);
    savings = section('Savings account',
      h('div', { class: 'bal', text: formatCp(acc.balance) }),
      h('p', { class: 'muted', text: `3% interest every 30 days; the next is in ${daysUntilInterest(acc, now)} day${daysUntilInterest(acc, now) === 1 ? '' : 's'}. This account works only at this branch.` }),
      h('div', { class: 'row gen-pickers' },
        field('Deposit (gold)', numIn(G, 'dep', 'gold', 'any')), field('Withdraw (gold)', numIn(G, 'wd', 'gold', 'any'))),
      h('div', { class: 'row' },
        h('button', { class: 'btn small', type: 'button', text: 'Deposit', disabled: !(depCp > 0), onclick: run(async () => {
          if (pack) {
            // the coins leave the backpack and the balance rises, in one step
            await spend(depCp, { kind: 'deposit', text: `Savings deposit at ${where}: ${formatCp(depCp)}`, ref: accId }, (t) => {
              acc.balance += depCp; note(acc, `Deposited ${formatCp(depCp)}`); t.set('accounts', accId, accData(acc));
            });
            G.dep = ''; toast(`Deposited ${formatCp(depCp)} from your backpack.`); renderPanel();
            return;
          }
          await bill(`Savings deposit: ${formatCp(depCp)}`, depCp / 100, 'savings|deposit');
          acc.balance += depCp; note(acc, `Deposited ${formatCp(depCp)}`); await saveAcc(acc);
          G.dep = ''; toast(`Deposited ${formatCp(depCp)}. Hand the coins to your DM; it is on the ledger.`); renderPanel();
        }) }),
        h('button', { class: 'btn small ghost', type: 'button', text: 'Withdraw', disabled: !(wdCp > 0 && wdCp <= acc.balance), onclick: run(async () => {
          if (pack) {
            // the balance falls and the coins arrive in the backpack, in one step
            await earn(wdCp, { kind: 'withdraw', text: `Savings withdrawal at ${where}: ${formatCp(wdCp)}`, ref: accId }, (t) => {
              acc.balance -= wdCp; note(acc, `Withdrew ${formatCp(wdCp)}`); t.set('accounts', accId, accData(acc));
            });
            G.wd = ''; toast(`Withdrew ${formatCp(wdCp)} into your backpack.`); renderPanel();
            return;
          }
          acc.balance -= wdCp; note(acc, `Withdrew ${formatCp(wdCp)}`); await saveAcc(acc);
          await payOut(`Savings withdrawal: ${formatCp(wdCp)}`, wdCp / 100);
          G.wd = ''; toast(`Withdrew ${formatCp(wdCp)}. Your DM pays it out; it is on the ledger.`); renderPanel();
        }) })),
      wdCp > acc.balance ? h('p', { class: 'repair-no', text: 'The account does not hold that much.' }) : null,
      acc.log.length ? h('details', { class: 'legend' }, h('summary', { text: 'Account history' }),
        h('ul', { class: 'sales' }, [...acc.log].reverse().slice(0, 12).map((x) => h('li', { text: `${x.text} \u00b7 ${ago(x.at)}` })))) : null);
  }

  // 4. safety-deposit boxes
  let boxes;
  if (!acc) {
    boxes = section('Safety-deposit boxes', h('p', { class: 'muted', text: 'Open a savings account first. Box rent is taken from it each month.' }));
  } else {
    const stash = S.loot.filter((x) => x.kind === 'goods' && (!x.claimedBy || heldMine(x)));   // the party's stash, and what is in your own backpack
    const card = (box) => {
      const f = (G.boxes[box.id] ||= { name: '', size: 'small', qty: '1', loot: '', lsize: 'small', lqty: '1' });
      const info = BOXES[box.size], used = boxUsed(box);
      const put = async (name, size, qty, after) => {
        if (!name.trim()) throw new Error('Name the item.');
        if (!(qty >= 1)) throw new Error('Enter how many.');
        if (!boxFits(box, size, qty)) throw new Error(`That will not fit. The box has ${info.cap - used} unit${info.cap - used === 1 ? '' : 's'} left (small = 1, medium = 2, large = 4).`);
        const same = box.items.find((i) => i.name === name.trim() && i.size === size);
        if (same) same.qty += qty; else box.items.push({ name: name.trim().slice(0, 80), qty, size });
        note(acc, `Put ${qty} \u00d7 ${name.trim()} in a ${info.label.toLowerCase()} box`);
        await saveAcc(acc);
        if (after) await after();
      };
      const lootPick = stash.find((x) => x.id === f.loot);
      return h('div', { class: `box-card${box.locked ? ' is-locked' : ''}` },
        h('h5', { text: `${info.label} box \u00b7 ${used} of ${info.cap} units used` }),
        h('small', { class: 'muted', text: `${formatCp(info.fee)} a month, paid through ${new Date(box.paidThrough).toLocaleDateString()}.` }),
        box.locked ? h('div', {},
          h('p', { class: 'repair-no', text: `Locked: ${box.arrears} month${box.arrears === 1 ? '' : 's'} of rent unpaid (${formatCp(box.arrears * info.fee)}). Your things are safe, but nothing goes in or out until it is paid.` }),
          h('button', { class: 'btn small', type: 'button', text: 'Pay what is owed', onclick: run(async () => {
            const res = payArrears(acc, box.id, Date.now());
            if (!res.ok) throw new Error(res.reason);
            await saveAcc(res.acc); toast('Paid. The box is open again.'); renderPanel();
          }) })) : h('div', {},
          box.items.length ? h('ul', {}, box.items.map((it, i) => h('li', {}, `${it.qty} \u00d7 ${it.name} (${ITEM_SIZES[it.size]?.label.toLowerCase() || it.size}) `,
            h('button', { class: 'linklike', text: 'take out', onclick: run(async () => {
              if (!confirm(`Take ${it.qty} \u00d7 ${it.name} out of the box?`)) return;
              box.items.splice(i, 1); note(acc, `Took ${it.name} out of a ${info.label.toLowerCase()} box`); await saveAcc(acc); renderPanel();
            }) })))) : h('p', { class: 'muted', text: 'Empty.' }),
          h('div', { class: 'row gen-pickers' },
            field('Put in (name)', h('input', { type: 'text', maxlength: 80, value: f.name, placeholder: 'e.g. Longsword +1', onchange: (e) => { f.name = e.target.value; } })),
            field('How big', sizeSel(f, 'size')), field('How many', numIn(f, 'qty', '1'))),
          h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', text: 'Put it in the box', onclick: run(async () => {
            await put(f.name, f.size || 'small', parseInt(f.qty, 10), null); f.name = ''; f.qty = '1'; renderPanel();
          }) })),
          stash.length ? h('div', { class: 'row gen-pickers' },
            field('Or from your backpack or the party\u2019s Loot', h('select', { onchange: (e) => { f.loot = e.target.value; renderPanel(); } },
              [h('option', { value: '', text: 'Choose goods\u2026' }), ...stash.map((x) => h('option', { value: x.id, selected: f.loot === x.id, text: `${x.qty} \u00d7 ${x.name}${heldMine(x) ? ' (in your backpack)' : ' (party Loot)'}` }))])),
            lootPick ? field('How big', sizeSel(f, 'lsize')) : null,
            lootPick ? field(`How many (of ${lootPick.qty})`, numIn(f, 'lqty', '1')) : null,
            lootPick ? h('button', { class: 'btn small', type: 'button', text: 'Move it into the box', onclick: run(async () => {
              const n = Math.min(lootPick.qty, parseInt(f.lqty, 10) || 0);
              await put(lootPick.name, f.lsize || 'small', n, async () => {
                const left = (lootPick.qty || 1) - n;
                if (left <= 0) await S.store.deleteLoot(lootPick.id); else await S.store.saveLoot({ qty: left }, lootPick.id);
              });
              f.loot = ''; renderPanel();
            }) }) : null) : null,
          !box.items.length ? h('button', { class: 'linklike', text: 'hand the box back (no refund)', onclick: run(async () => {
            if (!confirm('Hand this box back? The rent already paid is not refunded.')) return;
            acc.boxes = acc.boxes.filter((b) => b.id !== box.id); note(acc, `Handed back a ${info.label.toLowerCase()} box`); await saveAcc(acc); renderPanel();
          }) }) : null));
    };
    boxes = section('Safety-deposit boxes',
      h('p', { class: 'muted', text: 'Rent a box to keep things safe. The rent comes out of your savings account each month. A small box holds 4 small items, or 2 medium, or 1 large; a medium box twice that, and a large box four times.' }),
      acc.boxes.length ? acc.boxes.map(card) : h('p', { class: 'muted', text: 'You have no boxes here.' }),
      h('div', { class: 'row' }, Object.entries(BOXES).map(([size, b]) => h('button', { class: 'btn small ghost', type: 'button',
        text: `Rent a ${b.label.toLowerCase()} box (${formatCp(b.fee)})`, disabled: acc.balance < b.fee || acc.boxes.length >= 12,
        onclick: run(async () => {
          acc.balance -= b.fee; acc.boxes.push(newBox(size, Date.now())); note(acc, `Rented a ${b.label.toLowerCase()} box: \u2212${formatCp(b.fee)}`);
          await saveAcc(acc); toast(`A ${b.label.toLowerCase()} box is yours. The first month is paid.`); renderPanel();
        }) }))),
      acc.balance < BOXES.small.fee ? h('small', { class: 'muted', text: 'The first month\u2019s rent is taken from the account straight away.' }) : null);
  }

  // the DM sees every account at this branch
  const branch = isDM() ? S.accounts.filter((x) => x.shopId === shop.id) : [];
  const dmList = isDM() ? section(`Accounts at this branch (${branch.length})`,
    branch.length ? h('ul', { class: 'sales' }, branch.map((x) => {
      const v = settle(x, now), items = v.boxes.reduce((n, b) => n + b.items.length, 0);
      return h('li', {}, `${x.owner}: ${formatCp(v.balance)}, ${v.boxes.length} box${v.boxes.length === 1 ? '' : 'es'}${items ? ` holding ${items} item${items === 1 ? '' : 's'}` : ''}${v.boxes.some((b) => b.locked) ? ' (a box is locked)' : ''} `,
        h('button', { class: 'linklike', text: 'set balance\u2026', onclick: run(async () => {
          const ans = prompt(`Set ${x.owner}'s balance (in gold, e.g. 12.5):`, String(v.balance / 100));
          if (ans == null) return;
          const cp = Math.round(parseFloat(ans) * 100);
          if (!(cp >= 0)) throw new Error('Enter a number.');
          await S.store.saveAccount(x.id, { shopId: v.shopId, uid: v.uid, owner: v.owner, balance: cp, since: v.since, boxes: v.boxes, gamble: v.gamble || {}, log: [...v.log, { at: Date.now(), text: `The DM set the balance to ${formatCp(cp)}` }].slice(-30) });
        }) }),
        v.boxes.some((b) => b.items.length) ? h('ul', {}, v.boxes.flatMap((b) => b.items.map((it) => h('li', { text: `${BOXES[b.size].label} box: ${it.qty} \u00d7 ${it.name}` })))) : null);
    })) : h('p', { class: 'muted', text: 'No one has opened an account here yet.' })) : null;

  return h('div', { class: 'gec-wrap' }, exchange, writBlock, savings, boxes, dmList);
}

// ─── gaming houses and pleasure houses ──────────────────────────────
// Both are paid for from the player's savings account at the G.E.C. in the same town: the stake or the price comes out
// of it, and winnings go back in. The DM reveals these shops when the party finds them (they start hidden).
function houseLevelPicker(d, key, label, options, flavorOf, hint) {
  const sel = h('select', { onchange: (e) => { d[key] = e.target.value; d.description = flavorOf(e.target.value); renderPanel(); } },
    options.map(([k, t]) => h('option', { value: k, selected: d[key] === k, text: t })));
  return h('div', { class: 'row gen-pickers' }, field(label, sel, hint));
}

// the player's savings account at a G.E.C. branch in this shop's town, brought up to date
function townBank(shop) {
  const uid = S.store.uid, town = settlementOf(shop.location).key;
  const picked = shop.bankShopId && S.shops.find((x) => x.id === shop.bankShopId && x.type === 'gec');   // the DM can name the branch
  const gecs = picked ? [picked] : S.shops.filter((x) => x.type === 'gec' && settlementOf(x.location).key === town);
  const found = S.accounts.filter((x) => x.uid === uid && gecs.some((g) => g.id === x.shopId))
    .map((raw) => ({ raw, acc: settle(raw, Date.now()) })).sort((p, q) => q.acc.balance - p.acc.balance)[0];
  return found ? { gecs, acc: found.acc, accId: found.raw.id, gec: gecs.find((g) => g.id === found.raw.shopId) } : { gecs, acc: null };
}
const saveBank = (bank, acc) => S.store.saveAccount(bank.accId, { shopId: acc.shopId, uid: acc.uid, owner: acc.owner, balance: Math.round(acc.balance),
  since: acc.since, boxes: acc.boxes, log: acc.log.slice(-30), gamble: acc.gamble || {} });

function bankLine(shop, bank) {
  if (bank.acc) return h('p', {}, 'Your bankroll: ', h('strong', { text: formatCp(bank.acc.balance) }), h('small', { class: 'muted', text: ` (savings account at ${bank.gec?.name || 'the G.E.C.'})` }));
  return h('p', { class: 'repair-no', text: bank.gecs.length
    ? 'You need a savings account with money in it at the G.E.C. in this town. Open one there first.'
    : `There is no G.E.C. in ${settlementOf(shop.location).label}, so you have no savings account to pay from.${S.shops.some((x) => x.type === 'gec') ? ` There are branches in ${[...new Set(S.shops.filter((x) => x.type === 'gec').map((x) => settlementOf(x.location).label))].join(', ')}.` : ''}` });
}

// Where a gaming or pleasure house is paid from: with backpacks on, the backpack or the savings account; otherwise
// (as before) only the savings account.
function bankroll(shop, bank, G) {
  if (!usingBackpack()) return bankLine(shop, bank);
  const pick = field('Pay from', h('select', { onchange: (e) => { G.from = e.target.value; renderPanel(); } },
    [['bag', 'Your backpack'], ['account', 'Your savings account']].map(([v, t]) => h('option', { value: v, selected: G.from === v, text: t }))));
  return h('div', {}, pick, G.from === 'bag'
    ? h('p', {}, 'In your backpack: ', h('strong', { text: coinText(myPurse()) }))
    : bankLine(shop, bank));
}
const utcDay = () => Math.floor(Date.now() / 86400000);
// what this player has won (or lost) at a house today from the backpack, in copper
const bagTally = (houseId) => { const g = backpackOf(myUid())?.gamble?.[houseId]; return g && g.day === utcDay() ? g.net : 0; };

function gamingBox(shop, st) {
  if (shop.type !== 'gaming' || st.terms.refuses) return null;
  const G = (S.panel.gam ||= { game: 'dice', bet: '', stake: '', last: null });
  const edge = edgeById(shop.edge), lim = GAMING_LIMITS[shop.size] || GAMING_LIMITS[2], bank = townBank(shop);
  const pack = usingBackpack();
  G.from = pack ? (G.from || 'bag') : 'account';
  const useBag = pack && G.from === 'bag';          // staking from the backpack, not the savings account
  const game = gameById(G.game);
  if (!game.bets.some((b) => b.id === G.bet)) G.bet = game.bets[0].id;
  const bet = betOf(game, G.bet), mult = multiplier(game, bet, edge.pct);
  const day = today(), tally = (bank.acc?.gamble || {})[shop.id];
  // winnings count across both: the house's daily limit is the same whichever way you pay
  const net = (tally?.day === day ? tally.net : 0) + (pack ? bagTally(shop.id) : 0);
  const roll = useBag ? cpOf(myPurse()) : (bank.acc?.balance || 0);
  const stakeCp = Math.round((parseFloat(G.stake) || 0) * 100);
  const capReached = net >= lim.win;
  const problem = !useBag && !bank.acc ? 'No bankroll.' : capReached ? 'The house will pay you no more today. Come back tomorrow.'
    : stakeCp < MIN_BET ? `The smallest bet is ${formatCp(MIN_BET)}.` : stakeCp > lim.bet ? `The most this house takes on one bet is ${formatCp(lim.bet)}.`
    : stakeCp > roll ? `You do not have that much in your ${useBag ? 'backpack' : 'account'}.` : '';
  const run = (fn) => async (e) => { const b = e?.currentTarget; if (b) b.disabled = true; try { await fn(); } catch (err) { toast('Could not play: ' + err.message); } if (b?.isConnected) b.disabled = false; };

  return h('details', { class: 'legend gec', open: true },
    h('summary', { text: 'The tables' }),
    h('p', { class: 'muted', text: `Stakes come out of your ${pack ? 'backpack or savings account' : 'savings account'} and winnings go back in. This house takes bets from ${formatCp(MIN_BET)} to ${formatCp(lim.bet)}, and will not pay one player more than ${formatCp(lim.win)} in winnings in a day.` }),
    isDM() ? h('p', { class: 'muted', text: `DM: this house keeps ${edge.label} on average.` }) : null,
    bankroll(shop, bank, G),
    (bank.acc || useBag) ? h('p', { class: 'muted', text: `Won today at this house: ${formatCp(Math.max(0, net))} of ${formatCp(lim.win)}.` }) : null,
    h('div', { class: 'row gen-pickers' },
      field('Game', h('select', { onchange: (e) => { G.game = e.target.value; G.bet = ''; G.last = null; renderPanel(); } }, GAMES.map((x) => h('option', { value: x.id, selected: G.game === x.id, text: x.label })))),
      field('Your bet', h('select', { onchange: (e) => { G.bet = e.target.value; renderPanel(); } }, game.bets.map((b) => h('option', { value: b.id, selected: G.bet === b.id, text: b.label })))),
      field('Stake (gold)', h('input', { type: 'number', min: 0, step: 'any', value: G.stake, placeholder: 'gold', onchange: (e) => { G.stake = e.target.value; renderPanel(); } }))),
    h('p', { class: 'muted', text: game.blurb }),
    h('p', {}, h('strong', { text: `A win returns ${mult.toFixed(2)} times your stake.` }), game.tie ? ' A tie returns your stake.' : ''),
    problem && G.stake ? h('p', { class: 'repair-no', text: problem }) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', text: 'Place the bet', disabled: !!problem, onclick: run(async () => {
      const res = play(G.game, G.bet);
      const out = resolveBet({ stake: stakeCp, mult, win: res.win, push: res.push, netToday: net, cap: lim.win });
      if (useBag) {
        // the stake and the winnings go through the backpack, and today's tally for this house is kept with it
        const verdict = out.profit > 0 ? `won ${formatCp(out.profit)}` : out.profit < 0 ? `lost ${formatCp(-out.profit)}` : 'got the stake back';
        const utc = utcDay();
        await S.store.transact(async (t) => {
          const purse = await t.purse(myUid(), whoAmI());
          if (cpOf(purse.coins) < stakeCp) throw new Error('You do not have that much in your backpack.');
          let next;
          if (out.profit >= 0) next = receiveCoins(purse.coins, out.profit);
          else { const p = payCoins(purse.coins, -out.profit); if (!p.ok) throw new Error(p.reason); next = p.coins; }
          const prev = purse.gamble?.[shop.id], prevNet = prev && prev.day === utc ? prev.net : 0;
          t.setCoins(purse, next, { kind: 'bet', ref: shop.id, text: `${game.label} at ${shop.name}: ${verdict}`,
            gamble: { ...(purse.gamble || {}), [shop.id]: { day: utc, net: prevNet + out.profit } } });
        });
        G.last = { text: res.text, verdict, win: out.profit > 0, capped: out.capped };
        renderPanel();
        return;
      }
      const acc = bank.acc;
      acc.balance += out.profit;
      acc.gamble = { ...(acc.gamble || {}), [shop.id]: { day, net: net + out.profit } };
      const verdict = out.profit > 0 ? `won ${formatCp(out.profit)}` : out.profit < 0 ? `lost ${formatCp(-out.profit)}` : 'got the stake back';
      acc.log.push({ at: Date.now(), text: `${game.label} at ${shop.name}: ${verdict}` });
      await saveBank(bank, acc);
      G.last = { text: res.text, verdict, win: out.profit > 0, capped: out.capped };
      renderPanel();
    }) })),
    G.last ? h('div', { class: `gam-result ${G.last.win ? 'win' : G.last.verdict.startsWith('lost') ? 'loss' : ''}` },
      h('strong', { text: `You ${G.last.verdict}.` }), G.last.text,
      G.last.capped ? h('small', { class: 'muted', text: ' The house paid out up to its daily limit for you.' }) : null) : null,
    h('details', { class: 'legend' }, h('summary', { text: 'What the house pays' }),
      h('ul', { class: 'sales' }, game.bets.slice(0, 8).map((b) => h('li', { text: `${b.label}: a win returns ${multiplier(game, b, edge.pct).toFixed(2)} \u00d7 your stake` })),
        game.bets.length > 8 ? h('li', { class: 'muted', text: 'Each single number pays alike.' }) : null)));
}

function pleasureBox(shop, st) {
  if (shop.type !== 'pleasure' || st.terms.refuses) return null;
  const G = (S.panel.visit ||= { last: null });
  const lv = levelById(shop.level), bank = townBank(shop);
  const pack = usingBackpack();
  G.from = pack ? (G.from || 'bag') : 'account';
  const useBag = pack && G.from === 'bag';
  const run = (fn) => async (e) => { const b = e?.currentTarget; if (b) b.disabled = true; try { await fn(); } catch (err) { toast('Could not do that: ' + err.message); } if (b?.isConnected) b.disabled = false; };
  return h('details', { class: 'legend gec', open: true },
    h('summary', { text: `${lv.label} house \u2014 company and comfort` }),
    h('p', { class: 'muted', text: `Comforts: ${lv.comforts}. Risk of a nasty surprise: ${lv.danger}.${isDM() ? ` (DM: about ${Math.round(lv.risk * 100)}% a visit.)` : ''} You pay from ${pack ? 'your backpack, or' : ''} your savings account at the G.E.C. in this town.` }),
    bankroll(shop, bank, G),
    ...PLEASURE_SERVICES.map((s, i) => {
      const cost = lv.prices[i], afford = useBag ? cpOf(myPurse()) >= cost : bank.acc && bank.acc.balance >= cost;
      return h('div', { class: 'visit-row' },
        h('span', {}, s.label, ' ', h('small', { class: 'muted', text: formatCp(cost) })),
        h('button', { class: 'btn small', type: 'button', text: 'Go in', disabled: !afford, onclick: run(async () => {
          if (!confirm(`${s.label} at ${shop.name} for ${formatCp(cost)}?`)) return;
          const v = visit(shop.level, s.id);
          if (useBag) {
            await spend(cost, { kind: 'service', ref: shop.id, text: `${shop.name}, ${s.label.toLowerCase()}: ${formatCp(cost)}. ${v.buff.name}${v.disease ? `; caught ${v.disease.name}` : ''}` });
            G.last = { cost, service: s.label, v };
            renderPanel();
            return;
          }
          const acc = bank.acc;
          acc.balance -= cost;
          acc.log.push({ at: Date.now(), text: `${shop.name}, ${s.label.toLowerCase()}: ${formatCp(cost)}. ${v.buff.name}${v.disease ? `; caught ${v.disease.name}` : ''}` });
          await saveBank(bank, acc);
          G.last = { cost, service: s.label, v };
          renderPanel();
        }) }));
    }),
    G.last ? h('div', { class: `gam-result ${G.last.v.disease ? 'loss' : 'win'}` },
      h('strong', { text: `${G.last.v.buff.name}` }), G.last.v.buff.text,
      h('small', { class: 'muted', text: ' (Lasts until your next long rest.)' }),
      G.last.v.disease ? h('p', {}, h('strong', { text: `But you have caught ${G.last.v.disease.name}.` }), G.last.v.disease.text, h('small', { class: 'muted', text: ` ${CURE}` })) : null) : null,
    h('p', { class: 'muted', text: `Your DM decides how any ailment plays out. The result is also written in your ${useBag ? 'backpack' : 'account'} history.` }));
}

// Haggling: once per player, per shop, per week. Good rolls knock prices down, bad ones push them up.
function haggleBox(shop, st) {
  if (st.terms.refuses) return null;
  if (isDM()) {
    const tries = S.haggles.filter((x) => x.shopId === shop.id && x.week === st.week).sort((a, b) => b.at - a.at);
    return tries.length ? h('div', { class: 'haggle dm' },
      h('strong', { text: 'Haggling this week' }),
      h('ul', {}, tries.map((x) => h('li', {},
        `${x.buyer}: ${rollText(x)}. ${haggleResult(x.roll).text} `,
        h('button', { class: 'linklike', text: 'reset', title: 'Let them try again', onclick: () => S.store.deleteHaggle(x.id).catch((e) => toast(e.message)) }))))) : null;
  }
  if (st.myHaggle) {
    const x = st.myHaggle, res = haggleResult(x.roll);
    return h('div', { class: `haggle ${res.mult < 1 ? 'pos' : res.mult > 1 ? 'neg' : 'neu'}` },
      h('span', { class: `d20 still${x.die === 20 ? ' crit' : x.die === 1 ? ' fumble' : ''}`, text: x.die ?? '?' }),
      h('div', {},
        h('strong', { text: `You haggled: ${rollText(x)}.` }), ' ', res.text,
        h('small', { text: ' Applies to your purchases here until the stock refreshes.' })));
  }
  const me = S.players.find((p) => p.id === S.store.uid);
  const die = h('span', { class: 'd20', text: '20', 'aria-hidden': 'true' });
  const box = h('div', { class: 'haggle' },
    die,
    h('div', {},
      h('button', { class: 'btn small ghost', type: 'button', text: '\u2696 Haggle (once this week)', onclick: (e) => haggle(e.currentTarget) }),
      h('small', { text: me
        ? ` Rolls a d20 + your Persuasion (${signed(me.persuasion)}). Good rolls lower your prices here this week; bad ones raise them.`
        : ' Rolls a d20 + your Persuasion. Good rolls lower your prices here this week; bad ones raise them.' })));
  async function haggle(btn) {
    let bonus = me?.persuasion;
    if (bonus == null) {
      const answer = prompt('What is your character\u2019s Persuasion bonus? (e.g. 3, or -1)\n\nYou only set this once; after that your DM keeps it up to date.');
      if (answer == null) return;
      bonus = parseInt(String(answer).replace('+', ''), 10);
      if (!Number.isFinite(bonus) || bonus < -5 || bonus > 20) { toast('Enter your Persuasion bonus as a number, e.g. 3.'); return; }
      try {
        const rec = await S.store.savePlayer({ name: String(myName() || S.store.displayName || 'A party member').slice(0, 60), persuasion: bonus, setAt: Date.now() });
        if (Number.isFinite(rec?.persuasion)) bonus = rec.persuasion;
      } catch (err) {
        toast(err.code === 'permission-denied'
          ? 'Could not save your bonus: the atlas’s database rules need updating. Let your DM know.'
          : 'Could not save your bonus: ' + err.message);
        return;
      }
    }
    btn.disabled = true;
    const roll = await tumble(die); // the atlas rolls the d20
    const total = roll + bonus, res = haggleResult(total);
    try {
      await S.store.addHaggle({ shopId: shop.id, week: st.week, die: roll, bonus, roll: total, mult: res.mult, buyer: myName() || S.store.displayName || 'A party member' });
      const said = rollText({ die: roll, bonus, roll: total });
      toast(`${said[0].toUpperCase()}${said.slice(1)}. ${res.text}`);
    } catch (err) {
      btn.disabled = false;
      toast(err.message.includes('already') ? err.message : 'Could not haggle: ' + err.message);
    }
  }
  return box;
}

// "rolled 13 + 4 = 17" (or just the total for haggles from before the atlas did the rolling)
function rollText(x) {
  if (x.die == null) return `rolled ${x.roll}`;
  const nat = x.die === 20 ? ' (natural 20!)' : x.die === 1 ? ' (natural 1)' : '';
  return `rolled ${x.die} ${x.bonus < 0 ? '\u2212' : '+'} ${Math.abs(x.bonus)} = ${x.roll}${nat}`;
}

// A fair d20, shown tumbling for a moment before it lands.
function tumble(el) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const result = (buf[0] % 20) + 1;
  return new Promise((resolve) => {
    if (reduced) { el.textContent = result; resolve(result); return; }
    el.classList.add('rolling');
    let n = 0;
    const spin = setInterval(() => {
      el.textContent = 1 + Math.floor(Math.random() * 20);
      if (++n >= 14) {
        clearInterval(spin);
        el.textContent = result;
        el.classList.remove('rolling');
        el.classList.toggle('crit', result === 20);
        el.classList.toggle('fumble', result === 1);
        setTimeout(() => resolve(result), 350);
      }
    }, 60);
  });
}

// DM: items this shop always stocks, on top of the generated stock.
function houseSpecialsEditor(extras) {
  const rows = h('div', { class: 'tier-rows' });
  const add = (x = { name: '', price: '', qty: '' }) => {
    const row = h('div', { class: 'special-row' },
      h('input', { type: 'text', class: 'sp-name', placeholder: 'Item or service, e.g. Crow’s house ale (mug)', value: x.name, maxlength: 80 }),
      h('input', { type: 'number', class: 'sp-price', placeholder: 'gp', step: '0.01', min: '0', value: x.price }),
      h('input', { type: 'number', class: 'sp-qty', placeholder: 'per week', step: '1', min: '0', value: x.qty ?? '' }),
      h('button', { type: 'button', class: 'linklike', text: 'remove', onclick: () => row.remove() }));
    rows.append(row);
  };
  extras.forEach(add);
  const wrap = h('div', { class: 'field' },
    h('span', { text: 'House specials' }),
    h('small', { text: 'Always in stock, every week. Price in gold (0.1 = 1 sp). Leave "per week" blank for a service that never runs out.' }),
    rows,
    h('button', { type: 'button', class: 'btn small ghost', text: '+ Add a house special', onclick: () => add() }));
  wrap.value = () => [...rows.querySelectorAll('.special-row')].map((r) => ({
    name: r.querySelector('.sp-name').value.trim(),
    price: Math.max(0, parseFloat(r.querySelector('.sp-price').value) || 0),
    qty: r.querySelector('.sp-qty').value === '' ? '' : Math.max(0, parseInt(r.querySelector('.sp-qty').value, 10) || 0),
  })).filter((x) => x.name);
  return wrap;
}

// DM: set your own price for anything the generator stocks (sticks whenever that item comes back).
function priceOverridesEditor(shop) {
  const current = { ...(shop.priceOverrides || {}) };
  const items = generateStock(shop, shopWeek(shop).week);
  const list = h('div', { class: 'override-list' }, items.map((i) => {
    const input = h('input', { type: 'number', step: '0.01', min: '0', placeholder: String(i.price), value: current[i.key] ?? '', 'data-key': i.key });
    return h('label', { class: 'override-row' }, h('span', { text: i.name }), input);
  }));
  const wrap = h('details', { class: 'legend' },
    h('summary', { text: 'Set your own prices (this week’s items)' }),
    h('small', { class: 'muted', text: 'In gold, before renown and haggling. Leave blank to use the generated price. A price you set sticks whenever that item is back in stock.' }),
    list);
  wrap.value = () => {
    const out = { ...current };
    for (const input of list.querySelectorAll('input')) {
      if (input.value === '') delete out[input.dataset.key];
      else out[input.dataset.key] = Math.max(0, parseFloat(input.value) || 0);
    }
    return out;
  };
  return wrap;
}

// DM: each player's Persuasion bonus, as used for haggling. Players set it once; you keep it current.
function partyBonuses() {
  const players = [...S.players].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return h('details', { class: 'legend party' },
    h('summary', { text: `Party Persuasion (${players.length})` }),
    players.length ? h('ul', {}, players.map((p) => {
      const input = h('input', { type: 'number', min: -5, max: 20, step: 1, value: p.persuasion, 'aria-label': `${p.name} Persuasion bonus` });
      return h('li', {},
        h('span', { text: p.name || 'A party member' }),
        input,
        h('button', { class: 'btn small ghost', type: 'button', text: 'Save', onclick: async () => {
          const v = parseInt(input.value, 10);
          if (!Number.isFinite(v)) return;
          await S.store.savePlayer({ persuasion: v }, p.id).then(() => toast(`${p.name}: Persuasion ${signed(v)}.`)).catch((e) => toast(e.message));
        } }));
    })) : h('p', { class: 'muted', text: 'Players appear here the first time they haggle.' }));
}

// ─── shop generator (DM) ────────────────────────────────────────────
function openShopGen(ref) {
  const place = placeOf(ref);
  S.panel = { type: 'shopGen', id: ref, draft: generateShop('general', place?.size || 2) };
  renderPanel();
}

function shopGenView() {
  const ref = S.panel.id, place = placeOf(ref), d = S.panel.draft;
  const regenerate = (type, size) => { S.panel.draft = generateShop(type, size); renderPanel(); };
  const typeSel = h('select', { onchange: (e) => regenerate(e.target.value, d.size) },
    Object.entries(SHOP_TYPES).map(([k, v]) => h('option', { value: k, selected: k === d.type, text: v.label })));
  const sizeSel = h('select', { onchange: (e) => regenerate(d.type, e.target.value) },
    SIZES.map((s) => h('option', { value: s.id, selected: s.id === d.size, text: s.name })));
  const name = h('input', { type: 'text', maxlength: 80, value: d.name });
  const keeper = h('input', { type: 'text', maxlength: 60, value: d.proprietor.name });
  const desc = h('textarea', { rows: 2 }); desc.value = d.description;
  const addPerson = h('input', { type: 'checkbox', checked: true });
  const addPin = h('input', { type: 'checkbox', checked: ref.startsWith('page:') });
  const hidden = h('input', { type: 'checkbox', checked: !!SHOP_TYPES[d.type]?.hiddenByDefault });
  const preview = stockFor({ ...d, id: '__preview', createdAt: Date.now(), restockOffset: 0, location: ref });
  return h('div', { class: 'codex editor' },
    h('h2', { class: 'codex-title', text: 'Generate a shop' }),
    h('p', { class: 'codex-sub', text: `at ${place ? `${place.label}${place.sub ? `, ${place.sub}` : ''}` : 'this place'}` }),
    h('div', { class: 'row gen-pickers' }, field('Kind of shop', typeSel), field('Settlement size', sizeSel)),
    d.type === 'gaming' ? houseLevelPicker(d, 'edge', 'House edge', Object.entries(EDGES).map(([k, v]) => [k, v.label]), (k) => EDGES[k].flavor,
      'How much the house keeps, on average, of every coin staked. Players see the payouts, never this label.') : null,
    d.type === 'pleasure' ? houseLevelPicker(d, 'level', 'Quality of the house', Object.entries(PLEASURE_LEVELS).map(([k, v]) => [k, v.label]), (k) => PLEASURE_LEVELS[k].flavor,
      'The finer the house, the better the comforts and the smaller the risk. It also sets the prices.') : null,
    h('small', { class: 'muted', text: 'Bigger settlements stock more items, finer goods and rarer finds.' }),
    h('div', { class: 'row' }, h('button', { class: 'btn ghost', type: 'button', text: '↻ Reroll', onclick: () => regenerate(d.type, d.size) })),
    field('Shop name', name),
    field('Proprietor', keeper, `${esc(d.proprietor.race)}. ${esc(d.proprietor.quirk)}`),
    field('Description', desc),
    h('details', { class: 'legend', open: true },
      h('summary', { text: `This week’s stock (${preview.items.length} items)` }),
      h('ul', { class: 'sales' }, preview.items.map((i) => h('li', { text: `${i.name} ${i.qty == null ? '(service)' : `×${i.qty}`} — ${formatPrice(i.cost)}${i.grade === 'rare' ? ' (under the counter)' : ''}` })))),
    h('label', { class: 'check' }, addPerson, ' Add the proprietor to People'),
    h('label', { class: 'check' }, addPin, ' Place a pin for it on the map'),
    h('label', { class: 'check' }, hidden, ' Hidden from players for now'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'button', text: 'Save shop', onclick: async (e) => {
        e.currentTarget.disabled = true;
        const data = {
          ...d, name: name.value.trim() || d.name, description: desc.value.trim(),
          proprietor: { ...d.proprietor, name: keeper.value.trim() || d.proprietor.name },
          location: ref, createdAt: Date.now(), restockOffset: 0, hidden: hidden.checked,
        };
        try {
          const id = await S.store.saveShop(data);
          if (addPerson.checked) {
            const personId = await S.store.savePerson({
              name: data.proprietor.name, title: `${SHOP_TYPES[data.type].label}, ${data.name}`,
              group: `${place?.group || 'Merchants'}${GROUP_SEP}Merchants`, places: [ref],
              body: `${data.proprietor.race}. ${data.proprietor.quirk}`, image: '', hidden: data.hidden,
            });
            await S.store.saveShop({ personId }, id);
          }
          if (addPin.checked) startPlacingShop(id); else openShop(id);
        } catch (err) { toast('Could not save the shop: ' + err.message); }
      } }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => closePanel() })));
}

function shopEditView() {
  const shop = shopById(S.panel.id);
  if (!shop) return h('p', { text: 'This shop no longer exists.' });
  const name = h('input', { type: 'text', maxlength: 80, value: shop.name });
  const desc = h('textarea', { rows: 3 }); desc.value = shop.description || '';
  const size = h('select', {}, SIZES.map((s) => h('option', { value: s.id, selected: s.id === shop.size, text: s.name })));
  const edgeSel = h('select', {}, Object.entries(EDGES).map(([k, v]) => h('option', { value: k, selected: (shop.edge || 'moderate') === k, text: v.label })));
  const levelSel = h('select', {}, Object.entries(PLEASURE_LEVELS).map(([k, v]) => h('option', { value: k, selected: (shop.level || 'common') === k, text: v.label })));
  const bankSel = h('select', {}, [h('option', { value: '', text: 'Automatic (a G.E.C. in the same town)' }),
    ...S.shops.filter((x) => x.type === 'gec').map((g) => h('option', { value: g.id, selected: shop.bankShopId === g.id, text: `${g.name} · ${settlementOf(g.location).label}` }))]);
  const hidden = h('input', { type: 'checkbox', checked: !!shop.hidden });
  const specials = houseSpecialsEditor(shop.extras || []);
  const overrides = priceOverridesEditor(shop);
  return h('div', { class: 'codex editor' },
    h('h2', { class: 'codex-title', text: 'Edit shop' }),
    field('Shop name', name),
    field('Description', desc),
    field('Settlement size', size, 'Changing the size changes what the shop stocks from now on.'),
    shop.type === 'gaming' ? field('House edge', edgeSel, 'How much the house keeps, on average, of every coin staked.') : null,
    shop.type === 'pleasure' ? field('Quality of the house', levelSel, 'Sets the comforts, the risk and the prices.') : null,
    shop.type === 'gaming' || shop.type === 'pleasure' ? field('Paid from the savings account at', bankSel, 'Normally the G.E.C. in the same town. Pick a branch to override that.') : null,
    specials,
    overrides,
    h('label', { class: 'check' }, hidden, ' Hidden from players'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'button', text: 'Save', onclick: async () => {
        try {
          await S.store.saveShop({ name: name.value.trim() || shop.name, description: desc.value.trim(), size: Number(size.value), hidden: hidden.checked,
            ...(shop.type === 'gaming' ? { edge: edgeSel.value } : {}), ...(shop.type === 'pleasure' ? { level: levelSel.value } : {}),
            ...(shop.type === 'gaming' || shop.type === 'pleasure' ? { bankShopId: bankSel.value } : {}),
            extras: specials.value(), priceOverrides: overrides.value() }, shop.id);
          const pin = shop.pinId && pinById(shop.pinId);
          if (pin && (pin.title !== name.value.trim() || !!pin.hidden !== hidden.checked)) await S.store.savePin({ title: name.value.trim() || shop.name, hidden: hidden.checked }, pin.id);
          openShop(shop.id);
        } catch (e) { toast('Could not save: ' + e.message); }
      } }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => openShop(shop.id) }),
      h('button', { class: 'btn danger', type: 'button', text: 'Close the shop', onclick: async () => {
        if (!confirm(`Close "${shop.name}" for good? Its pin is removed; its ledger entries and proprietor stay.`)) return;
        if (shop.pinId && pinById(shop.pinId)) await S.store.deletePin(shop.pinId).catch(() => {});
        await S.store.deleteShop(shop.id).catch((e) => toast(e.message));
        openMarket();
      } })));
}

// Put a shop's pin on the map: turn to the map its place is on, then the next click places it.
function startPlacingShop(id) {
  const shop = shopById(id), place = shop && placeOf(shop.location);
  if (!shop || !place) { openShop(id); return; }
  S.placeShop = id;
  closePanel(true);
  if (S.pageId !== place.pageId) goToPage(place.pageId);
  setEdit(false);
  modeHint();
}

async function placeShopPin(pos) {
  const shop = shopById(S.placeShop);
  S.placeShop = null;
  modeHint();
  if (!shop) return;
  const page = currentPage();
  try {
    const pinId = await S.store.savePin({ title: shop.name, kind: 'shop', body: '', x: pos.x, y: pos.y, pageId: page.id,
      pageHidden: !!page.hidden, hidden: !!shop.hidden, shopId: shop.id, linkPage: '' });
    await S.store.saveShop({ pinId }, shop.id);
    const person = shop.personId && personById(shop.personId);
    if (person && !(person.places || []).includes(`pin:${pinId}`)) await S.store.savePerson({ places: [...(person.places || []), `pin:${pinId}`] }, person.id);
    openShop(shop.id);
  } catch (e) { toast('Could not place the shop: ' + e.message); }
}

// ─── market & ledger ────────────────────────────────────────────────
function openMarket(tab) {
  S.pinId = null; highlightPin();
  S.panel = { type: 'market', id: 'all', tab: tab || S.panel?.tab || 'shops' };
  renderPanel();
}

function marketView() {
  const tab = S.panel.tab || 'shops';
  const setTab = (t) => { if (S.panel?.type !== 'market') return; S.panel.tab = t; renderPanel(); };
  const tabs = h('div', { class: 'tabs' },
    h('button', { class: tab === 'shops' ? 'on' : '', text: 'Shops', onclick: () => setTab('shops') }),
    h('button', { class: tab === 'loot' ? 'on' : '', text: 'Loot', onclick: () => setTab('loot') }),
    h('button', { class: tab === 'ledger' ? 'on' : '', text: isDM() ? 'Ledger' : 'My purchases', onclick: () => setTab('ledger') }));
  let body;
  if (tab === 'shops') {
    const byPlace = new Map();
    for (const s of S.shops) {
      const label = placeOf(s.location) ? `${placeOf(s.location).label}${placeOf(s.location).sub ? `, ${placeOf(s.location).sub}` : ''}` : 'Elsewhere';
      if (!byPlace.has(label)) byPlace.set(label, []);
      byPlace.get(label).push(s);
    }
    body = byPlace.size
      ? [...byPlace.keys()].sort().map((label) => h('section', { class: 'people-group open' },
        h('h4', { class: 'market-place', text: label }),
        byPlace.get(label).sort((a, b) => a.name.localeCompare(b.name)).map(shopRow)))
      : [h('p', { class: 'muted', text: isDM() ? 'No shops yet. Open a town or map’s panel and use "+ Generate a shop here".' : 'No shops have been found yet.' })];
  } else if (tab === 'loot') {
    body = lootTab();
  } else {
    const onlyOpen = S.panel.onlyOpen ?? true;
    const mine = (p) => p.buyerUid === S.store.uid;
    const list = S.purchases.filter((p) => (isDM() ? (!onlyOpen || !p.settled) : mine(p))).sort((a, b) => b.at - a.at);
    const haggles = S.haggles.filter((x) => isDM() || x.uid === S.store.uid).sort((a, b) => b.at - a.at).slice(0, 20);
    const owed = list.filter((p) => !p.settled).reduce((n, p) => n + p.total, 0);
    body = [
      isDM() ? h('div', { class: 'ledger-bar' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: onlyOpen, onchange: (e) => { if (S.panel?.type !== 'market') return; S.panel.onlyOpen = e.target.checked; renderPanel(); } }), ' Unsettled only'),
        list.some((p) => !p.settled) ? h('button', { class: 'btn small ghost', text: 'Settle all shown', onclick: async () => {
          if (!confirm(`Mark ${list.filter((p) => !p.settled).length} purchases as settled?`)) return;
          await Promise.all(list.filter((p) => !p.settled).map((p) => S.store.updatePurchase(p.id, { settled: true }))).catch((e) => toast(e.message));
        } }) : null) : null,
      h('p', { class: 'ledger-sum', text: `${list.length} purchase${list.length === 1 ? '' : 's'}${owed ? ` · ${formatPrice(owed)} unsettled` : ''}` }),
      list.length ? h('ol', { class: 'ledger' }, list.map((p) => {
        const shop = shopById(p.shopId);
        return h('li', { class: p.settled ? 'settled' : '' },
          h('div', { class: 'ledger-main' },
            h('strong', { text: `${p.qty} \u00d7 ${p.itemName}${p.haggle ? ` (haggled ${p.haggle < 1 ? '\u2212' : '+'}${Math.round(Math.abs(1 - p.haggle) * 100)}%)` : ''}` }),
            h('span', { class: 'ledger-total', text: formatPrice(p.total) })),
          h('div', { class: 'ledger-meta' },
            h('span', { text: isDM() ? p.buyer : 'You' }), ' · ',
            shop ? h('button', { class: 'linklike', text: shop.name, onclick: () => openShop(shop.id) }) : h('span', { text: '(closed shop)' }),
            ' · ', h('time', { text: ago(p.at), title: new Date(p.at).toLocaleString() }),
            p.settled ? h('span', { class: 'tag settled-tag', text: 'settled' }) : null),
          isDM() ? h('div', { class: 'ledger-actions' },
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!p.settled, onchange: (e) => S.store.updatePurchase(p.id, { settled: e.target.checked }).catch((err) => toast(err.message)) }), ' Settled'),
            h('button', { class: 'linklike', text: 'void', title: 'Undo this purchase (returns the stock)', onclick: async () => {
              if (confirm(`Void ${p.buyer}'s purchase of ${p.qty} × ${p.itemName}? The items go back on the shelf.`)) await S.store.deletePurchase(p.id).catch((e) => toast(e.message));
            } })) : null);
      })) : h('p', { class: 'muted', text: isDM() ? 'Nothing to settle.' : 'You haven\u2019t bought anything yet.' }),
      salesBlock(onlyOpen),
      haggles.length ? h('details', { class: 'legend' },
        h('summary', { text: `Haggling (${haggles.length})` }),
        h('ul', { class: 'sales' }, haggles.map((x) => h('li', {
          text: `${isDM() ? x.buyer : 'You'} at ${shopById(x.shopId)?.name || '(closed shop)'}: ${rollText(x)}. ${haggleResult(x.roll).text} \u00b7 ${ago(x.at)}`,
        })))) : null,
      isDM() ? partyBonuses() : null,
    ];
  }
  return h('div', { class: 'codex' },
    h('div', { class: 'codex-kind', html: '<span>Trade & coin</span>' }),
    h('h2', { class: 'codex-title', text: 'Market' }),
    isDM() ? festivalControls() : null,
    ...festivalNotes(),
    tabs,
    body);
}

// ─── loot ───────────────────────────────────────────────────────────
// The party's shared stash ("Loot"), coins, hidden caches at places, a homebrew magic item library,
// and unidentified magic items. Players see an unidentified item only by its description; what it
// really is lives in lootTruth (DM only). When a player pays a shop to identify something, the item
// is marked "being studied" and the DM's browser reveals it the next time the DM opens the atlas.
// ─── backpacks ──────────────────────────────────────────────────────
// Every character carries one backpack: their coins, and the things they own (loot marked with their uid).
// While the DM has backpacks switched on, what a player buys, sells, banks or is given goes through it, and
// every move of the coins is written to a ledger the DM can read. With backpacks off, everything works the
// old way (gold settled with the DM at the table). Each change is one all-or-nothing step (store.transact),
// so a purchase can never take the coins and lose the item, or the other way round.
const backpackOn = () => !!S.backpackCfg?.on;
const usingBackpack = () => backpackOn() && !isDM();     // the DM is not a player and has no backpack
const myUid = () => S.store.uid;
const whoAmI = () => String(myName() || S.store.displayName || 'A party member').slice(0, 60);
const backpackOf = (uid) => S.backpacks.find((b) => b.uid === uid || b.id === uid) || null;
const myPurse = () => normalizeCoins(backpackOf(myUid())?.coins);
const heldMine = (x) => heldBy(x, myUid(), whoAmI());

function onBackpacks(list) { S.backpacks = list; refreshBackpackViews(); }
function onBackpackLog(list) { S.backpackLog = list; if (S.panel?.type === 'backpack') renderPanel(); }
function onBackpackCfg(cfg) { S.backpackCfg = cfg || {}; refreshBackpackViews(); }
function refreshBackpackViews() {
  const btn = $('#backpackBtn');
  if (btn) btn.title = isDM() ? 'Backpacks: the party’s coins and things' : `Your backpack: ${coinText(myPurse())}`;
  if (['backpack', 'shop', 'market', 'sell'].includes(S.panel?.type)) renderPanel();
}

// Pay from, or be paid into, the backpack. info: { kind, text, ref } (ref may be a function of the step, for an
// id made there). work(t, logId, ref) adds the other writes that go with it (the item, the receipt).
async function backpackMove(sign, cp, info, work) {
  return S.store.transact(async (t) => {
    const purse = await t.purse(myUid(), whoAmI());
    let next;
    if (sign < 0) {
      const paid = payCoins(purse.coins, cp);
      if (!paid.ok) throw new Error(paid.reason);
      next = paid.coins;
    } else next = receiveCoins(purse.coins, cp);
    const ref = typeof info.ref === 'function' ? info.ref(t) : (info.ref || '');
    const logId = t.setCoins(purse, next, { ...info, ref });
    return work ? work(t, logId, ref) : null;
  });
}
const spend = (cp, info, work) => backpackMove(-1, cp, info, work);
const earn = (cp, info, work) => backpackMove(1, cp, info, work);

function openBackpack(id) {
  S.pinId = null; highlightPin();
  S.panel = { type: 'backpack', id: id || (isDM() ? 'all' : 'me') };
  renderPanel();
}

const historyLine = (l) => h('li', { text: `${l.deltaCp >= 0 ? '+' : '−'}${formatCp(Math.abs(l.deltaCp))} ${l.text} · now ${formatCp(l.balanceCp)} · ${ago(l.at)}` });

function backpackView() {
  const dm = isDM();
  if (dm && S.panel.id === 'all') return backpackRoster();
  const uid = dm ? S.panel.id : myUid();
  const b = backpackOf(uid);
  const owner = b?.owner || (dm ? '' : whoAmI());
  const purse = normalizeCoins(b?.coins), value = cpOf(purse);
  const items = S.loot.filter((x) => heldBy(x, uid, owner)).sort((p, q) => (q.claimedAt || q.boughtAt || 0) - (p.claimedAt || p.boughtAt || 0));
  const log = S.backpackLog.filter((l) => l.uid === uid).sort((p, q) => q.at - p.at).slice(0, 60);
  return h('div', { class: 'codex' },
    dm ? h('button', { class: 'linklike back', type: 'button', text: '← All backpacks', onclick: () => openBackpack('all') }) : null,
    h('div', { class: 'codex-kind', html: '<span>Backpack</span>' }),
    h('h2', { class: 'codex-title', text: dm ? `${owner || 'A player'}’s backpack` : 'Your backpack' }),
    !backpackOn() ? h('p', { class: 'muted', text: dm ? 'Backpacks are switched off, so players still settle gold with you at the table.' : 'Backpacks are not in use yet. Until your DM switches them on, gold is still settled at the table.' }) : null,
    h('div', { class: 'loot-coins' },
      h('span', { class: 'coin-icon', 'aria-hidden': 'true', html: glyph(KINDS.shop, 22) }),
      h('div', {}, h('strong', { id: 'bpCoins', text: coinText(purse) }), h('small', { text: value ? `about ${formatCp(value)} in all` : 'The coin purse is empty.' })),
      dm ? h('div', { class: 'row coin-actions' },
        h('button', { class: 'btn small ghost', text: 'Give coins', onclick: () => dmCoins(uid, owner, 'give') }),
        h('button', { class: 'btn small ghost', text: 'Take coins', onclick: () => dmCoins(uid, owner, 'take') }),
        h('button', { class: 'btn small ghost', text: 'Set coins', onclick: () => dmCoins(uid, owner, 'set') })) : null),
    !dm ? h('p', { class: 'muted', text: 'What you buy lands here, and what you sell or bank comes out of it. Visit a shop to spend, or a G.E.C. branch to bank your coins.' }) : null,
    !dm ? h('div', { class: 'row' }, h('button', { class: 'btn small', type: 'button', text: 'Go to the Market', onclick: () => openMarket('shops') })) : null,
    h('h3', { class: 'notes-title', text: `${dm ? 'Carrying' : 'You are carrying'}${items.length ? ` (${items.length})` : ''}` }),
    items.length ? h('ol', { class: 'loot-list' }, items.map(lootRow)) : h('p', { class: 'muted', text: 'Nothing yet.' }),
    log.length ? h('details', { class: 'legend', open: true },
      h('summary', { text: `History (${log.length})` }),
      h('ul', { class: 'sales', id: 'bpHistory' }, log.map(historyLine))) : null);
}

// DM: everyone's backpack at a glance, the on/off switch, and the clean-up of old claims.
function backpackRoster() {
  const list = [...S.backpacks].sort((a, b) => (a.owner || '').localeCompare(b.owner || ''));
  const unlinked = S.loot.filter((x) => x.claimedBy && !x.holderUid);
  const total = list.reduce((n, b) => n + cpOf(b.coins), 0);
  return h('div', { class: 'codex' },
    h('div', { class: 'codex-kind', html: '<span>Backpacks</span>' }),
    h('h2', { class: 'codex-title', text: 'The party’s backpacks' }),
    h('div', { class: 'loot-coins' },
      h('div', {}, h('strong', { id: 'bpSwitch', text: backpackOn() ? 'Backpacks are ON for players' : 'Backpacks are OFF' }),
        h('small', { text: backpackOn() ? 'Players pay, are paid and bank through their backpacks.' : 'Players settle gold with you at the table, as before.' })),
      h('div', { class: 'row coin-actions' }, h('button', { class: 'btn small ghost', id: 'bpToggle', text: backpackOn() ? 'Switch off' : 'Switch on', onclick: toggleBackpacks }))),
    list.length ? h('ol', { class: 'loot-list', id: 'bpRoster' }, list.map((b) => {
      const n = S.loot.filter((x) => heldBy(x, b.uid, b.owner)).length;
      return h('li', { class: 'loot-item' },
        h('div', { class: 'loot-main' }, h('strong', { text: b.owner || 'A player' }), h('span', { class: 'loot-value', text: coinText(b.coins) })),
        h('div', { class: 'loot-meta', text: `${n} item${n === 1 ? '' : 's'}` }),
        h('div', { class: 'loot-actions' },
          h('button', { class: 'linklike', text: 'open', onclick: () => openBackpack(b.uid) }),
          h('button', { class: 'linklike', text: 'give coins', onclick: () => dmCoins(b.uid, b.owner, 'give') }),
          h('button', { class: 'linklike', text: 'take coins', onclick: () => dmCoins(b.uid, b.owner, 'take') }),
          h('button', { class: 'linklike', text: 'set coins', onclick: () => dmCoins(b.uid, b.owner, 'set') })));
    })) : h('p', { class: 'muted', text: 'Nobody has opened the atlas since backpacks arrived. Each player gets a backpack the first time they do.' }),
    list.length ? h('p', { class: 'muted', text: `Carried by the party in all: ${formatCp(total)}.` }) : null,
    unlinked.length ? h('div', {},
      h('p', { class: 'muted', text: `${unlinked.length} claimed item${unlinked.length === 1 ? ' is' : 's are'} not tied to a backpack yet (they were claimed by name).` }),
      h('div', { class: 'row' }, h('button', { class: 'btn small ghost', id: 'bpLink', text: 'Match them to backpacks by name', onclick: linkClaimedItems }))) : null,
    h('p', { class: 'muted', text: 'The ledger of every coin that moves is in each player’s history (open their backpack).' }));
}

async function toggleBackpacks() {
  const turningOn = !backpackOn();
  const msg = turningOn
    ? 'Switch backpacks ON?\n\nFrom now on, what players buy comes out of their backpack, and what they sell or bank goes into it. Give each player their starting coins first (open a backpack, then "Give coins"), or they will not be able to buy anything.'
    : 'Switch backpacks OFF?\n\nPlayers go back to settling gold with you at the table. Coins already in backpacks stay there.';
  if (!confirm(msg)) return;
  await S.store.saveBackpackConfig({ on: turningOn }).catch((e) => toast('Could not switch it: ' + e.message));
  await S.store.addLootLog(turningOn ? 'Backpacks switched on.' : 'Backpacks switched off.').catch(() => {});
}

// Items the DM claimed for a character by typing their name now follow that character's backpack.
async function linkClaimedItems() {
  const names = new Map(S.backpacks.map((b) => [String(b.owner || '').trim().toLowerCase(), b]));
  const todo = S.loot.filter((x) => x.claimedBy && !x.holderUid);
  const missed = new Set();
  let done = 0;
  for (const x of todo) {
    const b = names.get(String(x.claimedBy).trim().toLowerCase());
    if (!b) { missed.add(x.claimedBy); continue; }
    try { await S.store.saveLoot({ holderUid: b.uid }, x.id); done++; } catch (e) { toast('Could not link ' + x.name + ': ' + e.message); }
  }
  toast(`Matched ${done} item${done === 1 ? '' : 's'}.${missed.size ? ` No backpack yet for: ${[...missed].join(', ')}.` : ''}`);
}

// DM: give, take or set a character's coins (always with a line in the ledger).
async function dmCoins(uid, owner, mode) {
  const cur = normalizeCoins(backpackOf(uid)?.coins);
  const ask = { give: `Give ${owner || 'them'} how much? e.g. "120 gp 40 sp"`, take: `Take how much from ${owner || 'them'}? They hold ${coinText(cur)}.`, set: `Set ${owner || 'their'} coins to how much? They hold ${coinText(cur)}. e.g. "50 gp"` }[mode];
  const amount = parseCoins(prompt(ask, mode === 'set' ? coinText(cur).replace('No coins', '0 gp') : ''));
  if (!amount) return;
  const why = mode === 'set' ? '' : (prompt('Why? (optional; it goes in their history)', '') || '').trim().slice(0, 120);
  try {
    await S.store.transact(async (t) => {
      const purse = await t.purse(uid, owner);
      let next;
      if (mode === 'give') next = addPurse(purse.coins, amount);
      else if (mode === 'take') { const r = takeFromPurse(purse.coins, amount); if (!r.ok) throw new Error(r.reason); next = r.coins; }
      else next = normalizeCoins(amount);
      const kind = { give: 'award', take: 'take', set: 'set' }[mode];
      t.setCoins(purse, next, { kind, owner, text: `${LEDGER_KINDS[kind]}${why ? `: ${why}` : ''}` });
    });
    toast(`${{ give: 'Gave', take: 'Took', set: 'Set' }[mode]} ${coinText(amount)}${mode === 'take' ? ' from' : mode === 'set' ? ' for' : ' to'} ${owner || 'them'}.`);
  } catch (e) { toast('Could not do that: ' + e.message); }
}

const COIN_KEYS = ['pp', 'gp', 'sp', 'cp'];
const coinText = (c) => COIN_KEYS.filter((k) => c?.[k]).map((k) => `${Number(c[k]).toLocaleString()} ${k}`).join(', ') || 'No coins';
const addCoins = (a, b, sign = 1) => Object.fromEntries(COIN_KEYS.map((k) => [k, Math.max(0, (Number(a?.[k]) || 0) + sign * (Number(b?.[k]) || 0))]));
function parseCoins(text) {
  const out = { cp: 0, sp: 0, gp: 0, pp: 0 };
  let found = false;
  for (const m of String(text || '').toLowerCase().matchAll(/(\d[\d,]*)\s*(pp|gp|sp|cp)/g)) { out[m[2]] += parseInt(m[1].replace(/,/g, ''), 10); found = true; }
  return found ? out : null;
}
const lootById = (id) => S.loot.find((x) => x.id === id);
const partyNames = () => [...new Set([...S.backpacks.map((b) => b.owner), ...S.players.map((p) => p.name), ...S.loot.map((x) => x.claimedBy)].filter(Boolean))].sort();
// the backpack a typed name belongs to (ignoring capitals and stray spaces)
const backpackByName = (name) => S.backpacks.find((b) => b.owner && String(b.owner).trim().toLowerCase() === String(name || '').trim().toLowerCase()) || null;

function onLoot(list) { S.loot = list; processIdentifications(); refreshLootViews(); }
function onLootTruth(list) { S.lootTruth = Object.fromEntries(list.map((x) => [x.id, x])); processIdentifications(); refreshLootViews(); }
function refreshLootViews() {
  if (S.panel?.type === 'market' && S.panel.tab === 'loot') renderPanel();
  else if (['pin', 'about', 'backpack', 'shop'].includes(S.panel?.type)) renderPanel();   // a shop shows writs; a backpack shows what is carried
}

// DM's browser only: reveal anything a player has paid to identify.
const identifying = new Set();
async function processIdentifications() {
  if (!isDM()) return;
  const waiting = S.loot.filter((x) => x.status === 'pending' && S.lootTruth[x.id] && !identifying.has(x.id));
  if (!waiting.length) return;
  waiting.forEach((x) => identifying.add(x.id));
  try {
    for (const x of waiting) await revealItem(x, x.pendingIn ? `Identified in ${x.pendingIn}` : 'Identified');
    toast(`${waiting.length} item${waiting.length === 1 ? '' : 's'} identified for the party.`);
  } catch (e) { toast('Could not identify: ' + e.message); }
  waiting.forEach((x) => identifying.delete(x.id));
}

async function revealItem(item, how) {
  const t = S.lootTruth[item.id];
  if (!t) return;
  await S.store.saveLoot({ name: t.name, detail: t.detail || '', value: t.value ?? null, rarity: t.rarity || '', status: 'identified', identifiedAt: Date.now() }, item.id);
  await S.store.addLootLog(`${how}: “${item.name}” turned out to be ${t.name}${t.rarity ? ` (${t.rarity})` : ''}.`);
}

// Put a pile of generated loot into the party's stash.
// holder (optional): a backpack, { uid, owner }. The coins and things go straight into that character's backpack
// instead of the party's stash.
async function giveLoot(pile, source, holder) {
  const hasCoins = COIN_KEYS.some((k) => pile.coins?.[k]);
  if (hasCoins && holder) {
    await S.store.transact(async (t) => {
      const purse = await t.purse(holder.uid, holder.owner);
      t.setCoins(purse, addPurse(purse.coins, pile.coins), { kind: 'loot', text: `Found${source ? ` at ${source}` : ''}: ${coinText(pile.coins)}`, owner: holder.owner });
    });
  } else if (hasCoins) await S.store.savePartyCoins(addCoins(S.partyCoins, pile.coins));
  const mine = holder ? { holderUid: holder.uid, claimedBy: holder.owner, claimedAt: Date.now() } : {};
  for (const line of pile.lines) {
    if (line.kind === 'magic' && line.magic) {
      const m = line.magic;
      const id = await S.store.saveLoot({ kind: 'magic', name: m.label || 'A curious item', detail: m.unidentified || '', value: null, qty: line.qty || 1, status: 'unidentified', source, ...mine });
      await S.store.saveLootTruth(id, { name: m.name, detail: m.detail || '', rarity: m.rarity || '', value: m.value ?? null, type: m.type || '', homebrewId: m.homebrewId || '' });
    } else {
      await S.store.saveLoot({ kind: line.kind, name: line.name, detail: line.detail || '', value: line.value || null, qty: line.qty || 1, status: 'identified', source, ...mine });
    }
  }
  const things = [
    hasCoins ? coinText(pile.coins) : '',
    ...pile.lines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ''}${l.kind === 'magic' ? (l.magic?.label || 'a curious item').replace(/^A /, 'a ') : l.name}`),
  ].filter(Boolean);
  await S.store.addLootLog(`${holder ? `${holder.owner} found` : 'Found'}${source ? ` at ${source}` : ''}: ${things.join('; ') || 'nothing of value'}.`);
}

// ── assigning generated loot, then dropping it ─────────────────────
const sortedBackpacks = () => [...S.backpacks].sort((a, b) => (a.owner || '').localeCompare(b.owner || ''));
const lootLineName = (l) => `${l.qty > 1 ? `${l.qty} \u00d7 ` : ''}${l.kind === 'magic' ? (l.magic?.label || 'a curious item').replace(/^A /, 'a ') : l.name}`;
// A choice of who gets something: value '' means "whatever is chosen above" (the first option's wording is passed in),
// 'party' the shared Loot, or a character's uid. extra: more options after the first (like "shared evenly").
const recipientSelect = (value, firstLabel, onPick, extra = []) => h('select', { class: 'gl-to', onchange: (e) => onPick(e.target.value) },
  [h('option', { value: '', selected: !value, text: firstLabel }), ...extra,
    h('option', { value: 'party', selected: value === 'party', text: 'The party\u2019s Loot' }),
    ...sortedBackpacks().map((b) => h('option', { value: b.uid, selected: value === b.uid, text: b.owner || 'A player' }))]);

// Who gets what: a Map from '' (the party's shared Loot) or a character's uid to { coins, lines }.
// defaultTo is the "give everything to" choice; a line's own choice (l.to) overrides it, and the coins have theirs (d.coinsTo).
function lootPlan(d, defaultTo) {
  const plan = new Map();
  const slot = (key) => { if (!plan.has(key)) plan.set(key, { coins: normalizeCoins({}), lines: [] }); return plan.get(key); };
  const dest = (to) => { const v = to === 'party' ? '' : (to || defaultTo || ''); return v && backpackOf(v) ? v : ''; };
  const coins = normalizeCoins(d.coins);
  if (d.coinsTo === 'split') {
    const who = (d.splitAmong || []).filter((uid) => backpackOf(uid));
    const { share, left } = splitEvenly(coins, who.length);
    if (who.length && cpOf(share)) { who.forEach((uid) => { slot(uid).coins = share; }); slot('').coins = addPurse(slot('').coins, left); }
    else slot('').coins = coins;
  } else slot(dest(d.coinsTo)).coins = addPurse(slot(dest(d.coinsTo)).coins, coins);
  for (const l of d.lines) slot(dest(l.to)).lines.push(l);
  for (const [key, share] of [...plan]) if (!cpOf(share.coins) && !share.lines.length) plan.delete(key);
  return plan;
}

// Drop the whole plan in one all-or-nothing step: coins into backpacks, things into backpacks or the party's Loot.
async function dropLoot(plan, source) {
  const now = Date.now(), told = [];
  let partyCoins = null;
  await S.store.transact(async (t) => {
    const purses = new Map();
    for (const key of plan.keys()) if (key) { const b = backpackOf(key); if (!b) throw new Error('One of those characters has no backpack yet.'); purses.set(key, await t.purse(b.uid, b.owner)); }
    for (const [key, share] of plan) {
      const holder = key ? backpackOf(key) : null, hasCoins = cpOf(share.coins) > 0;
      if (hasCoins && holder) { const purse = purses.get(key); t.setCoins(purse, addPurse(purse.coins, share.coins), { kind: 'loot', text: `Found${source ? ` at ${source}` : ''}: ${coinText(share.coins)}`, owner: holder.owner }); }
      else if (hasCoins) partyCoins = share.coins;
      const mine = holder ? { holderUid: holder.uid, claimedBy: holder.owner, claimedAt: now } : {};
      for (const line of share.lines) {
        if (line.kind === 'magic' && line.magic) {
          const m = line.magic;
          const id = t.add('loot', { foundAt: now, kind: 'magic', name: m.label || 'A curious item', detail: m.unidentified || '', value: null, qty: line.qty || 1, status: 'unidentified', source: source || '', ...mine });
          t.set('lootTruth', id, { name: m.name, detail: m.detail || '', rarity: m.rarity || '', value: m.value ?? null, type: m.type || '', homebrewId: m.homebrewId || '' });
        } else t.add('loot', { foundAt: now, kind: line.kind, name: line.name, detail: line.detail || '', value: line.value || null, qty: line.qty || 1, status: 'identified', source: source || '', ...mine });
      }
      told.push(`${holder ? holder.owner : 'the party\u2019s Loot'}: ${[hasCoins ? coinText(share.coins) : '', ...share.lines.map(lootLineName)].filter(Boolean).join(', ')}`);
    }
    if (partyCoins) t.set('party', 'coins', addCoins(S.partyCoins, partyCoins));
    t.add('lootLog', { text: `Found${source ? ` at ${source}` : ''}. ${told.join('; ') || 'Nothing of value'}.`, at: now });
  });
  return told;
}

// ── the Loot tab ────────────────────────────────────────────────────
function lootTab() {
  const unclaimed = S.loot.filter((x) => !x.claimedBy).sort((a, b) => (b.foundAt || 0) - (a.foundAt || 0));
  const claimed = S.loot.filter((x) => x.claimedBy).sort((a, b) => (b.claimedAt || 0) - (a.claimedAt || 0));
  const log = [...S.lootLog].sort((a, b) => b.at - a.at);
  const pendingCount = S.loot.filter((x) => x.status === 'pending').length;
  return [
    h('div', { class: 'loot-coins' },
      h('span', { class: 'coin-icon', 'aria-hidden': 'true', html: glyph(KINDS.shop, 22) }),
      h('div', {},
        h('strong', { text: coinText(S.partyCoins) }),
        coinValue(S.partyCoins) ? h('small', { text: `about ${formatPrice(coinValue(S.partyCoins))} in all` }) : h('small', { text: 'The party purse is empty.' })),
      isDM() ? h('div', { class: 'row coin-actions' },
        h('button', { class: 'btn small ghost', text: 'Split evenly', onclick: splitCoins }),
        h('button', { class: 'btn small ghost', text: 'Take coins', onclick: takeCoins }),
        h('button', { class: 'btn small ghost', text: 'Add coins', onclick: addCoinsPrompt })) : null),
    isDM() ? h('div', { class: 'row loot-dm' },
      h('button', { class: 'btn', text: '+ Generate loot', onclick: () => openLootGen(S.pageId ? `page:${S.pageId}` : '') }),
      h('button', { class: 'btn ghost', text: `Magic items (${S.magicItems.length})`, onclick: () => { S.panel = { type: 'magicLib', id: 'all' }; renderPanel(); } }),
      pendingCount ? h('span', { class: 'tag', text: `${pendingCount} being identified` }) : null) : null,
    isDM() && S.caches.length ? h('details', { class: 'legend caches' },
      h('summary', { text: `Hidden caches (${S.caches.length})` }),
      h('ul', {}, S.caches.map(cacheRow))) : null,
    h('h3', { class: 'notes-title', text: `In the party’s Loot${unclaimed.length ? ` (${unclaimed.length})` : ''}` }),
    unclaimed.length ? h('ol', { class: 'loot-list' }, unclaimed.map(lootRow)) : h('p', { class: 'muted', text: 'Nothing unclaimed. The party’s pockets are light.' }),
    claimed.length ? h('details', { class: 'legend' },
      h('summary', { text: `Claimed (${claimed.length})` }),
      h('ol', { class: 'loot-list' }, claimed.map(lootRow))) : null,
    log.length ? h('details', { class: 'legend' },
      h('summary', { text: 'History' }),
      h('ul', { class: 'sales' }, log.slice(0, 60).map((l) => h('li', { text: `${l.text} · ${ago(l.at)}` })))) : null,
  ];
}

function lootRow(x) {
  const truth = isDM() && S.lootTruth[x.id];
  const status = x.status === 'unidentified' ? 'Unidentified' : x.status === 'pending' ? 'Being studied by the sage…' : '';
  return h('li', { class: `loot-item ${x.kind || ''} ${x.status || ''}` },
    h('div', { class: 'loot-main' },
      h('strong', { text: `${x.qty > 1 ? `${x.qty} × ` : ''}${x.name}` }),
      x.rarity ? h('span', { class: 'grade rare', text: x.rarity }) : null,
      status ? h('span', { class: `grade ${x.status === 'pending' ? 'fine' : 'house'}`, text: status }) : null,
      h('span', { class: 'loot-value', text: x.status !== 'identified' ? 'value unknown' : x.value ? formatPrice(x.value * (x.qty || 1)) : '' })),
    x.detail ? h('div', { class: 'loot-detail', text: x.detail }) : null,
    truth && x.status !== 'identified' ? h('div', { class: 'loot-truth', text: `DM: really ${truth.name}${truth.rarity ? ` (${truth.rarity})` : ''}${truth.value ? `, ${formatPrice(truth.value)}` : ''}. ${truth.detail || ''}` }) : null,
    x.kind === 'goods' && x.cost != null ? h('div', { class: 'loot-detail', text: `Bought for ${formatPrice(x.cost)} each${x.boughtBy ? ` by ${x.boughtBy}` : ''}.` }) : null,
    h('div', { class: 'loot-meta' },
      [x.source ? `Found at ${x.source}` : '', x.claimedBy ? `Claimed by ${x.claimedBy}` : '', x.pendingBy ? (x.status === 'identified' ? `identified in ${x.pendingIn || 'town'} (paid by ${x.pendingBy})` : `sent to be identified by ${x.pendingBy}${x.pendingIn ? ` in ${x.pendingIn}` : ''}`) : ''].filter(Boolean).join(' · ')),
    isDM() ? h('div', { class: 'loot-actions' },
      !x.claimedBy ? h('button', { class: 'linklike', text: x.kind === 'goods' || x.kind === 'writ' ? 'give to a character…' : 'claim…', onclick: () => claimItem(x) }) : h('button', { class: 'linklike', text: 'unclaim', onclick: () => unclaimItem(x) }),
      x.status === 'identified' && x.kind !== 'hook' && x.kind !== 'writ' ? h('button', { class: 'linklike', text: 'sell…', title: 'Sell it to a shop', onclick: () => openSell(x.id) }) : null,
      x.status !== 'identified' ? h('button', { class: 'linklike', text: 'reveal', title: 'Identify it now, for free', onclick: () => revealItem(x, 'Identified').catch((e) => toast(e.message)) }) : null,
      h('button', { class: 'linklike', text: 'remove', onclick: async () => {
        if (!confirm(`Remove "${x.name}" from Loot for good?`)) return;
        await S.store.deleteLoot(x.id).catch((e) => toast(e.message));
        await S.store.addLootLog(`Removed from Loot: ${x.name}.`).catch(() => {});
      } })) : null,
    !isDM() && x.kind === 'goods' && (!x.claimedBy || heldMine(x)) ? h('div', { class: 'loot-actions' }, h('button', { class: 'linklike', text: 'sell…', title: 'Sell it to a shop', onclick: () => openSell(x.id) })) : null);
}

async function claimItem(x) {
  const names = partyNames();
  const who = prompt(`Who claims "${x.name}"?${names.length ? `\n\nKnown party members: ${names.join(', ')}` : ''}`, names[0] || '');
  if (!who?.trim()) return;
  let qty = x.qty || 1;
  if (qty > 1) {
    const n = parseInt(prompt(`How many of the ${qty}?`, String(qty)), 10);
    if (!(n > 0) || n > qty) { toast(`Enter a number from 1 to ${qty}.`); return; }
    qty = n;
  }
  try {
    // a name that matches a backpack puts the item in that character's backpack
    const holder = backpackByName(who) ? { holderUid: backpackByName(who).uid } : {};
    if (qty === (x.qty || 1)) {
      await S.store.saveLoot({ claimedBy: who.trim(), claimedAt: Date.now(), ...holder }, x.id);
    } else {
      // split the stack: the claimed part becomes its own entry (with its secret identity copied)
      await S.store.saveLoot({ qty: x.qty - qty }, x.id);
      const { id, ...rest } = x;
      const newId = await S.store.saveLoot({ ...rest, qty, claimedBy: who.trim(), claimedAt: Date.now(), ...holder });
      if (S.lootTruth[x.id]) { const { id: _t, ...truth } = S.lootTruth[x.id]; await S.store.saveLootTruth(newId, truth); }
    }
    await S.store.addLootLog(`${who.trim()} claimed ${qty > 1 ? `${qty} × ` : ''}${x.name}.`);
  } catch (e) { toast('Could not claim: ' + e.message); }
}

async function unclaimItem(x) {
  await S.store.saveLoot({ claimedBy: null, claimedAt: null, holderUid: null }, x.id).catch((e) => toast(e.message));
  await S.store.addLootLog(`${x.name} went back into Loot (was ${x.claimedBy}’s).`).catch(() => {});
}

async function takeCoins() {
  const who = prompt(`Who is taking coins?${partyNames().length ? `\n\nKnown party members: ${partyNames().join(', ')}` : ''}`);
  if (!who?.trim()) return;
  const amount = parseCoins(prompt(`How much does ${who.trim()} take? e.g. "50 gp" or "2 pp 15 gp 4 sp"\n\nIn Loot: ${coinText(S.partyCoins)}`));
  if (!amount) return;
  if (COIN_KEYS.some((k) => amount[k] > (S.partyCoins[k] || 0))) { toast('There isn’t that much in Loot.'); return; }
  const b = backpackByName(who);
  if (b) {
    // out of the party's coins and into that character's backpack, in one step
    try {
      await S.store.transact(async (t) => {
        const purse = await t.purse(b.uid, b.owner);
        t.set('party', 'coins', addCoins(S.partyCoins, amount, -1));
        t.setCoins(purse, addPurse(purse.coins, amount), { kind: 'loot', text: `Took ${coinText(amount)} from the party’s coins`, owner: b.owner });
      });
      toast(`${b.owner} took ${coinText(amount)}. It is in their backpack.`);
    } catch (e) { toast('Could not do that: ' + e.message); return; }
  } else await S.store.savePartyCoins(addCoins(S.partyCoins, amount, -1)).catch((e) => toast(e.message));
  await S.store.addLootLog(`${who.trim()} took ${coinText(amount)}.`).catch(() => {});
}

async function addCoinsPrompt() {
  const amount = parseCoins(prompt('Add how much to Loot? e.g. "120 gp 40 sp"'));
  if (!amount) return;
  const why = prompt('Where did it come from? (optional)', '') || '';
  await S.store.savePartyCoins(addCoins(S.partyCoins, amount)).catch((e) => toast(e.message));
  await S.store.addLootLog(`Added to Loot${why ? ` (${why})` : ''}: ${coinText(amount)}.`).catch(() => {});
}

async function splitCoins() {
  const names = (prompt('Split the coins evenly between who? (comma-separated)', partyNames().join(', ')) || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (!names.length) return;
  const share = Object.fromEntries(COIN_KEYS.map((k) => [k, Math.floor((S.partyCoins[k] || 0) / names.length)]));
  if (!COIN_KEYS.some((k) => share[k])) { toast('Not enough coins to split.'); return; }
  const total = Object.fromEntries(COIN_KEYS.map((k) => [k, share[k] * names.length]));
  const left = addCoins(S.partyCoins, total, -1);
  if (!confirm(`Each of ${names.join(', ')} gets ${coinText(share)}.${COIN_KEYS.some((k) => left[k]) ? `\n${coinText(left)} stays in Loot (it doesn’t divide evenly).` : ''}`)) return;
  const packs = names.map(backpackByName);
  if (packs.some(Boolean)) {
    // each name that has a backpack gets their share in it; the party's coins go down by what was handed out
    const unmatched = names.filter((_, i) => !packs[i]);
    if (unmatched.length && !confirm(`No backpack for ${unmatched.join(', ')}. Their share stays in Loot. Carry on?`)) return;
    const matched = packs.filter(Boolean);
    const handed = Object.fromEntries(COIN_KEYS.map((k) => [k, share[k] * matched.length]));
    try {
      await S.store.transact(async (t) => {
        const purses = [];
        for (const b of matched) purses.push(await t.purse(b.uid, b.owner));
        t.set('party', 'coins', addCoins(S.partyCoins, handed, -1));
        purses.forEach((p) => t.setCoins(p, addPurse(p.coins, share), { kind: 'split', text: `Coins split ${names.length} ways: ${coinText(share)} each`, owner: p.owner }));
      });
    } catch (e) { toast('Could not split them: ' + e.message); return; }
    await S.store.addLootLog(`Coins split ${names.length} ways: ${matched.map((b) => b.owner).join(', ')} each took ${coinText(share)}, into their backpacks.`).catch(() => {});
    return;
  }
  await S.store.savePartyCoins(left).catch((e) => toast(e.message));
  await S.store.addLootLog(`Coins split ${names.length} ways: ${names.join(', ')} each took ${coinText(share)}.`).catch(() => {});
}

// ── hidden caches ───────────────────────────────────────────────────
const cachesAt = (type, id) => S.caches.filter((c) => c.place === `${type}:${id}`
  || (type === 'page' && c.place?.startsWith('pin:') && pinById(c.place.slice(4))?.pageId === id));

function cacheRow(c) {
  const place = placeOf(c.place);
  return h('li', { class: 'cache-row' },
    h('div', {},
      h('strong', { text: c.title || 'Hidden loot' }),
      h('small', { text: ` ${place ? `at ${place.label}` : ''} · ${coinText(c.coins)}${c.lines?.length ? ` + ${c.lines.length} item${c.lines.length === 1 ? '' : 's'}` : ''}` })),
    h('div', { class: 'row' },
      h('button', { class: 'btn small', text: 'Reveal to party', onclick: async () => {
        if (!confirm(`The party found "${c.title || 'the hidden loot'}"? It goes into Loot.`)) return;
        try { await giveLoot(c, placeOf(c.place)?.label || c.title || ''); await S.store.deleteCache(c.id); toast('Added to the party’s Loot.'); }
        catch (e) { toast('Could not reveal: ' + e.message); }
      } }),
      h('button', { class: 'linklike', text: 'view', onclick: () => { S.panel = { type: 'lootGen', id: c.place, draft: { ...c.draftOpts, seed: c.seed, coins: c.coins, lines: c.lines }, cacheId: c.id, title: c.title }; renderPanel(); } }),
      h('button', { class: 'linklike', text: 'discard', onclick: () => confirm('Throw this cache away?') && S.store.deleteCache(c.id).catch((e) => toast(e.message)) })));
}

function cachesHere(list, ref) {
  if (!isDM()) return null;
  return h('section', { class: 'people-here dm-cache' },
    h('h3', { class: 'notes-title', text: `Hidden loot here${list.length ? ` (${list.length})` : ''} · DM only` }),
    list.length ? h('ul', { class: 'cache-list' }, list.map(cacheRow)) : null,
    h('button', { class: 'btn small ghost', text: '+ Generate loot here', onclick: () => openLootGen(ref) }));
}

// ── the generator (DM) ──────────────────────────────────────────────
function openLootGen(ref) {
  const opts = { level: Number(lsGet('atlas-loot-level')) || 3, mode: 'individual', setting: 'lair', homebrewMode: 'mix' };
  S.panel = { type: 'lootGen', id: ref || '', draft: { ...opts, ...generateLoot({ ...opts, homebrew: S.magicItems }) } };
  renderPanel();
}

function lootGenView() {
  const d = S.panel.draft, ref = S.panel.id;
  const optsOf = () => ({ level: d.level, mode: d.mode, setting: d.setting, homebrewMode: d.homebrewMode, homebrew: S.magicItems });
  const reroll = () => { Object.assign(d, generateLoot(optsOf())); renderPanel(); };
  const setOpt = (k, v) => { d[k] = v; if (k === 'level') lsSet('atlas-loot-level', String(v)); reroll(); };
  const level = h('input', { type: 'number', min: 1, max: 20, value: d.level, onchange: (e) => setOpt('level', Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1))) });
  const mode = h('select', { onchange: (e) => setOpt('mode', e.target.value) }, Object.entries(MODES).map(([k, v]) => h('option', { value: k, selected: k === d.mode, text: v })));
  const setting = h('select', { onchange: (e) => setOpt('setting', e.target.value) }, Object.entries(SETTINGS).map(([k, v]) => h('option', { value: k, selected: k === d.setting, text: v.label })));
  const hb = S.magicItems.length ? h('select', { onchange: (e) => setOpt('homebrewMode', e.target.value) },
    [['mix', 'Mix in my homebrew'], ['prefer', 'Prefer my homebrew'], ['only', 'Only my homebrew']].map(([k, v]) => h('option', { value: k, selected: k === d.homebrewMode, text: v }))) : null;
  const coinInputs = COIN_KEYS.map((k) => h('label', { class: 'coin-input' }, h('input', { type: 'number', min: 0, value: d.coins[k] || 0, onchange: (e) => { d.coins[k] = Math.max(0, parseInt(e.target.value, 10) || 0); } }), ` ${k}`));
  const kindLabel = { gem: 'gem', art: 'art', gear: 'item', hook: 'story hook', magic: 'magic' };
  // split some of a stack off into its own line, so it can go to someone else
  const splitLine = (i) => {
    const l = d.lines[i], have = l.qty || 1;
    const n = parseInt(prompt(`Split how many off the ${have}?`, '1'), 10);
    if (!(n >= 1 && n < have)) return;
    l.qty = have - n;
    d.lines.splice(i + 1, 0, { ...l, qty: n, id: `split-${Date.now()}` });
    renderPanel();
  };
  const lines = h('ol', { class: 'gen-lines' }, d.lines.map((l, i) => h('li', { class: `gen-line ${l.kind}` },
    h('span', { class: `grade ${l.kind === 'magic' ? 'rare' : l.kind === 'hook' ? 'house' : 'fine'}`, text: kindLabel[l.kind] || l.kind }),
    h('input', { type: 'number', class: 'gl-qty', min: 1, value: l.qty || 1, title: 'How many', onchange: (e) => { l.qty = Math.max(1, parseInt(e.target.value, 10) || 1); } }),
    h('div', { class: 'gl-main' },
      l.kind === 'magic'
        ? h('div', {},
          h('strong', { text: l.magic.name }), ` (${l.magic.rarity}${l.magic.homebrewId ? ', homebrew' : ''}, ${formatPrice(l.magic.value || 0)})`,
          h('small', { text: `Players will see: “${l.magic.label}. ${l.magic.unidentified}”` }))
        : h('input', { type: 'text', value: l.name, onchange: (e) => { l.name = e.target.value; } }),
      l.kind !== 'magic' && l.kind !== 'hook' && l.kind !== 'gear' ? h('small', { text: `${formatPrice(l.value || 0)} each` }) : null,
      // who gets it: a character, or the party's Loot (blank follows the choice at the foot)
      S.backpacks.length ? h('div', { class: 'gl-assign' },
        recipientSelect(l.to || '', 'As chosen below', (v) => { l.to = v; renderPanel(); }),
        (l.qty || 1) > 1 ? h('button', { class: 'linklike', type: 'button', text: 'split\u2026', title: 'Split some of this stack off, to give to someone else', onclick: () => splitLine(i) }) : null) : null),
    h('button', { class: 'linklike', type: 'button', text: '↻', title: 'Reroll this line', onclick: () => { d.lines[i] = { ...rerollLine(l, optsOf()), ...(l.to ? { to: l.to } : {}) }; renderPanel(); } }),
    h('button', { class: 'linklike', type: 'button', text: '×', title: 'Remove', onclick: () => { d.lines.splice(i, 1); renderPanel(); } }))));
  const addMagic = h('select', { onchange: (e) => {
    const [src, key] = e.target.value.split(':');
    if (!key) return;
    const m = src === 'hb' ? S.magicItems.find((x) => x.id === key) : SRD_MAGIC.find((x) => x.name === key);
    if (m) d.lines.push({ id: `add-${Date.now()}`, kind: 'magic', qty: 1, name: m.name, value: Number(m.value) || 0,
      magic: { name: m.name, rarity: m.rarity, type: m.type || 'wondrous', label: m.label || 'A curious item', unidentified: m.unidentified || '', detail: m.detail || '', value: Number(m.value) || 0, homebrewId: src === 'hb' ? m.id : '' } });
    renderPanel();
  } },
  h('option', { value: '', text: '+ Add a specific magic item…' }),
  S.magicItems.length ? h('optgroup', { label: 'My homebrew' }, S.magicItems.map((m) => h('option', { value: `hb:${m.id}`, text: `${m.name} (${m.rarity})` }))) : null,
  h('optgroup', { label: 'SRD' }, SRD_MAGIC.map((m) => h('option', { value: `srd:${m.name}`, text: `${m.name} (${m.rarity})` }))));
  // where it can be hidden: the current map and its pins, or anywhere else
  const places = [
    ...S.pages.map((p) => [`page:${p.id}`, `${' '.repeat(p._depth)}${p.title}`]),
    ...S.pins.filter((p) => p.pageId === S.pageId && p.kind !== 'shop').map((p) => [`pin:${p.id}`, ` • ${p.title} (on this map)`]),
  ];
  const placeSel = h('select', {}, places.map(([v, t]) => h('option', { value: v, selected: v === ref, text: t })));
  const title = h('input', { type: 'text', maxlength: 80, value: S.panel.title || '', placeholder: 'e.g. The bandit captain’s strongbox' });
  const total = coinValue(d.coins) + d.lines.reduce((n, l) => n + (Number(l.value) || 0) * (l.qty || 1), 0);
  const plan = lootPlan(d, S.panel.giveTo || '');
  const recipients = [...plan.keys()].filter(Boolean);
  const giveLabel = recipients.length === 0 ? 'Give to the party now' : recipients.length === 1 && plan.size === 1 ? `Give to ${backpackOf(recipients[0]).owner}` : 'Give it out now';
  const pile = () => ({ coins: { ...d.coins }, lines: d.lines.map(({ to, ...l }) => ({ ...l })) });   // (a hidden cache keeps no assignments)
  const giveTo = h('select', { id: 'giveTo', onchange: (e) => { S.panel.giveTo = e.target.value; renderPanel(); } },
    [h('option', { value: '', text: 'The party’s Loot (shared)' }), ...[...S.backpacks].sort((a, b) => (a.owner || '').localeCompare(b.owner || '')).map((b) => h('option', { value: b.uid, selected: S.panel.giveTo === b.uid, text: `${b.owner || 'A player'}’s backpack` }))]);
  return h('div', { class: 'codex editor' },
    h('button', { class: 'linklike back', text: '← Loot', onclick: () => openMarket('loot') }),
    h('h2', { class: 'codex-title', text: S.panel.cacheId ? 'Hidden cache' : 'Generate loot' }),
    h('div', { class: 'row gen-pickers' }, field('Party level', level), field('How much', mode)),
    h('div', { class: 'row gen-pickers' }, field('Where it’s found', setting), hb ? field('Magic items', hb) : null),
    h('div', { class: 'row' }, h('button', { class: 'btn ghost', type: 'button', text: '↻ Reroll everything', onclick: reroll })),
    h('div', { class: 'field' }, h('span', { text: 'Coins' }), h('div', { class: 'row coin-row' }, coinInputs),
      S.backpacks.length ? h('div', { class: 'coin-dest' },
        recipientSelect(d.coinsTo || '', 'As chosen below', (v) => { d.coinsTo = v; if (v === 'split' && !d.splitAmong) d.splitAmong = S.backpacks.map((b) => b.uid); renderPanel(); },
          [h('option', { value: 'split', selected: d.coinsTo === 'split', text: 'Shared evenly between\u2026' })]),
        d.coinsTo === 'split' ? h('div', { class: 'split-who' }, sortedBackpacks().map((b) => h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: (d.splitAmong || []).includes(b.uid), onchange: (e) => { const set = new Set(d.splitAmong || []); if (e.target.checked) set.add(b.uid); else set.delete(b.uid); d.splitAmong = [...set]; renderPanel(); } }),
          ` ${b.owner || 'A player'}`))) : null) : null),
    h('div', { class: 'field' }, h('span', { text: `Items (${d.lines.length})` }), lines,
      h('div', { class: 'row' },
        h('button', { class: 'btn small ghost', type: 'button', text: '+ Add a line', onclick: () => { d.lines.push({ id: `add-${Date.now()}`, kind: 'gear', qty: 1, name: '', value: 0 }); renderPanel(); } }),
        addMagic)),
    h('p', { class: 'muted', text: `Worth about ${formatPrice(total)} (magic items at their listed value).` }),
    h('div', { class: 'gen-actions' },
      // who gets it: the party's shared stash, or straight into one character's backpack
      S.backpacks.length ? field('Everything goes to', giveTo, 'Anything you do not choose for above goes here.') : null,
      // who gets what, before you press the button
      S.backpacks.length ? h('div', { class: 'drop-summary', id: 'dropSummary' },
        h('strong', { text: 'Who gets what' }),
        plan.size ? h('ul', {}, [...plan].map(([key, share]) => h('li', {},
          h('b', { text: key ? backpackOf(key).owner : 'The party\u2019s Loot' }), ': ',
          [cpOf(share.coins) ? coinText(share.coins) : '', ...share.lines.map(lootLineName)].filter(Boolean).join(', ')))) : h('p', { class: 'muted', text: 'Nothing to give out.' })) : null,
      h('button', { class: 'btn', id: 'giveLootBtn', type: 'button', text: giveLabel, onclick: async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          await dropLoot(lootPlan(d, S.panel.giveTo || ''), placeOf(placeSel.value)?.label || title.value.trim() || '');
          if (S.panel.cacheId) await S.store.deleteCache(S.panel.cacheId);
          toast(plan.size === 1 && [...plan.keys()][0] ? `Added to ${backpackOf([...plan.keys()][0]).owner}\u2019s backpack.` : plan.size > 1 || [...plan.keys()].some(Boolean) ? 'Handed out: ' + [...plan.keys()].map((k) => (k ? backpackOf(k).owner : 'the party\u2019s Loot')).join(', ') + '.' : 'Added to the party\u2019s Loot.');
          openMarket('loot');
        } catch (err) { toast('Could not give it out: ' + err.message); btn.disabled = false; }
      } }),
      h('div', { class: 'row' },
        placeSel, title,
        h('button', { class: 'btn ghost', type: 'button', text: S.panel.cacheId ? 'Save cache' : 'Hide it here', onclick: async () => {
          try {
            await S.store.saveCache({ place: placeSel.value, title: title.value.trim(), seed: d.seed, ...pile(),
              draftOpts: { level: d.level, mode: d.mode, setting: d.setting, homebrewMode: d.homebrewMode }, createdAt: Date.now() }, S.panel.cacheId);
            toast('Hidden. Reveal it from that place (or Loot) when the party finds it.');
            openMarket('loot');
          } catch (err) { toast('Could not hide it: ' + err.message); }
        } })),
      h('small', { class: 'muted', text: 'A hidden cache is only visible to you until you Reveal it.' })));
}

// ── homebrew magic items (DM) ───────────────────────────────────────
function magicLibView() {
  const items = [...S.magicItems].sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.name.localeCompare(b.name));
  return h('div', { class: 'codex' },
    h('button', { class: 'linklike back', text: '← Loot', onclick: () => openMarket('loot') }),
    h('div', { class: 'codex-kind', html: '<span>DM only</span>' }),
    h('h2', { class: 'codex-title', text: 'My magic items' }),
    h('p', { class: 'codex-sub', text: 'Your homebrew. They’re mixed into loot by rarity, and can appear under the counter in big-city shops.' }),
    h('div', { class: 'codex-actions' }, h('button', { class: 'btn', text: '+ New magic item', onclick: () => { S.panel = { type: 'magicEdit', id: 'new' }; renderPanel(); } })),
    items.length ? h('ol', { class: 'loot-list' }, items.map((m) => h('li', { class: 'loot-item magic' },
      h('div', { class: 'loot-main' },
        h('strong', { text: m.name }), h('span', { class: 'grade rare', text: m.rarity }),
        m.inShops ? h('span', { class: 'grade fine', text: 'in shops' }) : null,
        h('span', { class: 'loot-value', text: m.value ? formatPrice(m.value) : '' })),
      m.detail ? h('div', { class: 'loot-detail', text: m.detail }) : null,
      h('div', { class: 'loot-meta', text: `Unidentified: “${m.label || ''}. ${m.unidentified || ''}”` }),
      h('div', { class: 'loot-actions' }, h('button', { class: 'linklike', text: 'edit', onclick: () => { S.panel = { type: 'magicEdit', id: m.id }; renderPanel(); } })))))
      : h('p', { class: 'muted', text: 'No homebrew yet.' }));
}

function magicEditView() {
  const isNew = S.panel.id === 'new';
  const m = isNew ? { name: '', rarity: 'uncommon', type: 'wondrous', label: '', unidentified: '', detail: '', value: '', inLoot: true, inShops: false } : S.magicItems.find((x) => x.id === S.panel.id);
  if (!m) return h('p', { text: 'That item no longer exists.' });
  const f = {
    name: h('input', { type: 'text', maxlength: 80, value: m.name, required: true }),
    rarity: h('select', {}, RARITIES.map((r) => h('option', { value: r, selected: r === m.rarity, text: r }))),
    type: h('select', {}, ['wondrous', 'weapon', 'armor', 'ring', 'potion', 'scroll', 'wand', 'staff', 'rod'].map((t) => h('option', { value: t, selected: t === m.type, text: t }))),
    value: h('input', { type: 'number', min: 0, step: 1, value: m.value ?? '' }),
    label: h('input', { type: 'text', maxlength: 80, value: m.label || '', placeholder: 'e.g. A silver ring shaped like a coiled serpent' }),
    unidentified: h('textarea', { rows: 2, placeholder: 'What players notice before it’s identified' }),
    detail: h('textarea', { rows: 4, placeholder: 'What it actually does' }),
    inLoot: h('input', { type: 'checkbox', checked: m.inLoot !== false }),
    inShops: h('input', { type: 'checkbox', checked: !!m.inShops }),
  };
  f.unidentified.value = m.unidentified || '';
  f.detail.value = m.detail || '';
  return h('div', { class: 'codex editor' },
    h('button', { class: 'linklike back', text: '← My magic items', onclick: () => { S.panel = { type: 'magicLib', id: 'all' }; renderPanel(); } }),
    h('h2', { class: 'codex-title', text: isNew ? 'New magic item' : 'Edit magic item' }),
    field('Name', f.name),
    h('div', { class: 'row gen-pickers' }, field('Rarity', f.rarity), field('Type', f.type), field('Value (gp)', f.value)),
    field('What it does', f.detail),
    field('Unidentified: what it looks like', f.label, 'A short name players see, e.g. “A silver ring shaped like a coiled serpent”.'),
    field('Unidentified: what they notice', f.unidentified),
    h('label', { class: 'check' }, f.inLoot, ' Can turn up in generated loot'),
    h('label', { class: 'check' }, f.inShops, ' Can appear under the counter in big-city Arcane Curios, Exotic Imports and Black Markets'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'button', text: 'Save', onclick: async () => {
        if (!f.name.value.trim()) { f.name.focus(); return; }
        const data = { name: f.name.value.trim(), rarity: f.rarity.value, type: f.type.value, value: Math.max(0, parseFloat(f.value.value) || 0),
          label: f.label.value.trim() || `A curious ${f.type.value === 'wondrous' ? 'item' : f.type.value}`, unidentified: f.unidentified.value.trim(),
          detail: f.detail.value.trim(), inLoot: f.inLoot.checked, inShops: f.inShops.checked };
        try { await S.store.saveMagicItem(data, isNew ? null : m.id); S.panel = { type: 'magicLib', id: 'all' }; renderPanel(); }
        catch (e) { toast('Could not save: ' + e.message); }
      } }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => { S.panel = { type: 'magicLib', id: 'all' }; renderPanel(); } }),
      !isNew ? h('button', { class: 'btn danger', type: 'button', text: 'Delete', onclick: async () => {
        if (!confirm(`Delete "${m.name}" from your library? Copies already in Loot stay.`)) return;
        await S.store.deleteMagicItem(m.id).catch((e) => toast(e.message));
        S.panel = { type: 'magicLib', id: 'all' }; renderPanel();
      } }) : null));
}

// ── identification, bought at a shop ────────────────────────────────
async function buyIdentification(shop, st, item) {
  // same order as the Loot list: unclaimed first, newest first
  const candidates = S.loot.filter((x) => x.status === 'unidentified')
    .sort((a, b) => !!a.claimedBy - !!b.claimedBy || (b.foundAt || 0) - (a.foundAt || 0));
  if (!candidates.length) { toast('Nothing in the party’s Loot needs identifying.'); return; }
  const answer = prompt(`Which item should ${shop.proprietor?.name || 'the shopkeeper'} identify? (${formatPrice(item.cost)})\n\n`
    + candidates.map((x, i) => `${i + 1}. ${x.name}${x.claimedBy ? ` (${x.claimedBy}’s)` : ''}`).join('\n'), '1');
  if (answer == null) return;
  const chosen = candidates[parseInt(answer, 10) - 1];
  if (!chosen) { toast(`Enter a number from 1 to ${candidates.length}.`); return; }
  const pack = usingBackpack();
  if (!confirm(`Pay ${formatPrice(item.cost)} to have "${chosen.name}" identified at ${shop.name}?\n\n${pack ? `It comes out of your backpack (you have ${coinText(myPurse())}).` : 'It goes on the ledger; settle the gold with your DM.'}`)) return;
  const buyer = myName() || S.store.displayName || 'A party member';
  const where = placeOf(shop.location)?.label || shop.name;
  try {
    const extra = st.myHaggle && st.myHaggle.mult !== 1 ? { haggle: st.myHaggle.mult } : {};
    const record = { shopId: shop.id, week: st.week, itemKey: item.key, itemName: `Identify: ${chosen.name}`, qty: 1, unitPrice: item.cost, total: item.cost, buyer, ...extra };
    const study = { pendingBy: buyer, pendingAt: Date.now(), pendingIn: where };
    if (pack) {
      await spend(gpToCp(item.cost), { kind: 'identify', text: `Identified ${chosen.name} at ${shop.name}`, ref: (t) => t.newId('purchases') }, (t, logId, purchaseId) => {
        t.set('purchases', purchaseId, { ...record, buyerUid: myUid(), at: Date.now(), settled: true, paid: 'backpack', logId });
        t.update('loot', chosen.id, { status: 'pending', ...study });
      });
    } else {
      await S.store.addPurchase(record);
      await S.store.requestIdentify(chosen.id, study);
    }
    if (isDM()) await processIdentifications();
    toast(isDM() ? 'Identified.' : `${shop.proprietor?.name || 'The sage'} takes it away to study. It’ll be identified soon.`);
  } catch (e) { toast('Could not arrange it: ' + e.message); }
}

// ─── notes ──────────────────────────────────────────────────────────
function notesSection(type, id) {
  const sec = h('section', { class: 'notes', 'data-target': `${type}:${id}` },
    h('h3', { class: 'notes-title' }, 'Party notes ', h('span', { class: 'notes-count' })),
    h('div', { class: 'notes-list' }),
    composer(type, id));
  fillNotes(sec);
  return sec;
}

function fillNotes(sec) {
  const [type, id] = sec.dataset.target.split(':');
  const list = notesFor(type, id);
  $('.notes-count', sec).textContent = list.length ? `(${list.length})` : '';
  const box = $('.notes-list', sec);
  if (box.querySelector('.note.editing')) return; // don't clobber an in-progress edit
  box.replaceChildren(...(list.length ? list.map(noteView) : [h('p', { class: 'muted', text: 'No notes yet. Be the first to write one.' })]));
}

function noteView(n) {
  const mine = n.uid === S.store.uid;
  const art = h('article', { class: `note${n.private ? ' private' : ''}${mine ? ' mine' : ''}` });
  const text = h('div', { class: 'note-text', text: n.text });
  const actions = h('span', { class: 'note-actions' },
    mine ? h('button', { text: 'edit', onclick: () => editNote(art, n) }) : null,
    mine || isDM() ? h('button', {
      text: 'delete', onclick: async () => {
        if (!confirm('Delete this note?')) return;
        try { await S.store.deleteNote(n.id); } catch (e) { toast('Could not delete: ' + e.message); }
      },
    }) : null);
  art.append(
    h('header', {},
      h('strong', { text: n.author || 'Someone' }),
      n.private ? h('span', { class: 'tag', text: 'only you' }) : null,
      h('time', { text: ago(n.createdAt) + (n.editedAt ? ' · edited' : ''), title: new Date(n.createdAt).toLocaleString() }),
      actions),
    text);
  return art;
}

function editNote(art, n) {
  art.classList.add('editing');
  const ta = h('textarea', { rows: 3 }); ta.value = n.text;
  const done = () => { art.classList.remove('editing'); $$('.notes[data-target]').forEach(fillNotes); };
  art.querySelector('.note-text').replaceWith(h('div', { class: 'note-edit' }, ta,
    h('div', { class: 'row' },
      h('button', { class: 'btn small', text: 'Save', onclick: async () => {
        const text = ta.value.trim();
        if (text) await S.store.updateNote(n.id, text).catch((e) => toast(e.message));
        done();
      } }),
      h('button', { class: 'btn small ghost', text: 'Cancel', onclick: done }))));
  ta.focus();
}

function composer(type, id) {
  const ta = h('textarea', { rows: 3, maxlength: 4000, placeholder: 'Add a note: rumors, suspicions, loot…' });
  const nameInput = h('input', { type: 'text', maxlength: 60, placeholder: 'Your name or character', value: myName() });
  const priv = h('input', { type: 'checkbox' });
  const who = h('div', { class: 'who' });
  const drawWho = (editing) => {
    who.replaceChildren();
    if (editing || !myName()) who.append(nameInput);
    else who.append('Writing as ', h('strong', { text: myName() }), ' · ',
      h('button', { class: 'linklike', type: 'button', text: 'change', onclick: () => { drawWho(true); nameInput.focus(); } }));
  };
  drawWho(false);
  const form = h('form', { class: 'composer' }, ta,
    h('div', { class: 'composer-foot' }, who,
      h('label', { class: 'priv', title: 'Only you will see this note' }, priv, ' Private'),
      h('button', { class: 'btn small', type: 'submit', text: 'Add note' })));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    const author = (nameInput.value.trim() || myName()).slice(0, 60);
    if (!author) { drawWho(true); nameInput.focus(); toast('First, tell the atlas who you are.'); return; }
    if (!text) { ta.focus(); return; }
    lsSet('atlas-name', author);
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await S.store.addNote({ targetType: type, targetId: id, text, author, private: priv.checked });
      ta.value = ''; priv.checked = false; drawWho(false);
    } catch (err) { toast('Could not save your note: ' + err.message); }
    btn.disabled = false;
  });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit(); });
  return form;
}

// ─── documents ──────────────────────────────────────────────────────
function renderDoc(page) {
  const doc = $('#docView');
  const scroll = doc.scrollTop;
  const same = doc.dataset.page === page.id;
  doc.dataset.page = page.id;
  doc.replaceChildren(h('div', { class: 'doc-inner' },
    h('p', { class: 'doc-eyebrow', text: page.hidden ? 'Hidden from players' : `Folio ${roman(S.pages.indexOf(page))}` }),
    h('h1', { class: 'doc-title', text: page.title }),
    page.subtitle ? h('p', { class: 'doc-sub', text: page.subtitle }) : null,
    h('div', { class: 'ornament', 'aria-hidden': 'true' }),
    pictureImg(page, 'doc-img'),
    h('div', { class: 'prose dropcap', html: md(page.body) }),
    secretBox(page.id),
    isDM() ? h('div', { class: 'codex-actions' }, h('button', { class: 'btn ghost', text: 'Edit page', onclick: () => openPageEditor(page.id) })) : null,
    h('div', { class: 'ornament', 'aria-hidden': 'true' }),
    notesSection('page', page.id)));
  if (same) doc.scrollTop = scroll;
}

// ─── DM editors ─────────────────────────────────────────────────────
function field(label, input, hint) {
  // A <label> forwards clicks on its text to the first control inside it, which is only
  // safe when the field is a single input. Composite fields (with buttons) get a plain div.
  const single = input.matches?.('input, select, textarea');
  return h(single ? 'label' : 'div', { class: 'field' }, h('span', { text: label }), input, hint ? h('small', { html: hint }) : null);
}

function imageField(value) {
  const input = h('input', { type: 'text', name: 'image', value: value || '', placeholder: 'maps/my-map.png or https://…' });
  const wrap = h('div', { class: 'image-field' }, input);
  if (S.store.canUpload) {
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const btn = h('button', { type: 'button', class: 'btn small ghost', text: 'Upload…', onclick: () => file.click() });
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      btn.disabled = true; btn.textContent = 'Uploading…';
      try { input.value = await S.store.uploadImage(f); toast('Image uploaded.'); }
      catch (e) { toast('Upload failed: ' + e.message); }
      btn.disabled = false; btn.textContent = 'Upload…';
    });
    wrap.append(btn, file);
  }
  return wrap;
}

// ─── pictures for pins and document pages ───────────────────────────
// A pin/page with `picture: true` has its image in the separate pictures store, fetched
// only when shown. `pictureAt` changes whenever it's replaced, so old copies aren't reused.
// (Older pins may still use a plain `image` link; that keeps working.)
const pictureCache = new Map();
function loadPicture(owner) {
  const key = `${owner.id}:${owner.pictureAt || 0}`;
  if (!pictureCache.has(key)) {
    pictureCache.set(key, S.store.getPicture(owner.id).then((src) => {
      if (!src) pictureCache.delete(key); // don't remember a miss; it may just not be saved yet
      return src;
    }));
  }
  return pictureCache.get(key);
}

function pictureImg(owner, cls) {
  if (owner.picture) {
    const img = h('img', { class: `${cls} loading`, alt: '' });
    loadPicture(owner).then((src) => {
      if (src) { img.src = src; img.classList.remove('loading'); } else img.remove();
    });
    return img;
  }
  return safeImg(owner.image) ? h('img', { class: cls, src: owner.image, alt: '' }) : null;
}

// Shrink a picked image to banner size (longest side ~1100px), keeping its shape.
async function shrinkBanner(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    for (const [max, q] of [[1100, 0.8], [900, 0.68], [700, 0.6]]) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, c.width, c.height);
      let out = c.toDataURL('image/webp', q);
      if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', q);
      if (out.length < 700_000) return out; // stays well inside a database record's 1 MB limit
    }
    throw new Error('too large');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// The click-or-drop picture box for pins and document pages. Read the outcome with .result():
// {mode:'keep'} | {mode:'new', data} | {mode:'remove'} | {mode:'link', link}
function pictureField(owner, label = 'Picture (optional)') {
  let state = { mode: 'keep' };
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const box = h('div', { class: 'picture-drop', tabindex: '0', role: 'button', 'aria-label': 'Choose a picture' });
  const remove = h('button', { type: 'button', class: 'btn small ghost', text: 'Remove picture' });
  const link = h('input', { type: 'text', placeholder: 'or paste an image link', value: owner.picture ? '' : (owner.image || '') });
  const show = (src) => {
    box.replaceChildren(src ? h('img', { src, alt: '' }) : h('span', { html: 'Click or drop a picture here<br><small>a scene, a building, a handout…</small>' }));
    remove.hidden = !src;
  };
  const load = async (f) => {
    if (!f || !f.type.startsWith('image/')) { toast("That file isn't an image."); return; }
    box.classList.add('busy');
    try { const data = await shrinkBanner(f); state = { mode: 'new', data }; link.value = ''; show(data); }
    catch { toast("Couldn't use that image. Try a PNG or JPG."); }
    box.classList.remove('busy');
  };
  box.addEventListener('click', () => file.click());
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('over'); });
  box.addEventListener('dragleave', () => box.classList.remove('over'));
  box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('over'); load(e.dataTransfer.files[0]); });
  file.addEventListener('change', () => load(file.files[0]));
  remove.addEventListener('click', () => { state = { mode: 'remove' }; link.value = ''; show(''); });
  link.addEventListener('change', () => {
    const v = link.value.trim();
    state = v ? { mode: 'link', link: v } : { mode: 'remove' };
    show(safeImg(v) ? v : '');
  });
  show(owner.picture ? '' : (safeImg(owner.image) ? owner.image : ''));
  if (owner.picture) loadPicture(owner).then((src) => { if (state.mode === 'keep') show(src || ''); });
  const wrap = field(label, h('div', { class: 'picture-field' }, box, h('div', { class: 'row' }, link, remove), file),
    'Shrunk automatically and stored in the atlas. No GitHub upload needed.');
  wrap.result = () => state;
  return wrap;
}

// Fold a pictureField outcome into the record being saved (before the save)…
function pictureData(result) {
  if (result.mode === 'new') return { picture: true, pictureAt: Date.now(), image: '' };
  if (result.mode === 'remove') return { picture: false, image: '' };
  if (result.mode === 'link') return { picture: false, image: result.link };
  return {};
}
// …and store or clear the picture itself once we know the record's id (after the save).
async function savePicture(id, kind, result, data, hadPicture) {
  if (result.mode === 'new') {
    await S.store.savePicture(id, kind, result.data);
    pictureCache.set(`${id}:${data.pictureAt}`, Promise.resolve(result.data));
  } else if ((result.mode === 'remove' || result.mode === 'link') && hadPicture) {
    await S.store.savePicture(id, kind, null);
  }
}

function openPinEditor(id, pos) {
  S.pinId = id;
  highlightPin();
  S.ghost?.remove(); S.ghost = null;
  if (!id && pos) {
    S.ghost = L.marker(toLatLng(pos.x, pos.y), {
      icon: L.divIcon({ className: 'pin-wrap', html: pinHTML({ title: 'New location', kind: 'place' }, 0, 0), iconSize: [44, 56], iconAnchor: [22, 54] }),
      interactive: false,
    }).addTo(S.map);
  }
  S.panel = { type: 'editPin', id: id || 'new', pos };
  renderPanel();
  $('#panelBody input[name=title]')?.focus();
}

function pinEditor() {
  const isNew = S.panel.id === 'new';
  const p = isNew ? { title: '', kind: 'place', body: '', hidden: false } : pinById(S.panel.id);
  if (!p) return h('p', { text: 'This pin no longer exists.' });
  const kind = h('select', { name: 'kind' }, Object.entries(KINDS).map(([k, v]) => h('option', { value: k, selected: k === (p.kind || 'place'), text: v.label })));
  const link = h('select', { name: 'linkPage' }, h('option', { value: '', text: 'None' }),
    S.pages.filter((pg) => pg.id !== S.pageId).map((pg) => h('option', { value: pg.id, selected: pg.id === p.linkPage, text: `${pg.title} (${pg.type})` })));
  const body = h('textarea', { name: 'body', rows: 9 }); body.value = p.body || '';
  const picture = pictureField(p);
  const form = h('form', { class: 'editor' },
    h('h2', { class: 'codex-title', text: isNew ? 'New location' : 'Edit location' }),
    field('Name', h('input', { name: 'title', required: true, maxlength: 120, value: p.title })),
    field('Kind', kind),
    field('Description', body, 'Formatting: **bold**, *italic*, - list items, &gt; quote. Link to another place with [[Its Name]].'),
    picture,
    field('Links to page', link, 'Clicking through opens this page, for example a city map from the world map.'),
    secretField(isNew ? null : p.id),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'hidden', checked: !!p.hidden }), ' Hidden from players (DM only)'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'submit', text: isNew ? 'Place it' : 'Save' }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => (isNew ? closePanel() : openPin(p.id)) }),
      !isNew ? h('button', { class: 'btn danger', type: 'button', text: 'Delete', onclick: async () => {
        if (!confirm(`Delete "${p.title}" and remove it from the map?`)) return;
        await S.store.deletePin(p.id).catch((e) => toast(e.message));
        if (p.picture) S.store.savePicture(p.id, 'pin', null).catch(() => {});
        closePanel();
      } }) : null));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      title: fd.get('title').trim(), kind: fd.get('kind'), body: fd.get('body'),
      linkPage: fd.get('linkPage'), hidden: fd.get('hidden') === 'on',
    };
    const pic = picture.result();
    Object.assign(data, pictureData(pic));
    try {
      if (isNew) {
        Object.assign(data, S.panel.pos, { pageId: S.pageId, pageHidden: !!currentPage().hidden });
        S.panel = { type: 'pin', id: null, saving: true };
        const id = await S.store.savePin(data);
        await savePicture(id, 'pin', pic, data, false);
        await saveSecret(id, fd);
        S.ghost?.remove(); S.ghost = null;
        openPin(id);
      } else {
        await S.store.savePin(data, p.id);
        await savePicture(p.id, 'pin', pic, data, !!p.picture);
        await saveSecret(p.id, fd);
        openPin(p.id);
      }
    } catch (err) { toast('Could not save: ' + err.message); }
  });
  return form;
}

function openPageEditor(id) {
  closeTOC();
  S.panel = { type: 'editPage', id: id || 'new' };
  renderPanel();
  $('#panelBody input[name=title]')?.focus();
}

// Where a page sits in Contents. New pages default to nesting under the page you're on.
function parentField(p, isNew) {
  const blocked = new Set(isNew ? [] : [p.id, ...descendantsOf(p.id)]); // no loops
  const current = isNew ? (S.pageId || '') : (p._parent || '');
  const sel = h('select', { name: 'parent' },
    h('option', { value: '', selected: !current, text: '(Top level)' }),
    S.pages.filter((pg) => !blocked.has(pg.id)).map((pg) =>
      h('option', { value: pg.id, selected: pg.id === current, text: `${' '.repeat(pg._depth)}${pg.title}` })));
  return field('Nested under', sel, 'Where this page sits in Contents, e.g. a town map under its dukedom, or an inn under its town.');
}

function pageEditor() {
  const isNew = S.panel.id === 'new';
  const p = isNew ? { type: 'map', title: '', subtitle: '', body: '', image: '', hidden: false } : pageById(S.panel.id);
  if (!p) return h('p', { text: 'This page no longer exists.' });
  const body = h('textarea', { name: 'body', rows: 10 }); body.value = p.body || '';
  const mapImage = field('Map image', imageField(p.type === 'map' ? p.image : ''),
    S.store.canUpload ? 'Upload a PNG, or paste a URL.' : 'Put the PNG in the site\'s <b>maps/</b> folder, commit it, and type its path here.');
  const picture = pictureField(p.type === 'doc' ? p : {}, 'Header picture (optional)');
  const showFor = (type) => { mapImage.hidden = type !== 'map'; picture.hidden = type !== 'doc'; };
  showFor(p.type);
  const typeSel = isNew ? field('Type', h('div', { class: 'seg', onchange: (e) => showFor(e.target.value) },
    h('label', {}, h('input', { type: 'radio', name: 'type', value: 'map', checked: true }), ' Map'),
    h('label', {}, h('input', { type: 'radio', name: 'type', value: 'doc' }), ' Document'))) : null;
  const form = h('form', { class: 'editor' },
    h('h2', { class: 'codex-title', text: isNew ? 'Add a page' : 'Edit page' }),
    typeSel,
    field('Title', h('input', { name: 'title', required: true, maxlength: 120, value: p.title })),
    field('Subtitle', h('input', { name: 'subtitle', maxlength: 160, value: p.subtitle || '' })),
    parentField(p, isNew),
    mapImage,
    picture,
    field(p.type === 'map' && !isNew ? 'About this map' : 'Text', body, 'Formatting: # heading, **bold**, *italic*, - list items, &gt; quote, [[Link to a place]].'),
    secretField(isNew ? null : p.id),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'labels', checked: isNew || !!p.labels }), ' Show pin names on the map (turn off if the map already has names printed on it)'),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'hidden', checked: !!p.hidden }), ' Hidden from players (DM only)'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'submit', text: isNew ? 'Add page' : 'Save' }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: () => { closePanel(); if (!isNew) renderPage(); } }),
      !isNew ? h('button', { class: 'btn danger', type: 'button', text: 'Delete page', onclick: async () => {
        const kids = childrenOf(p.id);
        const kidNote = kids.length ? ` Its ${kids.length} sub-map${kids.length > 1 ? 's' : ''} will move up a level.` : '';
        if (!confirm(`Delete "${p.title}" and every pin on it?${kidNote} Notes stay in the database but will be orphaned.`)) return;
        const idx = S.pages.indexOf(p);
        const fallback = S.pages[idx - 1] || S.pages[idx + 1];
        closePanel();
        await Promise.all(kids.map((k) => S.store.savePage({ parent: p._parent || '' }, k.id))).catch((e) => toast(e.message));
        await S.store.deletePage(p.id).catch((e) => toast(e.message));
        if (p.picture) S.store.savePicture(p.id, 'page', null).catch(() => {});
        if (fallback) goToPage(fallback.id, { instant: true });
      } }) : null));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      title: fd.get('title').trim(), subtitle: fd.get('subtitle').trim(), body: fd.get('body'),
      hidden: fd.get('hidden') === 'on', labels: fd.get('labels') === 'on',
      parent: fd.get('parent') || '',
    };
    const type = isNew ? fd.get('type') : p.type;
    const pic = type === 'doc' ? picture.result() : { mode: 'keep' };
    if (type === 'map') data.image = (fd.get('image') || '').trim();
    else Object.assign(data, pictureData(pic));
    try {
      if (isNew) {
        data.type = type;
        const sibs = childrenOf(data.parent); // add it after the last page at that level
        data.order = sibs.length ? Math.max(...sibs.map((pg) => pg.order ?? 0)) + 1 : 0;
        if (data.parent) { tocOpen.add(data.parent); lsSet('atlas-toc-open', JSON.stringify([...tocOpen])); }
        closePanel(true);
        const id = await S.store.savePage(data);
        await savePicture(id, 'page', pic, data, false);
        await saveSecret(id, fd);
        if (pageById(id)) goToPage(id); else S.pendingPage = id;
      } else {
        closePanel(true);
        await S.store.savePage(data, p.id);
        await savePicture(p.id, 'page', pic, data, !!p.picture);
        await saveSecret(p.id, fd);
        if (p.id === S.pageId) renderPage();
      }
    } catch (err) { toast('Could not save: ' + err.message); }
  });
  return form;
}

// ─── search ─────────────────────────────────────────────────────────
function openSearch() {
  $('#search').hidden = false;
  const input = $('#searchInput');
  input.value = '';
  runSearch('');
  input.focus();
}
function closeSearch() { $('#search').hidden = true; }

function runSearch(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (...fields) => words.every((w) => fields.join(' ').toLowerCase().includes(w));
  const hitTitle = (r) => (words.length && words.every((w) => r.label.toLowerCase().includes(w)) ? 1 : 0);
  const results = [
    ...S.pages.filter((p) => hit(p.title, p.subtitle || '', p.body || '')).map((p) => ({
      label: p.title, sub: p.type === 'map' ? 'Map' : 'Document', icon: '<span class="res-dot"></span>',
      go: () => goToPage(p.id),
    })),
    ...S.people.filter((p) => hit(p.name, p.title || '', p.group || '', p.body || '')).map((p) => ({
      label: p.name, sub: ['Person', p.title, p.group].filter(Boolean).join(' · '), icon: avatarHTML(p, 'res-avatar'),
      go: () => openPerson(p.id),
    })),
    ...S.pins.filter((p) => pageById(p.pageId) && hit(p.title, p.body || '', kindOf(p).label)).map((p) => ({
      label: p.title, sub: `${kindOf(p).label} · ${pageById(p.pageId).title}`, icon: glyph(kindOf(p), 18),
      go: () => openPin(p.id, { fly: true }),
    })),
    ...S.journal.filter((e) => (!e.draft || canWriteJournal()) && hit(e.title, e.body || '', `session ${e.n}`)).map((e) => ({
      label: `Session ${e.n}: ${e.title}`, sub: ['Session journal', fmtJournalDate(e.date), e.draft ? 'draft' : ''].filter(Boolean).join(' \u00b7 '),
      icon: '<span class="res-dot"></span>', go: () => openJournal(e.id),
    })),
  ].sort((a, b) => hitTitle(b) - hitTitle(a)).slice(0, 40);
  const ul = $('#searchResults');
  ul.replaceChildren(...results.map((r, i) => h('li', {},
    h('button', { class: `res${i === 0 ? ' sel' : ''}`, onclick: () => { closeSearch(); r.go(); }, html: `${r.icon}<span><strong>${esc(r.label)}</strong><small>${esc(r.sub)}</small></span>` }))));
  if (!results.length) ul.append(h('li', { class: 'muted', text: 'Nothing found in the atlas.' }));
}

// ─── misc chrome ────────────────────────────────────────────────────
let toastTimer;
function toast(msg, actionLabel, action) {
  const t = $('#toast');
  t.replaceChildren(h('span', { text: msg }));
  if (actionLabel) t.append(h('button', { text: actionLabel, onclick: () => { t.classList.remove('show'); action(); } }));
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), actionLabel ? 9000 : 4500);
}

function parseHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  return { p: q.get('p'), pin: q.get('pin'), person: q.get('person') };
}
function updateHash() {
  if (!S.pageId) return;
  const person = S.panel?.type === 'person' ? S.panel.id : null;
  const hash = `#p=${encodeURIComponent(S.pageId)}${S.pinId ? `&pin=${encodeURIComponent(S.pinId)}` : ''}${person ? `&person=${encodeURIComponent(person)}` : ''}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

function setupChrome() {
  $('#tocBtn').onclick = () => (document.body.classList.contains('toc-open') ? closeTOC() : openTOC());
  $('#tocClose').onclick = closeTOC;
  $('#scrim').onclick = closeTOC;
  $('#addPageBtn').onclick = () => openPageEditor(null);
  if (isDM() && S.store.importSeed && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    $('#addPageBtn').after(h('button', { class: 'btn ghost', style: 'width:100%;margin-top:8px', text: 'Import new starter content', onclick: syncSeed }));
  }
  $('#prevBtn').onclick = $('#cornerPrev').onclick = () => step(-1);
  $('#nextBtn').onclick = $('#cornerNext').onclick = () => step(1);
  $('#panelClose').onclick = () => closePanel();
  $('#aboutBtn').onclick = openAbout;
  $('#aboutTab').onclick = openAbout;
  $('#searchBtn').onclick = openSearch;
  $('#peopleBtn').onclick = () => (S.panel?.type === 'people' ? closePanel() : openPeople());
  $('#journalBtn').onclick = () => (S.panel?.type === 'journal' ? closePanel() : openJournal());
  $('#renownBtn').onclick = () => (S.panel?.type === 'renown' ? closePanel() : openRenownList());
  $('#marketBtn').onclick = () => (S.panel?.type === 'market' ? closePanel() : openMarket());
  $('#backpackBtn').onclick = () => (S.panel?.type === 'backpack' ? closePanel() : openBackpack());
  refreshBackpackViews();
  $('#pingBtn').onclick = () => setPingMode(!S.pingMode);
  $('#editBtn').onclick = () => setEdit(!S.edit);
  $('#torchBtn').onclick = () => {
    S.torch = !S.torch;
    $('#torchBtn').classList.toggle('on', S.torch);
    $('#torch').classList.toggle('show', S.torch);
    const r = $('#mapWrap').getBoundingClientRect();
    $('#torch').style.setProperty('--tx', `${r.width / 2}px`);
    $('#torch').style.setProperty('--ty', `${r.height / 2}px`);
  };
  $('#resetDemo').onclick = () => { if (confirm('Erase all demo changes and restore the sample atlas?')) S.store.reset(); };

  const dmBtn = $('#dmBtn');
  if (S.store.mode === 'local') {
    // demo: the button just toggles DM mode
    dmBtn.textContent = isDM() ? 'DM ✓' : 'DM';
    dmBtn.title = isDM() ? 'Leave DM mode' : 'Enter DM mode (demo)';
    dmBtn.classList.toggle('on', isDM());
    dmBtn.onclick = () => (isDM() ? S.store.signOut() : S.store.signIn());
  } else {
    // live: everyone is signed in with Google; the button shows who and signs out
    const first = (S.store.displayName || S.store.email).split(/[\s@]/)[0];
    dmBtn.textContent = isDM() ? 'DM ✓' : first;
    dmBtn.title = `Signed in as ${S.store.email}${isDM() ? ' (DM)' : ''}. Click to sign out.`;
    dmBtn.classList.toggle('on', isDM());
    dmBtn.onclick = () => { if (confirm(`Sign out of ${S.store.email}?`)) S.store.signOut(); };
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.wiki');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.kind === 'pin') openPin(a.dataset.id, { fly: true });
    else if (a.dataset.kind === 'person') openPerson(a.dataset.id);
    else goToPage(a.dataset.id);
  });

  $('#search').addEventListener('click', (e) => { if (e.target.id === 'search') closeSearch(); });
  $('#searchInput').addEventListener('input', (e) => runSearch(e.target.value));
  $('#searchInput').addEventListener('keydown', (e) => {
    const items = $$('#searchResults .res');
    let i = items.findIndex((x) => x.classList.contains('sel'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[i]?.classList.remove('sel');
      i = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[i]?.classList.add('sel');
      items[i]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') { items[Math.max(0, i)]?.click(); }
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === 'Escape') {
      if (!$('#search').hidden) closeSearch();
      else if (S.pingMode) setPingMode(false);
      else if (S.placeShop) { const id = S.placeShop; S.placeShop = null; modeHint(); openShop(id); }
      else if (document.body.classList.contains('toc-open')) closeTOC();
      else if (S.panel && !typing) closePanel();
      return;
    }
    if (typing) return;
    if (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); openSearch(); }
    else if (e.key === 'ArrowRight' && !e.altKey) step(1);
    else if (e.key === 'ArrowLeft' && !e.altKey) step(-1);
  });

  // swipe between pages on documents (maps use drag for panning)
  let sx = null;
  $('#docView').addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  $('#docView').addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 80) step(dx < 0 ? 1 : -1);
    sx = null;
  });
}

// ─── ambient embers ─────────────────────────────────────────────────
function startEmbers() {
  if (reduced) return;
  const c = $('#embers');
  const ctx = c.getContext('2d');
  let w, hgt, dpr;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = c.width = innerWidth * dpr; hgt = c.height = innerHeight * dpr;
  };
  resize();
  addEventListener('resize', resize);
  const spawn = (y) => ({ x: Math.random() * w, y: y ?? hgt + 10, r: (Math.random() * 1.6 + 0.6) * dpr, v: (Math.random() * 0.35 + 0.15) * dpr, p: Math.random() * 6.28, life: Math.random() });
  const motes = Array.from({ length: 38 }, () => spawn(Math.random() * hgt));
  const frame = () => {
    if (!document.hidden) {
      ctx.clearRect(0, 0, w, hgt);
      for (const m of motes) {
        m.y -= m.v; m.p += 0.012; m.x += Math.sin(m.p) * 0.3 * dpr;
        if (m.y < -10) Object.assign(m, spawn());
        const a = 0.25 + 0.35 * Math.abs(Math.sin(m.p * 1.7 + m.life * 6));
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
        g.addColorStop(0, `rgba(255,190,110,${a})`);
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 4, 0, 6.283); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
