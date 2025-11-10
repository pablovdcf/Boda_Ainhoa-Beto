# Invitación de Boda · Ainhoa & Alberto

Webapp estática para invitación, confirmación (RSVP) y panel de administración, con integración vía Google Apps Script (JSONP) y PWA opcional.

## Características
- Landing con timeline, galería y contador (Tailwind CDN).
- RSVP por invitado con token único (acompañantes, menú, alergias, bus, canción).
- Modal opcional para recoger email y enviar confirmación/evento.
- Panel admin con filtros y export CSV.
- PWA opcional (manifest + Service Worker simple).

## Estructura
- `index.html`: página pública.
- `invite.html`: confirmación por token (`?token=...`).
- `admin.html`: panel de administración.
- `assets/app.js`: lógica RSVP + modal email.
- `assets/api.js`: llamadas JSONP a Google Apps Script.
- `assets/admin.js`: render admin y export CSV.
- `assets/service-worker.js`: caché básico de recursos.
- `assets/manifest.json`: PWA (iconos en `assets/`).
- `assets/galeria/`: imágenes galería.

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
- Al enviar, se hace `apiRsvp` y se fija el estado (sí/no).

## Seguridad y privacidad
- Proyecto estático: no se pueden ocultar secretos en el cliente.
- Valida todo en GAS (token, cuotas, adminKey, etc.).
- Considera rotar `ADMIN_PIN` y `ADMIN_KEY` si publicas.

## Personalización
- Colores/tipografías en Tailwind CDN (`tailwind.config` inline en los HTML).
- Galería en `index.html` (sección de imágenes) y `assets/galeria/`.
- Timeline en `index.html` (array `EVENTS_V`).

## Checklist
- [ ] `SCRIPT_URL`, `SHARED_SECRET`, `ADMIN_KEY` configurados
- [ ] Iconos `assets/icon-192.png` y `assets/icon-512.png`
- [ ] Service Worker registrado (si quieres PWA)
- [ ] GAS desplegado (Web App) y permisos correctos
- [ ] Prueba con varios tokens (sí/no, con/sin acompañantes)
