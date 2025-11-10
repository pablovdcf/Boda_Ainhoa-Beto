// assets/app.js
import { apiLookup, apiRsvp, apiSaveEmail } from "./api.js";

const emailModal = document.getElementById('emailModal');
const emailInput = document.getElementById('emailInput');
const emailSaveBtn = document.getElementById('emailSaveBtn');
const emailSkipBtn = document.getElementById('emailSkipBtn');
const emailError = document.getElementById('emailError');

function openEmailModal(prefill = "") {
  if (!emailModal) return;
  emailInput.value = prefill || "";
  emailError.classList.add('hidden');
  emailModal.classList.remove('hidden');
  setTimeout(() => emailInput?.focus(), 50);
}

function closeEmailModal() {
  emailModal?.classList.add('hidden');
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const params = new URLSearchParams(location.search);
const tokenParam = params.get("token") || params.get("t") || "";
const lastToken = localStorage.getItem("lastToken") || "";

const tokenGate = document.getElementById("tokenGate");
const tokenForm = document.getElementById("tokenForm");
const tokenInput = document.getElementById("tokenInput");
const tokenError = document.getElementById("tokenError");

const greet = document.querySelector('#greet');
const form = document.querySelector('#rsvpForm');
const msg = document.querySelector('#msg');
const acomp = document.querySelector('#acompanantes');
const maxInfo = document.querySelector('#maxInfo');
const acompHost = document.querySelector('#acompanantesNombres');
const submitBtn = document.querySelector('#submitBtn');

const alreadyBox = document.getElementById('alreadyBox');
const alreadyStatus = document.getElementById('alreadyStatus');
const btnEdit = document.getElementById('btnEdit');
const btnKeep = document.getElementById('btnKeep');
const acompHelp = document.getElementById('acompanantesHelp');

const titularMenuLabel = document.getElementById('titularMenuLabel');
const titularCard = document.getElementById('titularCard');
const notasTitular = document.getElementById('notasTitular');

const skeleton = document.getElementById('formSkeleton');

let invitado = null;
let existingAcomp = []; // [{nombre, apellidos}]
let maxAcomps = 0;
let submitting = false;
let editMode = false;

// --- gate de token
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

// Pinta pares de inputs (nombre + apellidos)
function renderAcompInputs(n) {
  if (!acompHost) return;
  acompHost.innerHTML = '';

  for (let i = 0; i < n; i++) {
    const data = existingAcomp[i] || {};
    const wrap = document.createElement('div');
    wrap.className = 'rounded-2xl border p-3 md:p-4 bg-white/60 grid gap-2';

    // fila nombre+apellidos
    const row1 = document.createElement('div');
    row1.className = 'grid grid-cols-1 md:grid-cols-2 gap-2';
    const iNombre = document.createElement('input');
    iNombre.type = 'text';
    iNombre.placeholder = `Nombre acompañante ${i + 1}`;
    iNombre.className = 'w-full rounded-xl border p-2';
    iNombre.value = data.nombre || '';
    const iApell = document.createElement('input');
    iApell.type = 'text';
    iApell.placeholder = `Apellidos acompañante ${i + 1}`;
    iApell.className = 'w-full rounded-xl border p-2';
    iApell.value = data.apellidos || '';
    row1.appendChild(iNombre);
    row1.appendChild(iApell);

    // fila menú
    const row2 = document.createElement('div');
    row2.className = 'grid grid-cols-1 md:grid-cols-3 gap-2 items-center';
    const labMenu = document.createElement('label');
    labMenu.textContent = 'Menú';
    labMenu.className = 'text-sm text-slate-600';
    const selMenu = document.createElement('select');
    selMenu.className = 'rounded-xl border p-2';
    ['', 'estandar', 'vegetariano', 'infantil', 'celiaco', 'otro'].forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v ? v[0].toUpperCase() + v.slice(1) : '— Selecciona —';
      selMenu.appendChild(opt);
    });
    selMenu.value = (data.menu || '');
    row2.appendChild(labMenu);
    row2.appendChild(selMenu);
    const notaMenu = document.createElement('span');
    notaMenu.className = 'text-xs text-slate-500';
    notaMenu.textContent = 'Si “Otro”, explícalo en Notas.';
    row2.appendChild(notaMenu);

    // fila alergias
    const row3 = document.createElement('div');
    row3.className = 'grid grid-cols-1 md:grid-cols-1 gap-2';
    const txtAler = document.createElement('input');
    txtAler.type = 'text';
    txtAler.placeholder = 'Alergias/intolerancias (opcional)';
    txtAler.className = 'w-full rounded-xl border p-2';
    txtAler.value = data.alergias || '';
    row3.appendChild(txtAler);

    // fila notas
    const row4 = document.createElement('div');
    row4.className = 'grid grid-cols-1 md:grid-cols-1 gap-2';
    const txtNotas = document.createElement('textarea');
    txtNotas.placeholder = 'Notas para los novios (opcional)';
    txtNotas.rows = 2;
    txtNotas.className = 'w-full rounded-xl border p-2';
    txtNotas.value = data.notas || '';
    row4.appendChild(txtNotas);

    // marca para recolectar luego
    wrap.dataset.role = 'acomp-card';
    wrap.appendChild(row1);
    wrap.appendChild(row2);
    wrap.appendChild(row3);
    wrap.appendChild(row4);
    acompHost.appendChild(wrap);
  }
}

function setFormDisabled(disabled) {
  if (!form) return; // 👈 evita TypeError si #rsvpForm no está
  form.querySelectorAll('input, select, button, textarea')
    .forEach(el => { if (el !== btnEdit && el !== btnKeep) el.disabled = disabled; });
  form.classList.toggle('opacity-60', disabled);
  form.classList.toggle('pointer-events-none', disabled);
}

const radiosAsis = document.querySelectorAll('input[name="asistencia"]');

function toggleByAsistencia() {
  const val = (document.querySelector('input[name="asistencia"]:checked')?.value || '').toLowerCase();
  const on = (val === 'si');

  // Titular
  ['menu', 'alergias', 'notasTitular', 'cancion', 'bus', 'acompanantes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = !on;
      if (!on && id === 'acompanantes') el.value = '0';
    }
  });

  titularCard?.classList.toggle('opacity-50', !on);

  // Acompañantes (inputs dentro de las tarjetas)
  acompHost.classList.toggle('opacity-50', !on);
  acompHost.classList.toggle('pointer-events-none', !on);
  if (!on) acompHost.innerHTML = '';
  else renderAcompInputs(Number(acomp?.value || 0));

  // Botón enviar siempre activo (para registrar el "No")
  if (submitBtn) submitBtn.disabled = false;
}

radiosAsis.forEach(r => r.addEventListener('change', toggleByAsistencia));

async function init() {
  try {
    if (!token) {
      greet && (greet.textContent = 'Introduce tu enlace personalizado (falta el token en la URL).');
      form && (form.style.display = 'none');
      return;
    }
    // MOSTRAR LOADER
    skeleton?.classList.remove('hidden');
    form?.classList.add('hidden');

    // ⬇️ lookup: ahora esperamos que devuelva { ok, data, acomp, error }
    const { ok, data, acomp: acompArr, error } = await apiLookup(token);
    if (!ok) throw new Error(error || 'No encontrado');

    invitado = data;

    // Si no hay email y no lo hemos descartado antes para este token, mostrar modal
    const skipKey = `skipEmail_${token}`;
    const yaDescartado = localStorage.getItem(skipKey) === '1';
    if ((!invitado.email || !isValidEmail(invitado.email)) && !yaDescartado) {
      openEmailModal();
    }


    // Rotula "Menú de {Nombre}"
    if (titularMenuLabel) titularMenuLabel.textContent = invitado.nombre || 'Invitado';

    // Normalizamos acompañantes a objetos {nombre, apellidos}
    existingAcomp = (Array.isArray(acompArr) ? acompArr : []).map(x => {
      if (x && typeof x === 'object') {
        let nombre = (x.nombre || '').trim();
        let apellidos = (x.apellidos || '').trim();

        // Legacy: todo en "nombre" y "apellidos" vacío -> separamos
        if (!apellidos && /\s/.test(nombre)) {
          const parts = nombre.split(/\s+/);
          nombre = parts.shift() || '';
          apellidos = parts.join(' ');
        }

        return {
          nombre,
          apellidos,
          menu: (x.menu || '').trim(),
          alergias: (x.alergias || '').trim(),
          notas: (x.notas || '').trim()
        };
      }

      // Si viniera como string simple
      const s = String(x || '').trim();
      const parts = s.split(/\s+/);
      const nombre = parts.shift() || '';
      const apellidos = parts.join(' ');
      return { nombre, apellidos, menu: '', alergias: '', notas: '' };
    });


    document.getElementById('menu').value = invitado.menu || '';
    document.getElementById('alergias').value = invitado.alergias || '';
    const notasTitular = document.getElementById('notasTitular');
    if (notasTitular) notasTitular.value = invitado.notas_titular || '';

    window.currentToken = token;
    localStorage.setItem("lastToken", token);

    maxAcomps = Math.max(0, Number(invitado.plazas_max || 1) - 1);
    greet && (greet.textContent = `Hola, ${invitado.nombre}. Tienes hasta ${maxAcomps} acompañante(s).`);

    // Mostrar estado previo si existe
    const st = (invitado.status || '').toLowerCase(); // “si” | “no” | “” (pendiente)
    if (st === 'si' || st === 'no') {
      alreadyStatus && (alreadyStatus.textContent = st === 'si' ? 'ASISTO' : 'NO ASISTO');
      alreadyBox && alreadyBox.classList.remove('hidden');
      editMode = false;
      setFormDisabled(true);
    } else {
      editMode = true;
      setFormDisabled(false);
    }

    if (acomp) {
      acomp.max = String(maxAcomps);
      const ya = existingAcomp.filter(a => (a.nombre || '').trim() !== '' || (a.apellidos || '').trim() !== '').length;
      acomp.value = String(Math.min(ya, maxAcomps));
      maxInfo && (maxInfo.textContent = `Máximo de acompañantes: ${maxAcomps}`);
      renderAcompInputs(Number(acomp.value || 0));

      acomp.addEventListener('input', () => {
        const n = Math.max(0, Math.min(maxAcomps, Number(acomp.value || 0)));
        if (Number(acomp.value || 0) > maxAcomps) {
          acompHelp && acompHelp.classList.remove('hidden');
        } else {
          acompHelp && acompHelp.classList.add('hidden');
        }
        acomp.value = String(n);
        renderAcompInputs(n);
      });
    }

    // Botones del banner
    btnEdit && btnEdit.addEventListener('click', () => {
      editMode = true;
      setFormDisabled(false);
    });
    btnKeep && btnKeep.addEventListener('click', () => {
      // Simplemente cerramos el aviso y mantenemos deshabilitado (informativo)
      alreadyBox && alreadyBox.classList.add('hidden');
    });

    // OCULTAR LOADER Y MOSTRAR FORM
    skeleton?.classList.add('hidden');
    form?.classList.remove('hidden');

  } catch (e) {
    skeleton?.classList.add('hidden');
    greet && (greet.textContent = 'No hemos podido cargar tu invitación. Escribe a los novios 🙏');
    console.error(e);
    form && (form.style.display = 'none');
  }
}

emailSaveBtn?.addEventListener('click', async () => {
  const email = (emailInput?.value || '').trim();
  if (!isValidEmail(email)) {
    emailError?.classList.remove('hidden');
    return;
  }
  try {
    await apiSaveEmail(window.currentToken, email);
    // Actualiza en memoria para que el submit ya tenga email
    if (invitado) invitado.email = email;
    closeEmailModal();
  } catch (e) {
    console.error(e);
    emailError?.classList.remove('hidden');
  }
});

emailSkipBtn?.addEventListener('click', () => {
  // Recuerda que el usuario no quiere dejar email para este token
  const skipKey = `skipEmail_${window.currentToken || ''}`;
  localStorage.setItem(skipKey, '1');
  closeEmailModal();
});

form && form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (submitting) return;
  submitting = true;
  if (submitBtn) submitBtn.disabled = true;
  msg && (msg.textContent = 'Enviando…');

  try {
    const asistencia = (form.querySelector('input[name="asistencia"]:checked')?.value || '').toLowerCase();

    // Recoger tarjetas
    const cards = [...(acompHost?.querySelectorAll('[data-role="acomp-card"]') || [])];
    const acompList = cards.map(card => {
      const inputs = card.querySelectorAll('input, select, textarea');
      const [iNombre, iApell, selMenu, txtAler, txtNotas] = inputs;
      return {
        nombre: (iNombre?.value || '').trim(),
        apellidos: (iApell?.value || '').trim(),
        menu: (selMenu?.value || '').trim(),
        alergias: (txtAler?.value || '').trim(),
        notas: (txtNotas?.value || '').trim()
      };
    }).filter(x => (x.nombre || x.apellidos));

    // Si no hay email conocido y asistencia es "si", ofrece dejarlo (para poder enviar .ics)
    if (!invitado?.email || !isValidEmail(invitado.email)) {
      openEmailModal();
      // Rehabilita el envío para que pueda continuar
      submitting = false;
      if (submitBtn) submitBtn.disabled = false;
      msg && (msg.textContent = 'Puedes dejar un email para enviarte la confirmación (opcional).');
      return;
    }

    const nAcomp = Math.min(Number(acomp?.value || 0), maxAcomps);

    const payload = {
      token: window.currentToken,
      asistencia,
      acompanantes: nAcomp,
      acompanantes_nombres: acompList, // 👈 array de objetos
      menu: document.querySelector('#menu')?.value || '',
      alergias: document.querySelector('#alergias')?.value.trim() || '',
      notas_titular: (document.getElementById('notasTitular')?.value || '').trim(),
      bus: !!document.querySelector('#bus')?.checked,
      cancion: document.querySelector('#cancion')?.value.trim() || '',
    };

    const { ok, error } = await apiRsvp(payload);
    if (!ok) throw new Error(error || 'Error RSVP');

    msg && (msg.textContent = asistencia === 'si'
      ? '¡Gracias! Te hemos enviado un email con el evento para el calendario.'
      : '¡Gracias! Hemos registrado tu respuesta.');

    form.classList.add('opacity-70', 'pointer-events-none');
    if (submitBtn) submitBtn.textContent = 'Enviado ✓';

  } catch (e) {
    console.error(e);
    msg && (msg.textContent = 'No hemos podido enviar tu confirmación. Reintenta o avisa a los novios.');
    submitting = false;
    if (submitBtn) submitBtn.disabled = false;
  }
});

init();
toggleByAsistencia();
