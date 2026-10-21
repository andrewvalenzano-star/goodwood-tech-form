# Goodwood Kartways — Tech Form

Phone-friendly replacement for the paper TRAK Self Technical Declaration. See `SPEC.md` for the full spec.

Plain HTML/CSS/JS, no build step. Open `index.html` in a browser to try it.

## Where things live

- `js/config.js` — class list, chassis brands, ROK (two-engine) classes, checklist wording, declaration text, and the backend URL. Season-to-season edits happen here.
- `js/app.js` — form behaviour (conditional fields, photo capture, signature pad, validation, draft autosave, submit).
- `css/styles.css` — high-contrast, mobile-first styling.
- `apps-script/Code.gs` — the backend, pasted into the Google Sheet's Apps Script editor. Setup steps: `apps-script/SETUP.md`.

## Status

- [x] Pass 1 — form UI (demo mode, nothing is sent yet)
- [x] Pass 2 — Google Apps Script backend writing to the Sheet
- [x] Pass 3 — photo upload to Drive (compressed on the phone, one Drive folder per event date)
- [ ] Pass 4 — tire barcode scanning, OCR pre-fill for chassis/engine serials
- [ ] Pass 5 — offline queue, submitter PDF download

## Assets

- `img/logo.png`, `img/colourblocks.png` — from goodwoodkartways.com (property of Goodwood Kartways). The `img/*icon*.png` and `img/favicon.png` files are cropped from the logo's "G" mark.
- `fonts/racing-sans-one-latin.woff2` — Racing Sans One (the site's heading font), SIL Open Font License, self-hosted so it works offline.
