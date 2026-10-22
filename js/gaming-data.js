// Gaming houses and pleasure houses. The rules and odds live here, separate from the screens, so they can be
// tested on their own. Money is in copper pieces (whole numbers), as in the G.E.C. code.

// A fair random whole number from 0 to n-1 (uses the browser's secure generator).
export function secureRand(n) {
  const a = new Uint32Array(1), limit = Math.floor(4294967296 / n) * n;
  let x;
  do { crypto.getRandomValues(a); x = a[0]; } while (x >= limit);
  return x % n;
}

// ─── gaming houses ──────────────────────────────────────────────────
// How much the house keeps, on average, of every coin staked. It varies from house to house.
export const EDGES = {
  slight: { label: 'Slight (3%)', pct: 0.03, flavor: 'A busy, respectable house. The dice are honest and the dealer smiles, and the house is content with a small, steady cut.' },
  moderate: { label: 'Moderate (8%)', pct: 0.08, flavor: 'Smoke, noise and a long bar. The odds lean towards the house, but a lucky night is still possible.' },
  steep: { label: 'Steep (15%)', pct: 0.15, flavor: 'A dim back room where the house takes a heavy share. Regulars know to play small.' },
  rigged: { label: 'Rigged (25%)', pct: 0.25, flavor: 'A crooked den. The tables are tilted, the dice are suspect, and few leave richer than they came.' },
};
export const edgeById = (id) => EDGES[id] || EDGES.moderate;

// By settlement size (in copper): the biggest single bet, and the most one player can win, net, in a day.
export const GAMING_LIMITS = {
  1: { bet: 100, win: 1000 }, 2: { bet: 250, win: 2500 }, 3: { bet: 1000, win: 10000 }, 4: { bet: 4000, win: 40000 }, 5: { bet: 15000, win: 150000 },
};
export const MIN_BET = 10; // 1 silver

const RANKS = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];

// Each game: its bets, each with the true chance of winning (p). A tie in Cut the Deck returns the stake.
export const GAMES = [
  { id: 'dice', label: 'Dragon Dice', blurb: 'Two dice are rolled. Bet on a high total (8 or more), a low one (6 or less), or exactly seven.',
    bets: [{ id: 'high', label: 'High (8 to 12)', p: 15 / 36 }, { id: 'low', label: 'Low (2 to 6)', p: 15 / 36 }, { id: 'seven', label: 'Exactly seven', p: 6 / 36 }] },
  { id: 'wheel', label: 'The Wheel', blurb: 'A wheel of twenty places: eighteen numbered (odd red, even black) and two green dragon places that belong to the house.',
    bets: [{ id: 'red', label: 'Red', p: 9 / 20 }, { id: 'black', label: 'Black', p: 9 / 20 },
      ...Array.from({ length: 18 }, (_, i) => ({ id: `n${i + 1}`, label: `The number ${i + 1}`, p: 1 / 20 }))] },
  { id: 'cut', label: 'Cut the Deck', blurb: 'You and the dealer each cut a card. The higher rank wins; a tie returns your stake.',
    bets: [{ id: 'cut', label: 'Beat the dealer', p: 78 / 169 }], tie: 13 / 169 },
  { id: 'cups', label: 'Three Cups', blurb: 'A pearl is hidden under one of three cups, and the cups are shuffled. Guess where it is.',
    bets: [{ id: 'c1', label: 'The left cup', p: 1 / 3 }, { id: 'c2', label: 'The middle cup', p: 1 / 3 }, { id: 'c3', label: 'The right cup', p: 1 / 3 }] },
];
export const gameById = (id) => GAMES.find((g) => g.id === id) || GAMES[0];
export const betOf = (game, betId) => game.bets.find((b) => b.id === betId) || game.bets[0];

// What a winning bet returns, as a multiple of the stake (the stake itself included), so that the house keeps
// exactly its edge on average:  p * m + tie = 1 - edge.
export const multiplier = (game, bet, edgePct) => Math.max(1.01, (1 - edgePct - (game.tie || 0)) / bet.p);

export function play(gameId, betId, rand = secureRand) {
  const game = gameById(gameId), bet = betOf(game, betId);
  if (game.id === 'dice') {
    const a = rand(6) + 1, b = rand(6) + 1, t = a + b;
    const win = bet.id === 'high' ? t >= 8 : bet.id === 'low' ? t <= 6 : t === 7;
    return { win, push: false, text: `You roll ${a} and ${b}, a total of ${t}.` };
  }
  if (game.id === 'wheel') {
    const n = rand(20) + 1;
    const colour = n > 18 ? 'green' : n % 2 ? 'red' : 'black';
    const win = bet.id === 'red' ? colour === 'red' : bet.id === 'black' ? colour === 'black' : bet.id === `n${n}`;
    return { win, push: false, text: `The wheel stops on ${n > 18 ? 'a green dragon place' : `${n}, ${colour}`}.` };
  }
  if (game.id === 'cut') {
    const mine = rand(13), theirs = rand(13);
    return { win: mine > theirs, push: mine === theirs, text: `You cut the ${RANKS[mine]}; the dealer cuts the ${RANKS[theirs]}.` };
  }
  const pearl = rand(3) + 1;
  return { win: bet.id === `c${pearl}`, push: false, text: `The pearl was under the ${['left', 'middle', 'right'][pearl - 1]} cup.` };
}

// Work out a settled bet: the return (stake included), the profit, and whether the daily cap trimmed it.
// netToday is the player's winnings so far today at this house (losses count against it).
export function resolveBet({ stake, mult, win, push, netToday, cap }) {
  let ret = push ? stake : win ? Math.floor(stake * mult) : 0;
  let profit = ret - stake, capped = false;
  const room = cap - netToday;
  if (profit > room) { profit = Math.max(0, room); ret = stake + profit; capped = true; }
  return { ret, profit, capped };
}

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── pleasure houses ────────────────────────────────────────────────
// The finer the house, the better the comforts and the smaller the risk. Prices are in copper for each visit.
export const PLEASURE_LEVELS = {
  seedy: { label: 'Seedy', power: 1, risk: 0.25, prices: [200, 500, 800], comforts: 'Meagre', danger: 'High',
    flavor: 'A cramped upstairs room that smells of cheap lamp oil, with a landlady who counts coins twice and asks no questions.' },
  common: { label: 'Common', power: 2, risk: 0.12, prices: [500, 1200, 2000], comforts: 'Fair', danger: 'Moderate',
    flavor: 'A cheerful, noisy house with a red lantern over the door, warm beds and a bar downstairs.' },
  refined: { label: 'Refined', power: 3, risk: 0.05, prices: [2000, 5000, 8000], comforts: 'Fine', danger: 'Low',
    flavor: 'Silk curtains, scented baths and quiet music. The house keeps a healer on call and its reputation spotless.' },
  opulent: { label: 'Opulent', power: 4, risk: 0.02, prices: [6000, 15000, 30000], comforts: 'Splendid', danger: 'Very low',
    flavor: 'A marble house for dukes and merchant princes, where every visit is arranged with discretion and care.' },
};
export const levelById = (id) => PLEASURE_LEVELS[id] || PLEASURE_LEVELS.common;
export const PLEASURE_SERVICES = [
  { id: 'hour', label: 'An hour’s company', step: 0 },
  { id: 'evening', label: 'An evening’s company', step: 1 },
  { id: 'night', label: 'The whole night', step: 2 },
];

const DICE = [null, '1', '1d4', '1d6', '1d8', '1d10'];
const BUFFS = [
  { name: 'Well rested', text: (p) => `Gain ${[2, 4, 6, 8, 10][p - 1]} temporary hit points. They last until your next long rest.` },
  { name: 'Silver tongue', text: (p) => `Add ${DICE[p]} to your next Persuasion or Deception check.` },
  { name: 'Lighter heart', text: (p) => `Add ${DICE[p]} to your next saving throw.` },
  { name: 'Steady hands', text: (p) => `Add ${DICE[p]} to your next attack roll or ability check.` },
  { name: 'Peace of mind', text: (p) => (p <= 2 ? 'Advantage on your next saving throw against being frightened.' : 'Advantage on saving throws against being frightened or charmed until your next long rest.') },
  { name: 'Loose lips', text: (p) => (p <= 2 ? 'The staff gossip. Ask the DM one question about the town.' : 'The staff gossip. Ask the DM two questions about the town and its people.') },
  { name: 'A spring in your step', text: (p) => `Your speed is up by ${p >= 3 ? 10 : 5} feet until your next long rest.` },
  { name: 'Fresh vigor', text: (p) => (p <= 2 ? 'Advantage on your next Constitution saving throw.' : p === 3 ? 'Advantage on your next two Constitution saving throws.' : 'Remove one level of exhaustion, if you have one, and gain advantage on your next Constitution saving throw.') },
];
export const DISEASES = [
  { name: 'the Crimson Itch', text: 'A blotchy, maddening rash. You have disadvantage on Charisma checks until it is cured.' },
  { name: 'Rosefever', text: 'A burning fever. You have disadvantage on Constitution saving throws until it is cured.' },
  { name: 'Weeping Sores', text: 'Painful sores. Your speed is 5 feet less, and you cannot regain hit points from short rests, until it is cured.' },
  { name: 'the Grey Shakes', text: 'Trembling hands. You have disadvantage on attack rolls with finesse or ranged weapons until it is cured.' },
];
export const CURE = 'A temple or healer will treat it for about 50 gp, and the spells Lesser Restoration or Cure Disease will remove it.';

// One visit: which level of house, which service, and the dice. Returns the strength of the comforts (1 to 5),
// the random buff, and the disease if one was caught.
export function visit(levelId, serviceId, rand = secureRand) {
  const level = levelById(levelId), service = PLEASURE_SERVICES.find((s) => s.id === serviceId) || PLEASURE_SERVICES[0];
  const power = Math.min(5, level.power + service.step);
  const buff = BUFFS[rand(BUFFS.length)];
  const caught = rand(1000) < Math.round(level.risk * 1000);
  const disease = caught ? DISEASES[rand(DISEASES.length)] : null;
  return { power, buff: { name: buff.name, text: buff.text(power) }, disease };
}
