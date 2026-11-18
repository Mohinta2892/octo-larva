# Octo project page

Static GitHub Pages site for *The female larval fly CNS connectome: first draft*.
It has no build step: `index.html` plus `assets/`.

```
octo_page/
├── index.html                  page content (abstract, figures, captions, BibTeX)
├── assets/js/config.js         ALL external links, including the Google Form URL
├── assets/js/main.js           wires links, BibTeX copy button, figure lightbox
├── assets/css/style.css        styling (light + dark mode)
├── assets/img/                 web-sized figures (generated)
├── figures_src/                put Overleaf PDFs/PNGs here (not pushed)
├── google_form/create_access_form.gs   creates the access-request Google Form
└── scripts/
    ├── prepare_figures.sh      figures_src/*.pdf|png|jpg -> assets/img/*.png
    ├── preview.sh              local preview at http://localhost:8000
    └── deploy.sh               push to GitHub (first run sets up the repo)
```

## 1. Create the access-request form

1. Open <https://script.google.com>, click **New project**, and paste in `google_form/create_access_form.gs`.
2. Optional: set `NOTIFY_EMAIL` to get an email for each request.
3. Run `createAccessForm` and approve the permissions prompt.
4. Copy the **PUBLIC FORM URL** from the execution log into `assets/js/config.js` as `accessForm`.

Until `accessForm` is set, the page shows a greyed-out "Request form coming soon" button.

## 2. Publish on GitHub Pages

1. Create an **empty** public repo on github.com, e.g. `octo-connectome`.
2. Run `scripts/deploy.sh git@github.com:<you>/octo-connectome.git`.
3. In the repo, go to **Settings → Pages → Deploy from a branch** and choose `main` and `/ (root)`.
4. The site goes live at `https://<you>.github.io/octo-connectome/`.

Once it is live, change `og:image` in `index.html` to the absolute URL
(`https://<you>.github.io/octo-connectome/assets/img/neuropil_vs_soma.png`) so link previews show the image.

## 3. Updating

| Change | How |
|---|---|
| A link, or the form URL | edit `assets/js/config.js` |
| Text or captions | edit `index.html` |
| Add a figure | drop the PDF in `figures_src/`, run `scripts/prepare_figures.sh`, then add a `<figure>` block in `index.html` (see the `TODO` comments) |
| Preview | `scripts/preview.sh`, then open http://localhost:8000 |
| Publish | `scripts/deploy.sh "what changed"` |

For figures with a white background, add `class="light"` to the `<img>` so they get a white padded card in dark mode.
