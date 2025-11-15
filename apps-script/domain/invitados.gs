/** Funciones relacionadas con invitados y acompañantes */

function getInvData() {
  var sh = getSheet(CFG.SHEET_INV);
  var values = sh.getDataRange().getValues();
  if (!values.length) throw new Error('empty_sheet');
  var head = values[0];
  return { sheet: sh, head: head, rows: values.slice(1) };
}

function getInvIndexes(head) {
  return {
    head: head,
    token: headerIndex(head, ['token', 'id']),
    nombre: headerIndex(head, ['nombre', 'name']),
    apellidos: headerIndex(head, ['apellidos', 'surname', 'last', 'last_name']),
    email: headerIndex(head, ['email', 'mail']),
    grupo: headerIndex(head, ['grupo', 'rol', 'group']),
    plazas_max: headerIndex(head, ['plazas_max', 'plazas', 'max']),
    menu_titular: headerIndex(head, ['menu_titular', 'menu titular', 'menu']),
    alergias_titular: headerIndex(head, ['alergias_titular', 'alergias titular', 'alergias']),
    notas_titular: headerIndex(head, ['notas_titular', 'notas titular', 'notas']),
    status: headerIndex(head, ['status', 'estado']),
    idioma: headerIndex(head, ['idioma', 'lang']),
    notas: headerIndex(head, ['notas', 'notes']),
    qr_url: headerIndex(head, ['qr_url', 'qr url', 'qr']),
    es_acomp: headerIndex(head, ['es_acomp', 'es acomp', 'es_acompanante', 'acompanante?']),
    menu_acomp: headerIndex(head, ['menu_acomp', 'menu acomp', 'menu acompañante', 'menu']),
    alergias_acomp: headerIndex(head, ['alergias_acomp', 'alergias acomp', 'alergias acompañante', 'alergias']),
    notas_acomp: headerIndex(head, ['notas_acomp', 'notas acomp', 'notas acompañante', 'notas']),
    token_titular: headerIndex(head, ['token_titular', 'token titular', 'titular_token'])
  };
}

function loadTitular(token) {
  var tok = String(token || '');
  if (!tok) return null;
  var data = getInvData();
  var idx = getInvIndexes(data.head);
  var rows = data.rows;
  var position = -1;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idx.token]) === tok) {
      position = i;
      break;
    }
  }
  if (position < 0) return null;
  var rowNumber = position + 2;
  var rowValues = rows[position];
  return {
    sheet: data.sheet,
    idx: idx,
    rowNumber: rowNumber,
    values: rowValues,
    token: tok,
    maxPlazas: Number(rowValues[idx.plazas_max] || 1),
    maxAcompanantes: Math.max(0, Number(rowValues[idx.plazas_max] || 1) - 1),
    email: idx.email != null ? rowValues[idx.email] : '',
    nombre: idx.nombre != null ? rowValues[idx.nombre] : ''
  };
}

function titularPayload(titular) {
  if (!titular) return null;
  var d = titular.values;
  var i = titular.idx;
  return {
    token: d[i.token],
    nombre: d[i.nombre],
    email: d[i.email],
    grupo: d[i.grupo],
    plazas_max: Number(d[i.plazas_max] || 1),
    status: d[i.status] || 'pendiente',
    idioma: d[i.idioma] || 'ES',
    menu: i.menu_titular != null ? (d[i.menu_titular] || '') : '',
    alergias: i.alergias_titular != null ? (d[i.alergias_titular] || '') : '',
    notas_titular: i.notas_titular != null ? (d[i.notas_titular] || '') : ''
  };
}

function loadAcompanantes(token, idx) {
  var data = getInvData();
  var rows = data.rows;
  var indexes = idx || getInvIndexes(data.head);
  var out = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var isA = (String(row[indexes.es_acomp]) === 'TRUE') || row[indexes.es_acomp] === true;
    var tt = String(row[indexes.token_titular] || '');
    if (isA && tt === String(token || '')) {
      out.push({
        rowNumber: r + 2,
        values: row,
        idx: indexes,
        sheet: data.sheet
      });
    }
  }
  return out;
}

function acompPayload(entry) {
  var r = entry.values;
  var i = entry.idx;
  var nombre = (r[i.nombre] || '').trim();
  var apellidos = i.apellidos != null ? (r[i.apellidos] || '').trim() : '';
  if (!apellidos && /\s/.test(nombre)) {
    var parts = nombre.split(/\s+/);
    nombre = parts.shift() || '';
    apellidos = parts.join(' ');
  }
  return {
    token: r[i.token],
    nombre: nombre,
    apellidos: apellidos,
    menu: i.menu_acomp != null ? (r[i.menu_acomp] || '') : '',
    alergias: i.alergias_acomp != null ? (r[i.alergias_acomp] || '') : '',
    notas: i.notas_acomp != null ? (r[i.notas_acomp] || '') : ''
  };
}

function normalizeAcompanantesInput(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(cleanAcompObj).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(cleanAcompObj).filter(Boolean);
    } catch (err) {
      // ignore
    }
  }
  return [];
}

function cleanAcompObj(x) {
  if (!x) return null;
  var obj = x;
  if (typeof x !== 'object') {
    var s = String(x || '').trim();
    if (!s) return null;
    var parts = s.split(/\s+/);
    obj = { nombre: parts.shift() || '', apellidos: parts.join(' ') };
  }
  var nombre = String(obj.nombre || '').trim();
  var apellidos = String(obj.apellidos || '').trim();
  var menu = String(obj.menu || '').trim();
  var alergias = String(obj.alergias || '').trim();
  var notas = String(obj.notas || '').trim();
  if (!nombre && !apellidos) return null;
  return { nombre: nombre, apellidos: apellidos, menu: menu, alergias: alergias, notas: notas };
}

function syncAcompanantes(titular, desiredList) {
  var idx = titular.idx;
  var sheet = titular.sheet;
  var existing = loadAcompanantes(titular.token, idx);
  var delta = desiredList.length - existing.length;

  if (delta > 0) {
    for (var k = 0; k < delta; k++) {
      var row = new Array(idx.head.length).fill('');
      row[idx.token] = 'AC-' + titular.token + '-' + Utilities.getUuid().slice(0, 8);
      if (idx.nombre != null) row[idx.nombre] = '';
      if (idx.grupo != null) row[idx.grupo] = 'Acompañante';
      if (idx.plazas_max != null) row[idx.plazas_max] = 0;
      if (idx.status != null) row[idx.status] = '';
      if (idx.idioma != null) row[idx.idioma] = titular.values[idx.idioma] || 'ES';
      if (idx.es_acomp != null) row[idx.es_acomp] = true;
      if (idx.token_titular != null) row[idx.token_titular] = titular.token;
      sheet.appendRow(row);
    }
    existing = loadAcompanantes(titular.token, idx);
  }

  if (delta < 0) {
    var toDelete = existing.slice(delta);
    toDelete.reverse().forEach(function (entry) { sheet.deleteRow(entry.rowNumber); });
    existing = loadAcompanantes(titular.token, idx);
  }

  existing.forEach(function (entry, index) {
    var data = desiredList[index] || { nombre: '', apellidos: '', menu: '', alergias: '', notas: '' };
    if (entry.idx.nombre != null) {
      var fullName = data.nombre;
      if (!entry.idx.apellidos && data.apellidos) {
        fullName = data.nombre + ' ' + data.apellidos;
      }
      entry.sheet.getRange(entry.rowNumber, entry.idx.nombre + 1).setValue(fullName);
    }
    if (entry.idx.apellidos != null) entry.sheet.getRange(entry.rowNumber, entry.idx.apellidos + 1).setValue(data.apellidos);
    if (entry.idx.menu_acomp != null) entry.sheet.getRange(entry.rowNumber, entry.idx.menu_acomp + 1).setValue(data.menu || '');
    if (entry.idx.alergias_acomp != null) entry.sheet.getRange(entry.rowNumber, entry.idx.alergias_acomp + 1).setValue(data.alergias || '');
    if (entry.idx.notas_acomp != null) entry.sheet.getRange(entry.rowNumber, entry.idx.notas_acomp + 1).setValue(data.notas || '');
  });
}

function updateTitularFields(titular, data) {
  var idx = titular.idx;
  var sheet = titular.sheet;
  var row = titular.rowNumber;
  if (idx.menu_titular != null && data.menu !== undefined) sheet.getRange(row, idx.menu_titular + 1).setValue(data.menu);
  if (idx.alergias_titular != null && data.alergias !== undefined) sheet.getRange(row, idx.alergias_titular + 1).setValue(data.alergias);
  if (idx.notas_titular != null && data.notas_titular !== undefined) sheet.getRange(row, idx.notas_titular + 1).setValue(data.notas_titular);
  if (idx.status != null && data.status !== undefined) sheet.getRange(row, idx.status + 1).setValue(data.status);
}

function saveEmailForToken(token, email) {
  var titular = loadTitular(token);
  if (!titular) return { ok: false, error: 'not_found' };
  if (titular.idx.email == null) return { ok: false, error: 'missing_email_col' };
  titular.sheet.getRange(titular.rowNumber, titular.idx.email + 1).setValue(String(email || '').trim());
  return { ok: true };
}
