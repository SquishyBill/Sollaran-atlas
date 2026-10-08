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
- **Weekly restock:** stock refreshes every 7 days from when the shop was created, by itself. **Restock now** forces it.
- **Renown matters:** the nearest tracked standing (the town, then its map, then the dukedom) sets prices (+10 is 25% off, −10 is 60% more). Below 0 the fine goods are held back; from +3 the rare goods appear; at Reviled (−7 or lower) they won’t trade at all.
- **Buying:** anyone can click **Buy**. Stock goes down and the purchase goes in the **Market → Ledger** (DM) / **My purchases** (players). Tick **Settled** once you’ve taken the gold; **void** undoes a purchase and returns the stock.

- **27 kinds of shop**, from general stores and smiths to temples, inns, shipwrights, vintners, the Quartermaster and the Black Market. **Services** (lodging, healing, passage…) never run out.
- **Black Market:** hidden from players by default, and renown works in reverse: the less the law likes the party, the better the deals.
- **Your own touches (Edit on a shop):** *house specials* that are always in stock, and your own price for any generated item.
- **Haggling:** once per player, per shop, per week. The atlas rolls the d20 and adds the player's Persuasion bonus (they set it once; after that only the DM can change it, under **Market → Ledger → Party Persuasion**). The total decides: 5 or less +20%, 6–9 +10%, 10–14 no change, 15–19 10% off, 20–24 15% off, 25+ 20% off, for the rest of that week. Every attempt shows in the ledger; you can reset one from the shop.

Item names and prices follow the D&D 5e SRD 5.1 (CC BY 4.0); magic item prices are suggestions.

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
js/store-local.js     demo backend (browser storage)
js/seed.js          demo content
js/markdown.js      tiny safe markdown renderer
firestore.rules     database security rules
storage.rules       upload rules (only if uploads are on)
maps/               your map images
```
