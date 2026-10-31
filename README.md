# Campaign Atlas

An interactive D&D atlas you can flip through like a book. It has maps with clickable locations, lore documents, shared party notes, and live pings. It's a static site: GitHub Pages hosts it and Firebase stores the data. Everyone signs in with their Google account.

## Try it locally

ES modules don't load from `file://`, so run a tiny server from this folder:

```bash
python -m http.server 8123
```

Then open http://localhost:8123. Until you fill in the Firebase config, the atlas runs in **demo mode**: sample content, saved only in that browser, and the **DM** button toggles DM mode with no sign-in.

## Going live

### 1. Firebase (about 10 minutes)

1. In the [Firebase console](https://console.firebase.google.com), create a project (or reuse one).
2. **Build → Authentication → Sign-in method**: enable **Google**. That's the only provider needed. Anyone can sign in, but the rules decide what they can do: only the DM can edit.
3. **Build → Firestore Database → Create database** (production mode, any region).
4. **Firestore → Rules**: paste in `firestore.rules`, replace `you@example.com` in `dmEmails()` with your Google address, and click **Publish**.
5. **Project settings → Your apps → Web app (`</>`)**: register an app and copy the `firebaseConfig` object.

### 2. Configure the site

Edit `js/config.js`:
- paste in your `firebaseConfig`
- set `DM_EMAILS` to the same Google address you put in the rules

### 3. Import the atlas from your own computer

`js/seed.js` holds the starter pages, pins **and DM secrets**, so it's loaded into Firebase locally and never published.

```bash
python -m http.server 8124
```

Open http://localhost:8124 (Firebase allows `localhost` sign-in by default), click **DM**, sign in with Google, and click **Import the starter atlas**. You only do this once. From then on, all edits happen in the atlas itself.

### 4. Publish on GitHub Pages

1. Create a new **public** repository on GitHub. Free Pages hosting needs a public repo; that's fine, because `.gitignore` keeps `js/seed.js` out of it.
2. From this `atlas` folder, push it:

   ```bash
   git init -b main
   git add .
   git commit -m "Sollaran Archonate atlas"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

3. On GitHub, go to **Settings → Pages**, set Source to *Deploy from a branch*, and pick `main` and `/ (root)`.
4. After a minute the atlas is live at `https://<you>.github.io/<repo>/`.
5. In Firebase, go to **Authentication → Settings → Authorized domains** and add `<you>.github.io` so your DM sign-in works there.

Share that link with your players. That's all they need.

### Updating the site later

Edit pages, pins and secrets inside the atlas; they're saved to Firebase instantly and need no redeploy. You only push again when files change, such as new map images or code updates:

```bash
git add .
git commit -m "Describe the change"
git push
```

## Shops

**Generate one (DM):** open a town pin or a map's About panel, click **+ Generate a shop here**, pick the kind of shop and the settlement size, reroll until you like it, then **Save shop**. You can add the proprietor to People and drop a pin for the shop on the map.

- **Size sets the stock:** hamlets carry a few plain goods; cities carry more, finer goods (“fine”) and rare finds (“under the counter”).
- **Weekly restock:** once the calendar is running (see below), every shop restocks on each **Firstday**. Before that, stock refreshes every 7 days from when the shop was created. **Restock now** forces it.
- **Renown matters:** the nearest tracked standing (the town, then its map, then the dukedom) sets prices (+10 is 25% off, −10 is 60% more). Below 0 the fine goods are held back; from +3 the rare goods appear; at Reviled (−7 or lower) they won’t trade at all.
- **Buying:** anyone can click **Buy**. Stock goes down and the purchase goes in the **Market → Ledger** (DM) / **My purchases** (players). Tick **Settled** once you’ve taken the gold; **void** undoes a purchase and returns the stock.

- **27 kinds of shop**, from general stores and smiths to temples, inns, shipwrights, vintners, the Quartermaster and the Black Market. **Services** (lodging, healing, passage…) never run out.
- **Black Market:** hidden from players by default, and renown works in reverse: the less the law likes the party, the better the deals.
- **Your own touches (Edit on a shop):** *house specials* that are always in stock, and your own price for any generated item.
- **Haggling:** once per player, per shop, per week (a calendar week, from Firstday). The atlas rolls the d20 and adds the player's Persuasion bonus (they set it once; after that only the DM can change it, under **Market → Ledger → Party Persuasion**). The total decides: 5 or less +20%, 6–9 +10%, 10–14 no change, 15–19 10% off, 20–24 15% off, 25+ 20% off, for the rest of that week. Every attempt shows in the ledger; you can reset one from the shop.

Item names and prices follow the D&D 5e SRD 5.1 (CC BY 4.0); magic item prices are suggestions.

## Loot

Everything lives under **Market → Loot**.

- **Generate loot (DM):** pick party level, one creature or a hoard, and where it’s found (bandit camp, sunken ship, crypt…). Reroll the whole thing or any line, edit names, quantities and coins, add a specific magic item. Then **Give to the party now** or **Hide it here** as a secret cache at a place (reveal it from that place, or from Loot, when they find it).
- **Loot** is the party’s shared stash: coins, items and a history. Players can see it; only the DM changes it. **Claim…** gives an item (or part of a stack) to someone; **Split evenly** / **Take coins** / **Add coins** handle the purse.
- **Unidentified magic items** show players only a description. A player can pay **Identify an item** (20 gp, at Arcane Curios and Temples). The item shows “being studied”, and the DM’s browser reveals it the next time the DM opens the atlas. The DM can **reveal** anything for free (e.g. an *identify* spell at the table).
- **My magic items (DM):** your homebrew, mixed into loot by rarity (mix / prefer / only). Tick “in shops” to let one appear under the counter in big-city Arcane Curios, Exotic Imports and Black Markets.

## Backpacks

Every character carries one **backpack**: their coins (platinum, gold, silver, copper) and the things they own. It's made the first time a player opens the atlas. Open it with the backpack button in the top bar.

**The switch.** Backpacks are **off** until you turn them on, so nothing changes for the players until you're ready. As the DM, open the backpack button (you see everyone's), give each player their starting coins (**Give coins**), then press **Switch on**. Switch it off again and everything goes back to settling gold with you at the table; coins already in backpacks stay put.

**With backpacks on**, a player's gold moves by itself, each change as one all-or-nothing step (a purchase can never take the coins and lose the item):

- **Buying** takes the price from the backpack and puts the goods in it. Repairs, identification and exchange fees come out of it too. If they can't afford it, nothing happens.
- **Selling** takes the goods out and pays the gold in.
- **The G.E.C.:** deposits come out of the backpack and withdrawals go back in; coins are exchanged in the backpack (less the fee); writs are bought with its coins and cashed into it. A writ in someone's backpack can only be cashed by them.
- **Paying makes change by itself.** Platinum is only spent when it has to be.

**The DM's tools.** Open a player's backpack to see what they carry and their **History**: every coin that moves is a line there (what, how much, and what was left). **Give coins / Take coins / Set coins** always leave a line too. In Loot, **give to a character…** puts an item in a character's backpack (type their name; capitals don't matter), **Take coins** and **Split evenly** move the party's coins into backpacks, and **Generate loot** lets you decide who gets what before you drop it: each item line has its own "goes where" choice (a character, or the party's Loot), a stack can be split (**split…**) between people, the coins can go to one person or be **shared evenly** between the characters you tick, and a "Who gets what" summary shows the result. One press drops everything into the bags, all or nothing. **Match them to backpacks by name** ties items claimed in the past (by typing a name) to that player's backpack.

**How safe is it?** The database rules (in `firestore.rules`) keep each player's coins their own: only they and the DM can see them; a player can't change their coins without a matching ledger line in the same step; and coins only go **up** through a sale, a cashed writ or a savings withdrawal. That stops mistakes and casual poking. It doesn't stop a determined cheat, because the page works out prices and the G.E.C. balances can still be edited by someone who knows how. Every move is in the History for you to see.

## The calendar

The Sacred Calendar of the Sollaran Archonate: twelve months of 28 days (336 days a cycle), seven days to a week, four seasons of three months. Every month begins on a Firstday, so the weekday of any date follows from it. The calendar button in the top bar (a page marked with today's day) opens it: today is highlighted in a month grid, with the season's painting, the seasons and months at a glance, **Coming up**, and the list of holidays. Players see it once it has been started.

**Starting it (DM).** Open the calendar and set today's date (it asks for the month, day and cycle). From then on the date **moves by itself**, one day for each real day, turning over at midnight Eastern, even when nobody has the atlas open. (It is worked out from the date it was set and the real clock, so it needs no server.)

**Moving it (DM).** Under *Move the calendar*: +1 day, +3 days, +1 week, +1 month, or any number of days (with a reason that goes in the history), **Set the exact date**, **Pause** (the date stands still, for weeks the party is away from the table) and **Resume**. Every move is in the **History of the date** (DM only), and **Undo the last move** takes one back. Moving the date reports the holidays it passed over.

**What follows it.** Every shop restocks on each Firstday, and haggling and the weekly selling limits count calendar weeks. The two festivals switch on by themselves on their dates (7 Harmonis and 7 Artharis, three days each), and the banner names any holiday that is on. The old festival switches in Market still work, and *Festivals switch on by themselves* can be turned off. Before the calendar is started nothing changes: shops keep their own 7-day timers. The G.E.C.'s interest and rent and the gaming houses' daily limits still run on real time.

**Holidays.** Five come with the calendar (Day of Founding, Bertram's Rye Ale Festival, Day of Reckoning, Festival of the Sacred Harmony, the Final Benediction). Add your own: name, month, day, every cycle or once, how many days it lasts, a colour and a note. A holiday can be **hidden from players**; the database rules keep it from them.

**The files.** `js/calendar-data.js` holds all the date maths (tested on its own). The date is the document `config/calendar` (`{ day, since, paused }`); holidays are `holidays`; the history is `calendarLog`. The season paintings, holiday and month emblems and the sun are in `img/`.

## Tests

The atlas has tests that run on the Firebase **emulators** (a pretend copy on your own computer, never your real data). From this folder: `cd tests`, `npm install` once, then `node run.mjs` runs everything, or `node run.mjs unit`, `rules` or `e2e` for one kind. The browser tests (`e2e`) open the real page as a DM and two players.

## Who's signed in, and locking it to your party

Firebase keeps the list for you: **Authentication → Users** shows every Google account that has signed in, with first and last sign-in dates.

While `party()` in `firestore.rules` is empty, anyone with the link and a Google account can open the atlas. When you have everyone's address:

1. In `firestore.rules`, fill in the list, lowercase: `function party() { return ['player.one@gmail.com', 'player.two@gmail.com']; }`
2. Paste the rules into **Firestore → Rules** and click **Publish**.

No redeploy is needed. Anyone not on the list gets a polite "you're not on the party list" screen. You (the DM) always get in.

## Adding your maps

**Default (free):** put the image in `maps/` (from the `archonate maps` folder, add it to `tools/build_maps.py` and run it to get a WebP copy), commit and push, then in the atlas click **DM → Contents (☰) → + Add a page** and type the path, e.g. `maps/new-map.webp`.

**Optional in-app uploads:** set `ENABLE_UPLOADS = true` in `js/config.js`, enable **Storage** in Firebase (it requires the pay-as-you-go Blaze plan; a campaign's worth of maps costs close to nothing), and publish `storage.rules` with your email. An **Upload…** button then appears in the editors.

Large maps: anything up to ~8000 px wide works well. Very large PNGs load faster if you convert them to `.webp` or high-quality `.jpg`.

## Using it

| Who | What |
|---|---|
| Everyone | Flip pages with the arrows, the dog-eared corners, or the ← → keys. Click pins to read about places. Press `/` to search. |
| Everyone | Add notes to any place or page. Tick **Private** to keep a note to yourself. |
| Everyone | **Ping** (the crosshair button, or right-click the map) shows a ripple on everyone's screen. |
| Everyone | **Copy link** on a place gives a URL that opens straight to that pin. |
| Everyone | **People** (the two-figure button) lists every NPC, grouped and searchable. Each person shows where they're found, and each place lists the people there. |
| Everyone | **Renown** (the laurel button) shows the party's standing in each place and group: its tier, what that means, and a history of every change and why. Places also show it in their About panel. |
| DM | Start tracking renown from a place's About panel or the Renown list, adjust it with **+1 / −1** (and a reason), add place-specific perks, hide a standing, and edit the tiers. |
| DM | **Edit mode** (quill): click the map to add a location, and drag pins to move them. |
| DM | Pins and pages can be **hidden from players** for secrets and prep. |
| DM | A pin can **link to another page**, e.g. a city pin that opens the city map. |
| DM | Pins and document pages take a **picture**: click or drop one into the box in the editor. It's shrunk and stored in the atlas (no GitHub upload) and only loads when someone opens that pin or page. |
| DM | **Nested under** (in Edit page) puts a page inside another in Contents, e.g. a town under its dukedom and an inn under its town. Contents shows them as a tree with ▸/▾ to open and close each branch. |
| DM | In descriptions, `[[Place Name]]` or `[[Person Name]]` makes a link to that place, page or person. |
| DM | Add people from the People list or with **+ Add a person here** on any place. Set their group, portrait, where they're found, and DM secrets. |

Formatting in descriptions: `# heading`, `**bold**`, `*italic*`, `- list`, `> quote`, `---`.

## Files

```
index.html          page shell
css/atlas.css       all styling
js/config.js        campaign title, Firebase config, DM emails
js/app.js           the atlas UI
js/store-firebase.js  Firebase backend (anonymous players, Google DM)
js/calendar-data.js   the calendar: dates, weekdays, holidays and the clock
js/store-local.js     demo backend (browser storage)
js/seed.js          demo content
js/markdown.js      tiny safe markdown renderer
firestore.rules     database security rules
storage.rules       upload rules (only if uploads are on)
maps/               your map images
img/                the calendar: season paintings, holiday and month emblems, the sun
```
