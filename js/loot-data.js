// Loot generator: coins, gems, art, gear, story hooks and magic items, scaled by party level,
// individual vs hoard, and where it's found. Magic item names follow the D&D 5e SRD 5.1
// (CC BY 4.0); the coin/gem/magic odds, values and descriptions here are our own.
import { rng } from './shop-data.js';

// ─── dice ───────────────────────────────────────────────────────────
const roll = (r, n, s) => { let t = 0; for (let i = 0; i < n; i++) t += 1 + Math.floor(r() * s); return t; };
const pick = (r, list) => list[Math.floor(r() * list.length)];
const chance = (r, p) => r() < p;

export const tierOf = (level) => (level <= 4 ? 1 : level <= 10 ? 2 : level <= 16 ? 3 : 4);
export const MODES = { individual: 'One creature’s pockets', hoard: 'A hoard or treasure room' };

// ─── where it's found ───────────────────────────────────────────────
export const SETTINGS = {
  bandit: {
    label: 'Bandit camp', coin: 1, art: 0.5, magic: 0.8,
    gear: ['Loaded dice', 'Crowbar', 'Manacles', 'Rations (3 days)', 'Shortbow', 'Arrows (20)', 'A stolen merchant’s ledger', 'Rope, hempen (50 ft)', 'Wanted poster with the leader’s face', 'Thieves’ tools', 'A blackjack wrapped in leather', 'Caltrops (bag of 20)', 'A stolen holy symbol', 'Half-eaten wheel of cheese', 'Wineskin, nearly empty', 'Hooded cloak with a hidden pocket', 'Marked deck of cards', 'A tinderbox and flint', 'Crossbow bolts (12)', 'A pair of mismatched boots', 'Burlap sacks (5)', 'Grappling hook', 'A whetstone worn thin', 'Lock with no key', 'A child’s wooden toy, taken from a wagon', 'Shackle key on a leather cord', 'Hand axe, nicked', 'Torches (5)', 'A forged travel pass'],
    hooks: ['A crude map marking another hideout', 'A ransom note that was never delivered', 'A merchant’s seal, recently stolen', 'A list of caravans and their departure dates'],
  },
  lair: {
    label: 'Monster lair', coin: 1.2, art: 1, magic: 1,
    gear: ['Rusted chain shirt', 'A dented helmet', 'A torn backpack with a waterskin', 'Gnawed bones of an adventurer', 'A broken longsword hilt', 'Bedroll, mildewed', 'A cracked shield bearing a family crest', 'Tattered banner of a forgotten company', 'An adventurer’s boot, still laced', 'Spearhead, bent', 'Rusted lantern', 'A gnawed leather belt pouch', 'Torn cloak caught on a bone', 'Pitons (6), bent', 'A shattered spyglass', 'Scorched quiver', 'Broken manacles', 'A dented cooking pot', 'Half a map, chewed', 'Iron helm with claw marks', 'A dwarf’s braid clasp', 'A rotting rope ladder', 'A whistle carved from bone', 'A soggy rations pack', 'Chipped greataxe head'],
    hooks: ['A previous adventurer’s journal', 'A tooth-marked locket with a portrait inside', 'A half-burned letter home'],
  },
  noble: {
    label: 'Noble’s study', coin: 1.5, art: 1.6, magic: 0.9,
    gear: ['Clothes, fine', 'Signet ring', 'Ink and quill', 'A leather-bound book of poetry', 'Perfume (vial)', 'Wine, fine (bottle)', 'Sealing wax', 'Silver-backed hairbrush', 'Embroidered gloves', 'A box of fine cigars', 'Letter opener with a pearl handle', 'Silk handkerchiefs (6)', 'A tin of imported tea', 'A music box that plays a court dance', 'Reading spectacles', 'Lace-trimmed cravat', 'Monogrammed silver cutlery', 'A small portrait miniature', 'A chessboard with ivory pieces', 'Velvet slippers', 'Scented candles (4)', 'A walking cane with a brass head', 'Bottle of brandy, aged', 'A dance card with three names circled', 'Pomander of dried oranges and cloves', 'Writing desk set'],
    hooks: ['Sealed letters to a member of the Council of Ten', 'A ledger recording bribes', 'A deed to a property in another dukedom', 'A key to a box at the Moneychanger'],
  },
  temple: {
    label: 'Temple vault', coin: 1.1, art: 1.5, magic: 1.1,
    gear: ['Holy water (flask)', 'Candles, blessed (10)', 'Holy symbol, reliquary', 'Prayer book', 'Incense (block)', 'Vestments', 'Censer, brass', 'Alms box (empty)', 'Prayer beads', 'Embroidered altar cloth', 'Hymnal with pressed flowers', 'Oil lamp, ornate', 'Healer’s kit', 'Bandages (bundle)', 'Anointing oil (vial)', 'Wooden saint’s icon', 'A pilgrim’s staff', 'Bell, small silver', 'Sacramental wine (bottle)', 'A list of the faithful and their tithes', 'Monk’s robes', 'Votive offerings (a bowl of trinkets)', 'Chalk for warding circles', 'Blessed salt (pouch)', 'Pilgrim’s badges (handful)'],
    hooks: ['A record of a relic’s hiding place', 'A confession written and never given', 'The name of a saint scratched out of a list'],
  },
  ship: {
    label: 'Sunken ship', coin: 1.2, art: 0.8, magic: 1,
    gear: ['Navigator’s tools', 'Spyglass (cracked)', 'Waterlogged chest', 'Rope, hempen (50 ft)', 'Barnacled cutlass', 'Bottle of rum, still sealed', 'Sextant', 'Sailcloth (bolt)', 'Ship’s bell, green with age', 'A sea chest’s brass lock', 'Fishing net', 'Harpoon', 'Oilskin coat', 'Hardtack (tin)', 'Belaying pin', 'Lantern, storm', 'Compass, needle stuck', 'Tar (bucket)', 'A sailor’s ditty bag', 'Scrimshaw whale tooth', 'Boarding axe', 'A message in a bottle', 'Hammock', 'Salt pork (barrel, half full)', 'Cask of fresh water (empty)', 'Captain’s tricorn hat'],
    hooks: ['The captain’s log', 'A sea chart with a route to somewhere unmarked', 'A sealed oilskin packet addressed to Saubantch'],
  },
  dwarven: {
    label: 'Dwarven ruin', coin: 1.1, art: 1.3, magic: 1,
    gear: ['Miner’s pick', 'Smith’s tools', 'Lantern, hooded', 'An iron-bound chest', 'Ale keg (empty)', 'Dwarven war horn', 'Mason’s tools', 'Mining helmet with a candle holder', 'Iron spikes (10)', 'Stone tankard, carved', 'Forge tongs', 'A crate of iron ingots', 'Beard comb, bone', 'Chisel set', 'Coal (sack)', 'Pickaxe head, unused', 'Brewer’s supplies', 'Chain (10 ft)', 'A dwarven ale-horn', 'Stonecutter’s level', 'Iron rations (dwarven, rock-hard)', 'A small anvil', 'Lamp oil (flasks, 3)', 'Rune-etched hammer, common', 'Leather apron, scorched'],
    hooks: ['A rune-key to a sealed door', 'A tablet in old Dumrak-Karazdun script', 'A clan genealogy with one name chiselled out'],
  },
  wizard: {
    label: 'Wizard’s tower', coin: 0.9, art: 1, magic: 1.6,
    gear: ['Component pouch', 'Spellbook (water-damaged)', 'Ink (1 ounce bottle)', 'Arcane focus, crystal', 'Vials of strange reagents', 'Hourglass', 'Alchemist’s supplies', 'Crystal ball (cracked, nonmagical)', 'Star chart', 'Glass vials (10)', 'Beaker and stand', 'Scroll case (empty)', 'Blank parchment (10 sheets)', 'A jar of preserved eyes', 'Bat guano (pouch)', 'A stuffed owl', 'Chalk (box)', 'Mortar and pestle', 'Wand, carved but ordinary', 'Magnifying glass', 'A dried mandrake root', 'Brass astrolabe', 'Robes embroidered with stars', 'Candles, black (6)', 'Notebook of failed experiments', 'Lodestone'],
    hooks: ['Notes on an unfinished ritual', 'A letter from a rival mage', 'A summoning circle sketch with one rune wrong'],
  },
  caravan: {
    label: 'Merchant caravan', coin: 1.3, art: 0.8, magic: 0.7,
    gear: ['Bolt of silk', 'Spices (5 lb)', 'Salt (50 lb sack)', 'Barrel of Lynport wine', 'Trade goods crate', 'Saddlebags', 'Wagon wheel (spare)', 'Lamp oil (cask)', 'Dried fruit (crate)', 'Wool blankets (6)', 'Bolt of dyed cotton', 'Iron pots (set)', 'Tea bricks (5)', 'Tobacco (bale)', 'Horseshoes (dozen)', 'Mule harness', 'A merchant’s scales and weights', 'Furs (bundle)', 'Glass beads (bag)', 'Copper wire (coil)', 'Pottery, packed in straw', 'Rope (100 ft)', 'Ledger of debts', 'Tent, two-person', 'Cheese wheels (3)', 'Dyes (box of jars)'],
    hooks: ['A shipping manifest with one crate unaccounted for', 'A Teamsters’ Guild writ', 'A letter of credit on a Saubantch bank'],
  },
  crypt: {
    label: 'Crypt or tomb', coin: 1, art: 1.6, magic: 1.1,
    gear: ['Burial shroud', 'Funeral mask', 'Gold teeth (a handful)', 'Ceremonial dagger', 'Candles (10)', 'Urn of ashes', 'Embalming tools', 'Grave goods: a clay bowl', 'A tarnished circlet', 'Bones of a pet buried with its master', 'Shovel, rusted', 'Coffin nails (handful)', 'Pall cloth', 'A sealed canopic jar', 'Lantern with a cracked pane', 'Prayer scrolls, crumbling', 'Silver burial coins (on the eyes)', 'Mourning veil', 'Tomb rubbing on parchment', 'A death mask of a stranger', 'Ceremonial wine (dried to crust)', 'Lock of hair in a locket', 'Iron grave bell', 'Rotted wooden shield', 'Funeral incense'],
    hooks: ['A name carved over and over inside a coffin lid', 'A will that disinherits someone still living', 'A map of the catacombs, part missing'],
  },
  wilds: {
    label: 'The Wilds', coin: 0.6, art: 0.6, magic: 1,
    gear: ['Hunting trap', 'Bedroll', 'Arrows (20)', 'A carved bone talisman', 'Waterskin', 'Herbs (bundle)', 'Snare wire', 'Fishing tackle', 'Antlers', 'Pelts (3)', 'Flint arrowheads (handful)', 'Climber’s kit', 'Smoked meat (pouch)', 'Hide tent', 'A whittled flute', 'Wild honey (jar)', 'Hunting knife', 'Mushrooms (basket, some edible)', 'Feathers for fletching', 'Firewood (bundle)', 'A beast’s claw on a cord', 'Tracker’s notes', 'Sling and stones', 'Berries (pouch)', 'Moss-covered helmet'],
    hooks: ['A trail map of the Wilds, with warnings', 'An Arcadian prayer token', 'A Vendrix’s Wall rune-stone fragment'],
  },
};

// WORLD_PATCH: mundane finds and story hooks from the Sollaran Archonate document
const WORLD = {
  bandit: { gear: ['A Night Scale split-coin token', 'Powdered Residuum (a blue-dusted vial)', 'Stolen perfume (magical, a dozen vials)'], hooks: ['A Night Scale contact, with a meeting place and a password', 'A map of the Wilds the bandits bought, and probably should not have'] },
  noble: { gear: ['Crystal-weave scarf', 'Perfume, magical (vial)', 'Coffee beans (finest, 1 lb)', 'Bertram’s Rye Ale (prizewinning bottle)'], hooks: ['A GEC tariff exemption with a forged signature'] },
  caravan: { gear: ['Coffee beans (sack)', 'Crystal-weave cloth (bolt)', 'Bertram’s Rye Ale (keg)', 'Harvest-blessed wheat (sack, still fresh)', 'Spices from abroad (pouch)', 'Silk (bale)'], hooks: ['A GEC port-tariff receipt for goods that were never declared'] },
  wizard: { gear: ['Chrono-calibrated sextant', 'Sacred crystal shard, dull'], hooks: ['A note on how to tell attuned crystal from glass'] },
  dwarven: { gear: ['Cut gem blanks (a handful)', 'Chrono-calibrated surveying instrument', 'Bertram’s Rye Ale (dwarven-brewed copy)'], hooks: ['A dwarven gem-cutter’s ledger of imbued stones'] },
  crypt: { gear: ['Icon of one of the old gods, hidden in a hollow book'], hooks: ['A scratched-out icon, and a prayer to a god no one is allowed to name'] },
  temple: { gear: ['Attuned crystal, small (set in a ring)'], hooks: ['A hidden shrine to the old gods beneath the floor'] },
  wilds: { gear: ['Fragment of a Time of Mists relic', 'Powdered Residuum (blue dust from a portal)', 'Hunter’s trophy: a monster’s head', 'Icon of the old gods, weathered'], hooks: ['A Hunter’s contract for a relic from the Time of Mists', 'A map to a ruined, cursed city, accuracy doubtful'] },
  lair: { gear: ['Fragment of a Time of Mists relic'], hooks: ['A Hunter’s notes, and an unfinished map of the Wilds'] },
};
for (const [k, w] of Object.entries(WORLD)) { SETTINGS[k].gear.push(...w.gear); SETTINGS[k].hooks.push(...w.hooks); }


// mundane bits that turn up anywhere; drawn about a third of the time instead of the setting's own list
const COMMON_GEAR = ['Torch', 'Rope, hempen (50 ft)', 'Waterskin', 'Rations (1 day)', 'Tinderbox', 'Bedroll', 'Blanket', 'Backpack', 'Belt pouch', 'Mess kit', 'Whetstone', 'Chalk (piece)', 'Candle', 'Soap', 'Hempen sack', 'Wooden bowl and spoon', 'Iron pot', 'Signal whistle', 'Small mirror, steel', 'Dice set', 'Playing cards', 'Flask of oil', 'Bottle of cheap wine', 'Pair of boots', 'Wool cloak', 'Clothes, common', 'Clothes, traveler’s', 'Dagger', 'Sling', 'Club', 'Quarterstaff', 'Crossbow bolts (10)', 'Fishhooks (pouch)', 'Needle and thread', 'A tin whistle', 'A smooth lucky stone', 'A crumpled love letter', 'A wooden holy symbol', 'Comb, bone', 'Spoon, pewter', 'Pipe and tobacco', 'Key to an unknown door', 'A child’s drawing', 'A bundle of sticks and twine', 'Lamp', 'Hammer', 'Pitons (5)', 'Shovel', 'Ink pen', 'Sheets of paper (3)'];
const pickGear = (r, set) => pick(r, chance(r, 0.35) ? COMMON_GEAR : set.gear);

// ─── coins (dice × multiplier) per tier ─────────────────────────────
const COINS = {
  individual: {
    1: { cp: [5, 6, 1], sp: [4, 6, 1], gp: [3, 6, 1] },
    2: { sp: [4, 6, 10], gp: [2, 6, 10] },
    3: { gp: [4, 6, 10], pp: [3, 6, 1] },
    4: { gp: [2, 6, 100], pp: [8, 6, 1] },
  },
  hoard: {
    1: { cp: [6, 6, 100], sp: [3, 6, 100], gp: [2, 6, 10] },
    2: { cp: [2, 6, 100], sp: [2, 6, 1000], gp: [6, 6, 100], pp: [3, 6, 10] },
    3: { gp: [4, 6, 1000], pp: [5, 6, 100] },
    4: { gp: [12, 6, 1000], pp: [8, 6, 1000] },
  },
};

// ─── gems & art ─────────────────────────────────────────────────────
const GEMS = {
  10: ['Azurite', 'Banded agate', 'Blue quartz', 'Hematite', 'Lapis lazuli', 'Malachite', 'Moss agate', 'Obsidian', 'Tiger eye', 'Turquoise'],
  50: ['Bloodstone', 'Carnelian', 'Chalcedony', 'Chrysoprase', 'Citrine', 'Jasper', 'Moonstone', 'Onyx', 'Star rose quartz', 'Zircon'],
  100: ['Amber', 'Amethyst', 'Chrysoberyl', 'Coral', 'Garnet', 'Jade', 'Jet', 'Pearl', 'Spinel', 'Tourmaline'],
  500: ['Alexandrite', 'Aquamarine', 'Black pearl', 'Blue spinel', 'Peridot', 'Topaz'],
  1000: ['Black opal', 'Blue sapphire', 'Emerald', 'Fire opal', 'Opal', 'Star ruby', 'Star sapphire', 'Yellow sapphire'],
  5000: ['Black sapphire', 'Diamond', 'Jacinth', 'Ruby'],
};
const ART = {
  25: ['A silver ewer etched with the Harthall stag', 'A carved bone statuette of a stag', 'A small gold bracelet', 'Cloth-of-gold vestments', 'A black velvet mask stitched with silver', 'A copper chalice with silver filigree', 'A pair of engraved bone dice', 'A small mirror in a painted wooden frame', 'An embroidered silk handkerchief', 'A gold locket with a painted portrait inside'],
  250: ['A gold ring set with bloodstones', 'A carved ivory statuette', 'A large gold bracelet', 'A silver necklace with a gemstone pendant', 'A bronze crown', 'A silk robe with gold embroidery', 'A fine tapestry of the Lynport vineyards', 'A brass mug with jade inlay', 'A box of turquoise animal figurines', 'A gold bird cage with electrum filigree'],
  750: ['A silver chalice set with moonstones', 'A silver-plated longsword with jet in the hilt', 'A carved harp of exotic wood with ivory inlay', 'A small gold idol', 'A gold dragon comb set with red garnets', 'A bottle stopper cork embossed with gold leaf', 'A ceremonial electrum dagger with a black pearl in the pommel', 'A silver and gold brooch', 'An obsidian statuette with gold fittings', 'A painted gold war mask'],
  2500: ['A fine gold chain set with a fire opal', 'An old masterpiece painting', 'An embroidered silk and velvet mantle set with moonstones', 'A platinum bracelet set with a sapphire', 'An embroidered glove set with jewel chips', 'A jeweled anklet', 'A gold music box', 'A gold circlet set with four aquamarines', 'An eye patch with a mock eye of blue sapphire and moonstone', 'A necklace string of small pink pearls'],
  7500: ['A jeweled gold crown', 'A jeweled platinum ring', 'A small gold statuette set with rubies', 'A gold cup set with emeralds', 'A gold jewelry box with platinum filigree', 'A painted gold child’s sarcophagus', 'A jade game board with solid gold playing pieces', 'A bejeweled ivory drinking horn with gold filigree'],
};
ART[250].push('An icon of one of the old gods, in gilded wood', 'A tiny silver idol of a forbidden god');
ART[750].push('A bronze icon of an old god, recovered from the Wilds');
const GEM_TIERS = { individual: { 1: [10], 2: [50], 3: [100, 500], 4: [500, 1000] }, hoard: { 1: [10, 50], 2: [50, 100], 3: [100, 500, 1000], 4: [1000, 5000] } };
const ART_TIERS = { 1: [25], 2: [25, 250], 3: [250, 750], 4: [750, 2500, 7500] };

// ─── magic items ────────────────────────────────────────────────────
// [name, rarity, type, unidentified label, unidentified description, what it does (identified), value in gp]
export const RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary'];
const M = [
  ['Potion of Healing', 'common', 'potion', 'A vial of red liquid', 'It glimmers when shaken and smells faintly of cinnamon.', 'Drink to regain 2d4 + 2 hit points.', 50],
  ['Potion of Climbing', 'common', 'potion', 'A vial of layered liquid', 'Brown, silver and grey bands that never quite mix.', 'For 1 hour you gain a climbing speed and advantage on Athletics checks to climb.', 75],
  ['Spell scroll (cantrip)', 'common', 'scroll', 'A short rolled scroll', 'Written in a looping script you don’t recognise.', 'Contains one cantrip, chosen by the DM.', 25],
  ['Spell scroll (1st level)', 'common', 'scroll', 'A rolled scroll tied with red thread', 'The ink shimmers faintly when you unroll it.', 'Contains one 1st-level spell, chosen by the DM.', 60],
  ['Potion of Greater Healing', 'uncommon', 'potion', 'A flask of deep red liquid', 'Heavier than it looks, and warm to the touch.', 'Drink to regain 4d4 + 4 hit points.', 150],
  ['Potion of Fire Breath', 'uncommon', 'potion', 'A stoppered vial of orange liquid', 'Something like a tiny ember drifts inside.', 'For 1 hour, use a bonus action to exhale fire (4d6, DC 13 Dex save) up to three times.', 200],
  ['Potion of Water Breathing', 'uncommon', 'potion', 'A vial of cloudy green liquid', 'A small bubble rises inside it every few seconds.', 'You can breathe underwater for 1 hour.', 200],
  ['Spell scroll (2nd level)', 'uncommon', 'scroll', 'A scroll sealed with grey wax', 'The seal bears a symbol you don’t know.', 'Contains one 2nd-level spell, chosen by the DM.', 150],
  ['Spell scroll (3rd level)', 'uncommon', 'scroll', 'A scroll in a bone tube', 'The parchment is old but the ink looks fresh.', 'Contains one 3rd-level spell, chosen by the DM.', 300],
  ['Bag of Holding', 'uncommon', 'wondrous', 'A plain cloth sack', 'It weighs the same no matter what you put in it.', 'Holds up to 500 lb (64 cubic feet) but always weighs 15 lb.', 500],
  ['Boots of Elvenkind', 'uncommon', 'wondrous', 'Soft leather boots', 'You can’t hear your own footsteps in them.', 'Your steps make no sound; advantage on Stealth checks that rely on moving silently.', 500],
  ['Cloak of Elvenkind', 'uncommon', 'wondrous', 'A grey hooded cloak', 'It seems to shift with the shadows and makes no sound when it moves.', 'Hood up: Perception checks to see you have disadvantage, and you have advantage on Stealth checks to hide.', 500],
  ['Cloak of Protection', 'uncommon', 'wondrous', 'A deep blue cloak', 'Arrows seem to bend slightly around it on a coat hook.', '+1 bonus to AC and saving throws (requires attunement).', 500],
  ['Gloves of Swimming and Climbing', 'uncommon', 'wondrous', 'A pair of webbed leather gloves', 'They grip like a gecko’s feet on smooth stone.', 'Climbing and swimming don’t cost extra movement; +5 to Athletics checks to climb or swim.', 500],
  ['Goggles of Night', 'uncommon', 'wondrous', 'Smoked-glass goggles', 'Through them, a dark room looks dim rather than black.', 'Darkvision out to 60 feet (or +60 feet if you already have it).', 400],
  ['Hat of Disguise', 'uncommon', 'wondrous', 'A plain felt hat', 'In a mirror, the wearer’s face looks very slightly different each time.', 'Cast disguise self at will while wearing it.', 500],
  ['Immovable Rod', 'uncommon', 'wondrous', 'A flat iron rod with a button', 'The button won’t press unless you mean it to.', 'Press the button and the rod stays exactly where it is, holding up to 8,000 lb.', 1000],
  ['Pearl of Power', 'uncommon', 'wondrous', 'A large, perfectly round pearl', 'It is cool even after hours in a warm hand.', 'Once a day, recover one expended spell slot of up to 3rd level (requires attunement by a spellcaster).', 600],
  ['Ring of Swimming', 'uncommon', 'ring', 'A ring of blue-green coral', 'It’s always slightly damp.', 'You have a swimming speed of 40 feet.', 500],
  ['Ring of Jumping', 'uncommon', 'ring', 'A thin ring carved with a hare', 'Your feet feel lighter while you hold it.', 'Cast jump on yourself at will (requires attunement).', 500],
  ['Ring of Warmth', 'uncommon', 'ring', 'A copper ring with a red stone', 'It’s always warm, even in snow.', 'Resistance to cold damage; comfortable down to −50°F (requires attunement).', 600],
  ['Sending Stones', 'uncommon', 'wondrous', 'Two matching smooth stones', 'Each is carved with the same tiny symbol.', 'Once a day, hold one to cast sending to whoever holds the other.', 600],
  ['Wand of Magic Missiles', 'uncommon', 'wand', 'A slender wand of polished yew', 'Its tip glows faintly blue in the dark.', '7 charges; spend 1 or more to cast magic missile. Regains 1d6 + 1 charges daily.', 500],
  ['Driftglobe', 'uncommon', 'wondrous', 'A small glass sphere', 'It drifts very slightly when you let go of it.', 'Command it to shed light or daylight and float beside you.', 300],
  ['Decanter of Endless Water', 'uncommon', 'wondrous', 'A stoppered flask', 'It sloshes as if full, but nothing comes out when you tip it.', 'Speak a command word to pour fresh or salt water: a stream, a fountain or a geyser.', 600],
  ['Alchemy Jug', 'uncommon', 'wondrous', 'A heavy ceramic jug', 'Whatever you smell inside it is different each time.', 'Once a day, pour a chosen liquid: acid, beer, honey, mayonnaise, oil, vinegar, water or wine.', 600],
  ['Helm of Comprehending Languages', 'uncommon', 'wondrous', 'A dented bronze helm', 'Wearing it, overheard speech sounds strangely clear.', 'Cast comprehend languages at will.', 500],
  ['Lantern of Revealing', 'uncommon', 'wondrous', 'A hooded lantern of green glass', 'Its light makes shadows look oddly crowded.', 'While lit, invisible creatures and objects in its bright light become visible.', 600],
  ['Rope of Climbing', 'uncommon', 'wondrous', 'A coil of silky rope', 'It sometimes twitches like a sleeping snake.', 'Command it to move, knot itself and fasten to things; 60 feet long.', 500],
  ['Amulet of Proof against Detection and Location', 'uncommon', 'wondrous', 'A dull grey amulet', 'Your eyes slide off it when you look for it on a table.', 'You are hidden from divination magic (requires attunement).', 1500],
  ['Bracers of Archery', 'uncommon', 'wondrous', 'Leather bracers stamped with arrows', 'Your hands feel steadier wearing them.', 'Proficiency with longbows and shortbows; +2 damage with them (requires attunement).', 1500],
  ['Gauntlets of Ogre Power', 'uncommon', 'wondrous', 'Heavy iron gauntlets', 'They make your grip feel enormous.', 'Your Strength score is 19 (requires attunement).', 8000],
  ['Headband of Intellect', 'uncommon', 'wondrous', 'A thin silver circlet', 'Ideas seem to arrive faster while you wear it.', 'Your Intelligence score is 19 (requires attunement).', 8000],
  ['Javelin of Lightning', 'uncommon', 'weapon', 'A javelin with a copper tip', 'The hairs on your arm rise when you hold it.', 'Once a day, throw it to become a 5-ft-wide, 120-ft line of lightning (4d6, DC 13 Dex save).', 1500],
  ['Periapt of Wound Closure', 'uncommon', 'wondrous', 'A red stone on a leather thong', 'Small cuts heal noticeably fast while you wear it.', 'You stabilise at the start of your turn when dying, and hit dice heal double (requires attunement).', 5000],
  ['Elemental Gem', 'uncommon', 'wondrous', 'A gem that seems to hold a storm', 'Something moves inside it if you watch long enough.', 'Break it to summon an elemental of its type for 1 hour.', 900],
  ['Robe of Useful Items', 'uncommon', 'wondrous', 'A robe covered in cloth patches', 'The patches look like little sewn objects.', 'Pull off a patch to make the object it depicts real.', 400],
  ['Pipes of Haunting', 'uncommon', 'wondrous', 'Bone pipes with three holes', 'Blowing gently makes a sound like a far-off scream.', 'Play them to frighten creatures within 30 feet (DC 15 Wis save).', 400],
  ['Potion of Superior Healing', 'rare', 'potion', 'A flask of crimson liquid that glows', 'It pulses faintly, like a heartbeat.', 'Drink to regain 8d4 + 8 hit points.', 500],
  ['Spell scroll (4th level)', 'rare', 'scroll', 'A heavy scroll with a silver clasp', 'It hums when held near a spellcaster.', 'Contains one 4th-level spell, chosen by the DM.', 1000],
  ['Spell scroll (5th level)', 'rare', 'scroll', 'A scroll that won’t stay rolled', 'It keeps trying to open itself.', 'Contains one 5th-level spell, chosen by the DM.', 1500],
  ['Belt of Dwarvenkind', 'rare', 'wondrous', 'A wide belt with a braided buckle', 'It smells faintly of stone and ale.', '+2 Constitution (max 20), darkvision, Dwarvish, and advantage against poison (requires attunement).', 6000],
  ['Boots of Speed', 'rare', 'wondrous', 'Boots with tiny wings stitched at the heels', 'They tap impatiently on their own.', 'Click the heels to double your speed for up to 10 minutes a day (requires attunement).', 4000],
  ['Bracers of Defense', 'rare', 'wondrous', 'Plain steel bracers', 'Blows on them glance off with a bell-like ring.', '+2 AC while you wear no armor or shield (requires attunement).', 6000],
  ['Cape of the Mountebank', 'rare', 'wondrous', 'A gaudy red cape', 'It smells faintly of brimstone.', 'Once a day, cast dimension door, vanishing in a puff of smoke.', 6000],
  ['Cloak of Displacement', 'rare', 'wondrous', 'A cloak whose edges blur', 'Looking straight at the wearer is oddly hard.', 'Attacks against you have disadvantage until you take damage (requires attunement).', 6000],
  ['Flame Tongue', 'rare', 'weapon', 'A sword with a scorched scabbard', 'The blade is always warm to the touch.', 'Speak its command word and the blade bursts into flame: +2d6 fire damage (requires attunement).', 5000],
  ['Horseshoes of Speed', 'rare', 'wondrous', 'Four silver horseshoes', 'They never seem to scuff.', 'A horse wearing them gains 30 feet of speed.', 5000],
  ['Necklace of Fireballs', 'rare', 'wondrous', 'A necklace of small amber beads', 'Each bead is warm and seems to flicker.', 'Throw a bead to cast fireball (DC 15); throw more for a bigger blast.', 3000],
  ['Ring of Protection', 'rare', 'ring', 'A heavy silver ring', 'A faint shimmer surrounds the hand that wears it.', '+1 bonus to AC and saving throws (requires attunement).', 3500],
  ['Ring of Free Action', 'rare', 'ring', 'A ring of twisted iron', 'It is impossible to tie a knot that stays on it.', 'Difficult terrain costs you nothing, and magic can’t paralyse or restrain you (requires attunement).', 5000],
  ['Ring of Evasion', 'rare', 'ring', 'A ring with a small grey stone', 'It sometimes rolls off a table on its own.', '3 charges: succeed on a failed Dex save instead (requires attunement).', 5000],
  ['Wand of Fireballs', 'rare', 'wand', 'A blackened wand of ash wood', 'It smells of smoke and is warm in the hand.', '7 charges; spend 1 or more to cast fireball (DC 15) (requires attunement by a spellcaster).', 6000],
  ['Wand of Lightning Bolts', 'rare', 'wand', 'A wand of pale wood with a copper tip', 'It crackles when you brush it with wool.', '7 charges; spend 1 or more to cast lightning bolt (DC 15) (requires attunement by a spellcaster).', 6000],
  ['Potion of Supreme Healing', 'very rare', 'potion', 'A vial of liquid like molten rubies', 'It lights up the room when held to a candle.', 'Drink to regain 10d4 + 20 hit points.', 1350],
  ['Spell scroll (6th level)', 'very rare', 'scroll', 'A scroll bound in dragon leather', 'The letters rearrange themselves when you look away.', 'Contains one 6th-level spell, chosen by the DM.', 3500],
  ['Carpet of Flying', 'very rare', 'wondrous', 'A rolled carpet with a dizzying pattern', 'It ripples now and then with no breeze.', 'Speak its command word and it flies, carrying passengers.', 20000],
  ['Cloak of Arachnida', 'very rare', 'wondrous', 'A black silk cloak', 'Spiders won’t go near it.', 'Climbing speed, resistance to poison, walk on webs, and cast web once a day (requires attunement).', 20000],
  ['Dancing Sword', 'very rare', 'weapon', 'A sword that hums when drawn', 'It sometimes twitches in its sheath.', 'Toss it into the air and it fights by itself for a few rounds (requires attunement).', 20000],
  ['Manual of Bodily Health', 'very rare', 'wondrous', 'A heavy book of exercises', 'The pages are full of diagrams of the body.', 'Study it for 48 hours over 6 days: +2 Constitution and maximum, permanently.', 50000],
  ['Ring of Regeneration', 'very rare', 'ring', 'A ring of green jade', 'Small cuts close while you watch.', 'Regain 1d6 hit points every 10 minutes; lost limbs regrow (requires attunement).', 35000],
  ['Staff of Fire', 'very rare', 'staff', 'A staff of charred black wood', 'Its tip glows like a coal when gripped.', 'Resistance to fire and charges to cast burning hands, fireball and wall of fire (requires attunement).', 16000],
  ['Robe of the Archmagi', 'legendary', 'wondrous', 'A robe stitched with silver runes', 'Spells cast near it seem a little brighter.', 'AC 15 + Dex, advantage on saves against spells, and +2 to your spell DC and attack bonus (requires attunement).', 120000],
  ['Ring of Three Wishes', 'legendary', 'ring', 'A ring with three small stars engraved', 'Sometimes one of the stars catches the light when there is none.', '3 charges; spend one to cast wish.', 150000],
  ['Staff of the Magi', 'legendary', 'staff', 'A tall staff carved with a hundred symbols', 'The air around it smells like a thunderstorm.', 'A legendary staff of many spells, spell absorption and a devastating retributive strike (requires attunement).', 150000],
  ['Vorpal Sword', 'legendary', 'weapon', 'A long, thin blade', 'It cuts the air with no sound at all.', '+3 weapon that ignores slashing resistance; a natural 20 can sever a head (requires attunement).', 120000],
  ['Holy Avenger', 'legendary', 'weapon', 'A sword with a sunburst on the crossguard', 'It feels warm in the hand of anyone who prays.', '+3 weapon, +2d10 radiant against fiends and undead, and an aura of protection (requires attunement by a paladin).', 165000],
  ['Attuned Crystal Pendant', 'rare', 'wondrous', 'A crystal set in a plain pendant', 'It hums faintly, and magic seems to shy away from it.', 'Worn: advantage on saving throws against spells and effects from fey, fiends and celestials, and they cannot charm or frighten you (requires attunement). A sacred crystal of the Archonate.', 3000],
  ['Crystal-Weave Robe', 'uncommon', 'wondrous', 'A pale, shimmering robe', 'It is oddly light, and it glows faintly under starlight.', 'Cool in summer and warm in winter: you suffer no ill effects from ordinary natural heat or cold. Extremely durable.', 750],
  ['Dwarven Cut Ruby', 'uncommon', 'wondrous', 'A flawlessly cut red gem', 'It is warm to the touch, and never cools.', 'Worn as jewelry: resistance to fire damage (requires attunement). Dwarven cut gems are sold for export only.', 1500],
  ['Chrono-Calibrated Compass', 'uncommon', 'wondrous', 'A brass compass with fine gears showing through the case', 'Its needle never so much as trembles.', 'Works perfectly near magical interference and always points true north. Advantage on checks to avoid getting lost.', 400],
  ['Perfume of Many Scents', 'common', 'wondrous', 'A stoppered perfume vial', 'The scent seems different each time you smell it.', 'Dab it on and think of a scent; the perfume becomes it, lasting about a day. Twelve applications.', 75],
  ['Relic of the Time of Mists', 'rare', 'wondrous', 'An ancient object of unknown make', 'Mist curls from it when no one is looking.', 'A relic recovered from the Wilds. DM: decide what it does (edit this item in the Magic items library).', 1500],
];
// +N weapons and armor, built from a base item
const WEAPONS = ['Longsword', 'Shortsword', 'Battleaxe', 'Warhammer', 'Mace', 'Rapier', 'Dagger', 'Greatsword', 'Spear', 'Longbow', 'Shortbow', 'Crossbow, light'];
const ARMORS = ['Chain mail', 'Breastplate', 'Leather armor', 'Studded leather', 'Scale mail', 'Half plate', 'Plate', 'Shield'];
// Weapons and shields: +1 uncommon, +2 rare, +3 very rare. Body armor is one step rarer (+1 is rare).
const PLUS_VALUE = { 1: 1000, 2: 4000, 3: 16000 };
function plusItem(r, rarity) {
  const step = ['uncommon', 'rare', 'very rare'].indexOf(rarity) + 1; // 1..3
  let base = pick(r, chance(r, 0.35) ? ARMORS : WEAPONS);
  let body = ARMORS.includes(base) && base !== 'Shield';
  if (body && step < 2) { base = pick(r, WEAPONS); body = false; } // no uncommon body armor
  const b = body ? step - 1 : step;
  return {
    name: `${base} +${b}`, rarity, type: ARMORS.includes(base) ? 'armor' : 'weapon',
    label: `A finely made ${base.toLowerCase().replace(/^(.+), (.+)$/, '$2 $1')}`,
    unidentified: ARMORS.includes(base) ? 'It is lighter than it should be and shows no wear at all.' : 'Its edge never seems to dull, and it feels balanced in any hand.',
    detail: ARMORS.includes(base) ? `+${b} bonus to AC.` : `+${b} bonus to attack and damage rolls.`,
    value: PLUS_VALUE[b] * (body ? 1.5 : 1),
  };
}
const magicFrom = (row) => ({ name: row[0], rarity: row[1], type: row[2], label: row[3], unidentified: row[4], detail: row[5], value: row[6] });
export const SRD_MAGIC = M.map(magicFrom);

// pick a magic item of a rarity from the SRD list, homebrew, or a +N item
function magicItem(r, rarity, opts) {
  const allHomebrew = (opts.homebrew || []).filter((x) => x.inLoot !== false);
  const only = opts.homebrewMode === 'only' && allHomebrew.length;
  let homebrew = allHomebrew.filter((x) => x.rarity === rarity);
  if (only && !homebrew.length) homebrew = allHomebrew; // "only my homebrew": use one of another rarity rather than SRD
  const srd = only ? [] : SRD_MAGIC.filter((x) => x.rarity === rarity);
  const hbWeight = opts.homebrewMode === 'prefer' ? 0.6 : only ? 1 : homebrew.length / Math.max(1, homebrew.length + srd.length);
  if (homebrew.length && (chance(r, hbWeight) || !srd.length)) {
    const h = pick(r, homebrew);
    return { name: h.name, rarity: h.rarity, type: h.type || 'wondrous', label: h.label || 'A curious item', unidentified: h.unidentified || '', detail: h.detail || '', value: Number(h.value) || 0, homebrewId: h.id };
  }
  if (rarity !== 'common' && rarity !== 'legendary' && chance(r, 0.25)) return plusItem(r, rarity);
  if (!srd.length) return magicItem(r, RARITIES[Math.max(0, RARITIES.indexOf(rarity) - 1)], opts);
  return { ...pick(r, srd) };
}

// magic odds by tier: [rarities to draw from, chance for an individual, number range for a hoard]
const MAGIC = {
  1: { rarities: ['common', 'common', 'uncommon'], individual: 0.06, hoard: [0, 2] },
  2: { rarities: ['common', 'uncommon', 'uncommon', 'rare'], individual: 0.1, hoard: [1, 3] },
  3: { rarities: ['uncommon', 'rare', 'rare', 'very rare'], individual: 0.14, hoard: [1, 4] },
  4: { rarities: ['rare', 'very rare', 'very rare', 'legendary'], individual: 0.2, hoard: [2, 5] },
};

// ─── generating ─────────────────────────────────────────────────────
// opts: { level, mode: 'individual'|'hoard', setting, homebrew: [...], homebrewMode: 'mix'|'prefer'|'only', seed }
// Returns { coins: {cp, sp, gp, pp}, lines: [{ id, kind: 'gem'|'art'|'gear'|'hook'|'magic', name, value, qty, magic? }] }
export function generateLoot(opts) {
  const seed = opts.seed || Math.random().toString(36).slice(2, 10);
  const r = rng(`loot:${seed}`);
  const tier = tierOf(opts.level), set = SETTINGS[opts.setting] || SETTINGS.lair, mode = opts.mode === 'hoard' ? 'hoard' : 'individual';
  const coins = { cp: 0, sp: 0, gp: 0, pp: 0 };
  for (const [coin, [n, s, mult]] of Object.entries(COINS[mode][tier])) coins[coin] = Math.round(roll(r, n, s) * mult * set.coin);
  const lines = [];
  let n = 0;
  const add = (line) => lines.push({ id: `${seed}-${n++}`, qty: 1, ...line });
  // gems
  const gemCount = mode === 'hoard' ? (chance(r, 0.6) ? roll(r, 1, 6) : 0) : (chance(r, 0.4) ? 1 : 0);
  if (gemCount) { const value = pick(r, GEM_TIERS[mode][tier]); add({ kind: 'gem', name: pick(r, GEMS[value]), value, qty: gemCount }); }
  // art
  if (mode === 'hoard' && chance(r, Math.min(0.9, 0.45 * set.art))) {
    for (let i = 0, k = roll(r, 1, 3); i < k; i++) { const value = pick(r, ART_TIERS[tier]); add({ kind: 'art', name: pick(r, ART[value]), value }); }
  } else if (mode === 'individual' && chance(r, 0.08 * set.art)) {
    add({ kind: 'art', name: pick(r, ART[ART_TIERS[tier][0]]), value: ART_TIERS[tier][0] });
  }
  // gear from the setting
  for (let i = 0, k = mode === 'hoard' ? roll(r, 1, 3) : (chance(r, 0.5) ? 1 : 0); i < k; i++) add({ kind: 'gear', name: pickGear(r, set), value: 0 });
  // a story hook now and then
  if (chance(r, mode === 'hoard' ? 0.45 : 0.15)) add({ kind: 'hook', name: pick(r, set.hooks), value: 0 });
  // magic
  const m = MAGIC[tier];
  const magicCount = mode === 'hoard'
    ? Math.round((m.hoard[0] + Math.floor(r() * (m.hoard[1] - m.hoard[0] + 1))) * Math.min(1.5, set.magic))
    : (chance(r, m.individual * set.magic) ? 1 : 0);
  for (let i = 0; i < magicCount; i++) {
    const item = magicItem(r, pick(r, m.rarities), opts);
    add({ kind: 'magic', name: item.name, value: item.value, magic: item });
  }
  // identical gems, art or gear become one line with a quantity
  const merged = [];
  for (const l of lines) {
    const same = l.kind !== 'magic' && l.kind !== 'hook' && merged.find((m) => m.kind === l.kind && m.name === l.name && m.value === l.value);
    if (same) same.qty += l.qty; else merged.push(l);
  }
  return { seed, coins, lines: merged };
}

// Reroll one line, keeping its kind (a fresh gem, a different magic item of similar rarity, ...)
export function rerollLine(line, opts) {
  const r = rng(`reroll:${line.id}:${Math.random()}`);
  const tier = tierOf(opts.level), set = SETTINGS[opts.setting] || SETTINGS.lair, mode = opts.mode === 'hoard' ? 'hoard' : 'individual';
  if (line.kind === 'gem') { const value = pick(r, GEM_TIERS[mode][tier]); return { ...line, name: pick(r, GEMS[value]), value }; }
  if (line.kind === 'art') { const value = pick(r, ART_TIERS[tier]); return { ...line, name: pick(r, ART[value]), value }; }
  if (line.kind === 'gear') return { ...line, name: pickGear(r, set) };
  if (line.kind === 'hook') return { ...line, name: pick(r, set.hooks) };
  if (line.kind === 'magic') { const item = magicItem(r, line.magic?.rarity || pick(r, MAGIC[tier].rarities), opts); return { ...line, name: item.name, value: item.value, magic: item }; }
  return line;
}

// Rough gold value of a loot pile (coins + everything with a known value)
export const coinValue = (c) => (c.cp || 0) / 100 + (c.sp || 0) / 10 + (c.gp || 0) + (c.pp || 0) * 10;
