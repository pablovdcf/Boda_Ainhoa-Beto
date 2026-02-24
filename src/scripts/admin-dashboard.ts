import { API_CONFIG, apiAdminList, type AdminListRow } from "../lib/api";
import { toCsv } from "../lib/format";
import { safeRead, safeWrite } from "../lib/storage";

type Status = "si" | "no" | "pendiente";
type SortKey = "nombre" | "status" | "totalPersonas" | "menu";
type SortDir = "asc" | "desc";

interface Filters {
  query: string;
  estado: "" | Status;
  grupo: string;
  bus: "" | "si" | "no";
  menu: string;
}

interface SortState {
  key: SortKey;
  dir: SortDir;
}

interface CachePayload {
  timestamp: number;
  rows: AdminListRow[];
}

interface NormalizedRow {
  token: string;
  nombre: string;
  grupo: string;
  status: Status;
  acompanantes: number;
  totalPersonas: number;
  menu: string;
  alergias: string;
  bus: boolean;
  cancion: string;
  notas: string;
  updatedAt: string;
  searchable: string;
}

interface DashboardState {
  loading: boolean;
  error: string;
  data: NormalizedRow[];
  filtered: NormalizedRow[];
  filters: Filters;
  sort: SortState;
  fromCache: boolean;
  lastUpdated: number | null;
}

const CACHE_KEY = "admin_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const STATUS_ORDER: Record<Status, number> = {
  si: 0,
  pendiente: 1,
  no: 2
};

const MENU_LABELS: Record<string, string> = {
  estandar: "Estándar",
  vegetariano: "Vegetariano",
  celiaco: "Celíaco",
  infantil: "Infantil",
  otro: "Otro"
};

const DEFAULT_FILTERS: Filters = {
  query: "",
  estado: "",
  grupo: "",
  bus: "",
  menu: ""
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStatus(value: unknown): Status {
  const normalized = asString(value).toLowerCase();
  if (normalized === "si" || normalized === "sí") return "si";
  if (normalized === "no") return "no";
  return "pendiente";
}

function toBus(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = asString(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "si" || normalized === "sí";
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function menuLabel(value: string): string {
  return MENU_LABELS[value.toLowerCase()] || value || "—";
}

function statusLabel(value: Status): string {
  if (value === "si") return "Sí";
  if (value === "no") return "No";
  return "Pendiente";
}

function normalizeRow(raw: AdminListRow & Record<string, unknown>): NormalizedRow {
  const status = toStatus(raw.status);
  const acompanantes = toNumber(raw.acompanantes);
  const totalPersonas = status === "si" ? 1 + acompanantes : 0;
  const token = asString(raw.token);
  const nombre = asString(raw.nombre);
  const grupo = asString(raw.grupo);
  const menu = asString(raw.menu).toLowerCase();
  const alergias = asString(raw.alergias);
  const bus = toBus(raw.bus);
  const cancion = asString(raw.cancion);
  const notas = asString(raw.notas_titular || raw.notas || raw.notes);
  const updatedAt = asString(raw.updated_at || raw.updatedAt || raw.ts || raw.timestamp);
  const searchable = `${nombre} ${token} ${notas} ${cancion}`.toLowerCase();
  return {
    token,
    nombre,
    grupo,
    status,
    acompanantes,
    totalPersonas,
    menu,
    alergias,
    bus,
    cancion,
    notas,
    updatedAt,
    searchable
  };
}

function compareRows(a: NormalizedRow, b: NormalizedRow, sort: SortState): number {
  let result = 0;
  if (sort.key === "nombre") {
    result = a.nombre.localeCompare(b.nombre, "es");
  } else if (sort.key === "status") {
    result = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  } else if (sort.key === "totalPersonas") {
    result = a.totalPersonas - b.totalPersonas;
  } else if (sort.key === "menu") {
    result = menuLabel(a.menu).localeCompare(menuLabel(b.menu), "es");
  }
  return sort.dir === "asc" ? result : result * -1;
}

function formatDateForFile(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCacheAge(timestamp: number | null): string {
  if (!timestamp) return "";
  const ageMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(ageMs / 60000));
  if (minutes <= 0) return "Actualizado hace menos de 1 minuto.";
  if (minutes === 1) return "Actualizado hace 1 minuto.";
  return `Actualizado hace ${minutes} minutos.`;
}

function parseMenuFilters(rows: NormalizedRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((row) => {
    if (row.menu) set.add(row.menu);
  });
  return Array.from(set).sort((a, b) => menuLabel(a).localeCompare(menuLabel(b), "es"));
}

function buildAllergyList(rows: NormalizedRow[]): string[] {
  const map = new Map<string, string>();
  rows.forEach((row) => {
    const source = row.alergias;
    if (!source) return;
    source
      .split(/[;,]/g)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        const key = item.toLowerCase();
        if (!map.has(key)) map.set(key, item);
      });
  });
  return Array.from(map.values()).slice(0, 8);
}

export function initAdminDashboard(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const pinGate = document.getElementById("pinGate");
  const pinForm = document.getElementById("pinForm") as HTMLFormElement | null;
  const pinInput = document.getElementById("pinInput") as HTMLInputElement | null;
  const pinError = document.getElementById("pinError");
  const adminApp = document.getElementById("adminApp");

  const fSearch = document.getElementById("f_search") as HTMLInputElement | null;
  const fEstado = document.getElementById("f_estado") as HTMLSelectElement | null;
  const fGrupo = document.getElementById("f_grupo") as HTMLInputElement | null;
  const fBus = document.getElementById("f_bus") as HTMLSelectElement | null;
  const fMenu = document.getElementById("f_menu") as HTMLSelectElement | null;
  const csvDelimiter = document.getElementById("csvDelimiter") as HTMLSelectElement | null;

  const btnRefresh = document.getElementById("btnRefresh");
  const btnClearFilters = document.getElementById("btnClearFilters");
  const btnExport = document.getElementById("btnExport");
  const btnRetry = document.getElementById("btnRetry");

  const adminSkeleton = document.getElementById("adminSkeleton");
  const adminError = document.getElementById("adminError");
  const adminErrorText = document.getElementById("adminErrorText");
  const adminNotice = document.getElementById("adminNotice");

  const activeFilters = document.getElementById("activeFilters");
  const resultCount = document.getElementById("resultCount");
  const cacheHint = document.getElementById("cacheHint");

  const tbody = document.getElementById("tbody");
  const breakdownMenu = document.getElementById("breakdownMenu");
  const breakdownAlergias = document.getElementById("breakdownAlergias");

  const kTotal = document.getElementById("k_total");
  const kSi = document.getElementById("k_si");
  const kNo = document.getElementById("k_no");
  const kPend = document.getElementById("k_pend");
  const kAsistentes = document.getElementById("k_asistentes");
  const kBus = document.getElementById("k_bus");
  const kAcomp = document.getElementById("k_acomp");
  const kAlergias = document.getElementById("k_alergias");

  const sortButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".admin-sort"));

  if (
    !pinForm ||
    !pinInput ||
    !adminApp ||
    !fSearch ||
    !fEstado ||
    !fGrupo ||
    !fBus ||
    !fMenu ||
    !csvDelimiter ||
    !tbody
  ) {
    return;
  }

  const state: DashboardState = {
    loading: false,
    error: "",
    data: [],
    filtered: [],
    filters: { ...DEFAULT_FILTERS },
    sort: {
      key: "nombre",
      dir: "asc"
    },
    fromCache: false,
    lastUpdated: null
  };

  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

  function showNotice(message: string, tone: "success" | "warn" | "info" = "info"): void {
    if (!adminNotice) return;
    adminNotice.textContent = message;
    adminNotice.classList.remove("success", "warn", "info", "show");
    adminNotice.classList.add(tone, "show");
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      adminNotice.classList.remove("show");
    }, 4000);
  }

  function setLoading(loading: boolean): void {
    state.loading = loading;
    if (!adminSkeleton) return;
    const shouldShowSkeleton = loading && state.data.length === 0;
    adminSkeleton.classList.toggle("hidden", !shouldShowSkeleton);
  }

  function setError(message: string): void {
    state.error = message;
    if (!adminError || !adminErrorText) return;
    adminError.classList.toggle("hidden", message.length === 0);
    adminErrorText.textContent = message;
  }

  function statusBadgeClass(status: Status): string {
    if (status === "si") return "admin-status admin-status-ok";
    if (status === "no") return "admin-status admin-status-no";
    return "admin-status admin-status-pending";
  }

  function renderSortIndicators(): void {
    sortButtons.forEach((button) => {
      if (!button.dataset.label) button.dataset.label = button.textContent || "";
      const key = (button.dataset.sort || "") as SortKey;
      const active = state.sort.key === key;
      const arrow = active ? (state.sort.dir === "asc" ? "↑" : "↓") : "";
      button.textContent = `${button.dataset.label}${arrow ? ` ${arrow}` : ""}`;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderKpis(rows: NormalizedRow[]): void {
    const total = rows.length;
    const totalSi = rows.filter((row) => row.status === "si").length;
    const totalNo = rows.filter((row) => row.status === "no").length;
    const totalPend = rows.filter((row) => row.status === "pendiente").length;
    const acompanantesTotales = rows
      .filter((row) => row.status === "si")
      .reduce((sum, row) => sum + row.acompanantes, 0);
    const asistentes = rows
      .filter((row) => row.status === "si")
      .reduce((sum, row) => sum + row.totalPersonas, 0);
    const totalBus = rows.filter((row) => row.status === "si" && row.bus).length;
    const alergiasRows = rows.filter((row) => row.status === "si" && row.alergias.length > 0).length;

    if (kTotal) kTotal.textContent = String(total);
    if (kSi) kSi.textContent = String(totalSi);
    if (kNo) kNo.textContent = String(totalNo);
    if (kPend) kPend.textContent = String(totalPend);
    if (kAsistentes) kAsistentes.textContent = String(asistentes);
    if (kBus) kBus.textContent = String(totalBus);
    if (kAcomp) kAcomp.textContent = String(acompanantesTotales);
    if (kAlergias) kAlergias.textContent = `${alergiasRows} invitado(s) con alergias`;
  }

  function renderBreakdowns(rows: NormalizedRow[]): void {
    if (breakdownMenu) {
      const map = new Map<string, number>();
      rows
        .filter((row) => row.status === "si" && row.menu)
        .forEach((row) => {
          const key = row.menu;
          map.set(key, (map.get(key) || 0) + 1);
        });

      breakdownMenu.innerHTML = "";
      if (map.size === 0) {
        const item = document.createElement("li");
        item.className = "text-slate-500";
        item.textContent = "Sin datos de menú.";
        breakdownMenu.appendChild(item);
      } else {
        Array.from(map.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([menu, count]) => {
            const item = document.createElement("li");
            item.className = "flex items-center justify-between gap-2";
            item.innerHTML = `<span>${menuLabel(menu)}</span><strong>${count}</strong>`;
            breakdownMenu.appendChild(item);
          });
      }
    }

    if (breakdownAlergias) {
      const list = buildAllergyList(rows.filter((row) => row.status === "si"));
      breakdownAlergias.innerHTML = "";
      if (list.length === 0) {
        const item = document.createElement("li");
        item.className = "text-slate-500";
        item.textContent = "Sin alergias registradas.";
        breakdownAlergias.appendChild(item);
      } else {
        list.forEach((allergy) => {
          const item = document.createElement("li");
          item.textContent = `• ${allergy}`;
          breakdownAlergias.appendChild(item);
        });
      }
    }
  }

  function renderActiveFilters(): void {
    if (!activeFilters) return;
    const chips: Array<{ key: keyof Filters; label: string }> = [];
    if (state.filters.query) chips.push({ key: "query", label: `Búsqueda: ${state.filters.query}` });
    if (state.filters.estado) {
      chips.push({ key: "estado", label: `Estado: ${statusLabel(state.filters.estado)}` });
    }
    if (state.filters.grupo) chips.push({ key: "grupo", label: `Grupo: ${state.filters.grupo}` });
    if (state.filters.bus) chips.push({ key: "bus", label: `Bus: ${state.filters.bus === "si" ? "Sí" : "No"}` });
    if (state.filters.menu) chips.push({ key: "menu", label: `Menú: ${menuLabel(state.filters.menu)}` });

    activeFilters.innerHTML = "";
    if (chips.length === 0) {
      const item = document.createElement("span");
      item.className = "text-slate-500 text-sm";
      item.textContent = "Sin filtros activos.";
      activeFilters.appendChild(item);
      return;
    }

    chips.forEach((chip) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-filter-chip";
      button.dataset.clearKey = chip.key;
      button.textContent = `${chip.label} ×`;
      activeFilters.appendChild(button);
    });
  }

  function createTextCell(
    row: HTMLTableRowElement,
    text: string,
    className = "p-3 align-top text-slate-700"
  ): void {
    const td = document.createElement("td");
    td.className = className;
    td.textContent = text || "—";
    row.appendChild(td);
  }

  function renderRows(rows: NormalizedRow[]): void {
    tbody.innerHTML = "";
    if (rows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 10;
      td.className = "p-5 text-center text-slate-500";
      td.textContent = "No hay resultados para los filtros aplicados.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach((rowData) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-slate-200";

      createTextCell(tr, rowData.nombre, "p-3 align-top font-medium text-night");
      createTextCell(tr, rowData.grupo, "p-3 align-top text-slate-700");

      const statusTd = document.createElement("td");
      statusTd.className = "p-3 align-top";
      const statusBadge = document.createElement("span");
      statusBadge.className = statusBadgeClass(rowData.status);
      statusBadge.textContent = statusLabel(rowData.status);
      statusTd.appendChild(statusBadge);
      tr.appendChild(statusTd);

      createTextCell(tr, String(rowData.acompanantes), "p-3 align-top text-right text-slate-700");
      createTextCell(tr, String(rowData.totalPersonas), "p-3 align-top text-right text-slate-700");
      createTextCell(tr, menuLabel(rowData.menu), "p-3 align-top text-slate-700");
      createTextCell(tr, rowData.bus ? "Sí" : "No", "p-3 align-top text-slate-700");

      const notesTd = document.createElement("td");
      notesTd.className = "p-3 align-top text-slate-700";
      if (rowData.notas) {
        const notes = document.createElement("p");
        notes.className = "text-sm";
        notes.textContent = `Nota: ${rowData.notas}`;
        notesTd.appendChild(notes);
      }
      if (rowData.cancion) {
        const song = document.createElement("p");
        song.className = "text-xs text-slate-500 mt-1";
        song.textContent = `Canción: ${rowData.cancion}`;
        notesTd.appendChild(song);
      }
      if (!rowData.notas && !rowData.cancion) {
        notesTd.textContent = "—";
      }
      tr.appendChild(notesTd);

      createTextCell(tr, rowData.updatedAt || "—", "p-3 align-top text-slate-500");
      createTextCell(tr, rowData.token, "p-3 align-top text-xs text-slate-500");
      tbody.appendChild(tr);
    });
  }

  function applyFiltersAndSort(): void {
    const query = state.filters.query.toLowerCase().trim();
    const grupo = state.filters.grupo.toLowerCase().trim();
    const menuFilter = state.filters.menu.toLowerCase().trim();
    let rows = [...state.data];

    if (query) rows = rows.filter((row) => row.searchable.includes(query));
    if (state.filters.estado) rows = rows.filter((row) => row.status === state.filters.estado);
    if (grupo) rows = rows.filter((row) => row.grupo.toLowerCase().includes(grupo));
    if (state.filters.bus) rows = rows.filter((row) => (state.filters.bus === "si" ? row.bus : !row.bus));
    if (menuFilter) rows = rows.filter((row) => row.menu === menuFilter);

    rows.sort((a, b) => compareRows(a, b, state.sort));
    state.filtered = rows;
  }

  function updateMenuFilterOptions(): void {
    const selected = state.filters.menu;
    const dynamic = parseMenuFilters(state.data);
    const options = [`<option value="">Todos</option>`];
    dynamic.forEach((menu) => {
      options.push(`<option value="${menu}">${menuLabel(menu)}</option>`);
    });
    fMenu.innerHTML = options.join("");
    fMenu.value = selected && dynamic.includes(selected) ? selected : "";
    state.filters.menu = fMenu.value;
  }

  function renderAll(): void {
    applyFiltersAndSort();
    renderRows(state.filtered);
    renderKpis(state.filtered);
    renderBreakdowns(state.filtered);
    renderSortIndicators();
    renderActiveFilters();
    if (resultCount) resultCount.textContent = `${state.filtered.length} resultado(s)`;
    if (cacheHint) {
      const hint = state.fromCache
        ? `Mostrando datos cacheados. ${formatCacheAge(state.lastUpdated)}`
        : formatCacheAge(state.lastUpdated);
      cacheHint.textContent = hint;
    }
  }

  function getCache(): CachePayload | null {
    const cached = safeRead<CachePayload | null>(CACHE_KEY, null);
    if (!cached || typeof cached !== "object") return null;
    if (typeof cached.timestamp !== "number") return null;
    if (!Array.isArray(cached.rows)) return null;
    return cached;
  }

  async function loadData(forceRefresh = false): Promise<void> {
    setError("");
    const cached = getCache();
    const cacheFresh = cached && Date.now() - cached.timestamp <= CACHE_TTL_MS;

    if (!forceRefresh && cacheFresh) {
      state.data = cached.rows.map((row) => normalizeRow(row as AdminListRow & Record<string, unknown>));
      state.lastUpdated = cached.timestamp;
      state.fromCache = true;
      updateMenuFilterOptions();
      renderAll();
      showNotice("Datos cargados desde caché.", "info");
      return;
    }

    setLoading(true);
    try {
      const response = await apiAdminList();
      if (!response.ok) throw new Error(response.error || "No se pudo obtener admin_list.");
      const rows = Array.isArray(response.data) ? response.data : [];
      state.data = rows.map((row) => normalizeRow(row as AdminListRow & Record<string, unknown>));
      state.lastUpdated = Date.now();
      state.fromCache = false;
      safeWrite<CachePayload>(CACHE_KEY, {
        timestamp: state.lastUpdated,
        rows
      });
      updateMenuFilterOptions();
      renderAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error cargando datos de admin.";
      if (state.data.length > 0) {
        showNotice(`${message} Mostrando último estado disponible.`, "warn");
      } else if (cached) {
        state.data = cached.rows.map((row) => normalizeRow(row as AdminListRow & Record<string, unknown>));
        state.lastUpdated = cached.timestamp;
        state.fromCache = true;
        updateMenuFilterOptions();
        renderAll();
        showNotice(`${message} Mostrando caché local.`, "warn");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  function clearFilters(): void {
    state.filters = { ...DEFAULT_FILTERS };
    fSearch.value = "";
    fEstado.value = "";
    fGrupo.value = "";
    fBus.value = "";
    fMenu.value = "";
    renderAll();
  }

  function onSortClick(key: SortKey): void {
    if (state.sort.key === key) {
      state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
    } else {
      state.sort.key = key;
      state.sort.dir = "asc";
    }
    renderAll();
  }

  function exportCsv(): void {
    const delimiter = csvDelimiter.value || ";";
    const headers = [
      "token",
      "nombre",
      "grupo",
      "status",
      "acompanantes",
      "total_personas",
      "menu",
      "alergias",
      "bus",
      "cancion",
      "notas",
      "actualizado"
    ];

    const rows = state.filtered.map((row) => ({
      token: row.token,
      nombre: row.nombre,
      grupo: row.grupo,
      status: row.status,
      acompanantes: row.acompanantes,
      total_personas: row.totalPersonas,
      menu: menuLabel(row.menu),
      alergias: row.alergias,
      bus: row.bus ? "si" : "no",
      cancion: row.cancion,
      notas: row.notas,
      actualizado: row.updatedAt
    }));
    const csv = toCsv(rows, headers, delimiter, true);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rsvps_${formatDateForFile()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function unlockAdmin(): void {
    pinGate?.classList.add("hidden");
    adminApp.classList.remove("hidden");
    void loadData(false);
  }

  fSearch.addEventListener("input", () => {
    state.filters.query = fSearch.value;
    renderAll();
  });
  fEstado.addEventListener("change", () => {
    state.filters.estado = fEstado.value as Filters["estado"];
    renderAll();
  });
  fGrupo.addEventListener("input", () => {
    state.filters.grupo = fGrupo.value;
    renderAll();
  });
  fBus.addEventListener("change", () => {
    state.filters.bus = fBus.value as Filters["bus"];
    renderAll();
  });
  fMenu.addEventListener("change", () => {
    state.filters.menu = fMenu.value;
    renderAll();
  });

  btnClearFilters?.addEventListener("click", () => {
    clearFilters();
  });
  btnRefresh?.addEventListener("click", () => {
    void loadData(true);
  });
  btnRetry?.addEventListener("click", () => {
    void loadData(true);
  });
  btnExport?.addEventListener("click", () => {
    exportCsv();
  });

  activeFilters?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const key = target.dataset.clearKey as keyof Filters | undefined;
    if (!key) return;
    if (key === "query") {
      fSearch.value = "";
      state.filters.query = "";
    } else if (key === "estado") {
      fEstado.value = "";
      state.filters.estado = "";
    } else if (key === "grupo") {
      fGrupo.value = "";
      state.filters.grupo = "";
    } else if (key === "bus") {
      fBus.value = "";
      state.filters.bus = "";
    } else if (key === "menu") {
      fMenu.value = "";
      state.filters.menu = "";
    }
    renderAll();
  });

  sortButtons.forEach((button) => {
    const key = button.dataset.sort as SortKey | undefined;
    if (!key) return;
    button.addEventListener("click", () => {
      onSortClick(key);
    });
  });

  pinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const pin = pinInput.value.trim();
    if (pin === API_CONFIG.ADMIN_PIN) {
      try {
        window.localStorage.setItem("admin_pin", pin);
      } catch {
        // Ignore localStorage failures.
      }
      pinError?.classList.add("hidden");
      unlockAdmin();
      return;
    }
    pinError?.classList.remove("hidden");
  });

  let savedPin = "";
  try {
    savedPin = window.localStorage.getItem("admin_pin") || "";
  } catch {
    savedPin = "";
  }
  if (savedPin === API_CONFIG.ADMIN_PIN) {
    unlockAdmin();
  } else {
    pinGate?.classList.remove("hidden");
    adminApp.classList.add("hidden");
  }
}
