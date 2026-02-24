/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SCRIPT_URL?: string;
  readonly PUBLIC_SHARED_SECRET?: string;
  readonly PUBLIC_ADMIN_KEY?: string;
  readonly PUBLIC_ADMIN_PIN?: string;
  readonly PUBLIC_JSONP_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
