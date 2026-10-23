// All the things that change from season to season live here.
// Editing a list below is a one-line change; no other file needs touching.
window.TECH_CONFIG = {
  // Apps Script web-app URL. Empty = demo mode (nothing is sent anywhere).
  // When moving to the Goodwood Kartways Google account, redeploy the script
  // there and paste the new URL here. The form's own URL / QR code stays the same.
  endpointUrl: "https://script.google.com/macros/s/AKfycbwZ_Yf1rdaxT-p8lv1Atmreruyu_522-Brn1AZNAQOCtH5I-JnIxbkRMgl0fiO1lNKOQQ/exec",

  // From the 2026 Goodwood Kartways Race Entry Form, plus T4.
  classes: [
    "Kid Kart",
    "Briggs Cadet",
    "Briggs Junior Lite",
    "Briggs Junior",
    "Briggs Senior",
    "Briggs Masters",
    "Mini Rok",
    "VLR Junior",
    "VLR Senior",
    "VLR Masters",
    "T4",
  ],

  // Classes that show the Engine 2 fields ("ROK CLASSES ONLY" on the paper form).
  twoEngineClasses: ["Mini Rok", "VLR Junior", "VLR Senior", "VLR Masters"],

  // Classes whose minimum number height is 5" instead of 6".
  cadetClasses: ["Briggs Cadet"],

  // Choosing "Other" reveals a free-text make field.
  chassisBrands: [
    "OTK (all brands)",
    "IPK (all brands)",
    "Birel (all brands)",
    "CRG (all brands)",
    "Parolin",
    "Intrepid",
    "Sodi",
    "Tillotson",
    "Arrow",
    "Other",
  ],

  // Soft check only: a mismatch shows a warning but never blocks submitting.
  tireSerialPattern: /^V\d{8}$/,

  // Verbatim from the 2026 TRAK Self Technical Declaration.
  checklist: [
    {
      section: "Driver Protection — Competitor Check",
      items: [
        { id: "helmet", label: "Helmet", text: "Full coverage with visor. In compliance with 2026 KartSport Canada Karting Regulations — Book 1." },
        { id: "rib", label: "Rib Protector", text: "Unaltered, designed for motorsport use." },
        { id: "suit", label: "Driver Suit and Apparel", text: "Karting specific. Abrasion resistant shoes and gloves." },
        {
          id: "hair",
          label: "Long Hair Protection",
          text: "Balaclava required if hair extends beneath helmet level.",
          naLabel: "N/A — hair does not extend beneath helmet",
        },
      ],
    },
    {
      section: "Competition Numbers and Number Panels",
      items: [
        { id: "panels", label: "Number Panels (4)", text: "1 — Front/center, 2 — Sides/vertical, 1 — Rear/center. Yellow background." },
        { id: "numbers", label: "Numbers", text: "Black. Min. 6\" high, 1\" wide. Cadet Min. 5\" high." },
      ],
    },
    {
      section: "Kart Condition",
      items: [
        { id: "frame", label: "Frame Condition and Chassis Welds", text: "No visible cracking." },
        { id: "axles", label: "Axles and Bearings", text: "No excessive play." },
        { id: "wheels", label: "Wheels & Tires", text: "No visible damage." },
        { id: "steering", label: "Steering Components", text: "No excessive play." },
        { id: "seat", label: "Seat Mounting & Supports", text: "No visible cracking." },
        { id: "bodywork", label: "Bodywork Mounting & Supports", text: "Securely fastened as per regulations." },
        { id: "ballast", label: "Ballast Weights", text: "Properly secured." },
        { id: "brakes", label: "Brakes", text: "Proper function. Adequate brake pad thickness. No visible cracking." },
        { id: "chainguard", label: "Chain/Oil Guard", text: "Must be in place as per Regulations." },
        { id: "throttle", label: "Throttle", text: "Throttle not sticking. Return spring operational." },
      ],
    },
    {
      section: "Fluids",
      items: [
        { id: "fuel", label: "Fuel System", text: "Tank, mounts, lines and cap." },
        { id: "lines", label: "Fluid Lines", text: "Hoses/connectors: brake, water, oil. Breathers and catch cans. Clamps and mounts." },
      ],
    },
  ],

  declaration:
    "The undersigned acknowledges that at all times it is the competitors responsibility to ensure that the kart and components entered and used in competition meet the technical requirements throughout the entire race event.",
};
