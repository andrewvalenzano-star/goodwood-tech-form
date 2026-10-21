/**
 * Goodwood tech form backend.
 *
 * Lives inside the "Tech Submissions" Google Sheet (Extensions → Apps Script).
 * The form POSTs one JSON submission; this appends a row and saves photos and
 * the signature to a Drive folder next to the Sheet.
 *
 * Columns are created from whatever the form sends, so adding a class or a
 * checklist item in js/config.js needs no change here.
 *
 * Moving to another Google account (e.g. Goodwood Kartways): make a copy of the
 * Sheet in that account (this script is copied with it), run setup() once,
 * deploy as a web app, and put the new URL in js/config.js.
 */

var SHEET_NAME = 'Submissions';
var PHOTO_FOLDER_NAME = 'Tech Submission Photos';
var FOLDER_PROP = 'PHOTO_FOLDER_ID';
var TIME_ZONE = 'America/Toronto';

// Always first, in this order. Everything after comes from the form.
var FIXED_HEADERS = ['Submission ID', 'Received', 'Kart submissions today', 'Superseded by'];

/** Run once from the editor. Also triggers Google's permission prompt. */
function setup() {
  SpreadsheetApp.getActiveSpreadsheet().setSpreadsheetTimeZone(TIME_ZONE);
  ensureHeaders_(getSheet_(), []);
  photoFolder_();
}

function doGet() {
  return json_({ ok: true, message: 'Goodwood tech form endpoint is running.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse(e.postData.contents);
    var fields = data.fields || {};
    var files = data.files || {};

    // Honeypot filled in: a bot. Pretend it worked, store nothing.
    if (data.honeypot) return json_({ ok: true, submissionId: data.submissionId });

    lock.waitLock(30000);

    var sheet = getSheet_();
    var headers = ensureHeaders_(sheet, Object.keys(fields).concat(Object.keys(files)));
    var col = function (name) { return headers.indexOf(name); };

    var lastRow = sheet.getLastRow();
    var existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues() : [];

    // The phone may resend after a dropped connection: already saved, nothing to do.
    for (var i = 0; i < existing.length; i++) {
      if (existing[i][col('Submission ID')] === data.submissionId) {
        return json_({ ok: true, submissionId: data.submissionId, alreadyReceived: true });
      }
    }

    // Earlier submissions for the same kart on the same event date.
    var kartKey = normKart_(fields['Kart No']);
    var earlierRows = [];
    existing.forEach(function (row, i) {
      if (row[col('Event Date')] === fields['Event Date'] && normKart_(row[col('Kart No')]) === kartKey) {
        earlierRows.push(i + 2);
      }
    });

    var folder = dayFolder_(fields['Event Date']);
    var links = {};
    Object.keys(files).forEach(function (label) {
      var f = files[label];
      if (!f || !f.data) return;
      var ext = f.mimeType === 'image/png' ? '.png' : '.jpg';
      var blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.mimeType, data.submissionId + ' ' + label + ext);
      links[label] = folder.createFile(blob).getUrl();
    });

    var row = headers.map(function () { return ''; });
    row[col('Submission ID')] = data.submissionId;
    row[col('Received')] = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
    row[col('Kart submissions today')] = String(earlierRows.length + 1);
    Object.keys(fields).forEach(function (k) { row[col(k)] = fields[k] == null ? '' : String(fields[k]); });

    var newRow = sheet.getLastRow() + 1;
    // Plain text so the Sheet never turns kart "007" into 7 or a serial into a date.
    var range = sheet.getRange(newRow, 1, 1, headers.length);
    range.setNumberFormat('@').setValues([row]);

    Object.keys(links).forEach(function (label) {
      var link = SpreadsheetApp.newRichTextValue().setText('View').setLinkUrl(links[label]).build();
      sheet.getRange(newRow, col(label) + 1).setRichTextValue(link);
    });

    earlierRows.forEach(function (r) {
      sheet.getRange(r, col('Superseded by') + 1).setNumberFormat('@').setValue(data.submissionId);
    });

    return json_({ ok: true, submissionId: data.submissionId, kartSubmissionsToday: earlierRows.length + 1 });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;
  var first = ss.getSheets()[0];
  if (first.getLastRow() === 0) return first.setName(SHEET_NAME);
  return ss.insertSheet(SHEET_NAME);
}

/** Makes sure every name has a column (new ones go on the end) and returns the header row. */
function ensureHeaders_(sheet, names) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var before = headers.length;
  FIXED_HEADERS.concat(names).forEach(function (n) {
    if (headers.indexOf(n) === -1) headers.push(n);
  });
  if (headers.length !== before) {
    if (headers.length > sheet.getMaxColumns()) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#000000').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(1);
  }
  return headers;
}

/** The photo folder sits next to the Sheet; created on first use. */
function photoFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(FOLDER_PROP);
  if (id) {
    try {
      var existing = DriveApp.getFolderById(id);
      if (!existing.isTrashed()) return existing;
    } catch (e) { /* deleted or no access: make a new one */ }
  }
  var parents = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var folder = parent.createFolder(PHOTO_FOLDER_NAME);
  props.setProperty(FOLDER_PROP, folder.getId());
  return folder;
}

/** One sub-folder per event date keeps a season's photos browsable. */
function dayFolder_(eventDate) {
  var parent = photoFolder_();
  var name = eventDate || 'Undated';
  var found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

/** "007", "7" and " #7 " are the same kart. */
function normKart_(v) {
  return String(v || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().replace(/^0+(?=.)/, '');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
