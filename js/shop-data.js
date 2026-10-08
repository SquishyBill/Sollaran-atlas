// Shop generator: shop types, item catalogs, names, and the rules for stock and renown.
// Equipment names and prices follow the D&D 5e System Reference Document 5.1 (CC BY 4.0).
// The SRD gives no prices for magic items; those here are suggestions by rarity.
//
// Everything is generated from a seed, so a shop's stock for a given week is the same on
// every device without anyone having to save it.

// ─── settlement sizes ───────────────────────────────────────────────
export const SIZES = [
  { id: 1, name: 'Hamlet', items: [4, 6], fine: 0, rare: 0, qtyBoost: 1 },
  { id: 2, name: 'Village', items: [6, 9], fine: 0.1, rare: 0, qtyBoost: 1 },
  { id: 3, name: 'Town', items: [9, 12], fine: 0.2, rare: 1, qtyBoost: 2 },
  { id: 4, name: 'City', items: [12, 16], fine: 0.3, rare: 2, qtyBoost: 3 },
  { id: 5, name: 'Metropolis', items: [15, 20], fine: 0.4, rare: 3, qtyBoost: 4 },
];
export const sizeById = (id) => SIZES.find((s) => s.id === Number(id)) || SIZES[1];

// ─── catalogs ───────────────────────────────────────────────────────
// [name, price in gp, smallest settlement size that stocks it, flags]
// flags: c = consumable (stocked in quantity), n = no "fine" version, r = rare/special stock,
//        s = a service (never runs out: lodging, healing, passage…)
const GENERAL = [
  ['Backpack', 2], ['Bedroll', 1], ['Blanket', 0.5], ['Candle', 0.01, 1, 'cn'], ['Chalk (1 piece)', 0.01, 1, 'cn'],
  ['Crowbar', 2], ['Flask', 0.02, 1, 'n'], ['Hammer', 1], ['Lamp', 0.5], ['Lantern, hooded', 5],
  ['Lantern, bullseye', 10, 3], ['Mess kit', 0.2], ['Oil (flask)', 0.1, 1, 'cn'], ['Piton', 0.05, 1, 'cn'],
  ['Pouch', 0.5], ['Rations (1 day)', 0.5, 1, 'cn'], ['Rope, hempen (50 ft)', 1], ['Rope, silk (50 ft)', 10, 3],
  ['Sack', 0.01, 1, 'n'], ['Shovel', 2], ['Tinderbox', 0.5], ['Torch', 0.01, 1, 'cn'], ['Waterskin', 0.2],
  ['Whetstone', 0.01, 1, 'n'], ['Grappling hook', 2], ['Hunting trap', 5], ['Manacles', 2], ['Mirror, steel', 5, 2],
  ['Climber’s kit', 25, 2], ['Healer’s kit', 5], ['Fishing tackle', 1], ['Signal whistle', 0.05, 1, 'n'],
  ['Ink (1 ounce bottle)', 10, 2, 'cn'], ['Paper (one sheet)', 0.2, 2, 'cn'], ['Parchment (one sheet)', 0.1, 1, 'cn'],
  ['Spyglass', 1000, 5, 'r'], ['Magnifying glass', 100, 4, 'r'],
];
const SMITH = [
  ['Dagger', 2], ['Handaxe', 5], ['Javelin', 0.5], ['Light hammer', 2], ['Mace', 5], ['Sickle', 1], ['Spear', 1],
  ['Battleaxe', 10], ['Flail', 10], ['Glaive', 20, 3], ['Greataxe', 30, 2], ['Greatsword', 50, 2], ['Halberd', 20, 3],
  ['Longsword', 15], ['Maul', 10], ['Morningstar', 15], ['Pike', 5], ['Rapier', 25, 2], ['Scimitar', 25, 2],
  ['Shortsword', 10], ['Trident', 5], ['War pick', 5], ['Warhammer', 15], ['Shield', 10], ['Ring mail', 30],
  ['Chain shirt', 50, 2], ['Scale mail', 50, 2], ['Chain mail', 75, 2], ['Breastplate', 400, 3], ['Splint', 200, 3],
  ['Half plate', 750, 4], ['Plate', 1500, 4], ['Smith’s tools', 20],
  ['Longsword +1', 600, 4, 'r'], ['Shield +1', 600, 4, 'r'], ['Battleaxe +1', 600, 4, 'r'],
  ['Mithral chain shirt', 800, 5, 'r'], ['Adamantine breastplate', 900, 5, 'r'],
];
const LEATHER = [
  ['Leather armor', 10], ['Studded leather armor', 45, 2], ['Hide armor', 10], ['Backpack', 2], ['Pouch', 0.5],
  ['Saddlebags', 4], ['Saddle, riding', 10], ['Saddle, pack', 5], ['Saddle, military', 20, 3], ['Bit and bridle', 2],
  ['Waterskin', 0.2], ['Quiver', 1], ['Case, map or scroll', 1], ['Case, crossbow bolt', 1], ['Component pouch', 25, 2],
  ['Sling', 0.1], ['Whip', 2], ['Leatherworker’s tools', 5], ['Belt pouch, tooled', 1, 1], ['Gauntlets, leather', 1, 1],
  ['Boots of Elvenkind', 500, 4, 'r'], ['Gloves of Swimming and Climbing', 500, 4, 'r'], ['Bag of Holding', 600, 4, 'r'],
  ['Studded leather +1', 700, 5, 'r'],
];
const TAILOR = [
  ['Clothes, common', 0.5], ['Clothes, traveler’s', 2], ['Clothes, costume', 5], ['Clothes, fine', 15, 2],
  ['Robes', 1], ['Blanket', 0.5], ['Padded armor', 5], ['Sack', 0.01, 1, 'n'], ['Cloak, wool', 1], ['Hat, wide-brimmed', 0.5],
  ['Gloves, kid leather', 1, 2], ['Weaver’s tools', 1], ['Bolt of linen', 2, 1, 'n'], ['Bolt of silk', 10, 3, 'n'],
  ['Cloak of Protection', 500, 4, 'r'], ['Cloak of Elvenkind', 500, 4, 'r'], ['Robe of Useful Items', 400, 3, 'r'],
];
const FLETCHER = [
  ['Arrows (20)', 1, 1, 'c'], ['Crossbow bolts (20)', 1, 1, 'c'], ['Sling bullets (20)', 0.04, 1, 'cn'],
  ['Blowgun needles (50)', 1, 2, 'c'], ['Shortbow', 25], ['Longbow', 50], ['Crossbow, light', 25],
  ['Crossbow, heavy', 50, 2], ['Crossbow, hand', 75, 3], ['Blowgun', 10, 2], ['Quiver', 1], ['Hunting trap', 5],
  ['Woodcarver’s tools', 1], ['Bowstring, spare', 0.1, 1, 'cn'],
  ['Arrows +1 (5)', 150, 3, 'r'], ['Longbow +1', 600, 4, 'r'], ['Crossbow, light +1', 600, 4, 'r'],
];
const ALCHEMIST = [
  ['Potion of Healing', 50, 2, 'cn'], ['Antitoxin (vial)', 50, 2, 'cn'], ['Acid (vial)', 25, 2, 'cn'],
  ['Alchemist’s fire (flask)', 50, 2, 'cn'], ['Holy water (flask)', 25, 2, 'cn'], ['Poison, basic (vial)', 100, 3, 'cn'],
  ['Healer’s kit', 5], ['Herbalism kit', 5], ['Perfume (vial)', 5, 1, 'cn'], ['Soap', 0.02, 1, 'cn'],
  ['Vial', 1, 1, 'n'], ['Alchemist’s supplies', 50, 2], ['Poisoner’s kit', 50, 3],
  ['Potion of Climbing', 75, 2, 'rcn'], ['Potion of Greater Healing', 150, 3, 'rcn'], ['Potion of Water Breathing', 200, 3, 'rcn'],
  ['Potion of Fire Breath', 200, 3, 'rcn'], ['Potion of Resistance', 300, 4, 'rcn'], ['Potion of Superior Healing', 500, 4, 'rcn'],
];
const JEWELER = [
  ['Signet ring', 5], ['Azurite', 10, 1, 'n'], ['Hematite', 10, 1, 'n'], ['Bloodstone', 50, 2, 'n'], ['Moonstone', 50, 2, 'n'],
  ['Onyx', 50, 2, 'n'], ['Amethyst', 100, 3, 'n'], ['Garnet', 100, 3, 'n'], ['Jade', 100, 3, 'n'], ['Pearl', 100, 3, 'n'],
  ['Topaz', 500, 4, 'n'], ['Black pearl', 500, 4, 'n'], ['Diamond (300 gp)', 300, 4, 'n'], ['Emerald', 1000, 5, 'n'],
  ['Silver necklace', 25, 2], ['Gold ring', 25, 2], ['Jeweler’s tools', 25],
  ['Ring of Warmth', 600, 4, 'r'], ['Ring of Jumping', 500, 4, 'r'], ['Ring of Swimming', 500, 4, 'r'], ['Ring of Protection', 2000, 5, 'r'],
];
const ARCANE = [
  ['Identify an item', 20, 1, 's'], ['Arcane focus, crystal', 10], ['Arcane focus, orb', 20], ['Arcane focus, rod', 10], ['Arcane focus, staff', 5],
  ['Arcane focus, wand', 10], ['Component pouch', 25], ['Spellbook (blank)', 50], ['Ink (1 ounce bottle)', 10, 1, 'cn'],
  ['Ink pen', 0.02, 1, 'n'], ['Parchment (one sheet)', 0.1, 1, 'cn'], ['Druidic focus, yew wand', 10],
  ['Holy symbol, amulet', 5], ['Spell scroll (cantrip)', 30, 3, 'cn'], ['Spell scroll (1st level)', 60, 3, 'cn'],
  ['Spell scroll (2nd level)', 150, 4, 'cn'], ['Potion of Healing', 50, 3, 'cn'],
  ['Spell scroll (3rd level)', 300, 4, 'rcn'], ['Driftglobe', 300, 3, 'r'], ['Wand of Magic Missiles', 500, 4, 'r'],
  ['Pearl of Power', 600, 4, 'r'], ['Decanter of Endless Water', 600, 4, 'r'], ['Sending Stones', 600, 5, 'r'],
  ['Immovable Rod', 1000, 5, 'r'],
];
const STABLE = [
  ['Riding horse', 75, 1, 'n'], ['Draft horse', 50, 1, 'n'], ['Pony', 30, 1, 'n'], ['Mule', 8, 1, 'n'], ['Donkey', 8, 1, 'n'],
  ['Warhorse', 400, 3, 'n'], ['Camel', 50, 4, 'n'], ['Cart', 15], ['Wagon', 35], ['Carriage', 100, 3], ['Sled', 20],
  ['Feed (per day)', 0.05, 1, 'cn'], ['Stabling (per day)', 0.5, 1, 'cn'], ['Saddle, riding', 10], ['Saddlebags', 4],
  ['Bit and bridle', 2], ['Barding, leather', 40, 3],
  ['Horseshoes of Speed', 1000, 5, 'r'],
];
const PROVISIONER = [
  ['Rations (1 day)', 0.5, 1, 'cn'], ['Bread, loaf', 0.02, 1, 'cn'], ['Cheese, hunk', 0.1, 1, 'cn'], ['Meat, chunk', 0.3, 1, 'cn'],
  ['Ale (gallon)', 0.2, 1, 'cn'], ['Wine, common (pitcher)', 0.2, 1, 'cn'], ['Wine, fine (bottle)', 10, 2, 'cn'],
  ['Salt (1 lb)', 0.05, 1, 'cn'], ['Spices (1 lb)', 1, 3, 'cn'], ['Fishing tackle', 1], ['Waterskin', 0.2],
  ['Cook’s utensils', 1], ['Mess kit', 0.2], ['Barrel', 2, 1, 'n'], ['Bucket', 0.05, 1, 'n'], ['Jug', 0.02, 1, 'n'],
  ['Pot, iron', 2], ['Brewer’s supplies', 20, 2],
  ['Keg of dwarven stout', 25, 3, 'rn'], ['Elven wine (bottle)', 50, 4, 'rcn'],
];
const TINKER = [
  ['Thieves’ tools', 25, 2], ['Tinker’s tools', 50], ['Carpenter’s tools', 8], ['Mason’s tools', 10],
  ['Cartographer’s tools', 15, 2], ['Navigator’s tools', 25, 2], ['Disguise kit', 25, 2], ['Forgery kit', 15, 3],
  ['Lock', 10], ['Manacles', 2], ['Hourglass', 25, 2], ['Abacus', 2], ['Scale, merchant’s', 5],
  ['Ball bearings (bag of 1,000)', 1, 1, 'cn'], ['Caltrops (bag of 20)', 1, 1, 'cn'], ['Bell', 1], ['Chain (10 ft)', 5],
  ['Magnifying glass', 100, 3, 'r'], ['Alchemy Jug', 600, 4, 'r'], ['Lantern of Revealing', 600, 4, 'r'],
];

// ── shops added 2026-10-08 ──────────────────────────────────────────
const TEMPLE = [
  ['Holy water (flask)', 25, 1, 'cn'], ['Holy symbol, amulet', 5], ['Holy symbol, emblem', 5], ['Holy symbol, reliquary', 5],
  ['Candles, blessed (10)', 0.5, 1, 'cn'], ['Prayer book', 25, 2], ['Incense (block)', 0.1, 1, 'cn'],
  ['Identify an item', 20, 2, 's'], ['Blessing for the road', 5, 1, 's'], ['Healing: cure wounds', 10, 1, 's'], ['Healing: lesser restoration', 40, 2, 's'],
  ['Healing: prayer of healing', 40, 3, 's'], ['Remove curse', 90, 3, 's'], ['Funeral rites', 5, 1, 's'],
  ['Greater restoration', 450, 4, 'rs'], ['Raise dead (diamond not included)', 1250, 5, 'rs'], ['Potion of Healing', 50, 2, 'rcn'],
];
const INN = [
  ['Lodging, poor (per night)', 0.1, 1, 's'], ['Lodging, modest (per night)', 0.5, 1, 's'], ['Lodging, comfortable (per night)', 0.8, 2, 's'],
  ['Lodging, wealthy (per night)', 2, 3, 's'], ['Lodging, aristocratic (per night)', 4, 4, 's'],
  ['Meal, poor', 0.06, 1, 's'], ['Meal, modest', 0.3, 1, 's'], ['Meal, comfortable', 0.5, 2, 's'], ['Meal, wealthy', 0.8, 3, 's'],
  ['Ale (mug)', 0.04, 1, 's'], ['Wine, common (pitcher)', 0.2, 1, 's'], ['Wine, fine (bottle)', 10, 2, 'cn'],
  ['Hot bath', 0.1, 1, 's'], ['Stabling (per night)', 0.5, 1, 's'], ['A round for the house (and the local gossip)', 0.5, 1, 's'],
  ['Private room for a meeting', 1, 2, 's'], ['Feast for the party', 10, 3, 's'],
  ['The house\u2019s best bottle', 25, 3, 'rcn'],
];
const SHIPWRIGHT = [
  ['Rowboat', 50, 1, 'n'], ['Oars (pair)', 2], ['Sail canvas (bolt)', 5, 1, 'cn'], ['Rope, hempen (50 ft)', 1, 1, 'c'],
  ['Pitch & tar (barrel)', 2, 1, 'cn'], ['Anchor', 10], ['Fishing net', 1], ['Navigator\u2019s tools', 25, 2],
  ['Keelboat', 3000, 3, 'n'], ['Sailing ship', 10000, 4, 'n'], ['Longship', 10000, 5, 'n'],
  ['Passage (per mile)', 0.1, 1, 's'], ['Ship repairs (per day)', 10, 2, 's'], ['Hire a crew (per day)', 2, 2, 's'],
  ['Spyglass', 1000, 4, 'r'], ['Folding Boat', 600, 4, 'r'], ['Galley', 30000, 5, 'rn'], ['Warship', 25000, 5, 'rn'],
];
const VINTNER = [
  ['Wine, common (pitcher)', 0.2, 1, 'cn'], ['Wine, fine (bottle)', 10, 1, 'cn'], ['Lynport red (bottle)', 15, 2, 'cn'],
  ['Lynport white (bottle)', 12, 2, 'cn'], ['Sparkling wine (bottle)', 20, 3, 'cn'], ['Brandy (bottle)', 20, 3, 'cn'],
  ['Cask of table wine', 8, 1, 'n'], ['Empty bottles (dozen)', 0.2, 1, 'cn'], ['Corks & wax (dozen)', 0.1, 1, 'cn'], ['Wine skin', 0.2],
  ['Tasting (a flight of five)', 1, 2, 's'],
  ['Ashglass reserve, pre-flood vintage', 75, 3, 'rcn'], ['The Duchess\u2019s private label', 150, 4, 'rcn'],
];
const BREWER = [
  ['Ale (gallon)', 0.2, 1, 'cn'], ['Rye ale (gallon)', 0.25, 1, 'cn'], ['Stout (gallon)', 0.3, 1, 'cn'], ['Mead (bottle)', 2, 1, 'cn'],
  ['Keg of rye ale', 4, 1, 'n'], ['Empty keg', 2, 1, 'n'], ['Hops (sack)', 1, 1, 'cn'], ['Barley (sack)', 0.5, 1, 'cn'],
  ['Brewer\u2019s supplies', 20, 2], ['Tankard, pewter', 0.5], ['A pint and a seat by the vats', 0.04, 1, 's'],
  ['Betram\u2019s Rye Ale, prizewinning keg', 30, 2, 'rn'], ['Dwarven stout (keg)', 25, 3, 'rn'],
];
const SALT = [
  ['Salt (1 lb)', 0.05, 1, 'cn'], ['Salt (50 lb sack)', 2, 1, 'cn'], ['Salt (barrel)', 8, 2, 'cn'], ['Salt pork (1 lb)', 0.2, 1, 'cn'],
  ['Salted fish (1 lb)', 0.1, 1, 'cn'], ['Pickled vegetables (jar)', 0.1, 1, 'cn'], ['Preserved rations (1 week)', 3.5, 1, 'cn'],
  ['Smoked sausage', 0.3, 1, 'cn'], ['Brine (barrel)', 3, 1, 'n'], ['Sea salt, fine (jar)', 1, 3, 'cn'],
  ['Saltyard white salt (crate)', 50, 4, 'rn'], ['Salt-cured ham, aged a year', 15, 3, 'rcn'],
];
const QUARTERMASTER = [
  ['Spear', 1], ['Shortsword', 10], ['Longsword', 15], ['Shield', 10], ['Crossbow, light', 25], ['Crossbow bolts (20)', 1, 1, 'c'],
  ['Ring mail', 30], ['Chain shirt', 50], ['Chain mail', 75, 2], ['Tent, two-person', 2], ['Rations (1 day)', 0.5, 1, 'cn'],
  ['Mess kit', 0.2], ['Bedroll', 1], ['Signal whistle', 0.05, 1, 'n'], ['Caltrops (bag of 20)', 1, 1, 'cn'], ['Manacles', 2],
  ['Healer\u2019s kit', 5], ['Saddle, military', 20, 2], ['Waterskin', 0.2],
  ['Officer\u2019s breastplate', 400, 3, 'r'], ['Harthall regimental shield +1', 600, 4, 'r'], ['Longsword +1', 600, 4, 'r'],
];
const SCRIBE = [
  ['Paper (one sheet)', 0.2, 1, 'cn'], ['Parchment (one sheet)', 0.1, 1, 'cn'], ['Ink (1 ounce bottle)', 10, 1, 'cn'],
  ['Ink pen', 0.02, 1, 'n'], ['Book, blank', 25], ['Case, map or scroll', 1], ['Sealing wax', 0.5, 1, 'cn'],
  ['Calligrapher\u2019s supplies', 10, 2], ['Spellbook (blank)', 50, 3], ['Map of the dukedom', 10, 2],
  ['A letter written for you', 0.2, 1, 's'], ['A contract drafted', 2, 1, 's'], ['A book copied (per page)', 0.1, 2, 's'],
  ['A message sent by courier (per mile)', 0.02, 2, 's'],
  ['Spell scroll (1st level)', 60, 3, 'rcn'], ['Tome of local history', 25, 3, 'r'],
];
const HERBALIST = [
  ['Healing herbs (bundle)', 1, 1, 'cn'], ['Poultice', 2, 1, 'cn'], ['Antitoxin (vial)', 50, 2, 'cn'], ['Herbalism kit', 5],
  ['Sleeping draught', 5, 1, 'cn'], ['Calming tea', 0.5, 1, 'cn'], ['Insect-repelling salve', 1, 1, 'cn'], ['Smelling salts', 1, 1, 'cn'],
  ['Moonpetal (rare reagent)', 10, 3, 'cn'], ['Potion of Healing', 50, 2, 'cn'],
  ['Potion of Greater Healing', 150, 3, 'rcn'], ['Keoghtom\u2019s Ointment', 120, 4, 'rcn'],
];
const BUTCHER = [
  ['Meat, chunk', 0.3, 1, 'cn'], ['Sausage', 0.2, 1, 'cn'], ['Salt pork (1 lb)', 0.2, 1, 'cn'], ['Fish, fresh', 0.1, 1, 'cn'],
  ['Smoked fish', 0.2, 1, 'cn'], ['Eel', 0.3, 1, 'cn'], ['Fowl, plucked', 0.4, 1, 'cn'], ['Ham, whole', 2, 1, 'cn'],
  ['Lard (1 lb)', 0.1, 1, 'cn'], ['Lake Dorath trout', 0.5, 2, 'cn'], ['Oysters (dozen)', 1, 3, 'cn'],
  ['Venison haunch', 3, 2, 'cn'], ['A whole roast for a feast', 10, 3, 'rcn'],
];
const CARPENTER = [
  ['Barrel', 2, 1, 'n'], ['Chest', 5], ['Crate', 0.5, 1, 'n'], ['Ladder (10 ft)', 0.1], ['Pole (10 ft)', 0.05, 1, 'n'],
  ['Wagon wheel', 5], ['Carpenter\u2019s tools', 8], ['Woodcarver\u2019s tools', 1], ['Firewood (bundle)', 0.01, 1, 'cn'],
  ['Bucket', 0.05, 1, 'n'], ['Coffin', 10, 1, 'n'], ['Repairs (per day)', 1, 1, 's'], ['Build to order (per day)', 2, 2, 's'],
  ['Folding Boat', 600, 4, 'r'],
];
const MUSIC = [
  ['Flute', 2], ['Horn', 3], ['Shawm', 2], ['Drum', 6], ['Pan flute', 12], ['Dulcimer', 25], ['Lyre', 30], ['Viol', 30, 2],
  ['Bagpipes', 30, 2], ['Lute', 35], ['Strings & reeds', 0.5, 1, 'cn'], ['Songbook', 5, 2], ['Lessons (per week)', 2, 1, 's'],
  ['Pipes of the Sewers', 400, 4, 'r'], ['Pipes of Haunting', 400, 4, 'r'], ['Instrument of the Bards (Doss lute)', 2000, 5, 'r'],
];
const MONEYCHANGER = [
  ['Coin exchange (per 100 gp)', 2, 1, 's'], ['Letter of credit (per 100 gp)', 1, 2, 's'], ['Strongbox rental (per week)', 1, 2, 's'],
  ['Notarized contract', 5, 2, 's'], ['Appraisal of gems or art', 2, 2, 's'], ['Safe passage bond (per 100 gp)', 5, 3, 's'],
  ['Chest', 5], ['Lock', 10], ['Scale, merchant\u2019s', 5], ['Coin purse', 0.5],
  ['A sealed letter of introduction', 50, 4, 'rs'],
];
const CARTOGRAPHER = [
  ['Map of the dukedom', 10, 1, 'n'], ['Map of Sollara', 25, 3, 'n'], ['Road map with inns marked', 5, 2, 'n'],
  ['Chart of the Emerald Sea', 50, 4, 'n'], ['Cartographer\u2019s tools', 15], ['Navigator\u2019s tools', 25, 2],
  ['Case, map or scroll', 1], ['Compass', 25, 2], ['A survey of your route', 5, 2, 's'],
  ['Map of the Wilds (unreliable)', 100, 4, 'rn'], ['Old map of Tal\u2019Alor', 250, 5, 'rn'],
];
const BLACKMARKET = [
  ['Thieves\u2019 tools', 25], ['Forgery kit', 15], ['Disguise kit', 25], ['Poison, basic (vial)', 100, 1, 'cn'],
  ['Caltrops (bag of 20)', 1, 1, 'cn'], ['Ball bearings (bag of 1,000)', 1, 1, 'cn'], ['Crowbar', 2], ['Lantern, hooded', 5],
  ['Manacles', 2], ['Stolen goods (no questions)', 10, 1, 'cn'], ['Forged travel papers', 25, 2, 's'],
  ['A name, and where to find them', 10, 2, 's'], ['Assassin\u2019s blood (poison)', 150, 3, 'cn'],
  ['Serpent venom (poison)', 200, 4, 'cn'], ['Dust of Disappearance', 300, 3, 'rcn'], ['Cloak of Elvenkind', 500, 4, 'r'],
  ['Boots of Elvenkind', 500, 4, 'r'],
];
const IMPORTS = [
  ['Silk (bolt)', 10, 1, 'n'], ['Spices (1 lb)', 1, 1, 'cn'], ['Saffron (1 oz)', 15, 2, 'cn'], ['Pepper (1 lb)', 2, 1, 'cn'],
  ['Tea (bundle)', 1, 1, 'cn'], ['Incense (box)', 1, 1, 'cn'], ['Perfume (vial)', 5, 1, 'cn'], ['Porcelain cup', 10, 2],
  ['Ivory carving', 25, 2], ['Glass beads (string)', 1], ['Rope, silk (50 ft)', 10], ['Exotic songbird', 50, 4, 'n'],
  ['Robe of Useful Items', 400, 3, 'r'], ['Eversmoking Bottle', 300, 4, 'r'], ['Elemental Gem', 900, 5, 'r'],
];

export const SHOP_TYPES = {
  general: {
    label: 'General Store', catalog: GENERAL, nouns: ['Goods', 'Sundries', 'Supply', 'Provisions', 'Trading Post', 'Emporium'],
    adj: ['Well-Stocked', 'Wandering', 'Honest', 'Crooked', 'Lantern', 'Copper'],
    flavor: ['Shelves crammed floor to rafters with a bit of everything.', 'A counter, a bell, and a ledger nobody else may read.', 'It smells of rope, lamp oil and sawdust.'],
  },
  smith: {
    label: 'Blacksmith & Armorer', catalog: SMITH, nouns: ['Forge', 'Anvil', 'Hammer', 'Ironworks', 'Smithy', 'Steelworks'],
    adj: ['Red', 'Ringing', 'Iron', 'Ember', 'Black', 'Tempered'],
    flavor: ['The forge never cools and the hammer never stops.', 'Racks of blades glint behind a soot-black counter.', 'Sparks spill out of the open doors into the street.'],
  },
  leather: {
    label: 'Leatherworker', catalog: LEATHER, nouns: ['Tannery', 'Hide', 'Saddlery', 'Strap & Buckle', 'Leathers', 'Stitch'],
    adj: ['Oxblood', 'Tanned', 'Supple', 'Stitched', 'Old', 'Saddleback'],
    flavor: ['A cramped workshop that smells of tanning oil and beeswax.', 'Half-finished saddles hang from every beam.', 'Hides stretch on frames out back; the stench keeps the neighbors honest.'],
  },
  tailor: {
    label: 'Tailor & Clothier', catalog: TAILOR, nouns: ['Needle', 'Thread', 'Loom', 'Bolt', 'Thimble', 'Wardrobe'],
    adj: ['Silver', 'Silken', 'Velvet', 'Golden', 'Fine', 'Embroidered'],
    flavor: ['Bolts of cloth in every color line the walls.', 'A dressmaker’s dummy wears this season’s fashion from the capital.', 'Pins, chalk and gossip in equal measure.'],
  },
  fletcher: {
    label: 'Bowyer & Fletcher', catalog: FLETCHER, nouns: ['Quiver', 'Fletching', 'Bowstring', 'Yew', 'Arrow', 'Longbow'],
    adj: ['Straight', 'Grey Goose', 'True', 'Feathered', 'Whistling', 'Greenwood'],
    flavor: ['Feathers drift across the floor like snow.', 'Staves of yew and ash season in neat rows.', 'A straw target out back has seen better days.'],
  },
  alchemist: {
    label: 'Alchemist & Apothecary', catalog: ALCHEMIST, nouns: ['Mortar', 'Cauldron', 'Remedy', 'Tincture', 'Elixir', 'Retort'],
    adj: ['Bubbling', 'Green', 'Bitter', 'Curious', 'Healing', 'Smoking'],
    flavor: ['Glassware bubbles on every surface; something smells of burnt sugar.', 'Dried herbs hang in bundles from the ceiling.', 'Labels are written in a cramped and slightly worrying hand.'],
  },
  jeweler: {
    label: 'Jeweler & Gem Cutter', catalog: JEWELER, nouns: ['Gem', 'Facet', 'Setting', 'Loupe', 'Crown', 'Treasury'],
    adj: ['Glittering', 'Gilded', 'Sapphire', 'Starlit', 'Polished', 'Precious'],
    flavor: ['Every item sits behind thick glass and a watchful eye.', 'A guard by the door pretends not to look at you.', 'Velvet trays, tiny scales and a magnifying loupe.'],
  },
  arcane: {
    label: 'Arcane Curios', catalog: ARCANE, nouns: ['Grimoire', 'Wand', 'Orb', 'Sigil', 'Curio', 'Athenaeum'],
    adj: ['Gilded', 'Whispering', 'Starbound', 'Arcane', 'Shimmering', 'Moonlit'],
    flavor: ['The door chimes a half-second before you touch it.', 'Shelves of oddities, half of them humming faintly.', 'Ink-stained scrolls and a cat that watches too knowingly.'],
  },
  stable: {
    label: 'Stable & Livery', catalog: STABLE, nouns: ['Stables', 'Livery', 'Paddock', 'Hoof & Harness', 'Bridle', 'Corral'],
    adj: ['Galloping', 'Painted', 'Swift', 'Sturdy', 'Old Mare', 'Running'],
    flavor: ['Horses whicker as you come in; the smell is honest.', 'A muddy yard, a hayloft and a farrier at work.', 'Wagons line up for repairs along the fence.'],
  },
  provisioner: {
    label: 'Provisioner & Grocer', catalog: PROVISIONER, nouns: ['Larder', 'Pantry', 'Market', 'Barrel', 'Harvest', 'Granary'],
    adj: ['Full', 'Golden', 'Hearty', 'Salted', 'Bountiful', 'Plump'],
    flavor: ['Sacks of grain and wheels of cheese crowd the aisles.', 'Smoked hams hang above a counter dusted with flour.', 'Barrels of pickles, salt pork and last year’s apples.'],
  },
  tinker: {
    label: 'Tinker & Toolmaker', catalog: TINKER, nouns: ['Cog', 'Gearworks', 'Toolbox', 'Tinkery', 'Workbench', 'Lockworks'],
    adj: ['Clockwork', 'Brass', 'Clever', 'Rusty', 'Whirring', 'Odd'],
    flavor: ['Gears, springs and half-built contraptions everywhere.', 'Something on the back shelf is ticking.', 'Locks of every size line one wall; a few are still locked.'],
  },

  temple: {
    label: 'Temple of the Rising Sun', catalog: TEMPLE, nouns: ['Dawn', 'Sunrise', 'Light', 'Sanctuary', 'Rising Sun', 'Hearth'],
    adj: ['Golden', 'Radiant', 'Merciful', 'Dawning', 'Holy', 'Gentle'], namePattern: 'temple',
    flavor: ['Sunlight through the high windows lands on a worn stone altar.', 'Acolytes sweep the steps and greet every visitor by name.', 'The smell of beeswax and the hum of morning prayer.'],
  },
  inn: {
    label: 'Inn & Tavern', catalog: INN, nouns: ['Rest', 'Hearth', 'Tankard', 'Lantern', 'Hound', 'Crow', 'Stag', 'Barrel'],
    adj: ['Drowsy', 'Laughing', 'Golden', 'Prancing', 'Rusty', 'Jolly', 'Drunken', 'Sleeping'],
    flavor: ['A fire roars in the hearth and nobody asks your business.', 'Smoke, song, and the clatter of dice from the back tables.', 'Clean sheets, cold ale and a landlord who remembers faces.'],
  },
  shipwright: {
    label: 'Shipwright & Chandler', catalog: SHIPWRIGHT, nouns: ['Slipway', 'Hull', 'Keel', 'Drydock', 'Rigging', 'Mast'],
    adj: ['Seaworthy', 'Salt-Stained', 'Tarred', 'Windward', 'Steady', 'Barnacled'],
    flavor: ['A half-built hull rises on the slip like the ribs of a whale.', 'Coils of rope, barrels of pitch and the cry of gulls.', 'The yard rings with mallets; the harbor smells of tar.'],
  },
  vintner: {
    label: 'Vintner', catalog: VINTNER, nouns: ['Cellar', 'Vineyard', 'Cask', 'Grape', 'Vintage', 'Press'],
    adj: ['Crimson', 'Velvet', 'Sun-Warmed', 'Lynport', 'Old Vine', 'Gentle'],
    flavor: ['Racks of dusty bottles vanish into a cool stone cellar.', 'A tasting table, a sommelier, and very small glasses.', 'The air is sweet with crushed grapes and old oak.'],
  },
  brewer: {
    label: 'Brewer', catalog: BREWER, nouns: ['Brewhouse', 'Mash Tun', 'Barley', 'Tankard', 'Kettle', 'Hops'],
    adj: ['Foaming', 'Rye', 'Hoppy', 'Copper', 'Bubbling', 'Thirsty'],
    flavor: ['Great copper kettles steam behind a counter of kegs.', 'Last year\u2019s prize ribbon hangs proudly above the taps.', 'The whole street smells of malt.'],
  },
  salt: {
    label: 'Salt Merchant', catalog: SALT, nouns: ['Saltworks', 'Brine', 'Salt House', 'Cellar', 'Larder', 'Pan'],
    adj: ['White', 'Briny', 'Crystal', 'Preserving', 'Grey', 'Sea'],
    flavor: ['Sacks of white salt are stacked to the rafters.', 'Every price on the board is a little higher than you\u2019d like. Everyone needs salt.', 'Barrels of salt pork and pickles line the walls.'],
  },
  quartermaster: {
    label: 'Quartermaster', catalog: QUARTERMASTER, nouns: ['Stores', 'Armory', 'Supply', 'Barracks Store', 'Quartermaster', 'Depot'],
    adj: ['Regimental', 'Old Guard', 'Surplus', 'Garrison', 'Iron', 'Field'],
    flavor: ['Everything is stamped with the Harthall stag and counted twice.', 'A retired sergeant runs it like a parade ground.', 'Crates of army surplus, some of it suspiciously new.'],
  },
  scribe: {
    label: 'Scribe & Bookbinder', catalog: SCRIBE, nouns: ['Quill', 'Inkwell', 'Folio', 'Bindery', 'Scriptorium', 'Letters'],
    adj: ['Careful', 'Inky', 'Learned', 'Gilded', 'Quiet', 'Patient'],
    flavor: ['The only sound is the scratch of a dozen quills.', 'Stacks of books, some of them unfinished, all of them dusty.', 'A clerk peers over spectacles and asks what you need written.'],
  },
  herbalist: {
    label: 'Herbalist', catalog: HERBALIST, nouns: ['Garden', 'Root', 'Leaf', 'Thicket', 'Remedy', 'Bloom'],
    adj: ['Green', 'Wild', 'Gentle', 'Hedge', 'Moonlit', 'Fragrant'],
    flavor: ['Bundles of drying herbs hang from every beam.', 'A tiny shop that smells of mint, earth and something bitter.', 'The herbalist is out back in the garden; ring the bell.'],
  },
  butcher: {
    label: 'Butcher & Fishmonger', catalog: BUTCHER, nouns: ['Block', 'Cleaver', 'Catch', 'Smokehouse', 'Larder', 'Market'],
    adj: ['Fresh', 'Smoky', 'Honest', 'Red', 'Salted', 'Lakeside'],
    flavor: ['Today\u2019s catch lies on ice; hams hang from hooks.', 'The cleaver thunks without pause while you browse.', 'A smokehouse out back gives the street its smell.'],
  },
  carpenter: {
    label: 'Carpenter & Cooper', catalog: CARPENTER, nouns: ['Workshop', 'Joinery', 'Cooperage', 'Lathe', 'Timberyard', 'Bench'],
    adj: ['Oaken', 'Sturdy', 'Square', 'Sawdust', 'Honest', 'Pine'],
    flavor: ['Sawdust everywhere and barrels stacked like a wall.', 'The carpenter measures you with their eyes, out of habit.', 'Half-made wheels, chests and coffins line the yard.'],
  },
  music: {
    label: 'Instrument Maker', catalog: MUSIC, nouns: ['Lute', 'Harp', 'Song', 'Ballad', 'Chord', 'Melody'],
    adj: ['Silver', 'Singing', 'Sweet', 'Merry', 'Golden', 'Lilting'],
    flavor: ['Someone is always testing an instrument in the back room.', 'Lutes hang on the walls like hams in a smokehouse.', 'The maker hums the same tune every time a customer comes in.'],
  },
  moneychanger: {
    label: 'Moneychanger & Bank', catalog: MONEYCHANGER, nouns: ['Exchange', 'Counting House', 'Vault', 'Ledger', 'Coin', 'Strongroom'],
    adj: ['Golden', 'Honest', 'Silver', 'Sealed', 'Steady', 'Stone'],
    flavor: ['Marble floors, brass scales and two guards who never blink.', 'Every coin is weighed, bitten and written down.', 'Clerks at high desks, and a vault door you could drive a cart through.'],
  },
  cartographer: {
    label: 'Cartographer', catalog: CARTOGRAPHER, nouns: ['Compass', 'Chart', 'Atlas', 'Survey', 'Meridian', 'Map Room'],
    adj: ['Wandering', 'Careful', 'Faraway', 'Inked', 'Northern', 'Brass'],
    flavor: ['Maps cover the walls, the tables and part of the floor.', 'The cartographer wants to hear where you\u2019ve been more than sell you anything.', 'Globes, rulers and a map of the Wilds marked \u201chere be trouble\u201d.'],
  },
  blackmarket: {
    label: 'Black Market', catalog: BLACKMARKET, inverse: true, hiddenByDefault: true,
    nouns: ['Back Room', 'Cellar', 'Den', 'Alley', 'Hollow', 'Rat'], adj: ['Quiet', 'Crooked', 'Shadowed', 'Grey', 'Silent', 'Low'],
    flavor: ['Ask for it by the wrong name and the door stays shut.', 'A back room behind a respectable-looking business.', 'Everything is cash only, and nothing is ever discussed twice.'],
  },
  imports: {
    label: 'Exotic Imports', catalog: IMPORTS, nouns: ['Bazaar', 'Caravan', 'Wonders', 'Silks', 'Spice House', 'Treasures'],
    adj: ['Far Shore', 'Emerald', 'Gilded', 'Distant', 'Saffron', 'Peacock'],
    flavor: ['Silks, spices and things you have no names for.', 'Every item comes with a story of a long voyage, some of them true.', 'The air is thick with incense and the sound of a caged bird.'],
  },
};

// ─── people ─────────────────────────────────────────────────────────
const FIRST = ['Alda', 'Bram', 'Cora', 'Dunstan', 'Edda', 'Fenwick', 'Greta', 'Hollis', 'Ilsa', 'Jory', 'Kestrel', 'Liesl',
  'Marten', 'Nell', 'Osric', 'Perrin', 'Quill', 'Rowena', 'Silas', 'Tamsin', 'Ulric', 'Vesna', 'Wendel', 'Yara', 'Zebulon',
  'Agatha', 'Barnaby', 'Corwin', 'Delphine', 'Ewan', 'Faye', 'Garrick', 'Hester', 'Ivo', 'Jessamy', 'Lorcan', 'Mirela',
  'Nim', 'Odette', 'Piet', 'Rhosyn', 'Sabine', 'Torvald', 'Ysolde'];
const LAST = ['Ashdown', 'Brightwater', 'Cobble', 'Dunmore', 'Eastbrook', 'Fairweather', 'Greaves', 'Hartley', 'Ironside',
  'Juniper', 'Kettleby', 'Larkspur', 'Millward', 'Nettles', 'Oakhart', 'Pennywhistle', 'Quarry', 'Redfern', 'Stoutbarrel',
  'Thistlewood', 'Underhill', 'Vane', 'Whitlock', 'Yarrow', 'Ambersmith', 'Blackwood', 'Copperpot', 'Dewhurst', 'Emberly',
  'Fenn', 'Goldbranch', 'Holloway', 'Kindlewick', 'Lowe', 'Marsh', 'Proudfoot', 'Rook', 'Saltmarsh', 'Tallow', 'Wickham'];
const RACES = [['Human', 40], ['Dwarf', 12], ['Halfling', 12], ['Elf', 8], ['Half-elf', 8], ['Gnome', 7], ['Half-orc', 5],
  ['Tiefling', 4], ['Dragonborn', 4]];
const QUIRKS = ['Haggles for the sport of it, then gives a discount anyway.', 'Hums old sailors’ songs while working.',
  'Never forgets a face, or a debt.', 'Talks to the merchandise as if it can hear.', 'Insists every item has a story, and tells it.',
  'Suspicious of anyone with clean boots.', 'Always eating something.', 'Keeps a loaded crossbow under the counter and mentions it often.',
  'Speaks in a whisper, as if the walls listen.', 'Collects gossip the way others collect coins.', 'Gruff, but sneaks sweets to children.',
  'Prays to the Rising Sun before every sale.', 'Superstitious; won’t sell anything on an empty stomach.',
  'Brags about a famous customer who may not exist.', 'Has a parrot that repeats prices, badly.', 'Slow, careful and unhurried by anyone.',
  'Former soldier; stands at attention without meaning to.', 'Laughs at their own jokes, loudly.', 'Wants news from the road in exchange for a better price.',
  'Distrusts magic and anyone who uses it.'];

// ─── seeded randomness ──────────────────────────────────────────────
export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export function rng(seedStr) {
  let a = hashSeed(seedStr)();
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
function weighted(r, pairs) {
  let n = r() * pairs.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of pairs) { if ((n -= w) < 0) return v; }
  return pairs[0][0];
}
const newSeed = () => Math.random().toString(36).slice(2, 10);

// ─── generating a shop ──────────────────────────────────────────────
// Returns the parts of a shop that are fixed once saved. Stock is generated per week from shop.seed.
export function generateShop(type, size, seed = newSeed()) {
  const t = SHOP_TYPES[type], r = rng(`shop:${seed}`);
  const first = pick(r, FIRST), last = pick(r, LAST);
  const name = t.namePattern === 'temple' ? `${pick(r, ['Chapel', 'Shrine', 'Temple', 'House'])} of the ${pick(r, t.adj)} ${pick(r, t.nouns)}` : pick(r, [
    () => `The ${pick(r, t.adj)} ${pick(r, t.nouns)}`,
    () => `${last}’s ${pick(r, t.nouns)}`,
    () => `${first}’s ${pick(r, t.nouns)}`,
    () => `The ${pick(r, t.nouns)} & ${pick(r, t.nouns)}`,
  ])();
  // (temples name themselves; everyone else picks one of the patterns above)
  return {
    seed, type, size: Number(size), name,
    proprietor: { name: `${first} ${last}`, race: weighted(r, RACES), quirk: pick(r, QUIRKS) },
    description: pick(r, t.flavor),
    priceMod: Math.round((0.9 + r() * 0.25) * 100) / 100, // this shop's own markup, 0.90–1.15
  };
}

// The stock for a given week: [{ key, name, grade: 'standard'|'fine'|'rare', price (gp, before renown), qty }]
export function generateStock(shop, week) {
  const t = SHOP_TYPES[shop.type], s = sizeById(shop.size), r = rng(`stock:${shop.seed}:${week}`);
  const items = t.catalog.map(([name, price, min = 1, flags = '']) => ({ name, price, min, flags }));
  const common = items.filter((i) => !i.flags.includes('r') && !i.flags.includes('s') && i.min <= s.id);
  // everyday services are always on offer (an inn always has rooms); only goods are drawn at random
  const services = items.filter((i) => !i.flags.includes('r') && i.flags.includes('s') && i.min <= s.id);
  const rare = items.filter((i) => i.flags.includes('r') && i.min <= s.id);
  const shuffle = (list) => list.map((i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const out = [];
  for (const i of shuffle(common).slice(0, between(r, ...s.items))) {
    const service = i.flags.includes('s');
    const fine = !service && !i.flags.includes('n') && !i.flags.includes('c') && r() < s.fine;
    const qty = service ? null : i.flags.includes('c') ? between(r, 2, 6) * s.qtyBoost : between(r, 1, 1 + Math.floor(s.qtyBoost / 2));
    out.push({ key: `${i.name}|${fine ? 'fine' : 'standard'}`, name: fine ? `${i.name} (fine)` : i.name,
      grade: fine ? 'fine' : 'standard', price: fine ? i.price * 2 : i.price, qty, service });
  }
  for (const i of services) {
    out.push({ key: `${i.name}|standard`, name: i.name, grade: 'standard', price: i.price, qty: null, service: true });
  }
  for (const i of shuffle(rare).slice(0, s.rare)) {
    const service = i.flags.includes('s');
    out.push({ key: `${i.name}|rare`, name: i.name, grade: 'rare', price: i.price, qty: service ? null : i.flags.includes('c') ? between(r, 1, 3) : 1, service });
  }
  const grades = { standard: 0, fine: 1, rare: 2 };
  return out
    .map((i) => ({ ...i, price: nicePrice(i.price * shop.priceMod) }))
    .sort((a, b) => grades[a.grade] - grades[b.grade] || a.name.localeCompare(b.name));
}

// ─── renown ─────────────────────────────────────────────────────────
// How the party's standing where the shop is changes prices and what they'll sell.
export function renownTerms(score) {
  const mult = score >= 0 ? 1 - 0.025 * score : 1 + 0.06 * -score; // +10 → 25% off, −10 → 60% more
  if (score <= -7) return { mult, refuses: true, allow: {}, note: 'Refuses to trade with you.' };
  if (score <= -3) return { mult, allow: { standard: true }, note: 'Won’t sell you their better goods.' };
  if (score < 0) return { mult, allow: { standard: true }, note: 'Keeps the finer goods back from you.' };
  if (score < 3) return { mult, allow: { standard: true, fine: true }, note: 'Their best stock is for trusted customers only.' };
  return { mult, allow: { standard: true, fine: true, rare: true }, note: 'Shows you everything, including what’s under the counter.' };
}

// Round to amounts a shopkeeper would actually ask: whole gold from 10 gp, silver from 1 sp, copper below.
export function nicePrice(gp) {
  if (gp >= 10) return Math.round(gp);
  if (gp >= 0.1) return Math.round(gp * 10) / 10; // to the silver piece
  return Math.max(0.01, Math.round(gp * 100) / 100);
}

// ─── haggling ───────────────────────────────────────────────────────
// Once per player, per shop, per week: they roll Persuasion and enter the total.
// The result changes that player's prices at that shop until the stock refreshes.
export const HAGGLE = [
  { upTo: 5, mult: 1.2, text: 'Offended! Prices go up 20%.' },
  { upTo: 9, mult: 1.1, text: 'Unimpressed. Prices go up 10%.' },
  { upTo: 14, mult: 1, text: 'No deal. Prices stay the same.' },
  { upTo: 19, mult: 0.9, text: 'A fair bargain: 10% off.' },
  { upTo: 24, mult: 0.85, text: 'Charmed: 15% off.' },
  { upTo: Infinity, mult: 0.8, text: 'Won over completely: 20% off.' },
];
export const haggleResult = (roll) => HAGGLE.find((x) => roll <= x.upTo);

// 12.5 → "12 gp 5 sp"; 0.04 → "4 cp"
export function formatPrice(gp) {
  let cp = Math.round(gp * 100);
  const g = Math.floor(cp / 100); cp -= g * 100;
  const s = Math.floor(cp / 10); cp -= s * 10;
  return [g && `${g.toLocaleString()} gp`, s && `${s} sp`, cp && `${cp} cp`].filter(Boolean).join(' ') || '0 cp';
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Which week's stock a shop shows now (restocks every 7 days from creation; "Restock now" adds an offset).
export function shopWeek(shop, now = Date.now()) {
  const elapsed = Math.max(0, Math.floor((now - shop.createdAt) / WEEK_MS));
  return { week: elapsed + (shop.restockOffset || 0), nextRestock: shop.createdAt + (elapsed + 1) * WEEK_MS };
}
