// Builds the submitter's own PDF copy on the phone, from exactly what was submitted.
// The PDF library loads only when someone taps the button.
(function () {
  "use strict";

  var JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  var CFG = window.TECH_CONFIG;

  var libPromise = null;
  function loadLib() {
    if (!libPromise) {
      libPromise = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = JSPDF_URL;
        s.onload = function () { resolve(window.jspdf.jsPDF); };
        s.onerror = function () { libPromise = null; reject(new Error("Couldn't load the PDF library")); };
        document.head.appendChild(s);
      });
    }
    return libPromise;
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); }; // PDF still works without the logo
      img.src = src;
    });
  }

  // Letter size, in points.
  var PAGE_W = 612, PAGE_H = 792, M = 40;
  var RED = [234, 28, 36], GREY = [64, 64, 65], LINE = [200, 200, 200];

  function build(jsPDF, sub, logo) {
    var f = sub.fields;
    var doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
    var y = 0;

    function ensure(h) {
      if (y + h > PAGE_H - M) { doc.addPage(); y = M; }
    }

    function heading(text) {
      ensure(40);
      y += 8;
      doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(0);
      doc.text(text, M, y);
      y += 4;
      doc.setFillColor.apply(doc, RED).rect(M, y, PAGE_W - 2 * M, 1.5, "F");
      y += 13;
    }

    // Draws one label/value pair at x; returns its height without moving y.
    function cell(x, labelW, valueW, label, value) {
      var labels = doc.setFont("helvetica", "bold").setFontSize(10).splitTextToSize(label, labelW - 8);
      var values = doc.setFont("helvetica", "normal").setFontSize(10).splitTextToSize(value || "\u2014", valueW);
      doc.setFont("helvetica", "bold").setTextColor.apply(doc, GREY).text(labels, x, y);
      doc.setFont("helvetica", "normal").setTextColor(0).text(values, x + labelW, y);
      return Math.max(labels.length, values.length) * 12 + 3;
    }

    // [label, value] pairs side by side, two per line.
    function pairs(items) {
      var colW = (PAGE_W - 2 * M) / 2;
      for (var i = 0; i < items.length; i += 2) {
        ensure(30);
        var h = cell(M, 120, colW - 125, items[i][0], items[i][1]);
        if (items[i + 1]) h = Math.max(h, cell(M + colW + 5, 120, colW - 125, items[i + 1][0], items[i + 1][1]));
        y += h;
      }
    }

    // Header band, like the form's.
    doc.setFillColor(0, 0, 0).rect(0, 0, PAGE_W, 78, "F");
    doc.setFillColor.apply(doc, RED).rect(0, 78, PAGE_W, 5, "F");
    if (logo) doc.addImage(logo, "PNG", M, 14, 150, 150 * logo.naturalHeight / logo.naturalWidth);
    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(255);
    doc.text("Self Technical Declaration", PAGE_W - M, 36, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("Submitter's copy", PAGE_W - M, 52, { align: "right" });
    y = 110;

    // Confirmation box.
    doc.setDrawColor.apply(doc, LINE).setLineWidth(1).roundedRect(M, y - 16, PAGE_W - 2 * M, 44, 4, 4);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor.apply(doc, GREY);
    doc.text("CONFIRMATION NUMBER", M + 12, y);
    doc.text("SUBMITTED", PAGE_W / 2 + 20, y);
    doc.setFont("courier", "bold").setFontSize(16).setTextColor(0);
    doc.text(sub.submissionId, M + 12, y + 19);
    doc.setFont("helvetica", "normal").setFontSize(11);
    doc.text(f["Filled In (phone time)"] || "", PAGE_W / 2 + 20, y + 18);
    y += 44;

    heading("Driver & Kart");
    pairs([
      ["Driver name", f["Driver Name"]], ["Kart No", f["Kart No"]],
      ["Class", f["Class"]], ["Chassis make", f["Chassis Make"]],
      ["Chassis model", f["Chassis Model"]], ["Chassis serial no", f["Chassis Serial"]],
    ]);

    heading("Engines");
    var engines = [["Engine 1 make/model", f["Engine 1 Make/Model"]], ["Engine 1 serial no", f["Engine 1 Serial"]]];
    if (CFG.twoEngineClasses.indexOf(f["Class"]) !== -1) {
      engines.push(["Engine 2 make/model", f["Engine 2 Make/Model"]], ["Engine 2 serial no", f["Engine 2 Serial"]]);
    }
    pairs(engines);

    heading("Tires");
    pairs([
      ["Front tire 1", f["Front Tire 1"]], ["Front tire 2", f["Front Tire 2"]],
      ["Rear tire 1", f["Rear Tire 1"]], ["Rear tire 2", f["Rear Tire 2"]],
    ]);

    CFG.checklist.forEach(function (group) {
      heading(group.section);
      pairs(group.items.map(function (item) { return [item.label, f[item.label]]; }));
    });

    heading("Competitor's Declaration");
    var decl = doc.setFont("helvetica", "italic").setFontSize(10).splitTextToSize("“" + CFG.declaration + "”", PAGE_W - 2 * M);
    ensure(decl.length * 13 + 6);
    doc.setTextColor(0).text(decl, M, y);
    y += decl.length * 13 + 8;
    // Name on the left, signature beside it.
    ensure(75);
    var top = y;
    var colW = (PAGE_W - 2 * M) / 2;
    y += cell(M, 120, colW - 125, "Agreed", f["Declaration Agreed"]);
    y += cell(M, 120, colW - 125, "Driver/Mechanic name", f["Signed By"]);
    var sig = sub.files && sub.files.Signature;
    if (sig) {
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor.apply(doc, GREY);
      doc.text("Signature", M + colW + 5, top);
      doc.addImage("data:" + sig.mimeType + ";base64," + sig.data, "PNG", M + colW + 125, top - 10, 140, 53);
      doc.setDrawColor.apply(doc, LINE).setLineWidth(1).line(M + colW + 125, top + 45, PAGE_W - M, top + 45);
      y = Math.max(y, top + 55);
    }

    // Footer on every page.
    var pages = doc.getNumberOfPages();
    for (var i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(130);
      doc.text("Goodwood Kartways tech form • " + sub.submissionId, M, PAGE_H - 20);
      doc.text("Page " + i + " of " + pages, PAGE_W - M, PAGE_H - 20, { align: "right" });
    }
    return doc;
  }

  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // iPhone Safari only hands over a file in direct response to a tap, so the PDF
  // is built ahead of time (prepare) and handed over instantly on tap (save).
  window.TechPdf = {
    prepare: function (sub) {
      return Promise.all([loadLib(), loadImage("img/logo.png")]).then(function (r) {
        var blob = build(r[0], sub, r[1]).output("blob");
        return new File([blob], "Goodwood-Tech-" + sub.submissionId + ".pdf", { type: "application/pdf" });
      });
    },

    // Call straight from the click handler, with no waiting before it.
    save: function (file) {
      if (isIOS && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Share sheet: Save to Files, Print, Mail, etc.
        return navigator.share({ files: [file], title: file.name }).catch(function (e) {
          if (e.name !== "AbortError") throw e; // closing the sheet isn't an error
        });
      }
      var url = URL.createObjectURL(file);
      var a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      return Promise.resolve();
    },
  };
})();
