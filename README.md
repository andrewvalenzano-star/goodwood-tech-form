# Goodwood Kartways — Tech Form

Phone-friendly replacement for the paper TRAK Self Technical Declaration. See `SPEC.md` for the full spec.

Plain HTML/CSS/JS, no build step. Open `index.html` in a browser to try it.

## Where things live

- `js/config.js` — class list, chassis brands, ROK (two-engine) classes, checklist wording, declaration text, and the backend URL. Season-to-season edits happen here.
- `js/app.js` — form behaviour (conditional fields, serial scanning, signature pad, validation, submit). The form starts blank on every visit.
- `js/pdf.js` — the submitter's "Download PDF copy" (one Letter page, built on the phone with jsPDF from cdnjs, loaded on first tap).
- `js/reader.js` — reads serials from photos: tire barcodes (native BarcodeDetector, else ZXing), then text recognition (Tesseract.js). Libraries load from jsDelivr on first use. Always a pre-fill for the person to check. Photos are used only on the phone and never uploaded.
- `css/styles.css` — high-contrast, mobile-first styling.
- `apps-script/Code.gs` — the backend, pasted into the Google Sheet's Apps Script editor. Setup steps: `apps-script/SETUP.md`.

## Status

- [x] Pass 1 — form UI (demo mode, nothing is sent yet)
- [x] Pass 2 — Google Apps Script backend writing to the Sheet
- [x] ~~Pass 3 — photo upload to Drive~~ — removed Oct 23: serial photos are not stored; only the signature is saved to Drive
- [x] Pass 4 — scan buttons on every serial: tire barcode + text fallback, text pre-fill for chassis/engine
- [x] Submitter PDF download
- [ ] Offline queue — on hold, see Open items

## Open items

- **Offline queue (on hold, Oct 23):** Andrew is asking Dan whether it's wanted. Today, a submit with no signal shows an error and the driver taps Submit again later. The plan if approved: the form opens with no signal (service worker), a failed submit is saved on the phone and shows "queued", and it sends itself when signal returns (on iPhone, when the form is next opened — iOS has no background sync). Resends are already safe: the backend ignores a repeated submission ID.
- **Move to the Goodwood Kartways Google account / web address:** steps in `apps-script/SETUP.md`. Decide the final address before printing QR posters.
- **Pilot:** one practice/club day with paper forms as backup.

## Assets

- `img/logo.png`, `img/colourblocks.png` — from goodwoodkartways.com (property of Goodwood Kartways). The `img/*icon*.png` and `img/favicon.png` files are cropped from the logo's "G" mark.
- `fonts/racing-sans-one-latin.woff2` — Racing Sans One (the site's heading font), SIL Open Font License, self-hosted so it works offline.
