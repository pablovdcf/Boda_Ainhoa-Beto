function handleRsvp(params) {
  var token = String(params.token || '').trim();
  if (!token) return { ok: false, error: 'missing_token' };
  var asistencia = String(params.asistencia || '').trim().toLowerCase();
  if (!asistencia) return { ok: false, error: 'missing_asistencia' };
  var debugEnabled = String(params.debug || '') === '1';

  var titular = loadTitular(token);
  if (!titular) return { ok: false, error: 'not_found' };

  var acompCount = Math.max(0, Math.min(Number(params.acompanantes || 0), titular.maxAcompanantes));
  var menuTitular = normalizeTextLimit_(params.menu || '', 80);
  var alergiasTitular = normalizeTextLimit_(params.alergias || '', 200);
  var notasTitular = normalizeTextLimit_(params.notas_titular || '', 300);
  var cancion = normalizeTextLimit_(params.cancion || '', 120);
  var acompList = sanitizeAcompList_(normalizeAcompanantesInput(params.acompanantes_nombres)).slice(0, acompCount);
  var acompJson = JSON.stringify(acompList);

  var signature = [
    token,
    asistencia,
    acompCount,
    menuTitular,
    alergiasTitular,
    notasTitular,
    params.bus ? '1' : '0',
    cancion,
    acompJson
  ].join('|');

  var signatureLen = signature.length;
  var signatureBytes = Utilities.newBlob(signature).getBytes().length;
  var cacheKeyLen = -1;

  logRsvpDiag_('begin', {
    action: 'rsvp',
    functionName: 'handleRsvp',
    tokenHint: tokenHint_(token),
    acompanantes: acompCount,
    lengths: {
      menu: menuTitular.length,
      alergias: alergiasTitular.length,
      notas_titular: notasTitular.length,
      cancion: cancion.length,
      acomp_json: acompJson.length,
      signature_chars: signatureLen,
      signature_bytes: signatureBytes
    }
  });

  try {
    var cacheKey = buildRsvpCacheKey_(signature);
    cacheKeyLen = cacheKey.length;
    logRsvpDiag_('cache_get', {
      helper: 'cacheGet',
      key_len: cacheKeyLen,
      signature_bytes: signatureBytes
    });
    if (cacheGet(cacheKey)) return { ok: true, dedup: true };

    logRsvpDiag_('cache_put', {
      helper: 'cachePut',
      key_len: cacheKeyLen,
      signature_bytes: signatureBytes,
      ttl: CFG.CACHE_RSVP_SECONDS
    });
    cachePut(cacheKey, '1', CFG.CACHE_RSVP_SECONDS);
  } catch (cacheErr) {
    logRsvpDiag_('cache_error', {
      helper: cacheKeyLen > 0 ? 'cachePut/cacheGet' : 'buildRsvpCacheKey_',
      key_len: cacheKeyLen,
      signature_bytes: signatureBytes,
      error: String(cacheErr)
    });
  }

  syncAcompanantes(titular, acompList);
  updateTitularFields(titular, {
    menu: menuTitular,
    alergias: alergiasTitular,
    notas_titular: notasTitular,
    status: asistencia
  });

  var logInfo = logRespuesta({
    token: token,
    nombre: titular.nombre,
    asistencia: asistencia,
    acompanantes: acompCount,
    menu: menuTitular,
    alergias: alergiasTitular,
    notas_titular: notasTitular,
    bus: params.bus === true || params.bus === 'true',
    cancion: cancion,
    acompList: acompList
  });

  try {
    if (titular.email) {
      sendRsvpEmail({
        email: titular.email,
        nombre: titular.nombre,
        asistencia: asistencia
      });
      markEmailSent(logInfo);
    }
  } catch (err) {
    Logger.log(err);
  }

  logRsvpDiag_('saved', {
    action: 'rsvp',
    functionName: 'handleRsvp',
    tokenHint: tokenHint_(token),
    acompanantesGuardados: acompList.length
  });

  if (debugEnabled) {
    return {
      ok: true,
      savedCompanions: acompList.length,
      debug: {
        version: 'rsvp_dedup_sha256_v2',
        signature_bytes: signatureBytes,
        signature_chars: signatureLen,
        cache_key_len: cacheKeyLen
      }
    };
  }

  return { ok: true, savedCompanions: acompList.length };
}

function buildRsvpCacheKey_(signature) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    signature,
    Utilities.Charset.UTF_8
  );
  var hex = '';
  for (var i = 0; i < digest.length; i++) {
    var byteValue = digest[i];
    if (byteValue < 0) byteValue += 256;
    var chunk = byteValue.toString(16);
    if (chunk.length === 1) chunk = '0' + chunk;
    hex += chunk;
  }
  return 'rsvp:' + hex;
}

function normalizeTextLimit_(value, maxLen) {
  return String(value || '').trim().slice(0, maxLen);
}

function sanitizeAcompList_(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map(function (item) {
      var source = item && typeof item === 'object' ? item : {};
      return {
        nombre: normalizeTextLimit_(source.nombre, 50),
        apellidos: normalizeTextLimit_(source.apellidos, 50),
        menu: normalizeTextLimit_(source.menu, 40),
        alergias: normalizeTextLimit_(source.alergias, 200),
        notas: normalizeTextLimit_(source.notas, 300)
      };
    })
    .filter(function (item) {
      return item.nombre || item.apellidos;
    });
}

function tokenHint_(token) {
  var value = String(token || '');
  if (!value) return 'empty';
  var start = value.slice(0, 3);
  var end = value.length > 5 ? value.slice(-2) : '';
  return start + '...' + end + ' (len=' + value.length + ')';
}

function logRsvpDiag_(eventName, data) {
  try {
    Logger.log('[RSVP_DIAG][' + eventName + '] ' + JSON.stringify(data || {}));
  } catch (err) {
    Logger.log('[RSVP_DIAG][' + eventName + '] log_error=' + String(err));
  }
}
