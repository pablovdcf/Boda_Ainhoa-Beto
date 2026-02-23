export const API_CONFIG = {
  SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzhaTjnmF5FaflLFFVUbrw4Xplwl6D1zNP2oHA_zeSvuhd0WTG1Y0MLxsnsO4RMMXmp/exec",
  SHARED_SECRET: "BodaBetoyainhoa",
  ADMIN_PIN: "011222",
  ADMIN_KEY: "1234abcdxyz",
  JSONP_TIMEOUT_MS: 12000
} as const;

type JsonpValue = string | number | boolean | undefined | null;
type JsonpParams = Record<string, JsonpValue>;

export interface LookupData {
  token: string;
  nombre: string;
  email?: string;
  grupo?: string;
  plazas_max: number;
  status?: string;
  idioma?: string;
  menu?: string;
  alergias?: string;
  notas_titular?: string;
}

export interface AcompananteData {
  token?: string;
  nombre?: string;
  apellidos?: string;
  menu?: string;
  alergias?: string;
  notas?: string;
}

export interface ApiResultBase {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface LookupResult extends ApiResultBase {
  data?: LookupData;
  acomp?: AcompananteData[];
}

export interface AdminListRow {
  token: string;
  nombre: string;
  grupo?: string;
  status?: string;
  acompanantes?: number;
  menu?: string;
  alergias?: string;
  bus?: string | boolean;
}

export interface AdminListResult extends ApiResultBase {
  data?: AdminListRow[];
}

export interface RsvpPayload {
  token: string;
  asistencia: "si" | "no";
  acompanantes?: number;
  acompanantes_nombres?: AcompananteData[];
  menu?: string;
  alergias?: string;
  notas_titular?: string;
  bus?: boolean;
  cancion?: string;
}

export class JsonpError extends Error {
  constructor(message: string, public causeCode: string) {
    super(message);
    this.name = "JsonpError";
  }
}

function normalizeParams(params: JsonpParams): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    out[key] = String(value);
  });
  return out;
}

function jsonp<T>(params: JsonpParams, timeoutMs = API_CONFIG.JSONP_TIMEOUT_MS): Promise<T> {
  if (typeof document === "undefined") {
    return Promise.reject(
      new JsonpError("JSONP solo disponible en entorno navegador", "not_in_browser")
    );
  }

  return new Promise<T>((resolve, reject) => {
    const callbackName = `cb_${Math.random().toString(36).slice(2)}`;
    const payload = normalizeParams({
      ...params,
      callback: callbackName,
      secret: API_CONFIG.SHARED_SECRET
    });
    const query = new URLSearchParams(payload);
    const script = document.createElement("script");
    script.async = true;
    script.src = `${API_CONFIG.SCRIPT_URL}?${query.toString()}`;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        delete (window as typeof window & Record<string, unknown>)[callbackName];
      } catch {
        (window as typeof window & Record<string, unknown>)[callbackName] = undefined;
      }
      script.remove();
    };

    (window as typeof window & Record<string, unknown>)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new JsonpError("No se pudo cargar respuesta JSONP", "script_error"));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new JsonpError("Tiempo de espera agotado", "timeout"));
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

export function apiLookup(token: string) {
  return jsonp<LookupResult>({
    action: "lookup",
    token
  });
}

export function apiRsvp(data: RsvpPayload) {
  return jsonp<ApiResultBase>({
    action: "rsvp",
    token: data.token,
    asistencia: data.asistencia,
    acompanantes: String(data.acompanantes || 0),
    acompanantes_nombres: JSON.stringify(data.acompanantes_nombres || []),
    menu: data.menu || "",
    alergias: data.alergias || "",
    notas_titular: data.notas_titular || "",
    bus: String(Boolean(data.bus)),
    cancion: data.cancion || ""
  });
}

export function apiAdminList() {
  return jsonp<AdminListResult>({
    action: "admin_list",
    adminKey: API_CONFIG.ADMIN_KEY
  });
}

export function apiPing() {
  return jsonp<ApiResultBase>({
    action: "ping"
  });
}

