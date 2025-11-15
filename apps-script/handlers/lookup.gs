function handleLookup(params) {
  var token = String(params.token || '').trim();
  if (!token) return { ok: false, error: 'missing_token' };
  var titular = loadTitular(token);
  if (!titular) return { ok: false, error: 'not_found' };
  var acompEntries = loadAcompanantes(token, titular.idx);
  return {
    ok: true,
    data: titularPayload(titular),
    acomp: acompEntries.map(acompPayload)
  };
}
