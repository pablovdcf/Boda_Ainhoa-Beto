function handleRsvp(params) {
  var token = String(params.token || '').trim();
  if (!token) return { ok: false, error: 'missing_token' };
  var asistencia = String(params.asistencia || '').trim().toLowerCase();
  if (!asistencia) return { ok: false, error: 'missing_asistencia' };

  var titular = loadTitular(token);
  if (!titular) return { ok: false, error: 'not_found' };

  var acompCount = Math.max(0, Math.min(Number(params.acompanantes || 0), titular.maxAcompanantes));
  var acompList = normalizeAcompanantesInput(params.acompanantes_nombres).slice(0, acompCount);

  var signature = [
    token,
    asistencia,
    acompCount,
    params.menu || '',
    params.alergias || '',
    params.notas_titular || '',
    params.bus ? '1' : '0',
    params.cancion || '',
    JSON.stringify(acompList)
  ].join('|');
  var cacheKey = 'rsvp:' + Utilities.base64Encode(signature);
  if (cacheGet(cacheKey)) return { ok: true, dedup: true };
  cachePut(cacheKey, '1', CFG.CACHE_RSVP_SECONDS);

  syncAcompanantes(titular, acompList);
  updateTitularFields(titular, {
    menu: params.menu || '',
    alergias: params.alergias || '',
    notas_titular: params.notas_titular || '',
    status: asistencia
  });

  var logInfo = logRespuesta({
    token: token,
    nombre: titular.nombre,
    asistencia: asistencia,
    acompanantes: acompCount,
    menu: params.menu || '',
    alergias: params.alergias || '',
    notas_titular: params.notas_titular || '',
    bus: params.bus === true || params.bus === 'true',
    cancion: params.cancion || '',
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

  return { ok: true, savedCompanions: acompList.length };
}
