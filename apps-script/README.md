# Apps Script backend (simplificado)

Carpeta con los .gs que puedes copiar/pegar en tu proyecto de Google Apps Script. Estructura:

- `config.gs`: constantes (ID de la hoja, secretos, remitentes, evento del calendario).
- `lib/utils.gs`: helpers comunes (CORS/JSONP, acceso a hojas, caché, auth).
- `domain/*.gs`: lógica de negocio (invitados, respuestas, emails).
- `handlers/*.gs`: funciones pequeñas por acción (`lookup`, `rsvp`, `admin_list`, `save_email`).
- `main.gs`: `doGet/doPost` que enrutan la acción y devuelven JSONP/JSON.

## Cómo usarlo
1. Abre tu proyecto Apps Script.
2. Crea archivos con los mismos nombres y pega cada contenido.
3. Ajusta `CFG` en `config.gs` (ID de spreadsheet, dominios permitidos, remitentes, evento, etc.).
4. Despliega como Web App (debe permitir ejecución como tú y acceso anónimo).
5. El frontend seguirá llamando con JSONP (`secret` + `callback`).

## Personalización
- Cambia `CFG.EMAIL_FROM` / `CFG.EMAIL_REPLY_TO` para usar otro remitente (debe estar autorizado en Gmail).
- Edita las funciones `renderEmailSi` / `renderEmailNo` o sustitúyelas por plantillas `HtmlService` si prefieres.
- Para nuevos idiomas, aprovecha `titular.idioma` en `handleRsvp` y elige distintas plantillas.
