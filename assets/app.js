import { apiLookup, apiRsvp } from "./api.js";


const params = new URLSearchParams(location.search);
const token = params.get("token");


const greet = document.querySelector('#greet');
const form = document.querySelector('#rsvpForm');
const msg = document.querySelector('#msg');
const acomp = document.querySelector('#acompanantes');
const maxInfo = document.querySelector('#maxInfo');


let invitado = null;


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
        greet.textContent = `Hola, ${invitado.nombre}. Tienes hasta ${invitado.plazas_max} plazas.`;
        acomp.max = invitado.plazas_max - 1; // acompañantes = plazas_max - titular
        maxInfo.textContent = `Máximo de acompañantes: ${acomp.max}`;
    } catch (e) {
        greet.textContent = 'No hemos podido cargar tu invitación. Escribe a los novios 🙏';
        console.error(e);
        form.style.display = 'none';
    }
}


form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msg.textContent = 'Enviando…';


    const asistencia = form.querySelector('input[name="asistencia"]:checked')?.value;
    const payload = {
        token,
        asistencia,
        acompanantes: Number(acomp.value || 0),
        menu: document.querySelector('#menu').value,
        alergias: document.querySelector('#alergias').value.trim(),
        bus: document.querySelector('#bus').checked,
        cancion: document.querySelector('#cancion').value.trim(),
    };


    try {
        const { ok, error } = await apiRsvp(payload);
        if (!ok) throw new Error(error || 'Error desconocido');
        msg.textContent = '¡Gracias! Te hemos enviado un email con los detalles.';
        form.reset();
    } catch (e) {
        console.error(e);
        msg.textContent = 'No hemos podido enviar tu confirmación. Reintenta o avisa a los novios.';
    }
});


init();