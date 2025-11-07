// assets/app.js
import { apiLookup, apiRsvp } from "./api.js";

const params = new URLSearchParams(location.search);
const tokenParam = params.get("token") || params.get("t") || "";
const lastToken  = localStorage.getItem("lastToken") || "";

const tokenGate  = document.getElementById("tokenGate");
const tokenForm  = document.getElementById("tokenForm");
const tokenInput = document.getElementById("tokenInput");
const tokenError = document.getElementById("tokenError");

const greet     = document.querySelector('#greet');
const form      = document.querySelector('#rsvpForm');
const msg       = document.querySelector('#msg');
const acomp     = document.querySelector('#acompanantes');
const maxInfo   = document.querySelector('#maxInfo');
const submitBtn = document.querySelector('#submitBtn');

// NEW: contenedor para inputs de nombres
const acompHost = document.querySelector('#acompanantesNombres');

let invitado = null;
let existingAcomp = [];      // NEW: desde lookup (para editar)
let maxAcomps = 0;           // NEW
let submitting = false;

// --- gate de token (igual que tenías)
if (!tokenParam) {
  if (tokenGate) tokenGate.classList.remove("hidden");
  if (tokenInput && lastToken) tokenInput.value = lastToken;
  if (tokenInput) tokenInput.focus();
  if (tokenForm) {
    tokenForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const t = (tokenInput.value || "").trim();
      if (!/^[a-z0-9]{4,20}$/i.test(t)) {
        tokenError && tokenError.classList.remove("hidden");
        return;
      }
      localStorage.setItem("lastToken", t);
      const base = location.pathname.replace(/\/invite\.html$/, "/invite.html");
      location.href = `${base}?token=${encodeURIComponent(t)}`;
    });
  }
}

const token = tokenParam || null;

// NEW: pinta N inputs de nombres (sembrando valores previos)
function renderAcompInputs(n){
  if (!acompHost) return;
  acompHost.innerHTML = '';
  for (let i=0;i<n;i++){
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Nombre acompañante ${i+1}`;
    input.className = 'w-full rounded-xl border p-2';
    input.value = existingAcomp[i]?.nombre || '';
    acompHost.appendChild(input);
  }
}

async function init() {
  try {
    if (!token) {
      greet && (greet.textContent = 'Introduce tu enlace personalizado (falta el token en la URL).');
      form && (form.style.display = 'none');
      return;
    }
    // CHANGED: apiLookup ahora devuelve {ok, data, acomp}
    const { ok, data, acomp: acompArr, error } = await apiLookup(token);
    if (!ok) throw new Error(error || 'No encontrado');

    invitado = data;
    existingAcomp = Array.isArray(acompArr) ? acompArr : [];
    window.currentToken = token;
    localStorage.setItem("lastToken", token);

    maxAcomps = Math.max(0, Number(invitado.plazas_max || 1) - 1);
    greet && (greet.textContent = `Hola, ${invitado.nombre}. Tienes hasta ${maxAcomps} acompañante(s).`);
    if (acomp) {
      acomp.max = String(maxAcomps);
      const ya = existingAcomp.filter(a => (a.nombre||'').trim() !== '').length;
      acomp.value = String(ya);
      maxInfo && (maxInfo.textContent = `Máximo de acompañantes: ${maxAcomps}`);
      renderAcompInputs(ya); // NEW
      acomp.addEventListener('input', ()=>{
        const n = Math.min(maxAcomps, Math.max(0, Number(acomp.value||0)));
        acomp.value = String(n);
        renderAcompInputs(n);
      });
    }
  } catch (e) {
    greet && (greet.textContent = 'No hemos podido cargar tu invitación. Escribe a los novios 🙏');
    console.error(e);
    form && (form.style.display = 'none');
  }
}

form && form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (submitting) return;
  submitting = true;
  if (submitBtn) submitBtn.disabled = true;
  msg && (msg.textContent = 'Enviando…');

  try {
    const asistencia = (form.querySelector('input[name="asistencia"]:checked')?.value || '').toLowerCase();

    // NEW: recoge nombres introducidos
    const names = [...(acompHost?.querySelectorAll('input') || [])]
      .map(i => i.value.trim())
      .filter(v => v.length > 0);

    const payload = {
      token: window.currentToken,
      asistencia,
      acompanantes: Number(acomp?.value || 0),
      acompanantes_nombres: names, // NEW
      menu: document.querySelector('#menu')?.value || '',
      alergias: document.querySelector('#alergias')?.value.trim() || '',
      bus: !!document.querySelector('#bus')?.checked,
      cancion: document.querySelector('#cancion')?.value.trim() || '',
    };

    const { ok, error } = await apiRsvp(payload); // api.js: ver nota abajo
    if (!ok) throw new Error(error || 'Error RSVP');

    msg && (msg.textContent = asistencia === 'si'
      ? '¡Gracias! Te hemos enviado un email con el evento para el calendario.'
      : '¡Gracias! Hemos registrado tu respuesta.');

    form.classList.add('opacity-70','pointer-events-none');
    if (submitBtn) submitBtn.textContent = 'Enviado ✓';

  } catch (e) {
    console.error(e);
    msg && (msg.textContent = 'No hemos podido enviar tu confirmación. Reintenta o avisa a los novios.');
    submitting = false;
    if (submitBtn) submitBtn.disabled = false;
    return;
  }
});

init();
