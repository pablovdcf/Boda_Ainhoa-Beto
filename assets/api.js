// assets/api.js
export const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzhaTjnmF5FaflLFFVUbrw4Xplwl6D1zNP2oHA_zeSvuhd0WTG1Y0MLxsnsO4RMMXmp/exec",
  //DEV
  // SCRIPT_URL: "https://script.google.com/macros/s/AKfycbw5mYQ8DBFlvKs9dTp3zgpEbQm5xmJXVlt3ryKF4R0/dev",
  SHARED_SECRET: "BodaBetoyainhoa",
  ADMIN_PIN: "011222",             // <- cámbialo
  ADMIN_KEY: "1234abcdxyz",      // <- clave que validará GAS
};
// JSONP helper
function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    const q = new URLSearchParams({ ...params, callback: cb, secret: CONFIG.SHARED_SECRET });
    const url = `${CONFIG.SCRIPT_URL}?${q.toString()}`;
    const s = document.createElement("script");
    s.src = url; s.async = true;
    window[cb] = (data) => { resolve(data); cleanup(); };
    s.onerror = (err) => { reject(err); cleanup(); };
    function cleanup() { delete window[cb]; s.remove(); }
    document.body.appendChild(s);
  });
}

export function apiLookup(token) { return jsonp({ action: "lookup", token }); }
export function apiRsvp(data) {
  return jsonp({
    action: "rsvp",
    token: data.token,
    asistencia: data.asistencia,
    acompanantes: String(data.acompanantes || 0),
    acompanantes_nombres: JSON.stringify(data.acompanantes_nombres || []),
    menu: data.menu || "",
    alergias: data.alergias || "",
    notas_titular: data.notas_titular ?? '',
    bus: String(!!data.bus),
    cancion: data.cancion || ""
  });
}
export function apiAdminList() { return jsonp({ action: "admin_list", adminKey: CONFIG.ADMIN_KEY }); }
export function apiPing() { return jsonp({ action: "ping" }); }
export function apiSaveEmail(token, email) {
  return jsonp({ action: "save_email", token, email });
}

