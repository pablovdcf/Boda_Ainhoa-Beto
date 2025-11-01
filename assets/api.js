// Configuración API
// assets/api.js
export const CONFIG = {
    SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzhaTjnmF5FaflLFFVUbrw4Xplwl6D1zNP2oHA_zeSvuhd0WTG1Y0MLxsnsO4RMMXmp/exec",
    SHARED_SECRET: "BodaBetoyainhoa",
};

async function postJSON(payload) {
    const res = await fetch(CONFIG.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ ...payload, secret: CONFIG.SHARED_SECRET }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function apiLookup(token) { return postJSON({ action: "lookup", token }); }
export async function apiRsvp(data) { return postJSON({ action: "rsvp", ...data }); }
export async function apiAdminList() { return postJSON({ action: "admin_list" }); }
