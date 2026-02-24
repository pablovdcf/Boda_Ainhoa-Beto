/** Utils genéricos (respuestas HTTP, hojas, helpers) */
var _ssCache = null;

function getSpreadsheet() {
  if (!_ssCache) {
    _ssCache = SpreadsheetApp.openById(CFG.SS_ID);
  }
  return _ssCache;
}

function getSheet(name) {
  var sh = getSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name);
  return sh;
}

function corsify(out) {
  return out
    .setHeader('Access-Control-Allow-Origin', CFG.ALLOWED_ORIGIN)
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonOut(obj) {
  return corsify(
    ContentService.createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

function jsonpOut(callbackName, obj) {
  var safeCb = callbackName || 'callback';
  var payload = safeCb + '(' + JSON.stringify(obj) + ')';
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function respond(e, obj) {
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) return jsonpOut(cb, obj);
  return jsonOut(obj);
}

function requireSecret(value) {
  if (value !== CFG.SHARED_SECRET) {
    throw new Error('unauthorized');
  }
}

function requireAdminKey(value) {
  if ((value || '') !== CFG.ADMIN_KEY) {
    throw new Error('unauthorized');
  }
}

function norm(val) {
  return String(val || '').trim().toLowerCase();
}

function headerIndex(head, candidates) {
  var map = {};
  head.forEach(function (h, i) { map[norm(h)] = i; });
  for (var k = 0; k < candidates.length; k++) {
    var idx = map[norm(candidates[k])];
    if (idx !== undefined) return idx;
  }
  return null;
}

function buildIdxMap(head) {
  var out = {};
  head.forEach(function (h, i) { out[String(h)] = i; });
  return out;
}

function cacheGet(key) {
  return CacheService.getScriptCache().get(key);
}

function cachePut(key, value, seconds) {
  CacheService.getScriptCache().put(key, value, seconds || 60);
}

/** Utils genéricos (respuestas HTTP, hojas, helpers) */
var _ssCache = null;

function getSpreadsheet() {
  if (!_ssCache) {
    _ssCache = SpreadsheetApp.openById(CFG.SS_ID);
  }
  return _ssCache;
}

function getSheet(name) {
  var sh = getSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name);
  return sh;
}

function corsify(out) {
  return out
    .setHeader('Access-Control-Allow-Origin', CFG.ALLOWED_ORIGIN)
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonOut(obj) {
  return corsify(
    ContentService.createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

function jsonpOut(callbackName, obj) {
  var safeCb = callbackName || 'callback';
  var payload = safeCb + '(' + JSON.stringify(obj) + ')';
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function respond(e, obj) {
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) return jsonpOut(cb, obj);
  return jsonOut(obj);
}

function requireSecret(value) {
  if (value !== CFG.SHARED_SECRET) {
    throw new Error('unauthorized');
  }
}

function requireAdminKey(value) {
  if ((value || '') !== CFG.ADMIN_KEY) {
    throw new Error('unauthorized');
  }
}

function norm(val) {
  return String(val || '').trim().toLowerCase();
}

function headerIndex(head, candidates) {
  var map = {};
  head.forEach(function (h, i) { map[norm(h)] = i; });
  for (var k = 0; k < candidates.length; k++) {
    var idx = map[norm(candidates[k])];
    if (idx !== undefined) return idx;
  }
  return null;
}

function buildIdxMap(head) {
  var out = {};
  head.forEach(function (h, i) { out[String(h)] = i; });
  return out;
}

function cacheGet(key) {
  return CacheService.getScriptCache().get(key);
}

function cachePut(key, value, seconds) {
  CacheService.getScriptCache().put(key, value, seconds || 60);
}

/**
 * Genera un token único y lo garantiza contra la columna "token" (col A).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Hoja donde están los tokens (ej: "Invitados")
 * @param {number} length Longitud del token (ej: 8)
 * @returns {string} token único
 */
function generateUniqueToken_(sheet, length) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin I,O,0,1
  const maxAttempts = 200;

  // Lee tokens existentes (col A, desde fila 2)
  const lastRow = sheet.getLastRow();
  const existing = new Set(
    lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(String)
      : []
  );

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let token = "";
    for (let i = 0; i < length; i++) {
      token += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!existing.has(token)) return token;
  }

  throw new Error("No se pudo generar un token único tras varios intentos.");
}

function fillMissingTokens() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Invitados"); // ajusta nombre
  if (!sheet) throw new Error("No existe la hoja 'Invitados'.");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const values = range.getValues();

  let changed = false;
  for (let r = 0; r < values.length; r++) {
    const current = String(values[r][0] || "").trim();
    if (!current) {
      values[r][0] = generateUniqueToken_(sheet, 8); // 8 chars recomendado
      changed = true;
    }
  }

  if (changed) range.setValues(values);
}