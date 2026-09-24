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
| DM | **Edit mode** (quill): click the map to add a location, and drag pins to move them. |
| DM | Pins and pages can be **hidden from players** for secrets and prep. |
| DM | A pin can **link to another page**, e.g. a city pin that opens the city map. |
| DM | In descriptions, `[[Place Name]]` makes a link to that place or page. |

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
