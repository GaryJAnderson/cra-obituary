# CRA Obituary

A memorial website for **Charles Ray "Chuck" Anderson** (1941–2026).

Static HTML/CSS site, no build step. Open `index.html` in a browser to view it.
The only moving part is the **Memories** guestbook, which uses Firebase
(Firestore) so messages persist for the family.

## Structure

```
cra-obituary/
├── index.html            # the whole page
├── css/style.css          # styling
├── js/
│   ├── firebase-config.js  # Firebase project config (not secret)
│   ├── store.js            # guestbook data layer — the only file that knows Firebase
│   └── memories.js         # guestbook UI
├── images/                # portrait.jpg + any photos
├── tools/backup.html      # read-only: dump all messages (incl. removed) to JSON
├── firestore.rules        # security rules to paste into the Firebase console
└── README.md
```

## Sections

| Section | Notes |
|---|---|
| Hero | Name, dates, portrait (`images/portrait.jpg`) |
| In Memory | Video. Replace the placeholder block in `index.html` with the commented-out `<iframe>` and set the YouTube ID. |
| Obituary | Static text |
| Memories | Firebase-backed guestbook (see below) |
| Contact | "Message Tony on Facebook" — set the URL (`TONY_FACEBOOK_URL` in `index.html`) |

## Memories guestbook

- **Backend:** Cloud Firestore, Spark (free) plan — no billing account.
- **Auth:** anonymous sign-in (no login screen). A message can only be
  edited/removed from the browser that posted it.
- **Photos:** downscaled in the browser and stored inline in the message
  document (Firebase Storage needs a paid plan, so we avoid it).
- **"Remove"** just sets `hidden: true`. Nothing is hard-deleted; every edit
  is appended to a `revisions` array.

### One-time Firebase setup

1. Firebase console → create project (Spark plan is fine).
2. **Firestore Database** → create (production mode).
3. **Authentication** → Sign-in method → enable **Anonymous**.
4. **Project settings → Your apps → Web** → copy the config into
   `js/firebase-config.js`.
5. **Firestore → Rules** → paste `firestore.rules` → Publish.

### Reading / backing up messages

- Browse everything in the Firebase console (Firestore → `messages`).
- Or open `tools/backup.html` in a browser for a table of all messages
  (including removed ones) and a "Download JSON" button.
- Moderation (hiding spam): flip `hidden` to `true` on the doc in the
  Firebase console.

## Publishing

Static site — host free on Netlify (drag-and-drop the folder) or Cloudflare
Pages / GitHub Pages. No server needed.
