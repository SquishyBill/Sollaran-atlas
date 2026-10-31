// The Sacred Calendar of the Sollaran Archonate: twelve months of 28 days, seven days to a week, four seasons of
// three months, 336 days to a cycle. Every month begins on a Firstday, so a date's weekday follows from its day.
//
// The whole calendar is one whole number: the day count, with day 0 being the 1st of Artharis in Cycle 1. Everything
// else (the weekday, month, season and which holiday it is) is worked out from that number, so it is easy to test
// and easy for two sites to share.
//
// The date moves by itself. The calendar document keeps { day, since, paused }: the day it was on at the moment the
// real day `since` began. The date now is day + (real days since then), counted in Eastern time, so it advances at
// midnight even when nobody has the page open. Moving it (a journey, downtime, a rest) simply re-anchors it.

export const WEEK_DAYS = 7, MONTH_DAYS = 28, CYCLE_MONTHS = 12, CYCLE_DAYS = 336;
export const ZONE = 'America/New_York';

export const WEEKDAYS = [
  { name: 'Firstday', blurb: 'Beginnings, creation, and new endeavors.' },
  { name: 'Secondday', blurb: 'Service, duty, and craftsmanship.' },
  { name: 'Thirdday', blurb: 'Knowledge, learning, and wisdom.' },
  { name: 'Fourthday', blurb: 'Labor, trade, and prosperity.' },
  { name: 'Fifthday', blurb: 'Justice, law, and civic responsibility.' },
  { name: 'Sixthday', blurb: 'Preparation, family, and reflection.' },
  { name: 'Seventhday', blurb: 'Worship, purification, and the sacred song.' },
];

export const SEASONS = [
  { id: 'summer', name: 'Summer', title: 'The Season of Founding', blurb: 'Growth, celebration, and the strength of the Archonate.' },
  { id: 'autumn', name: 'Autumn', title: 'The Season of Revelation', blurb: 'Harvest, reflection, and the pursuit of truth.' },
  { id: 'winter', name: 'Winter', title: 'The Season of Harmony', blurb: 'Devotion, unity, and the enduring song.' },
  { id: 'spring', name: 'Spring', title: 'The Season of Absolution', blurb: 'Renewal, cleansing, and the promise of ascension.' },
];

export const MONTHS = [
  { name: 'Artharis', title: 'The Founding', blurb: 'Honors Arthas and the establishment of the Archonate.' },
  { name: 'Sanctaris', title: 'The Consecration', blurb: 'Honors the temples and their Singing Crystals.' },
  { name: 'Luminor', title: 'The Illumination', blurb: 'Represents enlightenment through the divine light.' },
  { name: 'Verith', title: 'The Revelation', blurb: 'Celebrates truth, wisdom, and the teachings of the Noble Seven.' },
  { name: 'Solarius', title: 'The Radiance', blurb: 'Represents the power and protection of the Archons.' },
  { name: 'Judicar', title: 'The Judgment', blurb: 'Honors the Archons’ authority and the Justicars who enforce the law.' },
  { name: 'Harmonis', title: 'The Harmony', blurb: 'Celebrates the unity of the Singing Crystals and the Festival of Sacred Harmony.' },
  { name: 'Sanguaris', title: 'The Devotion', blurb: 'Honors the Sanguine Sisterhood and its guardianship of the crystals.' },
  { name: 'Ordinus', title: 'The Order', blurb: 'Represents discipline, unity, and the stability of the Archonate.' },
  { name: 'Absolaris', title: 'The Absolution', blurb: 'Symbolizes purification, forgiveness, and the cleansing of sin.' },
  { name: 'Vigilar', title: 'The Vigil', blurb: 'Commemorates vigilance against apostasy, corruption, and threats from the Wilds.' },
  { name: 'Ascendar', title: 'The Ascension', blurb: 'Honors the eternal legacy of Arthas and the promise of spiritual perfection.' },
];

// The five holidays on the painted calendar. `festival` names the shop festival (in shop-data.js) that runs with it.
export const HOLIDAYS = [
  { id: 'founding', name: 'Day of Founding', month: 1, day: 1, span: 1, blurb: 'Commemoration of Arthas and the establishment of the Archonate.' },
  { id: 'rye', name: 'Bertram’s Rye Ale Festival', month: 1, day: 7, span: 3, festival: 'rye', blurb: 'A celebration of brewing, food, and fellowship. The winning brewer earns the Bertram Rye Ale contract.' },
  { id: 'reckoning', name: 'Day of Reckoning', month: 6, day: 7, span: 1, blurb: 'A public reaffirmation of laws, judgments, and the Archons’ authority.' },
  { id: 'harmony', name: 'Festival of the Sacred Harmony', month: 7, day: 7, span: 3, festival: 'harmony', blurb: 'The Sisters unite their Singing Crystals in a song heard across Sollara.' },
  { id: 'benediction', name: 'The Final Benediction', month: 12, day: 28, span: 1, blurb: 'The closing of the cycle and renewal of sacred vows.' },
].map((x) => ({ ...x, repeat: 'yearly', builtin: true }));

// ── turning a day count into a date, and back ───────────────────────
const whole = (n) => Math.max(0, Math.floor(Number(n) || 0));

export const toDayNumber = (cycle, month, dom) =>
  (Math.max(1, whole(cycle)) - 1) * CYCLE_DAYS + (Math.min(CYCLE_MONTHS, Math.max(1, whole(month))) - 1) * MONTH_DAYS + (Math.min(MONTH_DAYS, Math.max(1, whole(dom))) - 1);

export function dateOf(n) {
  n = whole(n);
  const inCycle = n % CYCLE_DAYS, month = Math.floor(inCycle / MONTH_DAYS) + 1, dom = (inCycle % MONTH_DAYS) + 1;
  return {
    n, cycle: Math.floor(n / CYCLE_DAYS) + 1, month, dom, inCycle,
    weekday: n % WEEK_DAYS, week: Math.floor(n / WEEK_DAYS), weekOfMonth: Math.floor((dom - 1) / WEEK_DAYS),
    season: Math.floor((month - 1) / 3), monthName: MONTHS[month - 1].name,
  };
}

export const ordinal = (n) => {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`;
};

// "Seventhday, the 7th of Harmonis, Cycle 742 of the Archonate"  (short: "Seventhday, 7 Harmonis 742")
export function formatDate(d, short = false) {
  d = typeof d === 'number' ? dateOf(d) : d;
  const wd = WEEKDAYS[d.weekday].name;
  return short ? `${wd}, ${d.dom} ${MONTHS[d.month - 1].name} ${d.cycle}` : `${wd}, the ${ordinal(d.dom)} of ${MONTHS[d.month - 1].name}, Cycle ${d.cycle} of the Archonate`;
}

// The first day of the week this day is in, and how many days until the next Firstday.
export const weekStart = (n) => whole(n) - (whole(n) % WEEK_DAYS);
export const daysToFirstday = (n) => WEEK_DAYS - (whole(n) % WEEK_DAYS);

// ── the real clock: days are counted in Eastern time, so a day turns over at midnight there ──
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

// Which real day it is (a whole number: days since 1970, counted by the Eastern calendar).
export function realDay(now = Date.now()) {
  const [y, m, d] = dayFmt.format(now).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
// How long until the real day turns over, in ms.
export function msToMidnight(now = Date.now()) {
  const [h, m, s] = clockFmt.format(now).split(':').map(Number);
  return Math.max(1000, 86400000 - ((h * 60 + m) * 60 + s) * 1000);
}

// ── the calendar document: { day, since, paused } ───────────────────
export const isStarted = (cal) => !!cal && Number.isInteger(cal.day) && cal.day >= 0 && Number.isInteger(cal.since);

// The day the calendar is on now (null if it has not been started).
export function currentDay(cal, now = Date.now()) {
  if (!isStarted(cal)) return null;
  return cal.paused ? cal.day : cal.day + Math.max(0, realDay(now) - cal.since);
}

// Move the calendar to a day: the fields to save.
export const anchored = (cal, day, now = Date.now()) => ({ day: whole(day), since: realDay(now), paused: !!cal?.paused });
// Move it forward (or back, with a negative number) by some days.
export const advanced = (cal, days, now = Date.now()) => anchored(cal, (currentDay(cal, now) ?? 0) + Math.round(Number(days) || 0), now);
export const paused = (cal, now = Date.now()) => ({ ...anchored(cal, currentDay(cal, now) ?? 0, now), paused: true });
export const resumed = (cal, now = Date.now()) => ({ ...anchored(cal, currentDay(cal, now) ?? 0, now), paused: false });

// ── holidays ────────────────────────────────────────────────────────
// A holiday is { name, month, day, span, repeat: 'yearly' | 'once', cycle (for 'once'), blurb, color, hidden }.
// `span` is how many days it lasts (a festival runs a few days).
export const startsOn = (hol, cycle) => toDayNumber(cycle, hol.month, hol.day);

// Is the holiday on in the day n (the day it starts or one of the days it lasts)?
export function occursOn(hol, n) {
  const span = Math.max(1, Math.min(CYCLE_DAYS, whole(hol.span) || 1)), cycle = dateOf(n).cycle;
  for (const c of [cycle - 1, cycle]) {
    if (c < 1 || (hol.repeat === 'once' && c !== whole(hol.cycle))) continue;
    const start = startsOn(hol, c);
    if (n >= start && n < start + span) return true;
  }
  return false;
}
export const holidaysOn = (n, list) => (list || []).filter((x) => occursOn(x, n));

// Which holidays start after day `from` up to and including day `to` (what a jump of days passed over).
export function holidaysBetween(from, to, list, limit = 4000) {
  const out = [];
  for (let n = whole(from) + 1, i = 0; n <= to && i < limit; n++, i++) {
    for (const x of list || []) {
      if (!occursOn(x, n)) continue;
      const first = !occursOn(x, n - 1);     // only the day it begins
      if (first) out.push({ n, holiday: x });
    }
  }
  return out;
}

// The next holiday to start from day n on (today counts), within a couple of cycles.
export function nextHoliday(n, list) {
  for (let k = whole(n), i = 0; i < CYCLE_DAYS * 2; k++, i++) {
    const hit = (list || []).find((x) => occursOn(x, k) && !occursOn(x, k - 1));
    if (hit) return { n: k, holiday: hit, days: k - whole(n) };
  }
  return null;
}

// Which of the shop festivals (harmony, rye) are on by the calendar, given the holidays on that day.
export const festivalsOn = (n, list) => [...new Set(holidaysOn(n, list).map((x) => x.festival).filter(Boolean))];

// Everything the calendar knows, for the page: built-in holidays plus the DM's own.
export const allHolidays = (custom) => [...HOLIDAYS, ...(custom || [])];

// A holiday the DM typed in, tidied for saving (or an error string).
export function holidayFrom(input) {
  const name = String(input?.name || '').trim().slice(0, 80);
  if (!name) return { error: 'Give the holiday a name.' };
  const month = Math.floor(Number(input.month)), day = Math.floor(Number(input.day));
  if (!(month >= 1 && month <= CYCLE_MONTHS)) return { error: 'The month must be 1 to 12.' };
  if (!(day >= 1 && day <= MONTH_DAYS)) return { error: 'The day must be 1 to 28.' };
  const repeat = input.repeat === 'once' ? 'once' : 'yearly';
  const out = { name, month, day, repeat, span: Math.max(1, Math.min(28, Math.floor(Number(input.span)) || 1)),
    blurb: String(input.blurb || '').trim().slice(0, 600), color: /^#[0-9a-f]{6}$/i.test(input.color || '') ? input.color : '#b8862b', hidden: !!input.hidden };
  if (repeat === 'once') {
    const cycle = Math.floor(Number(input.cycle));
    if (!(cycle >= 1)) return { error: 'Give the cycle it happens in.' };
    out.cycle = cycle;
  }
  return out;
}

// ── the DM's reminders ──────────────────────────────────────────────
// A reminder is pinned to a day for the DM alone: { title, note, day (the day count), done }. It is due once the date
// reaches that day, and stays due until it is marked done.
export const dueReminders = (list, n) => (list || []).filter((r) => !r.done && Number.isInteger(r.day) && r.day <= n).sort((a, b) => a.day - b.day);
export const remindersOn = (list, n) => (list || []).filter((r) => !r.done && r.day === n);
// Reminders a jump from day `from` to day `to` went over (or landed on).
export const remindersBetween = (from, to, list) => (list || []).filter((r) => !r.done && r.day > from && r.day <= to).sort((a, b) => a.day - b.day);

// A reminder the DM typed in, tidied for saving (or an error string). Give the date as { cycle, month, day }, or
// as `inDays` (days from `today`).
export function reminderFrom(input, today) {
  const title = String(input?.title || '').trim().slice(0, 100);
  if (!title) return { error: 'Give the reminder a title.' };
  let day;
  if (input.inDays !== '' && input.inDays != null && Number.isFinite(Number(input.inDays))) {
    if (!Number.isInteger(today)) return { error: 'Start the calendar first.' };
    day = today + Math.round(Number(input.inDays));
    if (day < 0) return { error: 'That is before the first day of the calendar.' };
  } else {
    const month = Math.floor(Number(input.month)), dom = Math.floor(Number(input.dom)), cycle = Math.floor(Number(input.cycle));
    if (!(month >= 1 && month <= CYCLE_MONTHS)) return { error: 'The month must be 1 to 12.' };
    if (!(dom >= 1 && dom <= MONTH_DAYS)) return { error: 'The day must be 1 to 28.' };
    if (!(cycle >= 1)) return { error: 'Give the cycle.' };
    day = toDayNumber(cycle, month, dom);
  }
  return { title, note: String(input.note || '').trim().slice(0, 400), day, done: !!input.done };
}
