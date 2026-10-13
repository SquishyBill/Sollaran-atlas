// NPC generator: a random person, shaped by what the DM pins (people, affiliation, role, age, wealth,
// attitude) and by the lore of the Sollaran Archonate. Everything it makes is a suggestion the DM edits.
// Names, looks and secrets are our own; the groups, peoples and customs come from the Archonate document.
import { rng } from './shop-data.js';

const pick = (r, list) => list[Math.floor(r() * list.length)];
const chance = (r, p) => r() < p;
const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
function weighted(r, pairs) {
  let n = r() * pairs.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of pairs) { if ((n -= w) < 0) return v; }
  return pairs[0][0];
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── peoples ────────────────────────────────────────────────────────
// weight: how often they turn up when left random (0 = only when pinned or an affiliation calls for them)
export const PEOPLES = [
  { id: 'human', label: 'Human', weight: 40, life: 80, culture: 'sollaran' },
  { id: 'dwarf', label: 'Dwarf', weight: 13, life: 350, culture: 'dwarf' },
  { id: 'halfling', label: 'Halfling', weight: 12, life: 150, culture: 'halfling' },
  { id: 'gnome', label: 'Gnome', weight: 10, life: 400, culture: 'gnome' },
  { id: 'batu', label: 'Tiefling (Batu)', weight: 5, life: 90, culture: 'sollaran', note: 'Batu families have bred out their fae traits and can almost pass for human.' },
  { id: 'bana', label: 'Tiefling (Bana)', weight: 3, life: 90, culture: 'bana', note: 'Bana families embrace their fae heritage. They and the Batu do not care for one another.' },
  { id: 'halforc', label: 'Half-orc', weight: 5, life: 70, culture: 'halforc', note: 'Looked on with pity; many are overly polite and kind, working hard to fit in.' },
  { id: 'dragonborn', label: 'Dragonborn', weight: 0.4, life: 300, culture: 'dragonborn', note: 'Born of Solothax. One emerges from the Wilds every fifty years. Even Justicars give them space.' },
  { id: 'elf', label: 'Elf (of the Barrow)', weight: 0, life: 3000, culture: 'elf', note: 'Enemies of the state: a standing reward of 1,000 gold for the capture of any elf.' },
  { id: 'naga', label: 'Naga (Coral Trident)', weight: 0, life: 800, culture: 'naga' },
];
export const peopleById = (id) => PEOPLES.find((p) => p.id === id) || PEOPLES[0];

export const GENDERS = [['male', 'Male'], ['female', 'Female'], ['nonbinary', 'Nonbinary']];
export const AGES = [['young', 'Young adult'], ['adult', 'Adult'], ['middle', 'Middle-aged'], ['old', 'Old'], ['venerable', 'Venerable']];
const AGE_FRAC = { young: [0.2, 0.3], adult: [0.3, 0.5], middle: [0.5, 0.7], old: [0.7, 0.9], venerable: [0.9, 1] };
export const WEALTH = [['poor', 'Poor'], ['modest', 'Modest'], ['comfortable', 'Comfortable'], ['wealthy', 'Wealthy']];
export const ATTITUDES = [['friendly', 'Friendly'], ['neutral', 'Neutral'], ['wary', 'Wary'], ['hostile', 'Hostile']];

// ─── names ──────────────────────────────────────────────────────────
const NAMES = {
  sollaran: {
    m: ['Aleric', 'Corwin', 'Dorian', 'Edric', 'Falk', 'Garrick', 'Halden', 'Ivor', 'Joren', 'Kellan', 'Lucan', 'Marek', 'Osric', 'Perrin', 'Roderic', 'Tavish', 'Ulric', 'Wystan', 'Bastian', 'Caspar'],
    f: ['Alina', 'Brenna', 'Cedra', 'Delia', 'Elara', 'Freya', 'Gwen', 'Hedda', 'Isolde', 'Jessa', 'Kestra', 'Lenna', 'Maren', 'Nessa', 'Orla', 'Petra', 'Rowena', 'Sabine', 'Thessaly', 'Una'],
    last: ['Hallworth', 'Dorathson', 'Stagmoor', 'Greywater', 'Ironvale', 'Larkfield', 'Marlowe', 'Ostrander', 'Penhallow', 'Quillon', 'Redfern', 'Saltmarsh', 'Thornwick', 'Underhill', 'Vance', 'Whitlock', 'Ashgrove', 'Brandt', 'Corrigan', 'Dunmere', 'Eastmoor', 'Fairlow', 'Harrow', 'Kestrel'],
  },
  english: { // Arcadians: medieval English
    m: ['William', 'John', 'Robert', 'Thomas', 'Richard', 'Henry', 'Walter', 'Geoffrey', 'Hugh', 'Roger', 'Edmund', 'Godfrey', 'Simon', 'Ralph', 'Gilbert', 'Osbert', 'Baldwin', 'Alan'],
    f: ['Alice', 'Matilda', 'Agnes', 'Margery', 'Isabel', 'Joan', 'Eleanor', 'Emma', 'Cecily', 'Beatrice', 'Edith', 'Maud', 'Avice', 'Juliana', 'Rohese', 'Sibyl'],
    by: ['Smith', 'Fletcher', 'Baker', 'Cooper', 'Wright', 'Thatcher', 'Miller', 'Chapman', 'Fuller', 'Tanner', 'Carter', 'Mason', 'Webster', 'Archer', 'Fowler', 'Reeve'],
    place: ['Ashby', 'Thornbury', 'Kingsbridge', 'Wexcombe', 'Ludlow', 'Aldwick', 'Merton', 'Stanhope', 'Eastcheap', 'Holbeach'],
    house: ['Fitzalan', 'Fitzhugh', 'Fitzwalter', 'de Lacy', 'de Montfort', 'de Clare', 'de Warenne'],
  },
  dwarf: {
    m: ['Dorgar', 'Brokk', 'Thrain', 'Volkar', 'Gorim', 'Harbek', 'Durgan', 'Balric', 'Orsik', 'Bromm', 'Hargun', 'Thorgrim', 'Karzak', 'Rurik'],
    f: ['Gundra', 'Hilde', 'Brunna', 'Dagny', 'Helga', 'Kathra', 'Mardred', 'Riswyn', 'Torra', 'Vistra', 'Odrun', 'Sigrun', 'Brynja', 'Thilda'],
    last: ['Stonefist', 'Deepdelver', 'Anvilbreaker', 'Rockbeard', 'Tankardhand', 'Ironbraid', 'Cavesinger', 'Goldvein', 'Crystalbrow', 'Hammerfall', 'Brawlborn', 'Ember-Ale'],
  },
  halfling: {
    m: ['Alton', 'Cade', 'Corrin', 'Eldon', 'Garret', 'Lyle', 'Merric', 'Milo', 'Osborn', 'Perrin', 'Roscoe', 'Wellby'],
    f: ['Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian', 'Kithri', 'Lavinia', 'Merla', 'Nedda', 'Paela', 'Verna'],
    last: ['Brushgather', 'Goodbarrel', 'Greenbottle', 'Hilltopple', 'Tealeaf', 'Underbough', 'Thorngage', 'Bramblewick', 'Applewhistle', 'Longfurrow'],
  },
  gnome: {
    m: ['Alvyn', 'Boddy', 'Dimble', 'Fonkin', 'Gimble', 'Jebb', 'Orryn', 'Roondar', 'Wrenn', 'Zook'],
    f: ['Bimpna', 'Breena', 'Caramip', 'Duvamil', 'Ellyjo', 'Lilli', 'Nissa', 'Roywyn', 'Tana', 'Zanna'],
    last: ['Beren', 'Daergel', 'Folkor', 'Nackle', 'Scheppen', 'Timbers', 'Turen', 'Cogsworth', 'Fizzwick', 'Sparkgrind'],
  },
  bana: {
    m: ['Calix', 'Dusk', 'Emberlin', 'Fenric', 'Loris', 'Morrow', 'Rook', 'Sable', 'Thistle', 'Vesper'],
    f: ['Briar', 'Cinder', 'Marigold', 'Mirelle', 'Oriel', 'Rue', 'Sorrel', 'Tansy', 'Velvet', 'Wren'],
    last: ['Hornsworn', 'Ashbloom', 'Nightbloom', 'Brightfang', 'Velvetthorn', 'Embercrown', 'Starcurl', 'Wildmere'],
  },
  halforc: {
    m: ['Dorn', 'Thok', 'Krag', 'Urzul', 'Baggi', 'Ront', 'Hask'],
    f: ['Grisha', 'Shara', 'Mogra', 'Ilka', 'Yurga', 'Vola'],
    last: ['Fairhand', 'Goodwin', 'Kind', 'Mildmay', 'Pleasant', 'Gentle', 'Thorncroft', 'Meek', 'Cheerly'],
  },
  dragonborn: {
    m: ['Kavrix', 'Sorrak', 'Vathys', 'Rhogar', 'Zendrith', 'Balasar', 'Drakhan'],
    f: ['Thazra', 'Ilmara', 'Nyxara', 'Sheshka', 'Vyrna', 'Korinn'],
    last: [],
  },
  naga: {
    m: ['Ussarak', 'Vashaan', 'Kessarel', 'Thessaraj', 'Ixaar', 'Sarrak'],
    f: ['Ssaria', 'Zhissa', 'Maraazi', 'Ixaara', 'Vesshani', 'Sarazel'],
    last: [],
  },
  sister: ['Eventide', 'Dawn', 'Vesper', 'Matins', 'Lauds', 'Compline', 'Solace', 'Serene', 'Candor', 'Mercy', 'Hush', 'Vigil', 'Clemency', 'Harmony', 'Lumen', 'Quill', 'Verity', 'Cadence'],
};

function elfName(r) {
  const a = ['Ael', 'Syl', 'Ith', 'Vael', 'Thar', 'Nim', 'Eir', 'Lor', 'Quen', 'Fae', 'Ilv', 'Cael'];
  const b = ['an', 'el', 'ir', 'ael', 'or', 'ith', 'ae'];
  const c = ['wen', 'rin', 'dor', 'thil', 'mar', 'ael', 'sa', 'lith', 'vyr', 'riel'];
  const first = pick(r, a) + pick(r, b) + pick(r, c);
  const epithet = chance(r, 0.6) ? ' ' + pick(r, ['Hollowbough', 'Lastlight', 'Mossveil', 'Thornsong', 'Rootwarden', 'Stillwater', 'Ashleaf', 'Deepglade']) : '';
  return first + epithet;
}

function nameFor(r, culture, gender) {
  const g = gender === 'nonbinary' ? (chance(r, 0.5) ? 'm' : 'f') : gender === 'female' ? 'f' : 'm';
  if (culture === 'elf') return elfName(r);
  if (culture === 'sister') return `Sister ${pick(r, NAMES.sister)}`;
  const n = NAMES[culture] || NAMES.sollaran;
  if (culture === 'english') {
    const first = pick(r, n[g]), roll = r();
    if (roll < 0.5) return `${first} ${pick(r, n.by)}`;
    if (roll < 0.75) return `${first} of ${pick(r, n.place)}`;
    return `${first} ${pick(r, n.house)}`;
  }
  if (culture === 'halforc') {
    const first = chance(r, 0.5) ? pick(r, n[g]) : pick(r, NAMES.sollaran[g]);
    return `${first} ${pick(r, n.last)}`;
  }
  const first = pick(r, n[g]);
  return n.last.length ? `${first} ${pick(r, n.last)}` : first;
}

// ─── occupations (for ordinary folk) ────────────────────────────────
// [title, an SRD stat block to look up]
export const OCCUPATIONS = [
  ['Farmer', 'Commoner'], ['Fisher', 'Commoner'], ['Miller', 'Commoner'], ['Baker', 'Commoner'], ['Butcher', 'Commoner'],
  ['Brewer', 'Commoner'], ['Innkeeper', 'Commoner'], ['Barkeep', 'Commoner'], ['Cook', 'Commoner'], ['Tailor', 'Commoner'],
  ['Weaver', 'Commoner'], ['Leatherworker', 'Commoner'], ['Blacksmith', 'Commoner (strong; or Veteran)'], ['Carpenter', 'Commoner'],
  ['Mason', 'Commoner'], ['Cooper', 'Commoner'], ['Potter', 'Commoner'], ['Cartwright', 'Commoner'], ['Stablehand', 'Commoner'],
  ['Horse-trader', 'Commoner'], ['Shopkeeper', 'Commoner'], ['Peddler', 'Commoner'], ['Teamster', 'Commoner'], ['Dockhand', 'Commoner'],
  ['Sailor', 'Commoner (or Scout)'], ['Ship’s mate', 'Veteran', ['adult', 'middle']], ['Fishmonger', 'Commoner'], ['Scribe', 'Commoner'], ['Teacher', 'Commoner'],
  ['Healer', 'Acolyte'], ['Midwife', 'Acolyte'], ['Gravedigger', 'Commoner'], ['Messenger', 'Scout'], ['Town guard', 'Guard'],
  ['Watch sergeant', 'Veteran', ['adult', 'middle']], ['Mercenary', 'Veteran'], ['Bounty hunter', 'Scout'], ['Gambler', 'Commoner (or Spy)'], ['Busker', 'Commoner'],
  ['Cartographer', 'Commoner'], ['Jeweler', 'Commoner'], ['Herbalist', 'Acolyte'], ['Apprentice', 'Commoner', ['young']], ['Beggar', 'Commoner'],
].map(([title, stat, ages]) => ({ title, stat, ages }));

// ─── looks, manners, traits, wants, secrets ─────────────────────────
const BUILD = ['Tall and lean', 'Short and sturdy', 'Broad-shouldered', 'Slight and quick-eyed', 'Heavyset', 'Wiry', 'Round-faced and ruddy', 'Gaunt', 'Of middling height and build', 'Long-limbed', 'Stooped', 'Barrel-chested'];
const FEATURE = ['a crooked nose', 'a scar through one eyebrow', 'startling green eyes', 'ink-stained fingers', 'a gap-toothed grin', 'weathered, sun-browned skin', 'a streak of grey in dark hair', 'a missing finger', 'freckles', 'a thick, braided beard or braid', 'a heavy brow and a worried look', 'an unnervingly steady gaze', 'burn scars on the forearms', 'a ready, easy smile', 'a limp', 'tattooed knuckles', 'a hawk’s nose', 'dimples', 'one cloudy eye', 'close-cropped hair'];
const CLOTHES = {
  poor: ['Patched, much-mended clothes.', 'Threadbare wool and worn boots.', 'A faded smock and a rope belt.', 'Hand-me-down clothes a size too large.'],
  modest: ['Clean, plain wool and a leather apron.', 'Sturdy work clothes, well kept.', 'A neat tunic and good boots.', 'Practical travel clothes.'],
  comfortable: ['Good cloth in sober colors, with a silver clasp.', 'A fine wool coat and polished boots.', 'Well-cut clothes with a touch of embroidery.', 'A merchant’s tidy layers and a belt purse.'],
  wealthy: ['Rich fabrics, rings on most fingers.', 'Crystal-weave cloth that glows faintly by starlight.', 'Velvet and silk, tailored to perfection.', 'Jewelry and a scented, elegant coat.'],
};
const MANNER = ['Speaks softly and leans in close.', 'Laughs too loudly at their own jokes.', 'Never meets your eye for long.', 'Fidgets with a small trinket.', 'Speaks in short, clipped sentences.', 'Hums an old song while working.', 'Interrupts, then apologizes.', 'Stands very still, then moves all at once.', 'Calls everyone “friend”.', 'Chews on a stem of grass or a toothpick.', 'Speaks formally, as if reciting.', 'Constantly glances at the door.', 'Gestures grandly with every word.', 'Dry, deadpan humor.', 'Always seems to be counting something.', 'Overly polite, to the point of being awkward.', 'Quotes proverbs, usually wrongly.', 'Whistles through a gap in their teeth.', 'Hard of hearing; says “what?” a lot.', 'Warm, motherly (or fatherly) toward everyone.'];
const TRAIT = ['Generous to a fault.', 'Suspicious of strangers.', 'Fiercely loyal to friends.', 'Cheerfully gossipy.', 'Terribly proud of their work.', 'Superstitious about everything.', 'Quick to anger, quick to forgive.', 'Deeply curious about the world beyond the sea.', 'Cautious; never says anything unguarded.', 'Eager to please.', 'Bitter about an old slight.', 'Devout, and says so often.', 'Loves a bargain.', 'Brave when it counts, anxious the rest of the time.', 'Cynical, but secretly soft-hearted.', 'Relentlessly optimistic.', 'Hates the Wilds and anyone who has been.', 'Loves to tell long stories.', 'Respects strength and little else.', 'Hungry for a better life.'];
const WANT = ['To see their children do better than they did.', 'To pay off a debt before someone collects it.', 'To find a missing relative.', 'To be left alone.', 'To earn enough for a place of their own.', 'To win the next Rye Ale festival.', 'To get into the Archive and pass the test.', 'To prove a rival wrong.', 'To buy their way out of a bad contract.', 'To hear news from beyond the sea.', 'To take revenge on the person who ruined them.', 'To see the Duke’s taxes lowered.', 'To leave the Archonate behind.', 'To hold onto what little they have.', 'To protect someone who doesn’t know they need it.', 'To make a name for themselves.', 'To find a safe place for their family.', 'To be forgiven for something they won’t name.', 'To see their trade guild flourish.', 'To find a patron.'];
const SECRET_ANY = [
  'Secretly still prays to one of the old gods.', 'A relative was marked apostate; the family changed its name and moved.', 'Owes a large sum to the Night Scale.', 'Is a paid informant for the local Sanguine Temple.',
  'Lost someone to the Forsaken and has never forgiven the Sisters.', 'Has a relic from the Wilds they cannot explain, hidden under the floor.', 'Has a little elven blood in the family, hidden for generations.', 'Quietly helps the Ashen Veil when asked.',
  'Is hiding an addiction to Powdered Residuum.', 'Skimmed from the till and is about to be found out.', 'Has seen an Archon without a mask, and tells no one.', 'Is stealing from their employer, a little at a time.',
  'Fled a duke’s justice in another dukedom and lives under a false name.', 'Knows where a smuggler’s cache is hidden.', 'Is secretly in love with someone entirely unsuitable.', 'Was once a Hunter, and still has the contacts.',
  'Is writing a book that would count as sedition.', 'Skipped the cleansing at the crystal and fears being noticed.', 'Has been selling information to the GEC.', 'Is a spy for a foreign power.', 'Murdered someone years ago and has never been caught.', 'Has a forged document that could change a family’s fate.',
];
const SECRET_PEOPLE = {
  batu: ['Secretly sands and files their horns every night, terrified of being exposed.', 'Despises the Bana and fears what they say about the Batu.'],
  bana: ['Quietly practices old fae customs the Archonate would call heresy.', 'Is in a feud with a Batu family that has turned deadly.'],
  halforc: ['Is the child of a Wilds raider, and has told no one.', 'Fears being blamed the moment anything goes missing.'],
  dragonborn: ['Is on a quest they will tell no one about, perhaps for Solothax.', 'Knows something about the location of the mountain den.'],
  elf: ['Knows the way to the Barrow.', 'Carries a message that the Archonate would kill to read.'],
  dwarf: ['Has smuggled out a cut gem that was meant for export only.', 'Has a grudge against the Archivists who control the crystals.'],
};

// ─── affiliations (what the Archonate makes of them) ────────────────
// peoples: who can be one (omit for the usual peoples) · gender: forced · culture: names · cover: ordinary job on the surface
// roles: [title, stat]. note: lore the DM may want while running them.
const r2 = (list) => list.map(([title, stat, ages]) => ({ title, stat, ages }));
export const AFFILIATIONS = [
  { id: 'citizen', label: 'Ordinary citizen', weight: 55, group: '', roles: OCCUPATIONS },
  { id: 'merchant', label: 'Merchant', weight: 7, group: 'Merchants', wealth: [0, 1, 4, 3],
    roles: r2([['Merchant', 'Noble (or Commoner)'], ['Shop owner', 'Commoner'], ['Caravan master', 'Veteran'], ['Importer', 'Commoner'], ['Moneylender', 'Spy (or Noble)']]),
    note: 'Merchants often control the purse strings, and many resent the Dukes.',
    manners: ['Appraises everyone’s clothes the moment they walk in.', 'Always has a deal in mind.'],
    wants: ['To finance the next big shipment.', 'To get a Duke in their debt.', 'To corner the market on something scarce.'],
    secrets: ['Is smuggling goods past the GEC inspectors.', 'Is deep in debt to the Night Scale.', 'Is financing a Duke in secret, and the Duke’s rivals would pay to know.'] },
  { id: 'courtier', label: 'Ducal household', weight: 5, group: 'Ducal household', wealth: [0, 0, 4, 5],
    roles: r2([['Courtier', 'Noble'], ['Steward', 'Noble'], ['Herald', 'Noble'], ['Ducal guard', 'Guard (or Veteran)'], ['Secretary', 'Spy (or Commoner)'], ['Tax collector', 'Noble']]),
    manners: ['Weighs every word before speaking.', 'Never answers a question directly.'],
    wants: ['To rise in the Duke’s favor.', 'To protect the Duke from a scandal.', 'To see a rival disgraced.'],
    secrets: ['Is passing the Duke’s secrets to a merchant.', 'Knows the Duke’s finances are far worse than he admits.', 'Is loyal to another Duke.'] },
  { id: 'justicar', label: 'Justicar', weight: 2, group: 'Justicars', peoples: ['human'], wealth: [0, 0, 3, 3],
    roles: r2([['Justicar', 'Knight (or Champion)'], ['Justicar in training', 'Veteran', ['young']]]),
    note: 'Elite knights, raised from birth on Tyr; knighted at twenty-one. Their crystal armor nullifies magic. Even a dozen soldiers are no match for one.',
    manners: ['Absolutely still, and utterly courteous.', 'Speaks only when something needs saying.'],
    wants: ['To carry out an order to the letter.', 'To find an apostate before the Sisters do.', 'To prove worthy of the Archons.'],
    secrets: ['Has begun to doubt an order, and tells no one.', 'Once let an apostate go.', 'Knows who their Archon parent is, and cannot say.'] },
  { id: 'sister', label: 'Sanguine Sister', weight: 2, group: 'Sanguine Sisterhood', peoples: ['human'], gender: 'female', culture: 'sister', wealth: [0, 3, 3, 0],
    roles: r2([['High Mother', 'Priest', ['middle', 'old']], ['High Priestess', 'Priest', ['adult', 'middle']], ['Novice Sister', 'Acolyte (or Priest)', ['young']]]),
    note: 'Masked and silent from age ten, they speak by telepathy and hand signs. Looking on an unmasked Sister makes you an apostate. Nearly invulnerable inside their own temple.',
    manners: ['Never speaks aloud; answers in hand signs and a voice in your head.', 'Utterly calm, even when threatened.'],
    wants: ['To keep their crystal pure and singing.', 'To root out the truth behind an accusation.', 'To protect the temple at any cost.'],
    secrets: ['Has begun to question the Sisterhood’s verdicts.', 'Has been manipulated into condemning someone innocent.', 'Has seen an unmasked face, and has told no one.'] },
  { id: 'archivist', label: 'Archivist or Wild Mage', weight: 3, group: 'Archivists', wealth: [0, 1, 4, 2],
    roles: r2([['Wild Mage (sorcerer)', 'Mage (low-level)', ['young', 'adult']], ['Archivist', 'Mage'], ['Champion Archivist', 'Mage'], ['Master Archivist', 'Archmage (or Mage, strong)', ['middle', 'old', 'venerable']]]),
    note: 'Wild Mages must go to the capital before reaching their third level of power. Archivists attune to a crystal and can use magic near crystals, but it backfires if turned on one. Failing the Test means death, banishment, or giving up magic.',
    manners: ['Taps a crystal pendant when thinking.', 'Corrects people’s grammar and their facts.'],
    wants: ['To pass the next Test.', 'To study something the Archive keeps locked away.', 'To attune a rarer crystal.'],
    secrets: ['Failed the Test and hides the fact.', 'Knows an arcane secret the Archive forbids.', 'Is secretly teaching a Wild Mage the High Magic.'] },
  { id: 'cleric', label: 'Cleric of the Seven', weight: 2, group: 'Clerics of the Seven', wealth: [1, 3, 2, 0],
    roles: r2([['Cleric of Arthas (Light)', 'Priest'], ['Cleric of Melody (Life)', 'Priest'], ['Cleric of Romi (Order)', 'Priest'], ['Cleric of Hemdal (Trickery)', 'Priest'], ['Cleric of Bandi (Knowledge)', 'Priest'], ['Cleric of Trevo (Peace)', 'Priest'], ['Cleric of Sarax (War)', 'Priest']]),
    note: 'They discovered their calling at the Archive and walk the land in service. Immune to the crystal fields, but diminished in power, as Archivists are in the Wilds.',
    manners: ['Blesses everything, from meals to doorways.', 'Speaks with quiet certainty.'],
    wants: ['To serve their Sacred One’s cause.', 'To heal a wound that magic cannot reach.', 'To find out why their power is dimmer than it should be.'],
    secrets: ['Doubts that the Seven hear them at all.', 'Was called to the Archives by something that was not a god.', 'Is secretly sympathetic to the old gods.'] },
  { id: 'hunter', label: 'Hunter', weight: 3, group: 'Hunters', wealth: [1, 2, 3, 1],
    roles: r2([['Relic hunter', 'Scout'], ['Beast hunter', 'Veteran'], ['Hunter (works with the Night Scale)', 'Scout'], ['Hunter, retired', 'Commoner (or Veteran)', ['old', 'venerable', 'middle']]]),
    note: 'Hunters enter the Wilds for relics of the Time of Mists and prized creature parts. A dangerous, unscrupulous trade that often works with the Night Scale.',
    manners: ['Never sits with their back to a door.', 'Laughs easily and means none of it.', 'Sniffs the air, checking for something.'],
    wants: ['One more big score and a quiet retirement.', 'To find a relic they saw once and could not carry.', 'To get out of a contract with the Night Scale.'],
    secrets: ['Is carrying a relic that is slowly changing them.', 'Left a partner to die in the Wilds.', 'Knows where one of the cursed city portals is.'] },
  { id: 'tyrsworn', label: 'Tyrsworn Warden', weight: 2, group: 'Tyrsworn Wardens', wealth: [0, 3, 3, 0],
    roles: r2([['Tyrsworn Warden (trainer)', 'Veteran'], ['Tyrsworn Warden (beast handler)', 'Scout'], ['Tyrsworn Warden (Wilds capturer)', 'Veteran']]),
    note: 'Grizzled veterans of the island of Tyr: trainers, handlers, or sent into the Wilds to capture creatures for the games.',
    manners: ['Sizes people up like a fighter in the Pits.', 'Gruff but quietly kind to the young.'],
    wants: ['To train one last champion.', 'To capture a creature nobody has seen.', 'To see a fighter they raised win the Trial.'],
    secrets: ['Throws fights for the Night Scale.', 'Let a creature go, and fears it will come back.', 'Knows the Pits are rigged.'] },
  { id: 'nightscale', label: 'Night Scale (black market)', weight: 4, group: 'Night Scale', wealth: [1, 2, 3, 2],
    roles: r2([['Fence', 'Spy'], ['Smuggler', 'Scout'], ['Keeper of a black shop', 'Commoner (or Spy)'], ['Gambling ring boss', 'Bandit Captain'], ['Cutthroat', 'Thug'], ['Poisoner', 'Assassin (or Spy)']]),
    note: 'The Night Scale smuggles goods, runs illegal shops and gambling rings, and wears the split-coin mark (tattoo, trinket, or sign).',
    manners: ['Turns a coin over and over in their fingers.', 'Never says anything straight.'],
    wants: ['To move a shipment past the GEC.', 'To get a rival’s shop shut down.', 'To buy a Justicar’s silence.'],
    secrets: ['Is skimming from the Night Scale’s take.', 'Is an informant for a Duke.', 'Wants out, and is looking for a way.'] },
  { id: 'ashen', label: 'Ashen Veil (hidden)', weight: 1.5, group: '', cover: true, wealth: [1, 4, 2, 0],
    note: 'The Ashen Veil is an underground network that smuggles apostates to the Wilds. They work in small cells, and wear grey veils when it matters. Presented here as an ordinary person with a hidden secret.',
    secrets: ['A member of the Ashen Veil, running a safe house.', 'A courier for the Ashen Veil, moving names between cells.', 'Leader of an Ashen Veil cell, who believes the Sisterhood is wrong about someone.'] },
  { id: 'forsaken', label: 'Forsaken', weight: 1.5, group: 'The Forsaken', wealth: [4, 0, 0, 0],
    roles: r2([['Forsaken laborer (mine)', 'Commoner (resistant to pain, never tires)'], ['Forsaken laborer (docks)', 'Commoner (resistant to pain, never tires)'], ['Forsaken laborer (fields)', 'Commoner (resistant to pain, never tires)'], ['Forsaken laborer (construction)', 'Commoner (resistant to pain, never tires)']]),
    note: 'Emaciated, white-eyed apostates repaying their debt in endless labor. They need no sleep, barely eat, and never speak. Only a Sanguine Sister can free one.',
    manners: ['Works without pause and does not answer questions.', 'Takes terrible punishment without complaint.'],
    wants: ['(Cannot say. Does as it is told.)'],
    secrets: ['Once a respected citizen, whose accuser is still living in town.', 'Still understands everything said near them.', 'Was falsely accused, and their family has been searching for them.'] },
  { id: 'reclaimer', label: 'Ebon Reclaimer', weight: 0.2, group: '', fixedName: 'Ebon Reclaimer', peoples: ['human'], wealth: [0, 2, 2, 0],
    roles: r2([['Ebon Reclaimer', 'Assassin (or Wraith-like, hunts apostates)']]),
    note: 'Hideously masked, dressed in black. They hunt apostates and take them away, and are sent only by the Sanguine Sisterhood. More myth than fact.',
    manners: ['Absolutely silent, and moves without a sound.'], wants: ['To bring in an apostate.'], secrets: ['Who they take, and where, is for the DM to decide.'] },
  { id: 'gec', label: 'Grand Exchange Consortium', weight: 3, group: 'The GEC', wealth: [0, 1, 4, 2],
    roles: r2([['Exchequer clerk', 'Commoner (or Spy)'], ['Tariff inspector', 'Guard (or Noble)'], ['Moneychanger', 'Commoner'], ['Port assessor', 'Noble (or Spy)']]),
    note: 'The GEC manages all financing, sets port tariffs, and trades in gossip and secrets as well as goods.',
    manners: ['Counts everything, including your words.', 'Writes down every answer.'],
    wants: ['To close an audit before the deadline.', 'To discover who is evading the tariffs.', 'To learn something valuable from a foreign ship.'],
    secrets: ['Takes bribes to wave certain goods through.', 'Sells the GEC’s secrets abroad.', 'Knows a Duke’s accounts don’t balance.'] },
  { id: 'dumrak', label: 'Dumrak-Karazdun dwarf', weight: 2, group: 'Dumrak-Karazdun', peoples: ['dwarf'], wealth: [1, 3, 2, 1],
    roles: r2([['Crystal miner', 'Veteran'], ['Brawler and gambler', 'Thug'], ['Shardsong Matron', 'Priest'], ['Clan elder', 'Veteran', ['old', 'venerable']], ['Gem cutter', 'Commoner']]),
    note: 'The boisterous, rowdy dwarves of Volkarag in the Western Wilds (the Archonate calls them Krazdun and the city Valkar Hold). Shardsong Matrons find and imbue the crystals.',
    manners: ['Bellows greetings and clinks tankards at the slightest excuse.', 'Sings off-key when drunk, which is often.'],
    wants: ['To get the best price for this year’s crystals.', 'To win a bet that’s gone out of hand.', 'To bring a clan grudge to its end.'],
    secrets: ['Smuggled out a gem that was meant for export only.', 'Resents the Archivists for taking the best crystals.', 'Knows a cave of attuned crystals the Matrons haven’t found.'] },
  { id: 'arcadian', label: 'Arcadian', weight: 0.5, group: 'Arcadians', peoples: ['human'], culture: 'english', wealth: [2, 2, 1, 0],
    roles: r2([['Captured raider', 'Veteran'], ['Spy in disguise', 'Spy'], ['Defector', 'Commoner'], ['Zealot preacher', 'Cult Fanatic'], ['Castaway sailor', 'Commoner']]),
    note: 'Religious zealots from the east, enemies since the War of Discordant Harmonies. On Sollaran soil, the crystals cut them off from their god. The Grand Arcadian Fleet (cycle 700) was destroyed by the Naga.',
    manners: ['Crosses themselves when no one is looking.', 'Speaks an old, formal English-sounding way.'],
    wants: ['To get word home.', 'To survive without their god’s power.', 'To atone for what the fleet tried to do.'],
    secrets: ['Is still in touch with an Arcadian agent.', 'Can feel their god growing faint, and it terrifies them.', 'Is a defector hiding what they carry.'] },
  { id: 'naga', label: 'Coral Trident pirate', weight: 0.2, group: 'Coral Trident', peoples: ['naga'], wealth: [0, 1, 2, 2],
    roles: r2([['Pirate captain', 'Spirit Naga (or Guardian Naga)'], ['Boarding party fighter', 'Veteran (naga)'], ['Emissary ashore', 'Spy (naga in disguise)']]),
    note: 'Led by the immortal Pirate Queen Saarazad. The Naga swore long ago to defend the Archonate from naval attack. No one knows where they live.',
    manners: ['Hisses slightly on certain words.', 'Never blinks when it matters.'], wants: ['Treasure.', 'To carry out Saarazad’s order.'],
    secrets: ['Knows the terms of the Archonate deal, and has doubts.', 'Is selling stolen treasure through the Night Scale.'] },
  { id: 'elf', label: 'Elf of the Barrow', weight: 0.2, group: 'Elves of the Barrow', peoples: ['elf'], wealth: [2, 2, 1, 0],
    roles: r2([['Barrow scout', 'Scout'], ['Keeper of the old ways', 'Druid'], ['Barrow elder', 'Druid (or Archmage, strong)', ['old', 'venerable']], ['Elf in hiding', 'Commoner (or Scout)']]),
    note: 'The last vestiges of the fallen elven kingdom, who worship the land itself. The Archonate pays 1,000 gold for the capture (or head) of any elf. No one knows where the Barrow is.',
    manners: ['Speaks as if everything were a very long story.', 'Moves without sound and watches the treeline.'],
    wants: ['To get home to the Barrow.', 'To learn what the Archonate knows.', 'To find another of their kind.'],
    secrets: ['Knows the way to the Barrow.', 'Carries a message that the Archonate would kill to read.', 'Has lived long enough to remember the war.'] },
  { id: 'envoy', label: 'Foreign envoy (Embassy Row)', weight: 1, group: 'Embassy Row', wealth: [0, 0, 3, 4],
    roles: r2([['Envoy of {nation}', 'Noble'], ['Attaché of {nation}', 'Spy (or Noble)'], ['Trade agent of {nation}', 'Commoner (or Spy)'], ['Courier for {nation}', 'Scout']]),
    nations: ['the United Kingdoms of Mercia', 'the Rix Protectorate', 'the Svartvelt Thanedoms', 'the Empire of Dranor', 'the Island Nation of Rodan'],
    note: 'The five known trading partners keep embassies on Embassy Row. Anything an envoy brings in or takes out is inspected by the Archonate.',
    manners: ['Struggles slightly with local idiom.', 'Constantly measures what is worth reporting home.'],
    wants: ['To close a trade deal.', 'To learn about the crystals.', 'To get a message out unread.'],
    secrets: ['Is spying on the Archonate.', 'Is smuggling an item past inspection.', 'Wants to defect.'] },
];
export const affiliationById = (id) => AFFILIATIONS.find((a) => a.id === id) || AFFILIATIONS[0];

const CORE = ['human', 'dwarf', 'halfling', 'gnome', 'batu', 'bana', 'halforc', 'dragonborn'];

// ─── ages ───────────────────────────────────────────────────────────
function ageText(r, people, bracket) {
  const [lo, hi] = AGE_FRAC[bracket] || AGE_FRAC.adult;
  let years = Math.round(peopleById(people).life * (lo + r() * (hi - lo)));
  if (years > 150) years = Math.round(years / 10) * 10; else if (years > 60) years = Math.round(years / 2) * 2;
  return years;
}

function peopleFeature(r, p, gender) {
  switch (p) {
    case 'batu': return pick(r, ['Small horns, filed down and hidden under a hat.', 'A tail kept tucked inside clothing.', 'Faint, unusual eyes that pass for human in poor light.']);
    case 'bana': return pick(r, ['Curling horns, worn proudly.', 'A long tail, always in motion.', 'Skin and eyes with a fae shimmer.']);
    case 'dwarf': return pick(r, ['A beard braided with metal rings.', 'Soot-dark hands and a miner’s squint.', 'A nose broken more than once.']);
    case 'halforc': return pick(r, ['Small tusks, carefully kept clean.', 'A heavy jaw, softened by a very gentle smile.', 'Greenish skin and an apologetic stoop.']);
    case 'dragonborn': return pick(r, ['Scales of deep copper.', 'Scales of dusky green, with a gold crest.', 'Scales of storm-grey and cold eyes.', 'Scales of blood red, and a smoldering gaze.']);
    case 'elf': return pick(r, ['Long, pointed ears under a hood.', 'Ageless features and moss-green eyes.', 'Silver hair, bound with bone and leaf.']);
    case 'naga': return 'A long, serpentine body, with scales of shifting color.';
    case 'halfling': return pick(r, ['Curly, unruly hair and bare, hairy feet.', 'A round, cheerful face.']);
    case 'gnome': return pick(r, ['Bright, restless eyes.', 'Spectacles on a chain.', 'Wild, wiry hair.']);
    default: return '';
  }
}

// ─── building the parts ─────────────────────────────────────────────
const PART_ROLLS = {
  appearance: (r, c) => {
    const bits = [`${pick(r, BUILD)}, with ${pick(r, FEATURE)}.`];
    const f = peopleFeature(r, c.people, c.gender);
    if (f) bits.push(f);
    bits.push(pick(r, CLOTHES[c.wealth] || CLOTHES.modest));
    return bits.join(' ');
  },
  manner: (r, c) => {
    const a = affiliationById(c.affiliation);
    return chance(r, 0.55) && a.manners ? pick(r, a.manners) : pick(r, MANNER);
  },
  trait: (r) => pick(r, TRAIT),
  want: (r, c) => {
    const a = affiliationById(c.affiliation);
    return chance(r, 0.6) && a.wants ? pick(r, a.wants) : pick(r, WANT);
  },
  secret: (r, c) => {
    const a = affiliationById(c.affiliation);
    if (a.cover) return pick(r, a.secrets);
    const pool = [...(a.secrets && chance(r, 0.7) ? a.secrets : []), ...(chance(r, 0.35) ? SECRET_PEOPLE[c.people] || [] : [])];
    return pool.length ? pick(r, pool) : pick(r, SECRET_ANY);
  },
  name: (r, c) => {
    const a = affiliationById(c.affiliation);
    if (a.fixedName) return a.fixedName;
    return nameFor(r, c.culture, c.gender);
  },
};

// Re-roll a single part of an NPC that's already been generated.
export function rollPart(part, c) {
  const fn = PART_ROLLS[part];
  return fn ? fn(rng(`npcpart:${part}:${Math.random()}`), c) : '';
}

// opts: { seed, people, affiliation, role, gender, age, wealth, attitude }  (blank or missing = random)
export function generateNpc(opts = {}) {
  const seed = opts.seed || Math.random().toString(36).slice(2, 10);
  const r = rng(`npc:${seed}`);
  const affs = AFFILIATIONS;
  const pinned = opts.people ? peopleById(opts.people).id : '';
  const affOk = (a) => !pinned || (a.peoples ? a.peoples.includes(pinned) : CORE.includes(pinned));
  const aff = opts.affiliation ? affiliationById(opts.affiliation) : weighted(r, affs.filter(affOk).map((a) => [a, a.weight]));
  const peopleId = pinned || (aff.peoples ? pick(r, aff.peoples) : weighted(r, PEOPLES.filter((p) => p.weight > 0).map((p) => [p.id, p.weight])));
  const gender = aff.gender || opts.gender || weighted(r, [['male', 48], ['female', 48], ['nonbinary', 4]]);
  const wealth = opts.wealth || ['poor', 'modest', 'comfortable', 'wealthy'][weighted(r, (aff.wealth || [15, 45, 28, 12]).map((w, i) => [i, w]))];
  const attitude = opts.attitude || weighted(r, [['friendly', 30], ['neutral', 40], ['wary', 22], ['hostile', 8]]);
  const nation = aff.nations ? pick(r, aff.nations) : '';

  // the role: ordinary folk get a job; "cover" affiliations (Ashen Veil) hide behind one
  const roles = aff.cover ? OCCUPATIONS : aff.roles;
  const picked = opts.role && roles.find((x) => x.title === opts.role);
  const role = picked || pick(r, roles);
  const bracket = opts.age || (role.ages ? pick(r, role.ages) : weighted(r, [['young', 20], ['adult', 38], ['middle', 24], ['old', 14], ['venerable', 4]]));

  const culture = aff.culture || (aff.nations && !aff.culture ? 'sollaran' : peopleById(peopleId).culture);
  const ctx = { people: peopleId, gender, bracket, wealth, attitude, affiliation: aff.id, culture, role: role.title, nation };
  const part = (name) => PART_ROLLS[name](r, ctx);

  const p = peopleById(peopleId);
  const years = ageText(r, peopleId, bracket);
  const ageLine = `${p.label}, about ${years} (${(AGES.find((a) => a[0] === bracket) || [])[1]?.toLowerCase() || 'adult'}), ${gender === 'nonbinary' ? 'nonbinary' : gender}`;
  const title = role.title.replace('{nation}', nation);
  return {
    seed, ctx,
    name: part('name'), title, ageLine,
    appearance: part('appearance'), manner: part('manner'), trait: part('trait'), want: part('want'), secret: part('secret'),
    stat: role.stat, attitude,
    lore: [aff.note, p.note].filter(Boolean).join(' '),
    group: aff.group || '',
  };
}
