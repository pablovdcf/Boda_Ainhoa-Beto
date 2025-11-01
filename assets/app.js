// assets/app.js
import { apiLookup, apiRsvp } from "./api.js";

const params = new URLSearchParams(location.search);
const token = params.get("token");

const greet    = document.querySelector('#greet');
const form     = document.querySelector('#rsvpForm');
const msg      = document.querySelector('#msg');
const acomp    = document.querySelector('#acompanantes');
const maxInfo  = document.querySelector('#maxInfo');
const submitBtn= document.querySelector('#submitBtn'); // <button id="submitBtn" type="submit">

let invitado = null;
let submitting = false;

async function init() {
  try {
    if (!token) {
      greet.textContent = 'Introduce tu enlace personalizado (falta el token en la URL).';
      form.style.display = 'none';
      return;
    }
    const { ok, data, error } = await apiLookup(token);
    if (!ok) throw new Error(error || 'No encontrado');

    invitado = data;
    window.currentToken = token; // <- lo usaremos al enviar

    greet.textContent = `Hola, ${invitado.nombre}. Tienes hasta ${invitado.plazas_max} plazas.`;
    acomp.max = Math.max(0, Number(invitado.plazas_max || 1) - 1);
    maxInfo.textContent = `Máximo de acompañantes: ${acomp.max}`;
  } catch (e) {
    greet.textContent = 'No hemos podido cargar tu invitación. Escribe a los novios 🙏';
    console.error(e);
    form.style.display = 'none';
  }
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (submitting) return;         // anti-doble
  submitting = true;
  if (submitBtn) submitBtn.disabled = true;
  msg.textContent = 'Enviando…';

  try {
    const asistencia = (form.querySelector('input[name="asistencia"]:checked')?.value || '').toLowerCase();
    const payload = {
      token: window.currentToken,
      asistencia,
      acompanantes: Number(acomp.value || 0),
      menu: document.querySelector('#menu').value,
      alergias: document.querySelector('#alergias').value.trim(),
      bus: document.querySelector('#bus').checked,
      cancion: document.querySelector('#cancion').value.trim(),
    };

    const { ok, error } = await apiRsvp(payload);
    if (!ok) throw new Error(error || 'Error RSVP');

    msg.textContent = asistencia === 'si'
      ? '¡Gracias! Te hemos enviado un email con el evento para el calendario.'
      : '¡Gracias! Hemos registrado tu respuesta.';
    // Si no quieres permitir reenviar, no resetees ni habilites:
    // form.classList.add('opacity-60','pointer-events-none');
  } catch (e) {
    console.error(e);
    msg.textContent = 'No hemos podido enviar tu confirmación. Reintenta o avisa a los novios.';
    submitting = false;
    if (submitBtn) submitBtn.disabled = false;
    return;
  }
});

init();
