# Boda Ainhoa & Alberto · Landing + RSVP + Admin + PWA
Aplicación web estática para invitación de boda con flujo de confirmación (RSVP), panel de administración y soporte PWA, conectada a Google Apps Script vía JSONP.

## Features
- Landing pública en `index.html` con contenido dinámico (timeline, galería, FAQ, countdown) desde `assets/config.json`.
- Página de confirmación en `invite.html` con token (`?token=` / `?t=`), lookup de invitado y envío RSVP.
- Panel en `admin.html` con gate por PIN, KPIs básicos, filtros y export CSV.
- API frontend en ES Modules (`assets/api.js`, `assets/app.js`, `assets/admin.js`).
- Integración con Google Apps Script por JSONP (`lookup`, `rsvp`, `admin_list`, `ping`, `save_email`).
- Soporte PWA con `assets/manifest.json` y `assets/service-worker.js`.
- Service worker con estrategia robusta (navigation network-first + cache de assets estáticos).

## Estructura del proyecto
> Nota: en este repo los archivos públicos están bajo `public/` y se sirven como raíz (`/`).  
> Por eso `public/assets/app.js` se publica como `/assets/app.js`.

```text
.
├─ index.html
├─ invite.html
├─ admin.html
├─ public/
│  ├─ assets/
│  │  ├─ app.js
│  │  ├─ admin.js
│  │  ├─ api.js
│  │  ├─ site.js
│  │  ├─ service-worker.js
│  │  ├─ manifest.json
│  │  ├─ config.json
│  │  ├─ galeria/
│  │  └─ themes/
│  ├─ service-worker.js
│  ├─ manifest.json
│  ├─ offline.html
│  └─ icons/
├─ apps-script/
│  ├─ main.gs
│  ├─ config.gs
│  ├─ handlers/
│  │  ├─ lookup.gs
│  │  ├─ rsvp.gs
│  │  └─ admin.gs
│  ├─ domain/
│  │  ├─ invitados.gs
│  │  ├─ respuestas.gs
│  │  └─ emails.gs
│  └─ lib/utils.gs
└─ package.json
```

## Cómo funciona (flujo)
1. Usuario entra en `index.html`.
2. CTA lleva a `invite.html` con token en URL (`?token=...` o `?t=...`).
3. `assets/app.js` llama `apiLookup(token)` en `assets/api.js` (JSONP, `action=lookup`).
4. Se cargan datos del titular y acompañantes; usuario edita asistencia/detalles.
5. Enviar RSVP dispara `apiRsvp(payload)` (`action=rsvp`).
6. Si corresponde, puede guardarse email con `apiSaveEmail(token,email)` (`action=save_email`).
7. En `admin.html`, tras PIN local, `assets/admin.js` llama `apiAdminList()` (`action=admin_list`) y renderiza tabla/KPIs/export.

## Configuración
La configuración de frontend está en `public/assets/api.js` (servido como `/assets/api.js`) dentro de `CONFIG`.

```js
export const CONFIG = {
  SCRIPT_URL: "<REDACTED_SCRIPT_URL>/exec",
  SHARED_SECRET: "<REDACTED_SHARED_SECRET>",
  ADMIN_PIN: "<REDACTED_ADMIN_PIN>",
  ADMIN_KEY: "<REDACTED_ADMIN_KEY>"
};
```

Campos:
- `SCRIPT_URL`: URL del Web App de GAS (`/exec` recomendado en producción).
- `SHARED_SECRET`: secreto compartido exigido por GAS en cada llamada.
- `ADMIN_PIN`: PIN del gate visual de `admin.html` (validación en cliente).
- `ADMIN_KEY`: clave enviada en `action=admin_list`.

## Integración con Google Apps Script
El backend está en `apps-script/` y expone `doGet/doPost` con dispatcher por `action` (`apps-script/main.gs`).

### Patrón de llamada (JSONP)
```js
const cb = "cb_" + Math.random().toString(36).slice(2);
const q = new URLSearchParams({
  ...params,
  callback: cb,
  secret: CONFIG.SHARED_SECRET
});
script.src = `${CONFIG.SCRIPT_URL}?${q.toString()}`;
```

### Acciones soportadas
- `ping`
  - Request: `action=ping`
  - Response esperada: `{ ok: true, ping: "pong" }`
- `lookup`
  - Request: `action=lookup&token=...`
  - Response esperada:
    - OK: `{ ok: true, data: {...titular}, acomp: [...] }`
    - Error: `{ ok: false, error: "missing_token|not_found|..." }`
- `rsvp`
  - Request: `action=rsvp` + payload RSVP
  - Response esperada:
    - OK: `{ ok: true, savedCompanions: <n> }` (o `{ ok: true, dedup: true }`)
    - Error: `{ ok: false, error: "..." }`
- `admin_list`
  - Request: `action=admin_list&adminKey=...`
  - Response esperada: `{ ok: true, data: [...] }` o `{ ok: false, error: "unauthorized" }`
- `save_email`
  - Request: `action=save_email&token=...&email=...`
  - Response esperada: `{ ok: true }` o error.

### Payload RSVP (estructura)
```js
{
  action: "rsvp",
  token: "<TOKEN>",
  asistencia: "si" | "no",
  acompanantes: "0..N",
  acompanantes_nombres: JSON.stringify([
    { nombre, apellidos, menu, alergias, notas }
  ]),
  menu: "<menu titular>",
  alergias: "<alergias titular>",
  notas_titular: "<texto>",
  bus: "true|false",
  cancion: "<texto>"
}
```

## PWA
- Manifest legacy: `assets/manifest.json` (fichero real: `public/assets/manifest.json`).
- Service worker legacy: `assets/service-worker.js` (fichero real: `public/assets/service-worker.js`), que delega a `/service-worker.js`.
- Service worker principal: `public/service-worker.js`.

Comportamiento actual del SW principal:
- `navigate` (HTML): **network-first** con fallback a `/offline.html`.
- Assets estáticos (`/assets/`, `/icons/`, `/_astro/`, extensiones estáticas): **cache-first**.
- Precarga inicial: `offline.html`, `manifest.json`, iconos.
- Limpieza de caches antiguas por versión + `skipWaiting` + `clients.claim`.

## Desarrollo local
Este proyecto se despliega como estático. Para probarlo localmente de forma fiable:

```bash
npm install
npm run build
npx serve dist -l 5173
```

Alternativa con Python:

```bash
npm run build
cd dist
python -m http.server 5173
```

## Deploy (estático)
### GitHub Pages
- Publicar el contenido de `dist/` (workflow CI o branch de publicación).
- Verificar que rutas `/assets/*` y `/icons/*` quedan servidas en raíz.

### Vercel
- Build command: `npm run build`
- Output directory: `dist`
- Tipo: static site.

### Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Tipo: static site.

## Seguridad y notas importantes
- `ADMIN_PIN`, `ADMIN_KEY` y `SHARED_SECRET` en frontend **no son secretos reales**: cualquier usuario puede inspeccionarlos.
- El PIN de `admin.html` es una barrera de UX, no una autenticación robusta.
- JSONP implica ejecución de script remoto; revisar siempre el origen (`SCRIPT_URL`) y rotar claves.
- Si se usan valores reales en `public/assets/api.js` o `apps-script/config.gs`, tratarlos como comprometidos y rotarlos.
- Recomendado a medio plazo:
  - mover secretos a backend/proxy serverless,
  - sustituir JSONP por `fetch` con CORS controlado,
  - limitar tasa y auditar accesos admin.

## Checklist de despliegue
- [ ] `SCRIPT_URL` apunta a GAS correcto y terminado en `/exec`.
- [ ] `SHARED_SECRET`, `ADMIN_PIN`, `ADMIN_KEY` actualizados (no defaults).
- [ ] `apps-script/config.gs` revisado con valores de producción (`CFG.*`) y secretos rotados.
- [ ] `npm run build` sin errores.
- [ ] `assets/manifest.json` y `assets/service-worker.js` accesibles en el deploy.
- [ ] Cache SW verificada tras publicar (sin HTML obsoleto).
- [ ] Flujo RSVP probado end-to-end (`lookup` + `rsvp`).
- [ ] `save_email` probado con token válido.
- [ ] `admin_list` responde con `ADMIN_KEY` correcta.
- [ ] Export CSV del admin validado con datos reales.

## Roadmap / mejoras futuras
- Migrar autenticación y claves admin fuera del cliente.
- Migrar de JSONP a API HTTP (`fetch`) con CORS/proxy.
- Añadir tests de contrato para acciones GAS.
- Añadir observabilidad (logs y alertas) en errores de RSVP.

## Licencia
Private / All rights reserved.
