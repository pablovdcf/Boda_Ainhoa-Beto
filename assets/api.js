// assets/api.js
export const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzhaTjnmF5FaflLFFVUbrw4Xplwl6D1zNP2oHA_zeSvuhd0WTG1Y0MLxsnsO4RMMXmp/exec",
  SHARED_SECRET: "BodaBetoyainhoa",
};

// JSONP helper
function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    const q = new URLSearchParams({ ...params, callback: cb, secret: CONFIG.SHARED_SECRET });
    const url = `${CONFIG.SCRIPT_URL}?${q.toString()}`;
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    window[cb] = (data) => { resolve(data); cleanup(); };
    s.onerror = (err) => { reject(err); cleanup(); };
    function cleanup(){ delete window[cb]; s.remove(); }
    document.body.appendChild(s);
  });
}

export function apiLookup(token)  { return jsonp({ action: "lookup", token }); }
export function apiRsvp(data)     { return jsonp({ action: "rsvp", ...data }); }
export function apiAdminList()    { return jsonp({ action: "admin_list" }); }
export function apiPing()         { return jsonp({ action: "ping" }); }
