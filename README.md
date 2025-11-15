# Invitación de Boda · Ainhoa & Alberto

Webapp estática para invitación, confirmación (RSVP) y panel de administración, con integración vía Google Apps Script (JSONP) y PWA opcional.

## Características
- Landing con timeline, galería y contador (Tailwind CDN).
- RSVP por invitado con token único (acompañantes, menú, alergias, bus, canción).
- Modal opcional para recoger email y enviar confirmación/evento.
- Aviso automático tras confirmar (o mantener respuesta) y redirección a la portada con mensaje personalizado.
- Panel admin con filtros y export CSV.
- PWA opcional (manifest + Service Worker simple).

## Estructura
- `index.html`: página pública.
- `invite.html`: confirmación por token (`?token=...`).
- `admin.html`: panel de administración.
- `assets/app.js`: lógica RSVP + modal email.
- `assets/api.js`: llamadas JSONP a Google Apps Script.
- `assets/admin.js`: render admin y export CSV.
- `assets/site.js`: aplica `assets/config.json`, render dinámico (hero, timeline, info, galería, FAQs) y gestiona avisos.
- `assets/service-worker.js`: caché básico de recursos.
- `assets/manifest.json`: PWA (iconos en `assets/`).
- `assets/themes/<nombre>.css`: tokens de color/gradientes para cada plantilla (ej. `classic`, `minimal`, `rustic`, `nocturne`, `romantic`).
- `assets/galeria/`: imágenes galería.
- `apps-script/`: backend Apps Script en módulos (pega cada `.gs` en tu proyecto GAS).

## Configuración (assets/api.js)
Edita constantes:
- `SCRIPT_URL`: URL del Google Apps Script desplegado (web app).
- `SHARED_SECRET`: shared secret entre cliente y GAS (se valida solo en servidor).
- `ADMIN_KEY`: clave server-side para `admin_list`.
- `ADMIN_PIN`: PIN visual para ocultar el panel a curiosos (no seguridad real).

Acciones esperadas en GAS:
- `lookup(token) -> {ok, data, acomp, error}`
- `rsvp(...) -> {ok, error}`
- `admin_list(adminKey) -> {ok, data, error}`
- `save_email(token, email) -> {ok, error}`
- `ping() -> {ok:true}`

Valida SIEMPRE en servidor:
- Que el `token` exista y su cuota de `acompanantes`/plazas.
- Que `adminKey` sea válida en `admin_list`.
- Firmas/timestamps si quieres mayor robustez (opcional).

## Parámetros de contenido (`assets/config.json`)
Controla la plantilla sin tocar HTML. Ejemplo completo en `assets/config.json` y boilerplate en `assets/config.example.json`.

- `theme`: nombre del CSS en `assets/themes/` (ahora `classic`).
- `title`, `couple.names`, `date`, `date_text`: título del sitio y textos del hero/contador.
- `venue`: `{ name, location_text, map_url }` para textos y botón de mapa.
- `hero_cta`: `{ label, href }` controla el botón principal del hero.
- `timeline`: array de pasos `{ label?, time, title, desc, icon, kind }` (icon IDs coinciden con el sprite de `index.html`).
- `info`: tarjetas informativas (transporte, alergias, niños...).
- `gallery`: lista de fotos `{ src, alt }` que alimenta la galería + lightbox.
- `faqs`: preguntas frecuentes `{ q, a }`.
- `cta`: bloque final (título, descripción y botón `{ label, href }`).

Edita `config.json`, recarga y listo. Si quieres otra boda, duplica el repo o guarda variantes de `config.json`.

## Desarrollo local
Es estático. Puedes abrir `index.html` en el navegador o servir un http simple para evitar problemas de rutas/JSONP.

Opciones:
- Python: `python -m http.server 8080`
- Node (serve): `npx serve .`
- VS Code Live Server

Luego visita:
- `http://localhost:8080/index.html`
- `http://localhost:8080/invite.html?token=TU_TOKEN`
- `http://localhost:8080/admin.html`

Si necesitas desplegar o modificar el backend, revisa `apps-script/README.md` (estructura modular, remitentes configurables, etc.).

## Deploy (opcional)
Si decides publicar, funciona en cualquier hosting estático (e.g. GitHub Pages). Este repo ahora está pensado para uso local, sin commits/push automáticos.

## PWA (opcional)
Se registra el Service Worker en `index.html` e `invite.html`. Para cache básico local está ok. Si despliegas, recuerda subir versión de caché en `assets/service-worker.js` (e.g. `boda-cache-v7`) para invalidar y recargar.

## Tokens y flujo RSVP
- Comparte enlaces del tipo `invite.html?token=XXXX`.
- Si el invitado entra sin token, `invite.html` muestra un campo para introducirlo.
- El formulario se adapta al número de plazas disponibles:
  - Datos del titular (menú, alergias, notas).
  - Acompañantes (nombre, apellidos, menú, alergias, notas).
  - Bus (checkbox) y canción sugerida.
- Al enviar, se hace `apiRsvp`, se muestra un aviso (“asistes”/“no asistes”) y a los 3‑4 s se redirige a la portada con el mensaje correspondiente (también pasa si pulsas “Seguir igual”).

## Seguridad y privacidad
- Proyecto estático: no se pueden ocultar secretos en el cliente.
- Valida todo en GAS (token, cuotas, adminKey, etc.).
- Considera rotar `ADMIN_PIN` y `ADMIN_KEY` si publicas.

## Personalización
- Colores/tipografías: via `assets/themes/<nombre>.css` (cambia `config.theme`). Las reglas usan CSS variables (`--color-primary`, `--btn-hero-bg`, etc.). Hay temas de ejemplo: `classic`, `minimal`, `rustic`, `nocturne`.
- Temas incluidos de ejemplo: `classic` (azules + dorado) y `minimal` (morado + rosa). Crea más duplicando uno de esos CSS y ajustando las variables.
- Contenido editable desde `assets/config.json` (hero, timeline, info, galería, FAQs, mapa, fecha...).
- Si necesitas más temas, crea otro CSS en `assets/themes/` y referencia su nombre en `config.json`.

## Checklist
- [ ] `SCRIPT_URL`, `SHARED_SECRET`, `ADMIN_KEY` configurados
- [ ] Iconos `assets/icon-192.png` y `assets/icon-512.png`
- [ ] Service Worker registrado (si quieres PWA)
- [ ] GAS desplegado (Web App) y permisos correctos
- [ ] Prueba con varios tokens (sí/no, con/sin acompañantes)
