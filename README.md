# Goodwood Kartways — Tech Form

Phone-friendly replacement for the paper TRAK Self Technical Declaration. See `SPEC.md` for the full spec.

Plain HTML/CSS/JS, no build step. Open `index.html` in a browser to try it.

## Where things live

- `js/config.js` — class list, chassis brands, ROK (two-engine) classes, checklist wording, declaration text, and the backend URL. Season-to-season edits happen here.
- `js/app.js` — form behaviour (conditional fields, photo capture, signature pad, validation, draft autosave, submit).
- `css/styles.css` — high-contrast, mobile-first styling.

## Status

- [x] Pass 1 — form UI (demo mode, nothing is sent yet)
- [ ] Pass 2 — Google Apps Script backend writing to the Sheet
- [ ] Pass 3 — photo upload to Drive
- [ ] Pass 4 — tire barcode scanning, OCR pre-fill for chassis/engine serials
- [ ] Pass 5 — offline queue, submitter PDF download
