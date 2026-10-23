// Reads a serial number out of a photo. Always a suggestion: the person checks it.
// Tires: barcode first (near-perfect when it works), then text recognition.
// Chassis/engine: text recognition only (stamped metal, no standard format).
// Libraries load only the first time someone takes a photo.
(function () {
  "use strict";

  var ZXING_URL = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
  var TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

  var scripts = {};
  function loadScript(url) {
    if (!scripts[url]) {
      scripts[url] = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = url;
        s.onload = resolve;
        s.onerror = function () { delete scripts[url]; reject(new Error("Couldn't load " + url)); };
        document.head.appendChild(s);
      });
    }
    return scripts[url];
  }

  function toCanvas(file, maxPx, rotate) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * scale);
        var h = Math.round(img.naturalHeight * scale);
        var c = document.createElement("canvas");
        c.width = rotate ? h : w;
        c.height = rotate ? w : h;
        var ctx = c.getContext("2d");
        if (rotate) { ctx.translate(h, 0); ctx.rotate(Math.PI / 2); }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Couldn't read photo")); };
      img.src = url;
    });
  }

  // ---------- Barcodes ----------

  function nativeBarcode(canvas) {
    if (!("BarcodeDetector" in window)) return Promise.resolve(null);
    return window.BarcodeDetector.getSupportedFormats()
      .then(function (formats) {
        var linear = formats.filter(function (f) { return f !== "qr_code" && f !== "data_matrix" && f !== "aztec" && f !== "pdf417"; });
        return new window.BarcodeDetector({ formats: linear }).detect(canvas);
      })
      .then(function (found) { return found.length ? found[0].rawValue : null; })
      .catch(function () { return null; });
  }

  function zxingBarcode(canvas) {
    var Z = window.ZXing;
    var hints = new Map();
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    var reader = new Z.MultiFormatReader();
    reader.setHints(hints);
    try {
      var bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
      return reader.decode(bitmap).getText();
    } catch (e) {
      return null; // NotFoundException: no barcode in this image
    }
  }

  function readBarcode(file) {
    return toCanvas(file, 1600, false).then(function (canvas) {
      return nativeBarcode(canvas).then(function (text) {
        if (text) return text;
        return loadScript(ZXING_URL).then(function () {
          var found = zxingBarcode(canvas);
          if (found) return found;
          // Sticker photographed sideways.
          return toCanvas(file, 1600, true).then(zxingBarcode);
        });
      });
    });
  }

  // ---------- Text recognition ----------

  var workerPromise = null;
  function ocrWorker() {
    if (!workerPromise) {
      workerPromise = loadScript(TESSERACT_URL)
        .then(function () { return window.Tesseract.createWorker("eng"); })
        .then(function (worker) {
          return worker.setParameters({ tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-" }).then(function () { return worker; });
        })
        .catch(function (e) { workerPromise = null; throw e; });
    }
    return workerPromise;
  }

  function recognise(file) {
    return Promise.all([ocrWorker(), toCanvas(file, 1600, false)]).then(function (r) {
      return r[0].recognize(r[1]).then(function (res) { return res.data; });
    });
  }

  // Letters OCR commonly confuses with digits, inside what should be all digits.
  var AS_DIGIT = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6" };

  function tireFromText(text) {
    var squashed = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    var m = squashed.match(/V[0-9OQDILZSBG]{8}/);
    if (!m) return null;
    return "V" + m[0].slice(1).replace(/[^0-9]/g, function (ch) { return AS_DIGIT[ch]; });
  }

  // Best-guess serial: a confident word of 4+ characters that contains a digit.
  function serialFromWords(words) {
    var best = null;
    words.forEach(function (w) {
      var t = w.text.toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/^-+|-+$/g, "");
      if (t.length < 4 || !/\d/.test(t)) return;
      if (!best || w.confidence > best.confidence || (w.confidence === best.confidence && t.length > best.text.length)) {
        best = { text: t, confidence: w.confidence };
      }
    });
    return best ? best.text : null;
  }

  // ---------- Public ----------

  window.SerialReader = {
    // kind: "tire" or "serial". Resolves to { value, source } or null.
    read: function (file, kind) {
      if (kind === "tire") {
        return readBarcode(file)
          .catch(function () { return null; })
          .then(function (code) {
            if (code) return { value: code.trim().toUpperCase(), source: "barcode" };
            return recognise(file).then(function (data) {
              var v = tireFromText(data.text);
              return v ? { value: v, source: "text" } : null;
            });
          });
      }
      return recognise(file).then(function (data) {
        var v = serialFromWords(data.words || []);
        return v ? { value: v, source: "text" } : null;
      });
    },
  };
})();
