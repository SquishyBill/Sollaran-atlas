// ─── Campaign settings ──────────────────────────────────────────────
export const CAMPAIGN = {
  title: 'The Sollaran Archonate',
  tagline: 'An atlas of the dukedoms of Sollara',
};

// ─── Firebase ───────────────────────────────────────────────────────
// Paste the config from Firebase console → Project settings → Your apps → Web app.
// (Set apiKey back to 'PASTE_ME' to run the browser-only demo mode instead.)
// This key only identifies the project; it's meant to be public. firestore.rules protects the data.
export const firebaseConfig = {
  apiKey: 'AIzaSyAAjTsnQgot2T9IY-nAKA8PP_IVdCZmTJo',
  authDomain: 'archonate-atlas.firebaseapp.com',
  projectId: 'archonate-atlas',
  storageBucket: 'archonate-atlas.firebasestorage.app',
  messagingSenderId: '856729435780',
  appId: '1:856729435780:web:b2e6a9fd6236894dce8cd1',
};

// Google accounts allowed to edit the atlas. Keep in sync with firestore.rules.
export const DM_EMAILS = ['christopherwmazzoli@gmail.com'];

// true  → the DM can upload map images from inside the atlas (needs Firebase Storage,
//          which requires the pay-as-you-go Blaze plan; a campaign's worth of maps costs ~nothing).
// false → put PNGs in the repo's maps/ folder and type the path, e.g. maps/world.png
export const ENABLE_UPLOADS = false;
