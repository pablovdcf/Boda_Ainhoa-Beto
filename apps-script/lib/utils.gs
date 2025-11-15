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
