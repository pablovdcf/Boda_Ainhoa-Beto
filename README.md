# Boda Ainhoa & Alberto · Fase 1 (Astro Scaffold)

Migración inicial a Astro + Tailwind local con prioridad en compatibilidad de rutas y despliegue estático en Vercel.

## Alcance de esta fase
- Scaffold de Astro en modo `static`.
- Mantener endpoints legacy GAS/JSONP sin cambios de contrato.
- Mantener rutas nuevas y legacy:
  - `/`
  - `/invite`
  - `/admin`
  - `/invite.html` (alias de `/invite`)
  - `/admin.html` (alias de `/admin`)
- Migración de `assets/` a `public/assets/` sin romper paths (`/assets/...`).
- PWA mínima con SW versionado evitando servir HTML viejo indefinidamente.

## Comandos
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Desarrollo local:
   ```bash
   npm run dev
   ```
3. Build estático:
   ```bash
   npm run build
   ```
4. Probar build:
   ```bash
   npm run preview
   ```
5. (Opcional) lint/format:
   ```bash
   npm run lint
   npm run format
   ```

## Estructura base (Fase 1)
- `src/layouts/BaseLayout.astro`
- `src/pages/index.astro`
- `src/pages/invite.astro`
- `src/pages/admin.astro`
- `src/pages/invite.html.astro`
- `src/pages/admin.html.astro`
- `src/components/ui/Button.astro`
- `src/components/ui/Card.astro`
- `src/components/ui/Badge.astro`
- `src/components/pages/InvitePage.astro`
- `src/components/pages/AdminPage.astro`
- `src/lib/api.ts`
- `src/lib/storage.ts`
- `src/lib/validators.ts`
- `src/lib/format.ts`
- `src/styles/globals.css`
- `public/assets/*` (assets legacy migrados)
- `public/manifest.json`
- `public/service-worker.js`
- `public/icons/*`

## API legacy encapsulada (sin cambios)
`src/lib/api.ts` mantiene JSONP y payloads legacy:
- `lookup(token)`
- `rsvp({ token, asistencia, acompanantes, acompanantes_nombres, menu, alergias, notas_titular, bus, cancion })`
- `admin_list(adminKey)`
- `ping`

Notas:
- Sigue JSONP (no `fetch`) para no depender de CORS.
- Se añadió timeout y error consistente en cliente sin cambiar campos ni acciones.

## Decisiones Fase 1 (SW/PWA) [5-10 líneas]
1. El Service Worker principal se sirve en `/service-worker.js`.
2. Se usa cache versionado (`CACHE_VERSION`) y limpieza de caches viejas en `activate`.
3. Para navegación (`request.mode === "navigate"`), estrategia `network-first`.
4. No se cachea HTML de navegación de forma persistente para evitar páginas antiguas tras deploy.
5. Se cachean estáticos (CSS/JS/imagenes/manifest) con `stale-while-revalidate`.
6. Se incluye `offline.html` como fallback cuando no hay red.
7. Se usa `skipWaiting()` + `clients.claim()` para activar versiones nuevas con rapidez.
8. Se mantiene `/assets/service-worker.js` como puente a `/service-worker.js` para compatibilidad.

## Checklist manual · Fase 1
- [ ] `npm run build` finaliza sin errores.
- [ ] `npm run preview` levanta correctamente.
- [ ] `/`, `/invite`, `/invite.html`, `/admin`, `/admin.html` cargan sin 404.
- [ ] En DevTools, `manifest.json` responde en raíz (`/manifest.json`).
- [ ] En DevTools, Service Worker activo en `/service-worker.js`.
- [ ] Los assets legacy siguen resolviendo en `/assets/...` (imágenes, JS, CSS).
- [ ] `/assets/service-worker.js` responde (compat legacy).
- [ ] RSVP/Admin cargan scripts legacy (`/assets/app.js` y `/assets/admin.js`).

