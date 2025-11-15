/** Punto de entrada WebApp */

function handleAction(action, params) {
  switch ((action || '').toLowerCase()) {
    case 'ping':
      return { ok: true, ping: 'pong' };
    case 'lookup':
      return handleLookup(params);
    case 'rsvp':
      return handleRsvp(params);
    case 'admin_list':
      return handleAdminList(params);
    case 'save_email':
      return handleSaveEmail(params);
    default:
      return { ok: false, error: 'unknown_action' };
  }
}

function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    requireSecret(params.secret);
    var result = handleAction(params.action, params);
    return respond(e, result);
  } catch (err) {
    return respond(e, { ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData) {
      if (e.postData.type === 'application/json') {
        body = JSON.parse(e.postData.contents || '{}');
      } else {
        body = e.parameter || {};
      }
    }
    requireSecret(body.secret);
    var result = handleAction(body.action, body);
    if (result && result.error === 'unauthorized') {
      return jsonOut(result);
    }
    return jsonOut(result);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doOptions() {
  return corsify(ContentService.createTextOutput('ok'));
}
