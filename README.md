# CRA Obituary

A memorial website for **Charles Ray Anderson**.

Static site — plain HTML and CSS, no build step. Open `index.html` in a browser
to view it locally.

## Structure

```
cra-obituary/
├── index.html        # the whole page
├── css/style.css     # styling
├── js/               # (reserved — nothing here yet)
├── images/           # portrait.jpg, photo-01.jpg … drop photos here
└── README.md
```

## Editing content

Everything to fill in is marked in `index.html` with `TODO` comments and
`[square brackets]`. Main areas:

- **Hero** — full name, dates, epitaph line
- **Obituary** — the life story (paste the drafted text here)
- **Service Details** — visitation / funeral / interment times and places
- **Gallery** — add photos to `images/`, update `src` and `alt`
- **Memories** — tributes from family and friends
- **Flowers & Giving** — charity / donation info

## Photos

Put image files in `images/`. Expected names:

- `portrait.jpg` — the main hero portrait (square works best)
- `photo-01.jpg` through `photo-06.jpg` — gallery (add/remove as needed)

Missing images show a subtle placeholder pattern instead of a broken icon.

## Publishing

Not set up yet. Options when ready: Netlify drop, GitHub Pages, or Cloudflare
Pages — all free and fine for a static site.
