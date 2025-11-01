// Configuración API
export const CONFIG = {
    SCRIPT_URL: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec", // <- cambia
    SHARED_SECRET: "pon-una-clave-larga-aqui",
};


// Utilidad de fetch
async function postJSON(payload) {
    const res = await fetch(CONFIG.SCRIPT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": CONFIG.SHARED_SECRET,
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}


export async function apiLookup(token) {
    return postJSON({ action: "lookup", token });
}


export async function apiRsvp(data) {
    return postJSON({ action: "rsvp", ...data });
}


export async function apiAdminList() {
    return postJSON({ action: "admin_list" });
}