const SETTINGS_KEY = "persona-helper-settings";
const DEFAULT_BACKEND_PORT = "5003";

export const DEFAULT_PERSONA_HELPER_SETTINGS = {
  backendPort: DEFAULT_BACKEND_PORT,
  allowConnectionFallback: true,
  preferredConnectionId: "",
};

function normalizePort(value) {
  if (typeof value !== "string" && typeof value !== "number") return DEFAULT_BACKEND_PORT;
  const candidate = String(value).trim();
  return /^\d{2,5}$/.test(candidate) ? candidate : DEFAULT_BACKEND_PORT;
}

export function normalizePersonaHelperSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_PERSONA_HELPER_SETTINGS };
  }

  return {
    backendPort: normalizePort(value.backendPort),
    preferredConnectionId: typeof value.preferredConnectionId === "string" ? value.preferredConnectionId : "",
    allowConnectionFallback:
      typeof value.allowConnectionFallback === "boolean"
        ? value.allowConnectionFallback
        : typeof value.allowLocalFallback === "boolean"
          ? value.allowLocalFallback
          : true,
  };
}

export function loadPersonaHelperSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return normalizePersonaHelperSettings(stored ? JSON.parse(stored) : null);
  } catch {
    return { ...DEFAULT_PERSONA_HELPER_SETTINGS };
  }
}

export function savePersonaHelperSettings(settings) {
  const next = normalizePersonaHelperSettings(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("persona-helper-settings-change", { detail: next }));
  return next;
}
