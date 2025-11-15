/** Funciones de respuestas y panel admin */

function logRespuesta(payload) {
  var sh = getSheet(CFG.SHEET_RSP);
  var now = new Date();
  var row = [
    now,
    payload.token,
    payload.nombre,
    payload.asistencia,
    Number(payload.acompanantes || 0),
    payload.menu || '',
    payload.alergias || '',
    payload.notas_titular || '',
    Boolean(payload.bus),
    payload.cancion || '',
    false,
    JSON.stringify(payload.acompList || [])
  ];
  sh.appendRow(row);
  var lastRow = sh.getLastRow();
  return {
    sheet: sh,
    rowNumber: lastRow,
    head: sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
  };
}

function markEmailSent(logInfo) {
  if (!logInfo || !logInfo.head) return;
  var idxMap = buildIdxMap(logInfo.head);
  var col = idxMap['enviado_email'];
  if (col == null) return;
  logInfo.sheet.getRange(logInfo.rowNumber, col + 1).setValue(true);
}

function buildAdminList() {
  var shInv = getSheet(CFG.SHEET_INV);
  var shRsp = getSheet(CFG.SHEET_RSP);
  var vInv = shInv.getDataRange().getValues();
  var vRsp = shRsp.getDataRange().getValues();
  if (!vInv.length) return [];
  var hInv = vInv[0];
  var hRsp = vRsp.length ? vRsp[0] : [];
  var iInv = buildIdxMap(hInv);
  var iRsp = buildIdxMap(hRsp);

  var map = {};
  vInv.slice(1).forEach(function (row) {
    var token = String(row[iInv.token]);
    if (!token) return;
    map[token] = {
      token: token,
      nombre: row[iInv.nombre],
      grupo: row[iInv.grupo],
      status: row[iInv.status] || 'pendiente',
      acompanantes: 0,
      menu: '',
      alergias: '',
      bus: ''
    };
  });

  vRsp.slice(1).forEach(function (row) {
    var token = String(row[iRsp.token]);
    if (!token || !map[token]) return;
    map[token].status = row[iRsp.asistencia] || map[token].status;
    map[token].acompanantes = row[iRsp.acompanantes] || map[token].acompanantes;
    map[token].menu = row[iRsp.menu] || map[token].menu;
    map[token].alergias = row[iRsp.alergias] || map[token].alergias;
    map[token].bus = row[iRsp.bus];
  });

  return Object.keys(map).map(function (k) { return map[k]; });
}
