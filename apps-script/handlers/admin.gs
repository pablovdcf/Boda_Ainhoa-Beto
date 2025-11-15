function handleAdminList(params) {
  if ((params.adminKey || '') !== CFG.ADMIN_KEY) {
    return { ok: false, error: 'unauthorized' };
  }
  return { ok: true, data: buildAdminList() };
}

function handleSaveEmail(params) {
  var token = String(params.token || '').trim();
  var email = String(params.email || '').trim();
  if (!token) return { ok: false, error: 'missing_token' };
  var result = saveEmailForToken(token, email);
  return result.ok ? { ok: true } : result;
}
