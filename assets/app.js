// assets/app.js
import { apiLookup, apiRsvp } from "./api.js";

// Acepta ?token= y también ?t=
const params = new URLSearchParams(location.search);
const tokenParam = params.get("token") || params.get("t") || "";
const lastToken  = localStorage.getItem("lastToken") || "";

// Elementos “gate” (solo si no hay token)
const tokenGate  = document.getElementById("tokenGate");
const tokenForm  = document.getElementById("tokenForm");
const tokenInput = document.getElementById("tokenInput");
const tokenError = document.getElementById("tokenError");

// Elementos de RSVP
const greet     = document.querySelector('#greet');
const form      = document.querySelector('#rsvpForm');
const msg       = document.querySelector('#msg');
const acomp     = document.querySelector('#acompanantes');
const maxInfo   = document.querySelector('#maxInfo');
const submitBtn = document.querySelector('#submitBtn'); // <button id="submitBtn" type="submit">

let invitado = null;
let submitting = false;

// --- Modo “introducir código” si no hay token en URL ---
if (!tokenParam) {
  if (tokenGate) tokenGate.classList.remove("hidden");
  if (tokenInput && lastToken) tokenInput.value = lastToken;
  if (tokenInput) tokenInput.focus();

  if (tokenForm) {
    tokenForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const t = (tokenInput.value || "").trim();
      // validación muy básica (alfanum 4–20)
      if (!/^[a-z0-9]{4,20}$/i.test(t)) {
        tokenError && tokenError.classList.remove("hidden");
        return;
      }
      localStorage.setItem("lastToken", t);
      // redirige con el token en la URL
      const base = location.pathname.replace(/\/invite\.html$/, "/invite.html");
      location.href = `${base}?token=${encodeURIComponent(t)}`;
    });
  }
}

// --- flujo normal si viene token ---
const token = tokenParam || null;

async function init() {
  try {
    if (!token) {
      greet && (greet.textContent = 'Introduce tu enlace personalizado (falta el token en la URL).');
      form && (form.style.display = 'none');
      return;
    }
    const { ok, data, error } = await apiLookup(token);
    if (!ok) throw new Error(error || 'No encontrado');

    invitado = data;
    window.currentToken = token; // <- lo usamos en el submit
    localStorage.setItem("lastToken", token);

    greet && (greet.textContent = `Hola, ${invitado.nombre}. Tienes hasta ${invitado.plazas_max} plazas.`);
    if (acomp) {
      acomp.max = Math.max(0, Number(invitado.plazas_max || 1) - 1);
      maxInfo && (maxInfo.textContent = `Máximo de acompañantes: ${acomp.max}`);
    }
  } catch (e) {
    greet && (greet.textContent = 'No hemos podido cargar tu invitación. Escribe a los novios 🙏');
    console.error(e);
    form && (form.style.display = 'none');
  }
}

form && form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (submitting) return;         // anti-doble
  submitting = true;
  if (submitBtn) submitBtn.disabled = true;
  msg && (msg.textContent = 'Enviando…');

  try {
    const asistencia = (form.querySelector('input[name="asistencia"]:checked')?.value || '').toLowerCase();
    const payload = {
      token: window.currentToken,
      asistencia,
      acompanantes: Number(acomp?.value || 0),
      menu: document.querySelector('#menu')?.value || '',
      alergias: document.querySelector('#alergias')?.value.trim() || '',
      bus: !!document.querySelector('#bus')?.checked,
      cancion: document.querySelector('#cancion')?.value.trim() || '',
    };

    const { ok, error } = await apiRsvp(payload);
    if (!ok) throw new Error(error || 'Error RSVP');

    msg && (msg.textContent = asistencia === 'si'
      ? '¡Gracias! Te hemos enviado un email con el evento para el calendario.'
      : '¡Gracias! Hemos registrado tu respuesta.');

    // Si no quieres permitir reenviar, comenta el bloque de abajo
    // form.classList.add('opacity-60','pointer-events-none');

  } catch (e) {
    console.error(e);
    msg && (msg.textContent = 'No hemos podido enviar tu confirmación. Reintenta o avisa a los novios.');
    submitting = false;
    if (submitBtn) submitBtn.disabled = false;
    return;
  }
});

init();
