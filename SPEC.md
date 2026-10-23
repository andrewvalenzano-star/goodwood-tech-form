# Kart Tech Form — Web App Spec

**Purpose:** Replace the paper TRAK Self Technical Declaration at Goodwood Kartways with a phone-friendly web form. Drivers/mechanics submit from any phone browser; submissions land in a central Google Sheet Dan controls, with serial-number photos attached. Built to make race mornings faster for everyone — a paddock favor, not a commercial product.

**Status:** Draft v4 (Oct 21, 2026) — reconciled against the actual **2026 TRAK Self Technical Declaration**, the **2026 Goodwood Kartways Race Entry Form** (source of the class list), photos of real tire serials, and Andrew's design decisions (class list incl. T4, chassis brand dropdown, no printable sheet, submitter PDF download). Checklist wording and declaration text are verbatim from the tech form. Remaining open questions are listed in §9.

---

## 1. Users and flow

- **Submitter:** driver or mechanic, on their own phone (any iOS/Android), in the paddock, possibly on weak signal.
- **Reviewer:** Dan (track operator). Reads the Sheet; may filter by event date and class.
- **Flow:** open link (or scan QR code posted at registration/tech) → fill form → photograph serial plates (optional but encouraged) → complete the competitor checks → declaration + signature → submit. If offline, the form queues on the phone and auto-sends when signal returns.
- **Confirmation:** on-screen success with a submission ID (e.g., date + kart number), so tech can ask "what's your confirmation?" at the kart.
- The form starts completely blank every time it's opened — nothing is remembered on the phone (Andrew, Oct 23).
- The paper form's instruction carries over: *"This form must be completed in full at the time and to the personnel announced at the event."*

## 2. Form fields (per the actual 2026 TRAK form)

### Driver / kart header
| Field | Type | Notes |
|---|---|---|
| Driver name | text | required |
| Class | dropdown | From the 2026 entry form, plus T4 (confirmed by Andrew, Oct 21): **Kid Kart, Briggs Cadet, Briggs Junior Lite, Briggs Junior, Briggs Senior, Briggs Masters, Mini Rok, VLR Junior, VLR Senior, VLR Masters, T4.** Class choice drives the Engine 2 rule below. Keep the list in one config file so adding classes is a one-line edit. |
| Kart No | text/numeric | required |
| Chassis Make/Model | **dropdown + free text** | Brand dropdown: **OTK (all brands), IPK (all brands), Birel (all brands), CRG (all brands), Parolin, Intrepid, Sodi, Tillotson, Arrow, Other.** Selecting **Other** reveals a free-text field for the make. Model stays a text field next to it. (Andrew's list, Oct 21 — "Tollotson" read as **Tillotson**; flag if wrong.) |
| Chassis Serial No | text + camera/OCR | photo attach; serial formats are not standardized, so OCR is a pre-fill only, always human-verified |

### Engines
| Field | Type | Notes |
|---|---|---|
| Engine 1 Make/Model | **text field** (same reasoning as chassis — class usually dictates the engine anyway; flag for Andrew/Dan to veto) | required |
| Engine 1 Serial No | text + camera/OCR | photo attach; formats not standardized — human-verified pre-fill only |
| Engine 2 Make/Model | text | **Optional** (Andrew, Oct 21). **ROK CLASSES ONLY** — show only when the selected class is a ROK class (Mini Rok, VLR Junior, VLR Senior, VLR Masters — confirm VLR counts for this rule with Dan) |
| Engine 2 Serial No | text + camera/OCR | **Optional.** ROK classes only; photo attach |

### Tires (front pair, rear pair — as laid out on the paper form)
| Field | Type | Notes |
|---|---|---|
| Front Tires — Serial No × 2 | **barcode scan** + text fallback | one scan per tire (each tire has its own sticker) |
| Rear Tires — Serial No × 2 | **barcode scan** + text fallback | one scan per tire |

**Tire serial format (from Andrew's photos):** a white sticker on the tire carries a standard 1D barcode with the serial printed beneath it in human-readable form — format **V + 8 digits** (e.g., V31155731, V43641304). This makes tires the most automatable field on the form: scan, don't type. The form can soft-validate against the `V########` pattern (warn, don't block — other tire brands may differ).

## 3. Competitor checks (verbatim items from the paper form)

Each item is a checkbox the submitter must check to submit. The criterion text from the form appears as the item's description.

### Driver Protection — Competitor Check
- **Helmet:** Full coverage with visor. In compliance with 2026 KartSport Canada Karting Regulations — Book 1.
- **Rib Protector:** Unaltered, designed for motorsport use.
- **Driver Suit and Apparel:** Karting specific. Abrasion resistant shoes and gloves.
- **Long Hair Protection:** Balaclava required if hair extends beneath helmet level. *(In the web form, offer an "N/A — hair does not extend beneath helmet" path so this doesn't block short-haired drivers.)*

### Competition Numbers and Number Panels
- **Number Panels (4):** 1 — Front/center, 2 — Sides/vertical, 1 — Rear/center. Yellow background.
- **Numbers:** Black. Min. 6" high, 1" wide. Cadet Min. 5" high.

### Kart condition checks
- **Frame Condition and Chassis Welds:** No visible cracking.
- **Axles and Bearings:** No excessive play.
- **Wheels & Tires:** No visible damage.
- **Steering Components:** No excessive play.
- **Seat Mounting & Supports:** No visible cracking.
- **Bodywork Mounting & Supports:** Securely fastened as per regulations.
- **Ballast Weights:** Properly secured.
- **Brakes:** Proper function. Adequate brake pad thickness. No visible cracking.
- **Chain/Oil Guard:** Must be in place as per Regulations.
- **Throttle:** Throttle not sticking. Return spring operational.

### Fluids
- **Fuel System:** Tank, mounts, lines and cap.
- **Fluid Lines:** Hoses/connectors: brake, water, oil. Breathers and catch cans. Clamps and mounts.

## 4. Declaration and signature (verbatim from the paper form)

> **Competitor's Declaration:** "The undersigned acknowledges that at all times it is the competitors responsibility to ensure that the kart and components entered and used in competition meet the technical requirements throughout the entire race event."

*(The paper form spells "technical" as "techincal" — use the corrected spelling in the app unless Dan wants it letter-for-letter.)*

- Checkbox: submitter agrees to the declaration.
- **Driver/Mechanic Name:** typed (as on the paper form).
- **Driver/Mechanic Signature:** the paper form has a signature line, so the web form includes a **finger-drawn signature pad** plus automatic timestamp.

## 5. Serial capture: barcode first for tires, OCR assist for the rest

### Tires — barcode scanning
- Each tire field gets a **Scan** button → phone camera takes a photo of the sticker → the barcode decodes and fills the field; if no barcode is found, text recognition looks for the printed `V########` (Andrew, Oct 23: camera + OCR for tires too). Fast and effectively error-free compared to typing 9 characters off a curved sticker.
- Implementation: in-browser barcode decoding (ZXing-JS works everywhere; the native BarcodeDetector API can be used where the browser supports it, with ZXing as fallback). No app install needed.
- The scan also keeps the captured frame/photo with the submission as backup.
- Typed entry and OCR of the printed digits remain as fallbacks if a sticker is damaged.

### Chassis and engine serials — photo + OCR assist
- Each serial field gets a camera button → phone camera → photo captured in-form.
- **Photos are always saved** with the submission (stored in a Google Drive folder Dan owns; Sheet row holds the links). The photo is the source of truth.
- **OCR is an assist, never the authority:** after a photo is taken, OCR attempts to read the serial and pre-fills the text field. The submitter must eyeball and correct it before submitting. These serials are **not standardized** (Andrew) and are stamped/engraved on metal in flat light — the worst case for OCR. Expect it to save typing most of the time, not all of the time.
- OCR implementation options:
  - **Tesseract.js** (in-browser): free, works offline, weaker accuracy.
  - **Google Cloud Vision API**: much better accuracy, tiny per-image cost, needs connectivity + API key.
  - **Recommendation:** ship v1 with Tesseract.js + manual correction. Revisit Cloud Vision only if real-world accuracy is poor.

## 6. Data and backend

- **Repository:** one Google Sheet owned by Dan ("Tech Submissions"), one row per submission, columns matching the form fields + photo links + timestamp + submission ID. Dan can filter/sort/print from it.
- **Backend (recommended):** a Google Apps Script web endpoint attached to Dan's Sheet. Form POSTs JSON → script appends the row and saves photos to Drive. No server to run, no cost, and the data lives in Dan's own Google account — he can revoke access anytime. That ownership point matters for getting a busy track operator to say yes.
- **Duplicate handling:** submitting again with same event date + kart number flags rather than silently duplicating ("2 submissions" note in Sheet); Dan uses the latest.
- **No printable sheet for tech** (decided Oct 21) — Dan works from the Sheet.
- **Submitter's own PDF:** after a successful submission, the confirmation screen offers **"Download PDF"** — a copy of the completed form for the submitter's own records (all fields, checklist, declaration, signature, timestamp, submission ID). Generated on the phone from the submitted data, so it works even if the submission is still queued offline.

## 7. Frontend, hosting, domain

- Single-page web app, mobile-first, big touch targets, readable in sunlight.
- **PWA behavior:** installable to home screen (optional), and **offline queue** — form data + photos stored locally and synced when connectivity returns. Non-negotiable for paddock use.
- No accounts, no passwords for submitters. The link is the access. (Dan's Sheet stays private; the form is write-only.) Add a simple honeypot field against spam; don't over-engineer.
- **Hosting:** static site, free tier — Cloudflare Pages, Netlify, Vercel, or GitHub Pages. Apps Script backend is also free. **Total running cost: $0.**
- **Domain:** NOT required (a free address like `goodwood-tech.pages.dev` works). A short custom domain (~$12–15/yr) is worth it only because it's sayable/printable.
- **QR codes matter more than the domain:** print QR-code posters for registration and tech — nobody types a URL at 8 AM with a kart on a stand.
- Accounts ideally in Dan's name eventually (or Andrew's, with a note that it transfers). Data (Sheet + Drive) should be Dan's from day one.

## 8. Build plan (Claude Code on laptop)

1. ~~Reconcile spec against the real paper form~~ — done in v2.
2. Repo with this SPEC.md; build in Claude Code in small passes: form UI → Sheet/Apps Script endpoint → photo upload → OCR pre-fill → offline queue → polish.
3. Test on a real iPhone and a real Android, outdoors, on cell data.
4. Show Dan a working demo with his own Sheet before any race day depends on it.
5. Pilot at one club/practice day with paper forms as backup. Then make it the default.

## 9. Remaining open questions for Dan

1. Long-hair item: OK to give it an N/A path in the web form?
2. Who else besides Dan gets view access to the Sheet?

*(Resolved: class list incl. T4 — confirmed. Engine 2 applies to Mini Rok + VLR Junior/Senior/Masters — assumption confirmed by Andrew. Chassis dropdown list — supplied by Andrew (with Other → free text). Tire serials — barcode stickers, V + 8 digits, one per tire. No printable sheet for tech; submitter gets a PDF download instead.)*
