# CRA Obituary — project context

Memorial website for **Charles Ray "Chuck" Anderson** (May 26, 1941 – February 28,
2026), built by his sons **Gary Anderson** and **Tony Anderson**.

## Intent / tone

Calm, serene, peaceful — **not** morbid, morose, or sad. The whole page is a
visual journey: a soft blue sky with white clouds at the top, easing down through
muted greens, into a warm, grainy, out-of-focus **soil** at the footer —
symbolizing peace and returning to the earth. Imagery stays soft, blurred,
low-contrast. Serif display type (Cormorant Garamond); warm paper tones for the
frosted content panels that float over the journey.

## Status (as of 2026-09-05)

Live at **https://cra-obituary.netlify.app** — the site is **public but not being
shared yet**. Launch is gated on the memorial **video** being ready.

Done: hero, full obituary text, Memories guestbook (Firebase-backed, working end
to end), Contacts (Tony + Gary LinkedIn), the sky→earth background, grainy soil
footer. Three real condolences from the funeral-home page are seeded into the
guestbook (Kirk Nicholls; Lois A. Mohr — "Family Friend"; Duane Jerome —
"Friend", message lightly de-typo'd).

Pending:
- **Video** — upload to YouTube as *Unlisted*, then in `index.html` (`#video`
  section) swap the placeholder `.video--placeholder` block for the
  commented-out `<iframe>` and set the video id.
- At launch: delete `robots.txt` and remove the `<meta name="robots"
  content="noindex, nofollow">` line from `index.html`.
- A **"TEST" guestbook card** with a photo may still be live — remove it via the
  page's own Remove button (from the browser that posted it) or the Firebase
  console.

## How it works

- **Static** HTML/CSS/JS, no build step. `index.html` + `css/style.css` + `js/`.
- **Hosting:** Netlify, **auto-deploys on every push to `main`** (GitHub repo
  `GaryJAnderson/cra-obituary`). ~30–60s per deploy. No manual drag-and-drop.
- **Guestbook backend:** Firebase project **cra-obituary** (Spark / free plan, no
  billing account).
  - Firestore collection `messages`. **Anonymous Auth** (no login screen) gives
    each visitor per-device ownership of their own message.
  - Photos are downscaled + re-encoded to a JPEG **data URL in the browser** and
    stored inline in the message doc — Firebase Storage needs a paid plan, so it
    is avoided; docs stay under Firestore's 1 MiB limit.
  - **"Remove" = soft delete** (`hidden: true`). Hard delete is disabled in the
    rules; every edit appends to a `revisions` array. Nothing is ever lost.
  - `firestore.rules` is the source of truth for the rules — **paste it into the
    Firebase console (Firestore → Rules → Publish) whenever it changes.**
  - `js/firebase-config.js` holds the web config. The `apiKey` there is **not a
    secret** (public Firebase identifier); security is enforced by the rules.
- **Read / back up messages:** Firebase console (Firestore → `messages`), or open
  `tools/backup.html` for a table + "Download JSON" (includes hidden messages and
  full edit history).
- **Moderate:** hide spam by setting `hidden: true` on the doc in the console.

## Security posture

- **The `apiKey` in `js/firebase-config.js` is public by design.** GitHub secret
  scanning flags it; that alert is a pattern match, not a breach. Never revoke or
  rotate it — that breaks the site and a replacement would be equally public.
  Harden it by *restricting* it in Google Cloud Console (website + API
  restrictions). See the comment at the top of that file.
- **Firestore rules are the actual access control**, and they were verified live
  (2026-09-06): an over-length message write was rejected server-side with
  `permission-denied`. Rules: public read; create requires anonymous auth with
  strict field validation; edit only from the posting device; hard delete
  disabled; edit history append-only.
- **No billing account** is attached (Spark plan), so abuse cannot cost money —
  worst case is exhausting a free daily quota.
- `_headers` sets a strict CSP (no inline scripts) plus HSTS, nosniff,
  frame-ancestors none, and a locked-down Permissions-Policy. **Any new
  third-party origin must be added there or the browser will block it.**
- Known accepted gap: **no rate limiting** on the guestbook. Scripted spam is
  possible. The fix if it ever happens is Firebase **App Check**; junk is
  removable from the Firebase console.

## Local dev

No Node or Python on this machine — a local static server can't be run here.
Preview by pushing to `main` and viewing the Netlify URL. Opening `index.html`
straight from disk works for layout, but the guestbook needs the live origin for
Firebase.

## Key files

| File | Purpose |
|---|---|
| `index.html` | the entire page |
| `css/style.css` | all styling. Sky→earth journey is on `body` + `.drift`; footer soil is `.footer::before` / `::after` |
| `js/store.js` | the **only** file that knows Firebase — five methods: `list` / `add` / `update` / `remove` / `mine` |
| `js/memories.js` | guestbook UI + photo lightbox |
| `js/nav.js` | sticky-nav frosting + scrollspy pills |
| `firestore.rules` | security rules — must be published in the Firebase console |
