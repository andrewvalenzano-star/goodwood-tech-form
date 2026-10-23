(function () {
  "use strict";

  var CFG = window.TECH_CONFIG;

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
    // Engine 2 is shown for ROK classes but never required.
    $("engine2Wrap").hidden = !twoEngines;
  }

  function syncChassisOther() {
    var other = $("chassisBrand").value === "Other";
    $("chassisOtherWrap").hidden = !other;
    $("chassisOther").required = other;
  }

  $("kartClass").addEventListener("change", syncClassRules);
  $("chassisBrand").addEventListener("change", syncChassisOther);

  // ---------- Serial photo capture + reading ----------

  var BTN_IDLE = "📷 Scan";
  var BTN_AGAIN = "📷 Retake";

  document.querySelectorAll(".serial").forEach(function (field) {
    var name = field.dataset.serial;
    var kind = field.classList.contains("tire") ? "tire" : "serial";
    var input = field.querySelector("input");
    var autoFilled = null; // last value we put in the box, so a re-scan can replace it
    var readToken = 0;     // ignores a slow read if a newer photo was taken meanwhile

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
    btn.textContent = BTN_IDLE;
    btn.setAttribute("aria-label", kind === "tire" ? "Take a photo of the tire sticker" : "Take a photo of the serial plate");
    btn.addEventListener("click", function () { fileInput.click(); });
    row.appendChild(btn);
    field.appendChild(fileInput);

    var status = document.createElement("p");
    status.className = "read-status";
    status.hidden = true;
    field.appendChild(status);

    var preview = document.createElement("div");
    preview.className = "photo-preview";
    preview.hidden = true;
    preview.innerHTML = '<img alt="Serial photo"><button type="button" class="btn-link">Remove photo</button>';
    field.appendChild(preview);

    function setStatus(cls, text) {
      status.className = "read-status " + cls;
      status.textContent = text;
      status.hidden = false;
    }

    function fill(value) {
      input.value = value;
      autoFilled = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("blur"));
    }

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      photos[name] = file;
      preview.querySelector("img").src = URL.createObjectURL(file);
      preview.hidden = false;
      btn.textContent = BTN_AGAIN;

      var token = ++readToken;
      setStatus("busy", kind === "tire" ? "Reading barcode…" : "Reading serial…");
      window.SerialReader.read(file, kind)
        .then(function (result) {
          if (token !== readToken) return;
          if (!result) {
            setStatus("fail", "Couldn't read it from the photo — please type it in. The photo is still saved.");
            return;
          }
          var current = input.value.trim().toUpperCase();
          if (!current || current === autoFilled || current === result.value) {
            fill(result.value);
            setStatus("ok", (result.source === "barcode" ? "Read from barcode" : "Read from photo") + " — check it matches.");
          } else {
            // Don't overwrite something the person typed; offer it instead.
            status.className = "read-status ok";
            status.textContent = "Photo reads " + result.value + ". ";
            var use = document.createElement("button");
            use.type = "button";
            use.className = "btn-link";
            use.textContent = "Use this";
            use.addEventListener("click", function () {
              fill(result.value);
              setStatus("ok", "Read from photo — check it matches.");
            });
            status.appendChild(use);
            status.hidden = false;
          }
        })
        .catch(function (e) {
          if (token !== readToken) return;
          console.error(e);
          setStatus("fail", "Couldn't read it (no signal?) — please type it in. The photo is still saved.");
        });
    });

    preview.querySelector("button").addEventListener("click", function () {
      readToken++;
      delete photos[name];
      preview.hidden = true;
      status.hidden = true;
      btn.textContent = BTN_IDLE;
    });

    field.resetSerial = function () {
      readToken++;
      autoFilled = null;
      preview.hidden = true;
      status.hidden = true;
      btn.textContent = BTN_IDLE;
    };
  });

  // ---------- Tire serial soft-check ----------

  document.querySelectorAll(".tire input").forEach(function (input) {
    var warn = document.createElement("p");
    warn.className = "hint-warn";
    warn.hidden = true;
    warn.textContent = "Doesn't look like a usual tire serial (V + 8 digits). Double-check it — you can still submit.";
    input.closest(".field").appendChild(warn);

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

  // ---------- Always start blank ----------

  // Earlier versions saved a draft on the phone; forget it.
  try { localStorage.removeItem("techFormDraft.v1"); } catch (e) { /* storage unavailable */ }

  function resetForm() {
    form.reset();
    sig.clear();
    photos = {};
    pendingId = null;
    document.querySelectorAll(".serial").forEach(function (f) { f.resetSerial(); });
    document.querySelectorAll(".hint-warn").forEach(function (w) { w.hidden = true; });
    form.querySelectorAll(".invalid").forEach(function (n) { n.classList.remove("invalid"); });
    $("form-error").hidden = true;
    syncClassRules();
    syncChassisOther();
  }

  // Some browsers restore typed values on reload or Back; wipe them.
  window.addEventListener("pageshow", function (e) { if (e.persisted) resetForm(); });
  resetForm();

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

  // One ID per form, so tapping Submit again after a failed send can't create a second row.
  var pendingId = null;

  function submissionIdFor(kartNo) {
    if (!pendingId || pendingId.kartNo !== kartNo) {
      pendingId = { kartNo: kartNo, id: makeSubmissionId(kartNo, new Date()) };
    }
    return pendingId.id;
  }

  // Phone photos are 3–12 MB; shrink to something that uploads on one bar of signal.
  var PHOTO_MAX_PX = 1600;

  function compressPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, PHOTO_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(base64File(canvas.toDataURL("image/jpeg", 0.8)));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Couldn't read photo")); };
      img.src = url;
    });
  }

  function base64File(dataUrl) {
    var comma = dataUrl.indexOf(",");
    return { mimeType: dataUrl.slice(5, dataUrl.indexOf(";")), data: dataUrl.slice(comma + 1) };
  }

  function checkValue(item) {
    var picked = form.querySelector('input[name="chk_' + item.id + '"]:checked');
    if (!picked) return "";
    return picked.value === "na" ? "N/A" : "Checked";
  }

  // Keys become Sheet column headers, in this order.
  function buildPayload() {
    var v = function (id) { return $(id).value.trim(); };
    var up = function (id) { return v(id).toUpperCase(); };
    var now = new Date();
    var twoEngines = !$("engine2Wrap").hidden;

    var fields = {
      "Event Date": localDate(now),
      "Driver Name": v("driverName"),
      "Class": v("kartClass"),
      "Kart No": v("kartNo"),
      "Chassis Make": v("chassisBrand") === "Other" ? v("chassisOther") : v("chassisBrand"),
      "Chassis Model": v("chassisModel"),
      "Chassis Serial": up("chassisSerial"),
      "Engine 1 Make/Model": v("engine1Model"),
      "Engine 1 Serial": up("engine1Serial"),
      "Engine 2 Make/Model": twoEngines ? v("engine2Model") : "",
      "Engine 2 Serial": twoEngines ? up("engine2Serial") : "",
      "Front Tire 1": up("tireFront1"),
      "Front Tire 2": up("tireFront2"),
      "Rear Tire 1": up("tireRear1"),
      "Rear Tire 2": up("tireRear2"),
    };
    CFG.checklist.forEach(function (g) {
      g.items.forEach(function (item) { fields[item.label] = checkValue(item); });
    });
    fields["Declaration Agreed"] = $("agree").checked ? "Yes" : "No";
    fields["Signed By"] = v("signerName");
    fields["Filled In (phone time)"] = localDate(now) + " " + now.toTimeString().slice(0, 8);

    return {
      submissionId: submissionIdFor(v("kartNo")),
      honeypot: form.elements.website.value,
      fields: fields,
      files: {
        "Chassis Serial Photo": photos.chassisSerial || null,
        "Engine 1 Serial Photo": photos.engine1Serial || null,
        "Engine 2 Serial Photo": twoEngines ? photos.engine2Serial || null : null,
        "Front Tire 1 Photo": photos.tireFront1 || null,
        "Front Tire 2 Photo": photos.tireFront2 || null,
        "Rear Tire 1 Photo": photos.tireRear1 || null,
        "Rear Tire 2 Photo": photos.tireRear2 || null,
        "Signature": sig.toDataURL(),
      },
    };
  }

  // Replaces File objects / data URLs in payload.files with { mimeType, data }.
  function encodeFiles(payload) {
    var labels = Object.keys(payload.files);
    return Promise.all(labels.map(function (label) {
      var f = payload.files[label];
      if (!f) return null;
      return typeof f === "string" ? base64File(f) : compressPhoto(f);
    })).then(function (encoded) {
      labels.forEach(function (label, i) { payload.files[label] = encoded[i]; });
      return payload;
    });
  }

  function send(payload) {
    // text/plain keeps this a "simple" request, which Apps Script accepts from another site.
    return fetch(CFG.endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(function (res) { return res.json(); })
      .then(function (body) {
        if (!body.ok) throw new Error(body.error || "Server error");
        return body;
      });
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
    if (!CFG.endpointUrl) {
      console.log("Demo mode — payload:", payload);
      showConfirmation(payload);
      return;
    }

    var btn = $("submitBtn");
    btn.disabled = true;
    btn.textContent = "Sending…";
    encodeFiles(payload)
      .then(send)
      .then(function () { showConfirmation(payload); })
      .catch(function (ex) {
        console.error(ex);
        err.textContent = "Couldn't send your form. Check your signal and tap Submit again — your answers are still here.";
        err.hidden = false;
        err.scrollIntoView({ behavior: "smooth", block: "center" });
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "Submit tech form";
      });
  });

  function showConfirmation(p) {
    pendingId = null;
    $("confirmId").textContent = p.submissionId;
    $("confirmSummary").textContent = p.fields["Driver Name"] + " · #" + p.fields["Kart No"] + " · " + p.fields["Class"];
    form.hidden = true;
    $("demo-banner").hidden = true;
    $("confirmation").hidden = false;
    window.scrollTo(0, 0);
  }

  $("newForm").addEventListener("click", function () {
    resetForm();
    $("confirmation").hidden = true;
    form.hidden = false;
    sig.resize();
    if (!CFG.endpointUrl) $("demo-banner").hidden = false;
    window.scrollTo(0, 0);
  });
})();
