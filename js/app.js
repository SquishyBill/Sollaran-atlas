import { CAMPAIGN, firebaseConfig } from './config.js';
import { renderMarkdown, esc } from './markdown.js';

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
};
const kindOf = (p) => KINDS[p.kind] || KINDS.place;
const glyph = (k, size = 16) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="fill:${k.color}" aria-hidden="true">${k.icon}</svg>`;

// ─── state ──────────────────────────────────────────────────────────
const S = {
  store: null,
  pages: [], pins: [], notes: [], secrets: {}, people: [], peopleQuery: '', pendingPerson: null,
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
  setupChrome();
  setupMap();
  S.store.subscribe({ pages: onPages, pins: onPins, notes: onNotes, secrets: onSecrets, people: onPeople, ping: onPing, error: onError });
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

function onSecrets(list) {
  S.secrets = Object.fromEntries(list.map((s) => [s.id, s.text]));
  if (['pin', 'about', 'person'].includes(S.panel?.type)) renderPanel();
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
    : S.edit ? 'Edit mode: click the map to add a location. Drag pins to move them.' : '';
  hint.textContent = text;
  hint.classList.toggle('show', !!text);
  $('#mapWrap').classList.toggle('crosshair', S.pingMode || S.edit);
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
  S.panel = { type: 'pin', id };
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
  const views = { pin: pinView, about: aboutView, editPin: pinEditor, editPage: pageEditor, people: peopleView, person: personView, editPerson: personEditor };
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
    peopleHere(peopleAt('pin', p.id), `pin:${p.id}`),
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
    isDM() ? h('div', { class: 'codex-actions' },
      h('button', { class: 'btn ghost', text: 'Edit page', onclick: () => openPageEditor(page.id) })) : null,
    page.type === 'map' ? h('div', { class: 'prose', html: md(page.body) }) : null,
    peopleHere(peopleAt('page', page.id), `page:${page.id}`),
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

function peopleView() {
  const list = h('div', { class: 'people-list' });
  const search = h('input', { type: 'search', class: 'people-search', placeholder: 'Search people, titles, groups, places…', value: S.peopleQuery });
  const fill = () => {
    const words = S.peopleQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = S.people.filter((p) => {
      const text = [p.name, p.title, p.group, p.body, ...(p.places || []).map((r) => placeInfo(r)?.label)].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    });
    const groups = new Map();
    for (const p of matches) {
      const g = p.group?.trim() || 'Others';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    }
    const names = [...groups.keys()].sort((a, b) => (a === 'Others') - (b === 'Others') || a.localeCompare(b));
    // groups start closed; a search opens every group with a match
    const searching = words.length > 0;
    list.replaceChildren(...(matches.length
      ? names.map((g) => {
        const open = searching || groupsOpen.has(g);
        return h('section', { class: `people-group${open ? ' open' : ''}` },
          h('button', {
            class: 'group-head', 'aria-expanded': open ? 'true' : 'false',
            onclick: () => { toggleGroup(g); fill(); },
            html: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg><span>${esc(g)}</span><em>${groups.get(g).length}</em>`,
          }),
          open ? groups.get(g).sort(byName).map(personRow) : null);
      })
      : [h('p', { class: 'muted', text: S.people.length ? 'No one matches that.' : 'No one has been added yet.' })]));
  };
  search.addEventListener('input', () => { S.peopleQuery = search.value; fill(); });
  fill();
  return h('div', { class: 'codex' },
    h('div', { class: 'codex-kind', html: '<span>Dramatis Personae</span>' }),
    h('h2', { class: 'codex-title', text: 'People of the Realm' }),
    h('p', { class: 'codex-sub', text: `${S.people.length} ${S.people.length === 1 ? 'person' : 'people'} known` }),
    isDM() ? h('div', { class: 'codex-actions' }, h('button', { class: 'btn', text: '+ Add a person', onclick: () => openPersonEditor(null, []) })) : null,
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
        h('div', { class: 'codex-kind', html: `<span>${esc(p.group || 'Person')}${p.hidden ? ' · Hidden from players' : ''}</span>` }),
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

function personEditor() {
  const isNew = S.panel.id === 'new';
  const p = isNew ? { name: '', title: '', group: '', image: '', body: '', hidden: false, places: S.panel.places || [] } : personById(S.panel.id);
  if (!p) return h('p', { text: 'This person no longer exists.' });
  const groups = [...new Set(S.people.map((x) => x.group).filter(Boolean))].sort();
  const body = h('textarea', { name: 'body', rows: 8 }); body.value = p.body || '';
  const picker = placePicker(p.places || []);
  const form = h('form', { class: 'editor' },
    h('h2', { class: 'codex-title', text: isNew ? 'Add a person' : 'Edit person' }),
    field('Name', h('input', { name: 'name', required: true, maxlength: 120, value: p.name })),
    field('Title or role', h('input', { name: 'title', maxlength: 160, value: p.title || '', placeholder: 'e.g. Duke of Harthall, "The Gilded Lion"' })),
    field('Group', h('div', {},
      h('input', { name: 'group', maxlength: 80, value: p.group || '', list: 'group-options', placeholder: 'e.g. Council of Ten, Seven Families of Emmett' }),
      h('datalist', { id: 'group-options' }, groups.map((g) => h('option', { value: g })))),
      'People are listed under their group in the directory.'),
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
      name: fd.get('name').trim(), title: fd.get('title').trim(), group: fd.get('group').trim(),
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
  return h('label', { class: 'field' }, h('span', { text: label }), input, hint ? h('small', { html: hint }) : null);
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
