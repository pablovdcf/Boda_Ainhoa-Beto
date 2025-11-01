// assets/api.js
export const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzhaTjnmF5FaflLFFVUbrw4Xplwl6D1zNP2oHA_zeSvuhd0WTG1Y0MLxsnsO4RMMXmp/exec",
  SHARED_SECRET: "BodaBetoyainhoa",
};

function toForm(data) {
  return new URLSearchParams(data).toString();
}

async function postForm(payload) {
  const res = await fetch(CONFIG.SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }, // ← simple request (sin preflight)
    body: toForm({ ...payload, secret: CONFIG.SHARED_SECRET }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiLookup(token)  { return postForm({ action: "lookup", token }); }
export async function apiRsvp(data)     { return postForm({ action: "rsvp", ...data }); }
export async function apiAdminList()    { return postForm({ action: "admin_list" }); }
