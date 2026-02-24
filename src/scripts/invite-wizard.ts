import {
  apiLookup,
  apiPing,
  apiRsvp,
  JsonpError,
  type AcompananteData,
  type LookupData,
  type LookupResult,
  type RsvpPayload
} from "../lib/api";
import { safeRead, safeRemove, safeWrite } from "../lib/storage";
import { clampNumber, isValidToken, normalizeToken } from "../lib/validators";

type Asistencia = "" | "si" | "no";
type StepKey = "asistencia" | "acompanantes" | "menu" | "bus" | "resumen";

interface FormState {
  asistencia: Asistencia;
  acompanantes: number;
  acompanantes_nombres: string[];
  menu: string;
  alergias: string;
  bus: boolean;
  cancion: string;
  notas_titular: string;
}

interface DraftData {
  version: number;
  token: string;
  currentStep: StepKey;
  form: FormState;
  updatedAt: string;
}

interface WizardState {
  token: string;
  data: LookupData | null;
  maxAcompanantes: number;
  form: FormState;
  currentStep: StepKey;
  loadingLookup: boolean;
  submitted: boolean;
  submitting: boolean;
  alreadyResponded: boolean;
}

const STEP_LABELS: Record<StepKey, string> = {
  asistencia: "Asistencia",
  acompanantes: "Acompañantes",
  menu: "Menú",
  bus: "Bus y canción",
  resumen: "Resumen"
};

const DEFAULT_FORM: FormState = {
  asistencia: "",
  acompanantes: 0,
  acompanantes_nombres: [],
  menu: "",
  alergias: "",
  bus: false,
  cancion: "",
  notas_titular: ""
};

const MENU_LABELS: Record<string, string> = {
  estandar: "Estándar",
  vegetariano: "Vegetariano",
  celiaco: "Celíaco",
  infantil: "Infantil",
  otro: "Otro"
};

function copyDefaultForm(): FormState {
  return {
    asistencia: DEFAULT_FORM.asistencia,
    acompanantes: DEFAULT_FORM.acompanantes,
    acompanantes_nombres: [],
    menu: DEFAULT_FORM.menu,
    alergias: DEFAULT_FORM.alergias,
    bus: DEFAULT_FORM.bus,
    cancion: DEFAULT_FORM.cancion,
    notas_titular: DEFAULT_FORM.notas_titular
  };
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toBoolValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    return normalized === "true" || normalized === "1" || normalized === "si" || normalized === "sí";
  }
  return false;
}

function normalizeAsistencia(value: unknown): Asistencia {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized === "si" || normalized === "sí") return "si";
  if (normalized === "no") return "no";
  return "";
}

function draftKey(token: string): string {
  return `draft_rsvp_${token.toLowerCase()}`;
}

function normalizeStep(value: unknown): StepKey {
  if (value === "acompanantes") return "acompanantes";
  if (value === "menu") return "menu";
  if (value === "bus") return "bus";
  if (value === "resumen") return "resumen";
  return "asistencia";
}

function readLegacyString(key: string): string {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeLegacyString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors.
  }
}

function extractAcompanantesFromLookup(acomp: LookupResult["acomp"]): string[] {
  if (!Array.isArray(acomp)) return [];
  return acomp
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const nombre = toStringValue(item.nombre);
        const apellidos = toStringValue(item.apellidos);
        return `${nombre} ${apellidos}`.trim();
      }
      return "";
    })
    .filter((value) => value.length > 0);
}

function normalizeNames(rawNames: string[], max: number): string[] {
  const names = rawNames.map((name) => name.trim());
  if (names.length > max) return names.slice(0, max);
  if (names.length < max) return names.concat(Array.from({ length: max - names.length }, () => ""));
  return names;
}

function safeFocus(element: HTMLElement | null): void {
  if (!element) return;
  window.requestAnimationFrame(() => element.focus());
}

export function initInviteWizard(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const root = document.getElementById("inviteWizardRoot");
  if (!root) return;

  const wizardStepper = document.getElementById("wizardStepper");
  const wizardForm = document.getElementById("wizardForm");
  const wizardSuccess = document.getElementById("wizardSuccess");
  const toast = document.getElementById("inviteToast");

  const tokenGateCard = document.getElementById("tokenGateCard");
  const tokenForm = document.getElementById("tokenForm") as HTMLFormElement | null;
  const tokenInput = document.getElementById("tokenInput") as HTMLInputElement | null;
  const tokenError = document.getElementById("tokenError");

  const lookupSkeletonCard = document.getElementById("lookupSkeletonCard");
  const lookupErrorCard = document.getElementById("lookupErrorCard");
  const lookupErrorText = document.getElementById("lookupErrorText");
  const btnRetryLookup = document.getElementById("btnRetryLookup");
  const btnChangeToken = document.getElementById("btnChangeToken");

  const guestInfoCard = document.getElementById("guestInfoCard");
  const guestName = document.getElementById("guestName");
  const guestStatusBadge = document.getElementById("guestStatusBadge");
  const guestInfoLine = document.getElementById("guestInfoLine");
  const guestInfoHint = document.getElementById("guestInfoHint");

  const stepSections = Array.from(root.querySelectorAll<HTMLElement>(".wizard-step"));

  const btnAsistenciaSi = document.getElementById("btnAsistenciaSi");
  const btnAsistenciaNo = document.getElementById("btnAsistenciaNo");
  const errorAsistencia = document.getElementById("errorAsistencia");
  const btnAsistenciaNext = document.getElementById("btnAsistenciaNext");

  const acompanantesMeta = document.getElementById("acompanantesMeta");
  const acompanantesInput = document.getElementById("acompanantesInput") as HTMLInputElement | null;
  const acompanantesNombres = document.getElementById("acompanantesNombres");
  const errorAcompanantes = document.getElementById("errorAcompanantes");
  const btnAcompanantesBack = document.getElementById("btnAcompanantesBack");
  const btnAcompanantesNext = document.getElementById("btnAcompanantesNext");

  const menuInput = document.getElementById("menuInput") as HTMLSelectElement | null;
  const alergiasInput = document.getElementById("alergiasInput") as HTMLTextAreaElement | null;
  const errorMenu = document.getElementById("errorMenu");
  const btnMenuBack = document.getElementById("btnMenuBack");
  const btnMenuNext = document.getElementById("btnMenuNext");

  const busBlock = document.getElementById("busBlock");
  const btnBusSi = document.getElementById("btnBusSi");
  const btnBusNo = document.getElementById("btnBusNo");
  const cancionInput = document.getElementById("cancionInput") as HTMLInputElement | null;
  const notasInput = document.getElementById("notasInput") as HTMLTextAreaElement | null;
  const errorBus = document.getElementById("errorBus");
  const btnBusBack = document.getElementById("btnBusBack");
  const btnBusNext = document.getElementById("btnBusNext");

  const summaryGuest = document.getElementById("summaryGuest");
  const summaryAsistencia = document.getElementById("summaryAsistencia");
  const summaryAcompanantes = document.getElementById("summaryAcompanantes");
  const summaryMenu = document.getElementById("summaryMenu");
  const summaryAlergias = document.getElementById("summaryAlergias");
  const summaryBus = document.getElementById("summaryBus");
  const summaryCancion = document.getElementById("summaryCancion");
  const summaryNotas = document.getElementById("summaryNotas");
  const summaryAcompanantesSection = document.getElementById("summaryAcompanantesSection");
  const summaryMenuSection = document.getElementById("summaryMenuSection");
  const summaryStatusNote = document.getElementById("summaryStatusNote");
  const submitError = document.getElementById("submitError");
  const btnResumenBack = document.getElementById("btnResumenBack");
  const btnSubmitWizard = document.getElementById("btnSubmitWizard") as HTMLButtonElement | null;
  const summaryEditButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-edit-step]")
  );

  if (!wizardStepper || !wizardForm || !wizardSuccess || !tokenForm || !tokenInput || !acompanantesInput) {
    return;
  }

  const state: WizardState = {
    token: "",
    data: null,
    maxAcompanantes: 0,
    form: copyDefaultForm(),
    currentStep: "asistencia",
    loadingLookup: false,
    submitted: false,
    submitting: false,
    alreadyResponded: false
  };

  let toastTimer: ReturnType<typeof window.setTimeout> | null = null;

  function showToast(message: string, tone: "success" | "warn" | "info" = "info"): void {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("success", "warn", "info", "show");
    toast.classList.add(tone, "show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 4200);
  }

  async function runDevHealthCheck(): Promise<void> {
    if (!import.meta.env.DEV) return;
    try {
      const result = await apiPing();
      if (result.ok) {
        console.info("[DEV][invite] GAS OK");
      } else {
        console.warn("[DEV][invite] GAS ping respondió con error:", result.error || "unknown_error");
      }
    } catch (error) {
      console.warn("[DEV][invite] GAS ping falló:", error);
    }
  }

  function setLookupLoading(isLoading: boolean): void {
    state.loadingLookup = isLoading;
    lookupSkeletonCard?.classList.toggle("hidden", !isLoading);
    tokenInput.disabled = isLoading;
  }

  function showTokenGate(show: boolean): void {
    tokenGateCard?.classList.toggle("hidden", !show);
  }

  function showLookupError(message: string): void {
    lookupErrorCard?.classList.remove("hidden");
    if (lookupErrorText) lookupErrorText.textContent = message;
  }

  function hideLookupError(): void {
    lookupErrorCard?.classList.add("hidden");
  }

  function getVisibleSteps(): StepKey[] {
    if (state.form.asistencia === "no") {
      return ["asistencia", "bus", "resumen"];
    }
    return ["asistencia", "acompanantes", "menu", "bus", "resumen"];
  }

  function currentStepIndex(): number {
    return getVisibleSteps().indexOf(state.currentStep);
  }

  function renderStepper(): void {
    const steps = getVisibleSteps();
    const activeIndex = Math.max(0, steps.indexOf(state.currentStep));
    wizardStepper.innerHTML = "";

    steps.forEach((step, index) => {
      const item = document.createElement("li");
      item.className = "wizard-stepper-item";

      const dot = document.createElement("span");
      dot.className = "wizard-stepper-dot";
      if (index < activeIndex) dot.classList.add("is-done");
      if (index === activeIndex) dot.classList.add("is-active");
      dot.textContent = String(index + 1);

      const label = document.createElement("span");
      label.className = "wizard-stepper-label";
      label.textContent = STEP_LABELS[step];

      item.append(dot, label);
      wizardStepper.appendChild(item);
    });
  }

  function setError(target: HTMLElement | null, message: string): void {
    if (!target) return;
    target.textContent = message;
    target.classList.toggle("hidden", message.length === 0);
  }

  function clearStepErrors(): void {
    setError(errorAsistencia, "");
    setError(errorAcompanantes, "");
    setError(errorMenu, "");
    setError(errorBus, "");
    setError(submitError, "");
  }

  function setAsistencia(value: Asistencia): void {
    state.form.asistencia = value;
    if (value === "no") {
      state.form.acompanantes = 0;
      state.form.acompanantes_nombres = [];
      state.form.menu = "";
      state.form.alergias = "";
      state.form.bus = false;
    }
    renderChoiceStates();
    renderAcompanantesMeta();
    renderAcompanantesInputs();
    renderBusBlock();
    renderStepper();
    saveDraft();
  }

  function setBus(value: boolean): void {
    state.form.bus = value;
    renderChoiceStates();
    saveDraft();
  }

  function renderChoiceStates(): void {
    const asistenciaButtons = [
      { element: btnAsistenciaSi, active: state.form.asistencia === "si" },
      { element: btnAsistenciaNo, active: state.form.asistencia === "no" }
    ];
    asistenciaButtons.forEach(({ element, active }) => {
      if (!element) return;
      element.classList.toggle("is-active", active);
      element.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const busButtons = [
      { element: btnBusSi, active: state.form.bus },
      { element: btnBusNo, active: !state.form.bus }
    ];
    busButtons.forEach(({ element, active }) => {
      if (!element) return;
      element.classList.toggle("is-active", active);
      element.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderBusBlock(): void {
    const showBusChoices = state.form.asistencia !== "no";
    busBlock?.classList.toggle("hidden", !showBusChoices);
  }

  function renderAcompanantesMeta(): void {
    if (!acompanantesMeta) return;
    const plazas = Math.max(1, Number(state.data?.plazas_max || 1));
    acompanantesMeta.textContent = `Tienes ${plazas} plaza(s): tú + hasta ${state.maxAcompanantes} acompañante(s).`;
  }

  function renderAcompanantesInputs(): void {
    const count = clampNumber(state.form.acompanantes, 0, state.maxAcompanantes);
    state.form.acompanantes = count;
    state.form.acompanantes_nombres = normalizeNames(state.form.acompanantes_nombres, count);

    acompanantesInput.max = String(state.maxAcompanantes);
    acompanantesInput.value = String(count);

    if (!acompanantesNombres) return;
    acompanantesNombres.innerHTML = "";

    for (let index = 0; index < count; index += 1) {
      const wrapper = document.createElement("div");
      wrapper.className = "rounded-xl border border-slate-200 bg-white/70 p-3";

      const label = document.createElement("label");
      label.htmlFor = `acompananteNombre${index}`;
      label.className = "text-sm font-medium text-slate-700";
      label.textContent = `Nombre del acompañante ${index + 1}`;

      const input = document.createElement("input");
      input.id = `acompananteNombre${index}`;
      input.type = "text";
      input.className = "mt-2 w-full rounded-xl border border-slate-300 px-3 py-2";
      input.placeholder = `Acompañante ${index + 1}`;
      input.value = state.form.acompanantes_nombres[index] || "";
      input.addEventListener("input", () => {
        state.form.acompanantes_nombres[index] = input.value;
        saveDraft();
      });

      wrapper.append(label, input);
      acompanantesNombres.appendChild(wrapper);
    }
  }

  function renderSummary(): void {
    if (summaryGuest) {
      const guestNameValue = state.data?.nombre || "Invitado";
      const tokenLine = state.token ? ` · Token ${state.token}` : "";
      summaryGuest.textContent = `${guestNameValue}${tokenLine}`;
    }

    if (summaryAsistencia) {
      summaryAsistencia.textContent =
        state.form.asistencia === "si"
          ? "Sí, asistiré"
          : state.form.asistencia === "no"
            ? "No podré asistir"
            : "Pendiente de confirmar";
    }

    const showAttendanceSections = state.form.asistencia === "si";
    summaryAcompanantesSection?.classList.toggle("hidden", !showAttendanceSections);
    summaryMenuSection?.classList.toggle("hidden", !showAttendanceSections);

    if (summaryAcompanantes) {
      summaryAcompanantes.innerHTML = "";
      const total = state.form.acompanantes;
      const countLine = document.createElement("p");
      countLine.textContent = `Nº acompañantes: ${total}`;
      summaryAcompanantes.appendChild(countLine);

      if (total > 0) {
        const list = document.createElement("ul");
        list.className = "mt-2 list-disc pl-6";
        state.form.acompanantes_nombres.slice(0, total).forEach((name) => {
          const item = document.createElement("li");
          item.textContent = name.trim() || "Sin nombre";
          list.appendChild(item);
        });
        summaryAcompanantes.appendChild(list);
      }
    }

    if (summaryMenu) {
      summaryMenu.textContent = state.form.menu
        ? `Menú: ${MENU_LABELS[state.form.menu] || state.form.menu}`
        : "Menú sin especificar";
    }

    if (summaryAlergias) {
      summaryAlergias.textContent = state.form.alergias
        ? `Alergias: ${state.form.alergias}`
        : "Alergias: no indicadas";
    }

    if (summaryBus) {
      if (state.form.asistencia === "no") {
        summaryBus.textContent = "Bus: no aplica";
      } else {
        summaryBus.textContent = state.form.bus ? "Bus: sí" : "Bus: no";
      }
    }

    if (summaryCancion) {
      summaryCancion.textContent = state.form.cancion
        ? `Canción: ${state.form.cancion}`
        : "Canción: sin sugerencia";
    }

    if (summaryNotas) {
      summaryNotas.textContent = state.form.notas_titular
        ? `Mensaje: ${state.form.notas_titular}`
        : "Mensaje: sin comentarios";
    }

    if (summaryStatusNote) {
      const note =
        state.alreadyResponded && !state.submitted
          ? "Ya había una respuesta previa. Si confirmas ahora, la actualizaremos."
          : "";
      summaryStatusNote.textContent = note;
      summaryStatusNote.classList.toggle("hidden", note.length === 0);
    }
  }

  function showStep(step: StepKey, focus = true): void {
    const visibleSteps = getVisibleSteps();
    if (!visibleSteps.includes(step)) {
      state.currentStep = visibleSteps[0];
    } else {
      state.currentStep = step;
    }

    stepSections.forEach((section) => {
      const sectionStep = normalizeStep(section.dataset.step);
      const isVisible = visibleSteps.includes(sectionStep) && sectionStep === state.currentStep;
      section.classList.toggle("hidden", !isVisible);
    });

    renderStepper();
    renderChoiceStates();
    renderBusBlock();

    if (state.currentStep === "resumen") renderSummary();

    saveDraft();

    if (focus) {
      const activeSection = stepSections.find(
        (section) => normalizeStep(section.dataset.step) === state.currentStep
      );
      safeFocus(activeSection ?? null);
    }
  }

  function goNextStep(): void {
    const visibleSteps = getVisibleSteps();
    const index = currentStepIndex();
    if (index === -1 || index >= visibleSteps.length - 1) return;
    showStep(visibleSteps[index + 1]);
  }

  function goPrevStep(): void {
    const visibleSteps = getVisibleSteps();
    const index = currentStepIndex();
    if (index <= 0) return;
    showStep(visibleSteps[index - 1]);
  }

  function validateAsistencia(): boolean {
    if (state.form.asistencia !== "si" && state.form.asistencia !== "no") {
      setError(errorAsistencia, "Selecciona si asistirás o no.");
      return false;
    }
    setError(errorAsistencia, "");
    return true;
  }

  function validateAcompanantes(): boolean {
    if (state.form.asistencia !== "si") {
      setError(errorAcompanantes, "");
      return true;
    }

    const count = clampNumber(acompanantesInput.value, 0, state.maxAcompanantes);
    state.form.acompanantes = count;
    state.form.acompanantes_nombres = normalizeNames(state.form.acompanantes_nombres, count);

    for (let index = 0; index < count; index += 1) {
      const value = toStringValue(state.form.acompanantes_nombres[index]);
      if (value.length < 2) {
        setError(errorAcompanantes, `Revisa el nombre del acompañante ${index + 1}.`);
        return false;
      }
      state.form.acompanantes_nombres[index] = value;
    }

    setError(errorAcompanantes, "");
    return true;
  }

  function validateMenu(): boolean {
    if (state.form.asistencia !== "si") {
      setError(errorMenu, "");
      return true;
    }

    const selectedMenu = menuInput ? toStringValue(menuInput.value) : "";
    state.form.menu = selectedMenu;
    state.form.alergias = alergiasInput ? alergiasInput.value.trim() : "";

    if (!selectedMenu) {
      setError(errorMenu, "Selecciona el menú para continuar.");
      return false;
    }

    setError(errorMenu, "");
    return true;
  }

  function validateBusCancion(): boolean {
    state.form.cancion = cancionInput ? cancionInput.value.trim() : "";
    state.form.notas_titular = notasInput ? notasInput.value.trim() : "";
    setError(errorBus, "");
    return true;
  }

  function validateCurrentStep(): boolean {
    if (state.currentStep === "asistencia") return validateAsistencia();
    if (state.currentStep === "acompanantes") return validateAcompanantes();
    if (state.currentStep === "menu") return validateMenu();
    if (state.currentStep === "bus") return validateBusCancion();
    return true;
  }

  function saveDraft(): void {
    if (!state.token || state.submitted) return;
    const payload: DraftData = {
      version: 1,
      token: state.token,
      currentStep: state.currentStep,
      form: {
        asistencia: state.form.asistencia,
        acompanantes: state.form.acompanantes,
        acompanantes_nombres: [...state.form.acompanantes_nombres],
        menu: state.form.menu,
        alergias: state.form.alergias,
        bus: state.form.bus,
        cancion: state.form.cancion,
        notas_titular: state.form.notas_titular
      },
      updatedAt: new Date().toISOString()
    };
    safeWrite(draftKey(state.token), payload);
  }

  function restoreDraft(token: string): StepKey {
    const fallbackStep: StepKey = "asistencia";
    const draft = safeRead<Partial<DraftData> | null>(draftKey(token), null);
    if (!draft || typeof draft !== "object") return fallbackStep;

    if (toStringValue(draft.token).toLowerCase() !== token.toLowerCase()) {
      return fallbackStep;
    }

    const rawForm = draft.form;
    if (rawForm && typeof rawForm === "object") {
      state.form.asistencia = normalizeAsistencia(rawForm.asistencia);
      state.form.acompanantes = clampNumber(rawForm.acompanantes, 0, state.maxAcompanantes);
      state.form.acompanantes_nombres = normalizeNames(
        Array.isArray(rawForm.acompanantes_nombres)
          ? rawForm.acompanantes_nombres.map((item) => toStringValue(item))
          : [],
        state.form.acompanantes
      );
      state.form.menu = toStringValue(rawForm.menu);
      state.form.alergias = toStringValue(rawForm.alergias);
      state.form.bus = toBoolValue(rawForm.bus);
      state.form.cancion = toStringValue(rawForm.cancion);
      state.form.notas_titular = toStringValue(rawForm.notas_titular);
    }

    return normalizeStep(draft.currentStep);
  }

  function syncDomFromState(): void {
    if (menuInput) menuInput.value = state.form.menu;
    if (alergiasInput) alergiasInput.value = state.form.alergias;
    if (cancionInput) cancionInput.value = state.form.cancion;
    if (notasInput) notasInput.value = state.form.notas_titular;
    renderChoiceStates();
    renderAcompanantesMeta();
    renderAcompanantesInputs();
    renderBusBlock();
  }

  function setGuestInfo(): void {
    if (!state.data) return;
    guestInfoCard?.classList.remove("hidden");

    if (guestName) guestName.textContent = state.data.nombre || "Invitado";
    if (guestInfoLine) {
      guestInfoLine.textContent = `Token ${state.token} · ${state.data.plazas_max} plaza(s) en total.`;
    }
    if (guestInfoHint) {
      guestInfoHint.textContent =
        state.maxAcompanantes > 0
          ? `Puedes venir con hasta ${state.maxAcompanantes} acompañante(s).`
          : "Tu invitación es individual.";
    }

    if (!guestStatusBadge) return;
    const status = normalizeAsistencia(state.data.status);
    if (!status) {
      guestStatusBadge.classList.add("hidden");
      guestStatusBadge.textContent = "";
      return;
    }

    state.alreadyResponded = true;
    guestStatusBadge.className =
      status === "si"
        ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
        : "inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800";
    guestStatusBadge.textContent = status === "si" ? "Ya confirmado: Sí" : "Ya confirmado: No";
  }

  function clearLookupState(): void {
    guestInfoCard?.classList.add("hidden");
    wizardForm.classList.add("hidden");
    wizardSuccess.classList.add("hidden");
    state.data = null;
    state.form = copyDefaultForm();
    state.currentStep = "asistencia";
    state.submitted = false;
    state.submitting = false;
    state.alreadyResponded = false;
    clearStepErrors();
  }

  function canonicalizeInviteUrl(token: string): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("token", token);
      url.searchParams.delete("t");
      window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
    } catch {
      // Ignore URL rewrite errors.
    }
  }

  function lookupErrorMessage(error: unknown): string {
    if (error instanceof JsonpError && error.causeCode === "timeout") {
      return "El servidor está tardando demasiado. Reintenta en unos segundos.";
    }
    if (error instanceof JsonpError) {
      return "No se pudo contactar con el servidor de confirmaciones. Reintenta.";
    }
    if (error instanceof Error && error.message) return error.message;
    return "No encontramos tu invitación con ese token.";
  }

  async function runLookup(token: string): Promise<void> {
    clearLookupState();
    hideLookupError();
    showTokenGate(false);
    setLookupLoading(true);

    state.token = token;
    writeLegacyString("lastToken", token);
    canonicalizeInviteUrl(token);

    try {
      const result = await apiLookup(token);
      if (!result.ok || !result.data) {
        throw new Error(result.error || "No encontramos tu invitación con ese token.");
      }

      state.data = result.data;
      state.maxAcompanantes = Math.max(0, Number(result.data.plazas_max || 1) - 1);

      const lookupForm = copyDefaultForm();
      lookupForm.asistencia = normalizeAsistencia(result.data.status);
      lookupForm.menu = toStringValue(result.data.menu);
      lookupForm.alergias = toStringValue(result.data.alergias);
      lookupForm.notas_titular = toStringValue(result.data.notas_titular);

      const extraData = result.data as LookupData & Record<string, unknown>;
      lookupForm.bus = toBoolValue(extraData.bus);
      lookupForm.cancion = toStringValue(extraData.cancion);

      const acompNames = extractAcompanantesFromLookup(result.acomp);
      lookupForm.acompanantes = clampNumber(acompNames.length, 0, state.maxAcompanantes);
      lookupForm.acompanantes_nombres = normalizeNames(acompNames, lookupForm.acompanantes);

      state.form = lookupForm;

      const draftStep = restoreDraft(token);
      if (state.form.asistencia === "no") {
        state.form.acompanantes = 0;
        state.form.acompanantes_nombres = [];
        state.form.menu = "";
        state.form.alergias = "";
        state.form.bus = false;
      }

      syncDomFromState();
      setGuestInfo();
      wizardForm.classList.remove("hidden");

      const visibleSteps = getVisibleSteps();
      const startStep = visibleSteps.includes(draftStep) ? draftStep : "asistencia";
      showStep(startStep, false);
      showToast("Invitación cargada correctamente.", "success");
    } catch (error) {
      const message = lookupErrorMessage(error);
      showLookupError(message);
      showTokenGate(true);
      wizardForm.classList.add("hidden");
      showToast(message, "warn");
    } finally {
      setLookupLoading(false);
    }
  }

  function buildAcompanantesPayload(): AcompananteData[] {
    if (state.form.asistencia !== "si" || state.form.acompanantes <= 0) return [];
    return state.form.acompanantes_nombres.slice(0, state.form.acompanantes).map((name) => ({
      nombre: name.trim()
    }));
  }

  async function submitWizard(): Promise<void> {
    if (state.submitting || state.submitted || !state.token) return;
    clearStepErrors();

    const visibleSteps = getVisibleSteps();
    const stepsToValidate = visibleSteps.filter((step) => step !== "resumen");
    for (const step of stepsToValidate) {
      state.currentStep = step;
      if (!validateCurrentStep()) {
        showStep(step);
        return;
      }
    }

    state.submitting = true;
    if (btnSubmitWizard) {
      btnSubmitWizard.disabled = true;
      btnSubmitWizard.textContent = "Enviando...";
    }

    try {
      const payload: RsvpPayload = {
        token: state.token,
        asistencia: state.form.asistencia === "no" ? "no" : "si",
        acompanantes: state.form.asistencia === "si" ? state.form.acompanantes : 0,
        acompanantes_nombres:
          state.form.asistencia === "si" ? buildAcompanantesPayload() : ([] as AcompananteData[]),
        menu: state.form.asistencia === "si" ? state.form.menu : "",
        alergias: state.form.asistencia === "si" ? state.form.alergias : "",
        notas_titular: state.form.notas_titular,
        bus: state.form.asistencia === "si" ? state.form.bus : false,
        cancion: state.form.cancion
      };

      const result = await apiRsvp(payload);
      if (!result.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "No se pudo guardar tu RSVP.");
      }

      state.submitted = true;
      safeRemove(draftKey(state.token));
      wizardForm.classList.add("hidden");
      wizardSuccess.classList.remove("hidden");
      showToast("Confirmación enviada. Gracias.", "success");
    } catch (error) {
      const message = lookupErrorMessage(error);
      setError(submitError, message);
      showToast(message, "warn");
    } finally {
      state.submitting = false;
      if (btnSubmitWizard) {
        btnSubmitWizard.disabled = false;
        btnSubmitWizard.textContent = "Confirmar";
      }
    }
  }

  tokenForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const rawToken = normalizeToken(tokenInput.value);
    if (!isValidToken(rawToken)) {
      tokenError?.classList.remove("hidden");
      safeFocus(tokenInput);
      return;
    }
    tokenError?.classList.add("hidden");
    void runLookup(rawToken);
  });

  btnRetryLookup?.addEventListener("click", () => {
    if (!state.token) return;
    void runLookup(state.token);
  });

  btnChangeToken?.addEventListener("click", () => {
    showTokenGate(true);
    hideLookupError();
    safeFocus(tokenInput);
  });

  btnAsistenciaSi?.addEventListener("click", () => {
    setAsistencia("si");
    setError(errorAsistencia, "");
  });

  btnAsistenciaNo?.addEventListener("click", () => {
    setAsistencia("no");
    setError(errorAsistencia, "");
  });

  btnAsistenciaNext?.addEventListener("click", () => {
    if (!validateAsistencia()) return;
    goNextStep();
  });

  acompanantesInput.addEventListener("input", () => {
    state.form.acompanantes = clampNumber(acompanantesInput.value, 0, state.maxAcompanantes);
    renderAcompanantesInputs();
    saveDraft();
  });

  btnAcompanantesBack?.addEventListener("click", () => {
    goPrevStep();
  });

  btnAcompanantesNext?.addEventListener("click", () => {
    if (!validateAcompanantes()) return;
    goNextStep();
  });

  menuInput?.addEventListener("change", () => {
    state.form.menu = toStringValue(menuInput.value);
    saveDraft();
  });

  alergiasInput?.addEventListener("input", () => {
    state.form.alergias = alergiasInput.value;
    saveDraft();
  });

  btnMenuBack?.addEventListener("click", () => {
    goPrevStep();
  });

  btnMenuNext?.addEventListener("click", () => {
    if (!validateMenu()) return;
    goNextStep();
  });

  btnBusSi?.addEventListener("click", () => {
    setBus(true);
  });

  btnBusNo?.addEventListener("click", () => {
    setBus(false);
  });

  cancionInput?.addEventListener("input", () => {
    state.form.cancion = cancionInput.value;
    saveDraft();
  });

  notasInput?.addEventListener("input", () => {
    state.form.notas_titular = notasInput.value;
    saveDraft();
  });

  btnBusBack?.addEventListener("click", () => {
    goPrevStep();
  });

  btnBusNext?.addEventListener("click", () => {
    if (!validateBusCancion()) return;
    goNextStep();
  });

  btnResumenBack?.addEventListener("click", () => {
    goPrevStep();
  });

  summaryEditButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetStep = normalizeStep(button.dataset.editStep);
      showStep(targetStep);
    });
  });

  btnSubmitWizard?.addEventListener("click", () => {
    void submitWizard();
  });

  renderStepper();
  renderChoiceStates();
  renderBusBlock();
  void runDevHealthCheck();

  const query = new URLSearchParams(window.location.search);
  const queryToken = normalizeToken(query.get("token") || query.get("t") || "");
  const rememberedToken = normalizeToken(readLegacyString("lastToken"));

  if (isValidToken(queryToken)) {
    tokenInput.value = queryToken;
    void runLookup(queryToken);
  } else {
    showTokenGate(true);
    if (isValidToken(rememberedToken)) {
      tokenInput.value = rememberedToken;
    }
    safeFocus(tokenInput);
  }
}
