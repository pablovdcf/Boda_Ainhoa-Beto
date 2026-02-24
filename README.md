# Boda Ainhoa & Alberto · Astro Static

Webapp de invitación en Astro (`output: static`) con compatibilidad legacy y contenido editable por colecciones.

## Comandos
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Variables de entorno (`PUBLIC_*`)
Estas variables se leen en build/runtime cliente. Al ser `PUBLIC_*`, quedan incluidas en el bundle.

| Variable | Requerida | Default local | Uso |
|---|---|---|---|
| `PUBLIC_SCRIPT_URL` | Sí (recomendada) | URL actual de GAS | Endpoint base JSONP de GAS. En producción debe terminar en `/exec`. |
| `PUBLIC_SHARED_SECRET` | Sí | `BodaBetoyainhoa` | Se envía como `secret` en JSONP. |
| `PUBLIC_ADMIN_KEY` | Sí | `1234abcdxyz` | Se usa en `action=admin_list`. |
| `PUBLIC_ADMIN_PIN` | Sí | `011222` | Gate UI del panel admin (no seguridad real). |
| `PUBLIC_JSONP_TIMEOUT_MS` | No | `12000` | Timeout JSONP en milisegundos. |

## Vercel (Production + Preview)
1. En Vercel Project > Settings > Environment Variables, define todas las `PUBLIC_*` para **Production** y **Preview**.
2. Usa `PUBLIC_SCRIPT_URL` apuntando a GAS `/exec` para invitados.
3. `/dev` en GAS es útil para pruebas internas, pero no para tráfico público.
4. Nota importante: `PUBLIC_*` no oculta secretos; solo evita hardcodes en repositorio.

## Rutas activas
- `/`
- `/invite`
- `/admin`
- `/invite.html` (alias de `/invite`)
- `/admin.html` (alias de `/admin`)

## Compatibilidad legacy mantenida
- Assets legacy en `public/assets/*` (paths preservados: `/assets/...`).
- RSVP migrado a wizard en Astro (`src/scripts/invite-wizard.ts`) con contrato GAS intacto.
- Admin migrado a dashboard Astro (`src/scripts/admin-dashboard.ts`) con contrato GAS intacto.
- API GAS sigue en JSONP (sin romper contrato):
  - `lookup(token)`
  - `rsvp(payload legacy)`
  - `admin_list(adminKey)`
  - `ping`

## Especificación visual legacy (source of truth: `index.html`)
### 1) Google Fonts
- `Playfair Display`
- `Inter`
- `Great Vibes`

### 2) Tailwind `extend` exacto
- `fontFamily.serif = ["Playfair Display", "serif"]`
- `fontFamily.sans = ["Inter", "ui-sans-serif", "system-ui"]`
- `colors.night = "#0B3B4F"`
- `colors.champagne = "#F5E6D3"`
- `colors.blush = "#F8D9E0"`
- `colors.ink = "#0f172a"`
- `colors.gold = "#C4A26A"`
- `boxShadow.soft = "0 10px 30px rgba(10, 30, 60, .10)"`
- `backgroundImage.hero = "linear-gradient(135deg, #0B3B4F 0%, #164e63 60%, #2563eb 120%)"`
- `backgroundImage.paper = "radial-gradient(1200px 600px at 50% -200px, rgba(255,255,255,.15), transparent 65%)"`

### 3) CSS utilitario clave restaurado
- `.card` (blur + border + shadow + hover)
- `.btn`, `.btn-outline`
- `.btn-hero`, `.btn-hero-outline`
- `.divider`, `.floral-divider`, `.section-divider`
- `.countdown` y `.num.fade`
- Timeline `.tl*` (estructura, bullet, hover, layout)
- Galería `.masonry` + lightbox `#lb #lbImg`
- `.notice-banner`

## Estructura clave
- `src/layouts/BaseLayout.astro`
- `src/pages/index.astro`
- `src/pages/invite.astro`
- `src/pages/admin.astro`
- `src/pages/invite.html.astro`
- `src/pages/admin.html.astro`
- `src/components/ui/*`
- `src/components/sections/*`
- `src/lib/api.ts`, `src/lib/storage.ts`, `src/lib/validators.ts`, `src/lib/format.ts`
- `src/content/*`

## Cómo editar contenido (Fase 2B)
### Agenda
Edita `src/content/agenda/*.md`:
- frontmatter: `order`, `label?`, `time`, `title`, `location?`, `icon?`, `kind?`
- cuerpo: descripción del bloque

### FAQ
Edita `src/content/faq/*.md`:
- frontmatter: `order`, `question`
- cuerpo: respuesta

### Recomendaciones / info cards
Edita `src/content/recomendaciones/*.md`:
- frontmatter: `title`, `order`, `category`
- cuerpo: texto del bloque

### Datos globales landing
Edita `src/content/site/landing.json`:
- hero, venue, story, location, gallery, countdown, CTA final

## PWA / Service Worker
1. SW principal en `/service-worker.js`.
2. Cache versionado y limpieza de caches viejas en `activate`.
3. Navegación con `network-first` para evitar HTML obsoleto tras deploy.
4. Assets estáticos con `cache-first`.
5. Fallback offline en `/offline.html`.
6. `skipWaiting()` + `clients.claim()`.
7. Compatibilidad legacy con `/assets/service-worker.js` (puente a SW raíz).

## Checklist manual · Fase 2B (restore legacy theme)
- [ ] Hero con `bg-hero`, `hero-florals`, overlay `bg-black/20`, tipografía serif y CTA `btn-hero`.
- [ ] Body/base con `bg-slate-50 text-ink`, fuentes legacy y `theme-color #0b3b4f`.
- [ ] Timeline en `#detalles` usando `.tl`, `.tl-item`, `.tl-bullet`, iconos sprite.
- [ ] Sección historia con medallón corazón + `.card` para imagen.
- [ ] Ubicación con `.location-section`, `.location-photos` y botón principal `.btn`.
- [ ] Bloque de info extra en 3 `.card p-6`.
- [ ] Galería `#galleryGrid.masonry` + lightbox `#lb` y `#lbImg`.
- [ ] Cuenta atrás con `.countdown` y separadores `•` + animación `.num.fade`.
- [ ] FAQ renderizada con `<details class="card">` visual legacy.
- [ ] `/invite`, `/invite.html`, `/admin`, `/admin.html` con look coherente (cards + btn + header hero).

## Fase 3 · RSVP Wizard (UX pro)
- Ruta activa: `/invite` y alias `/invite.html`.
- Carga del wizard: módulo Astro generado en `/_astro/Wizard.astro_astro_type_script_*.js`.
- Flujo:
  1. Token gate (manual o `?token=` / `?t=`).
  2. Lookup JSONP (`action=lookup`) con skeleton y manejo de error.
  3. Pasos de asistencia, acompañantes, menú/alergias, bus/canción y resumen editable.
  4. Submit JSONP (`action=rsvp`) con payload legacy y toasts.
- Estado local:
  - `lastToken`
  - `draft_rsvp_<token>`
- Contrato payload preservado: `token`, `asistencia`, `acompanantes`, `acompanantes_nombres`, `menu`, `alergias`, `notas_titular`, `bus`, `cancion`.

## Checklist manual · Fase 3
- [ ] `/invite` sin token muestra token gate.
- [ ] `/invite?t=TOKEN_VALIDO` dispara lookup automático.
- [ ] `plazas_max` limita acompañantes a `plazas_max - 1`.
- [ ] Si acompañantes > 0, nombres obligatorios (>= 2 chars).
- [ ] Resumen permite editar secciones y volver al paso correcto.
- [ ] Submit envía `action=rsvp` con nombres de campo legacy exactos.
- [ ] Error de JSONP/timeout muestra toast + mensaje de error y permite reintentar.
- [ ] Refresh conserva borrador `draft_rsvp_<token>`.

## Fase 4 · Admin overhaul (usabilidad)
- Rutas activas: `/admin` y `/admin.html` (alias), mismas vistas y mismo bundle Astro.
- Contrato GAS intacto:
  - `apiAdminList()` (`action=admin_list` + `adminKey` en `src/lib/api.ts`)
- UI gate por PIN en cliente intacto (`admin_pin` en localStorage).
- Nuevo dashboard:
  - búsqueda por nombre/token/notas/canción
  - filtros por estado/grupo/bus/menú + chips de filtros activos
  - KPIs: total, sí, no, pendientes, asistentes estimados, bus sí, acompañantes
  - breakdown de menús y alergias compactas
  - tabla con ordenación por `nombre`, `status`, `totalPersonas`, `menu`
  - cache local `admin_cache_v1` (TTL 5 min) + recarga manual
  - export CSV filtrado/ordenado con BOM y delimitador configurable (`;` por defecto)

## Checklist manual · Fase 4
- [ ] Carga inicial de admin y botón retry funcionan.
- [ ] Búsqueda por nombre/token/notas/canción devuelve resultados correctos.
- [ ] Filtros por estado/grupo/bus/menú y chips de filtros activos funcionan.
- [ ] KPIs y breakdowns reflejan el conjunto filtrado.
- [ ] Ordenación por columnas (nombre/estado/total/menu) funciona.
- [ ] Export CSV abre bien en Excel (BOM + `;` por defecto).
- [ ] `/admin` y `/admin.html` cargan sin 404 y comparten comportamiento.

## Fase 5 · PWA / Service Worker robusto
- Archivo activo: `public/service-worker.js` (root: `/service-worker.js`).
- Navegación (`request.mode === "navigate"`): `network-first`, sin cachear HTML; fallback a `/offline.html` solo si no hay red.
- Assets estáticos (`/assets/`, `/icons/`, `/_astro/`, extensiones estáticas): `cache-first` con cache versionado.
- Activación:
  - limpieza de caches antiguas al cambiar versión
  - `clients.claim()` para tomar control de clientes abiertos
  - `navigationPreload` habilitado cuando está disponible
- Update SW:
  - `skipWaiting()` en install + soporte por mensaje `SKIP_WAITING`
  - registro en `BaseLayout` con `updateViaCache: "none"`, detección de update y reload controlado tras `controllerchange`

## Checklist manual · Fase 5
- [ ] Tras deploy, recargar `/` muestra la versión nueva sin limpiar caché manual.
- [ ] Con red activa, navegar entre páginas no sirve HTML antiguo desde cache.
- [ ] Sin red, una navegación carga `offline.html`.
- [ ] Assets (`/_astro/*`, `/assets/*`, `/icons/*`) quedan cacheados y responden offline cuando aplica.
- [ ] En DevTools Application > Cache Storage solo queda la cache de versión actual tras activar nuevo SW.

## Fase 6 · Env vars + health check DEV
- `src/lib/api.ts` ya no hardcodea `SCRIPT_URL`, `SHARED_SECRET`, `ADMIN_KEY`, `JSONP_TIMEOUT_MS`.
- `PUBLIC_SCRIPT_URL` se normaliza para terminar en `/exec` en producción.
- `ADMIN_PIN` salió de `api.ts` y ahora vive en `src/lib/admin-config.ts` (`PUBLIC_ADMIN_PIN`).
- Health check de GAS solo en desarrollo:
  - `/invite`: log en consola `[DEV][invite] GAS OK` o warning.
  - `/admin`: log en consola `[DEV][admin] GAS OK` o warning.
- En producción no se ejecuta el ping DEV.

## Checklist manual · Fase 6
- [ ] `npm run build` y `npm run preview` funcionan.
- [ ] `/invite`, `/invite.html`, `/admin`, `/admin.html` siguen operativas.
- [ ] En `npm run dev`, aparece en consola el health check de GAS (OK o warning).
- [ ] Contratos JSONP (`lookup`, `rsvp`, `admin_list`, `ping`) sin cambios de acciones/campos.
