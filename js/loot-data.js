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
    gear: ['Loaded dice', 'Crowbar', 'Manacles', 'Rations (3 days)', 'Shortbow', 'Arrows (20)', 'A stolen merchant’s ledger', 'Rope, hempen (50 ft)', 'Wanted poster with the leader’s face'],
    hooks: ['A crude map marking another hideout', 'A ransom note that was never delivered', 'A merchant’s seal, recently stolen', 'A list of caravans and their departure dates'],
  },
  lair: {
    label: 'Monster lair', coin: 1.2, art: 1, magic: 1,
    gear: ['Rusted chain shirt', 'A dented helmet', 'A torn backpack with a waterskin', 'Gnawed bones of an adventurer', 'A broken longsword hilt', 'Bedroll, mildewed'],
    hooks: ['A previous adventurer’s journal', 'A tooth-marked locket with a portrait inside', 'A half-burned letter home'],
  },
  noble: {
    label: 'Noble’s study', coin: 1.5, art: 1.6, magic: 0.9,
    gear: ['Clothes, fine', 'Signet ring', 'Ink and quill', 'A leather-bound book of poetry', 'Perfume (vial)', 'Wine, fine (bottle)', 'Sealing wax'],
    hooks: ['Sealed letters to a member of the Council of Ten', 'A ledger recording bribes', 'A deed to a property in another dukedom', 'A key to a box at the Moneychanger'],
  },
  temple: {
    label: 'Temple vault', coin: 1.1, art: 1.5, magic: 1.1,
    gear: ['Holy water (flask)', 'Candles, blessed (10)', 'Holy symbol, reliquary', 'Prayer book', 'Incense (block)', 'Vestments'],
    hooks: ['A record of a relic’s hiding place', 'A confession written and never given', 'The name of a saint scratched out of a list'],
  },
  ship: {
    label: 'Sunken ship', coin: 1.2, art: 0.8, magic: 1,
    gear: ['Navigator’s tools', 'Spyglass (cracked)', 'Waterlogged chest', 'Rope, hempen (50 ft)', 'Barnacled cutlass', 'Bottle of rum, still sealed'],
    hooks: ['The captain’s log', 'A sea chart with a route to somewhere unmarked', 'A sealed oilskin packet addressed to Saubantch'],
  },
  dwarven: {
    label: 'Dwarven ruin', coin: 1.1, art: 1.3, magic: 1,
    gear: ['Miner’s pick', 'Smith’s tools', 'Lantern, hooded', 'An iron-bound chest', 'Ale keg (empty)', 'Dwarven war horn'],
    hooks: ['A rune-key to a sealed door', 'A tablet in old Dumrak-Karazdun script', 'A clan genealogy with one name chiselled out'],
  },
  wizard: {
    label: 'Wizard’s tower', coin: 0.9, art: 1, magic: 1.6,
    gear: ['Component pouch', 'Spellbook (water-damaged)', 'Ink (1 ounce bottle)', 'Arcane focus, crystal', 'Vials of strange reagents', 'Hourglass'],
    hooks: ['Notes on an unfinished ritual', 'A letter from a rival mage', 'A summoning circle sketch with one rune wrong'],
  },
  caravan: {
    label: 'Merchant caravan', coin: 1.3, art: 0.8, magic: 0.7,
    gear: ['Bolt of silk', 'Spices (5 lb)', 'Salt (50 lb sack)', 'Barrel of Lynport wine', 'Trade goods crate', 'Saddlebags'],
    hooks: ['A shipping manifest with one crate unaccounted for', 'A Teamsters’ Guild writ', 'A letter of credit on a Saubantch bank'],
  },
  crypt: {
    label: 'Crypt or tomb', coin: 1, art: 1.6, magic: 1.1,
    gear: ['Burial shroud', 'Funeral mask', 'Gold teeth (a handful)', 'Ceremonial dagger', 'Candles (10)', 'Urn of ashes'],
    hooks: ['A name carved over and over inside a coffin lid', 'A will that disinherits someone still living', 'A map of the catacombs, part missing'],
  },
  wilds: {
    label: 'The Wilds', coin: 0.6, art: 0.6, magic: 1,
    gear: ['Hunting trap', 'Bedroll', 'Arrows (20)', 'A carved bone talisman', 'Waterskin', 'Herbs (bundle)'],
    hooks: ['A trail map of the Wilds, with warnings', 'An Arcadian prayer token', 'A Vendrix’s Wall rune-stone fragment'],
  },
};

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
  const gemCount = mode === 'hoard' ? (chance(r, 0.6) ? roll(r, 1, 6) : 0) : (chance(r, 0.25) ? 1 : 0);
  if (gemCount) { const value = pick(r, GEM_TIERS[mode][tier]); add({ kind: 'gem', name: pick(r, GEMS[value]), value, qty: gemCount }); }
  // art
  if (mode === 'hoard' && chance(r, Math.min(0.9, 0.45 * set.art))) {
    for (let i = 0, k = roll(r, 1, 3); i < k; i++) { const value = pick(r, ART_TIERS[tier]); add({ kind: 'art', name: pick(r, ART[value]), value }); }
  } else if (mode === 'individual' && chance(r, 0.08 * set.art)) {
    add({ kind: 'art', name: pick(r, ART[ART_TIERS[tier][0]]), value: ART_TIERS[tier][0] });
  }
  // gear from the setting
  for (let i = 0, k = mode === 'hoard' ? roll(r, 1, 3) : (chance(r, 0.5) ? 1 : 0); i < k; i++) add({ kind: 'gear', name: pick(r, set.gear), value: 0 });
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
  if (line.kind === 'gear') return { ...line, name: pick(r, set.gear) };
  if (line.kind === 'hook') return { ...line, name: pick(r, set.hooks) };
  if (line.kind === 'magic') { const item = magicItem(r, line.magic?.rarity || pick(r, MAGIC[tier].rarities), opts); return { ...line, name: item.name, value: item.value, magic: item }; }
  return line;
}

// Rough gold value of a loot pile (coins + everything with a known value)
export const coinValue = (c) => (c.cp || 0) / 100 + (c.sp || 0) / 10 + (c.gp || 0) + (c.pp || 0) * 10;
