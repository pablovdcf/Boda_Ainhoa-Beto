# Boda Ainhoa & Alberto · Astro Static

Webapp de invitación en Astro (`output: static`) con compatibilidad legacy y contenido editable por colecciones.

## Comandos
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Rutas activas
- `/`
- `/invite`
- `/admin`
- `/invite.html` (alias de `/invite`)
- `/admin.html` (alias de `/admin`)

## Compatibilidad legacy mantenida
- Assets legacy en `public/assets/*` (paths preservados: `/assets/...`).
- Scripts RSVP/Admin legacy siguen cargando en `/invite` y `/admin`.
- API GAS sigue en JSONP (sin romper contrato):
  - `lookup(token)`
  - `rsvp(payload legacy)`
  - `admin_list(adminKey)`
  - `ping`

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

## Cómo editar contenido (Fase 2)
El contenido de landing ya no depende de HTML grande:

1. Agenda  
Edita `src/content/agenda/*.md`:
- frontmatter: `order`, `time`, `title`, `location?`
- cuerpo: descripción de cada bloque

2. FAQ  
Edita `src/content/faq/*.md`:
- frontmatter: `order`, `question`
- cuerpo: respuesta

3. Recomendaciones/logística  
Edita `src/content/recomendaciones/*.md`:
- frontmatter: `title`, `order`, `category`
- cuerpo: texto de recomendación

4. Datos generales landing (hero, venue, galería, contador)  
Edita `src/content/site/landing.json`.

## PWA / Service Worker
1. SW principal en `/service-worker.js`.
2. Cache versionado y limpieza de caches viejas en `activate`.
3. Navegación con `network-first` para evitar HTML obsoleto tras deploy.
4. Assets estáticos con `stale-while-revalidate`.
5. Fallback offline en `/offline.html`.
6. Se usa `skipWaiting()` + `clients.claim()`.
7. Compatibilidad legacy con `/assets/service-worker.js` (puente a SW raíz).

## Checklist manual · Fase 1
- [ ] `npm run build` sin errores.
- [ ] `npm run preview` funcionando.
- [ ] `/`, `/invite`, `/invite.html`, `/admin`, `/admin.html` responden 200.
- [ ] `/manifest.json` y `/service-worker.js` responden.
- [ ] `/assets/*` mantiene resolución sin 404.

## Checklist manual · Fase 2
- [ ] Landing con secciones: Hero, Agenda, Ubicación, Galería, FAQ, Footer.
- [ ] Contador funcionando y mostrando fecha del evento.
- [ ] FAQ accesible (`aria-expanded`, `aria-controls`, toggle con teclado).
- [ ] Galería abre lightbox, cierra con `ESC` y click fuera.
- [ ] Botón de ubicación copia dirección y abre Google Maps.
- [ ] Imágenes con `loading="lazy"` y `decoding="async"` (excepto hero/location principal).
- [ ] Contraste/focus visible correcto en botones, enlaces e inputs.
- [ ] `/invite` y `/admin` siguen operativos sin cambios funcionales.

