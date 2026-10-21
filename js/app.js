(function () {
  "use strict";

  var CFG = window.TECH_CONFIG;
  var DRAFT_KEY = "techFormDraft.v1";

  var form = document.getElementById("tech-form");
  var $ = function (id) { return document.getElementById(id); };

  // Photos live in memory only (keyed by serial field name) until submit.
  var photos = {};

  // ---------- Build the dynamic parts of the form from config ----------

  function fillSelect(select, values) {
    values.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  fillSelect($("kartClass"), CFG.classes);
  fillSelect($("chassisBrand"), CFG.chassisBrands);
  $("declarationText").textContent = "“" + CFG.declaration + "”";
  if (!CFG.endpointUrl) $("demo-banner").hidden = false;

  function renderChecklist() {
    var host = $("checklist");
    CFG.checklist.forEach(function (group) {
      var card = document.createElement("section");
      card.className = "card";
      var h = document.createElement("h2");
      h.textContent = group.section;
      card.appendChild(h);

      group.items.forEach(function (item) {
        if (item.naLabel) {
          // Two-way choice so the item doesn't block drivers it doesn't apply to.
          var wrap = document.createElement("div");
          wrap.className = "check-na";
          wrap.dataset.check = item.id;
          wrap.innerHTML =
            "<div><strong></strong><small></small></div>" +
            '<label class="opt"><input type="radio" value="checked"><span>Checked</span></label>' +
            '<label class="opt"><input type="radio" value="na"><span></span></label>';
          wrap.querySelector("strong").textContent = item.label;
          wrap.querySelector("small").textContent = item.text;
          wrap.querySelectorAll("input").forEach(function (r) { r.name = "chk_" + item.id; });
          wrap.querySelector(".opt:last-child span").textContent = item.naLabel;
          card.appendChild(wrap);
        } else {
          var label = document.createElement("label");
          label.className = "check";
          label.dataset.check = item.id;
          label.innerHTML = '<input type="checkbox"><span><strong></strong><small></small></span>';
          label.querySelector("input").name = "chk_" + item.id;
          label.querySelector("strong").textContent = item.label;
          label.querySelector("small").textContent = item.text;
          card.appendChild(label);
        }
      });
      host.appendChild(card);
    });
  }
  renderChecklist();

  // ---------- Conditional fields ----------

  function syncClassRules() {
    var twoEngines = CFG.twoEngineClasses.indexOf($("kartClass").value) !== -1;
    $("engine2Wrap").hidden = !twoEngines;
    $("engine2Model").required = twoEngines;
    $("engine2Serial").required = twoEngines;
  }

  function syncChassisOther() {
    var other = $("chassisBrand").value === "Other";
    $("chassisOtherWrap").hidden = !other;
    $("chassisOther").required = other;
  }

  $("kartClass").addEventListener("change", syncClassRules);
  $("chassisBrand").addEventListener("change", syncChassisOther);

  // ---------- Serial photo capture ----------

  document.querySelectorAll(".serial").forEach(function (field) {
    var name = field.dataset.serial;
    var input = field.querySelector("input");

    var row = document.createElement("div");
    row.className = "serial-row";
    input.parentNode.insertBefore(row, input);
    row.appendChild(input);

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.setAttribute("capture", "environment");
    fileInput.hidden = true;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-photo";
    btn.textContent = "📷 Photo";
    btn.setAttribute("aria-label", "Take a photo of the serial plate");
    btn.addEventListener("click", function () { fileInput.click(); });
    row.appendChild(btn);
    field.appendChild(fileInput);

    var preview = document.createElement("div");
    preview.className = "photo-preview";
    preview.hidden = true;
    preview.innerHTML = '<img alt="Serial photo"><button type="button" class="btn-link">Remove photo</button>';
    field.appendChild(preview);

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      photos[name] = file;
      preview.querySelector("img").src = URL.createObjectURL(file);
      preview.hidden = false;
      btn.textContent = "📷 Retake";
      fileInput.value = "";
    });

    preview.querySelector("button").addEventListener("click", function () {
      delete photos[name];
      preview.hidden = true;
      btn.textContent = "📷 Photo";
    });
  });

  // ---------- Tire serial soft-check ----------

  document.querySelectorAll(".tire input").forEach(function (input) {
    var warn = document.createElement("p");
    warn.className = "hint-warn";
    warn.hidden = true;
    warn.textContent = "Doesn't look like a usual tire serial (V + 8 digits). Double-check it — you can still submit.";
    input.parentNode.appendChild(warn);

    function check() {
      var v = input.value.trim().toUpperCase();
      warn.hidden = !v || CFG.tireSerialPattern.test(v);
    }
    input.addEventListener("blur", check);
    input.addEventListener("input", function () { if (!warn.hidden) check(); });
  });

  // ---------- Signature pad ----------

  var sig = (function () {
    var canvas = $("signature");
    var pad = canvas.parentNode;
    var ctx = canvas.getContext("2d");
    var drawing = false;
    var hasInk = false;
    var last = null;

    function resize() {
      // Resizing wipes the canvas, so keep what was drawn.
      var saved = hasInk ? canvas.toDataURL() : null;
      var ratio = Math.max(window.devicePixelRatio || 1, 1);
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || canvas.width === Math.round(rect.width * ratio)) return;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
      if (saved) {
        var img = new Image();
        img.onload = function () { ctx.drawImage(img, 0, 0, rect.width, rect.height); };
        img.src = saved;
      }
    }

    function point(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      last = point(e);
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      markSigned();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      e.preventDefault();
      var p = point(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) {
      canvas.addEventListener(t, function () { drawing = false; });
    });

    function markSigned() {
      hasInk = true;
      pad.classList.add("signed");
      $("signatureField").classList.remove("invalid");
    }

    function clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasInk = false;
      pad.classList.remove("signed");
    }

    window.addEventListener("resize", resize);
    resize();

    return {
      resize: resize,
      clear: clear,
      isEmpty: function () { return !hasInk; },
      toDataURL: function () { return canvas.toDataURL("image/png"); },
    };
  })();

  $("clearSignature").addEventListener("click", sig.clear);

  // ---------- Draft autosave (text + ticks only; photos and signature are not kept) ----------

  function saveDraft() {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === "website" || el.type === "file") return;
      if (el.type === "checkbox") data[el.name] = el.checked;
      else if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    });
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }

  function loadDraft() {
    var data;
    try { data = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { data = null; }
    if (!data) return;
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!(el.name in data)) return;
      if (el.type === "checkbox") el.checked = !!data[el.name];
      else if (el.type === "radio") el.checked = data[el.name] === el.value;
      else if (el.type !== "file") el.value = data[el.name];
    });
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* storage unavailable */ }
  }

  loadDraft();
  syncClassRules();
  syncChassisOther();
  form.addEventListener("input", saveDraft);
  form.addEventListener("change", saveDraft);

  // ---------- Validation ----------

  function fieldWrapper(el) {
    return el.closest(".field") || el.closest(".check") || el.closest(".check-na");
  }

  function validate() {
    form.querySelectorAll(".invalid").forEach(function (n) { n.classList.remove("invalid"); });
    var bad = [];

    form.querySelectorAll("input[required], select[required]").forEach(function (el) {
      if (el.closest("[hidden]")) return;
      var ok = el.type === "checkbox" ? el.checked : el.value.trim() !== "";
      if (!ok) bad.push(fieldWrapper(el));
    });

    form.querySelectorAll(".check").forEach(function (label) {
      if (!label.querySelector("input").checked) bad.push(label);
    });
    form.querySelectorAll(".check-na").forEach(function (wrap) {
      if (!wrap.querySelector("input:checked")) bad.push(wrap);
    });

    if (sig.isEmpty()) bad.push($("signatureField"));

    bad = bad.filter(function (n, i) { return n && bad.indexOf(n) === i; });
    bad.forEach(function (n) { n.classList.add("invalid"); });
    return bad;
  }

  // Clear the red state as soon as something is fixed.
  form.addEventListener("change", function (e) {
    var w = fieldWrapper(e.target);
    if (w) w.classList.remove("invalid");
  });
  form.addEventListener("input", function (e) {
    var w = fieldWrapper(e.target);
    if (w && e.target.value && e.target.value.trim()) w.classList.remove("invalid");
  });

  // ---------- Submission ----------

  var ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I, easy to read aloud

  function makeSubmissionId(kartNo, now) {
    var mm = String(now.getMonth() + 1).padStart(2, "0");
    var dd = String(now.getDate()).padStart(2, "0");
    var suffix = "";
    for (var i = 0; i < 3; i++) suffix += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
    var kart = kartNo.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "X";
    return mm + dd + "-" + kart + "-" + suffix;
  }

  function localDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function buildPayload() {
    var v = function (id) { return $(id).value.trim(); };
    var now = new Date();
    var twoEngines = !$("engine2Wrap").hidden;
    var checks = {};
    CFG.checklist.forEach(function (g) {
      g.items.forEach(function (item) {
        var radio = form.querySelector('input[name="chk_' + item.id + '"]:checked');
        if (radio) checks[item.id] = radio.value === "na" ? "N/A" : "Checked";
        else checks[item.id] = form.querySelector('input[name="chk_' + item.id + '"]').checked ? "Checked" : "";
      });
    });

    return {
      submissionId: makeSubmissionId(v("kartNo"), now),
      submittedAt: now.toISOString(),
      eventDate: localDate(now),
      driverName: v("driverName"),
      kartClass: v("kartClass"),
      kartNo: v("kartNo"),
      chassisMake: v("chassisBrand") === "Other" ? v("chassisOther") : v("chassisBrand"),
      chassisModel: v("chassisModel"),
      chassisSerial: v("chassisSerial").toUpperCase(),
      engine1Model: v("engine1Model"),
      engine1Serial: v("engine1Serial").toUpperCase(),
      engine2Model: twoEngines ? v("engine2Model") : "",
      engine2Serial: twoEngines ? v("engine2Serial").toUpperCase() : "",
      tireFront1: v("tireFront1").toUpperCase(),
      tireFront2: v("tireFront2").toUpperCase(),
      tireRear1: v("tireRear1").toUpperCase(),
      tireRear2: v("tireRear2").toUpperCase(),
      checks: checks,
      declarationAgreed: $("agree").checked,
      signerName: v("signerName"),
      signaturePng: sig.toDataURL(),
      honeypot: form.elements.website.value,
    };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("form-error");
    var bad = validate();
    if (bad.length) {
      err.textContent = bad.length === 1 ? "1 item still needs attention (shown in red)." : bad.length + " items still need attention (shown in red).";
      err.hidden = false;
      bad[0].scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    err.hidden = true;

    var payload = buildPayload();
    // Sending to the Google Sheet (and uploading photos) comes in the next build pass.
    if (!CFG.endpointUrl) console.log("Demo mode — payload:", payload, "photos:", Object.keys(photos));

    showConfirmation(payload);
  });

  function showConfirmation(p) {
    clearDraft();
    $("confirmId").textContent = p.submissionId;
    $("confirmSummary").textContent = p.driverName + " · #" + p.kartNo + " · " + p.kartClass;
    form.hidden = true;
    $("demo-banner").hidden = true;
    $("confirmation").hidden = false;
    window.scrollTo(0, 0);
  }

  $("newForm").addEventListener("click", function () {
    form.reset();
    sig.clear();
    photos = {};
    document.querySelectorAll(".photo-preview").forEach(function (p) { p.hidden = true; });
    document.querySelectorAll(".btn-photo").forEach(function (b) { b.textContent = "📷 Photo"; });
    document.querySelectorAll(".hint-warn").forEach(function (w) { w.hidden = true; });
    syncClassRules();
    syncChassisOther();
    $("confirmation").hidden = true;
    form.hidden = false;
    sig.resize();
    if (!CFG.endpointUrl) $("demo-banner").hidden = false;
    window.scrollTo(0, 0);
  });
})();
