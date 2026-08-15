const SETTINGS_KEY = "persona-helper-settings";
const DEFAULT_BACKEND_PORT = "5003";

export const DEFAULT_PERSONA_HELPER_SETTINGS = {
  backendPort: DEFAULT_BACKEND_PORT,
  allowConnectionFallback: true,
  preferredConnectionId: "",
  chatHistoryLimit: "20",
  generationMaxTokens: "1024",
  generationTemperature: "",
  generationTopP: "",
  generationTopK: "",
  generationFrequencyPenalty: "",
  generationPresencePenalty: "",
  recentHintLimit: "20",
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
    chatHistoryLimit: typeof value.chatHistoryLimit === "string" ? value.chatHistoryLimit : "20",
    generationMaxTokens: typeof value.generationMaxTokens === "string" ? value.generationMaxTokens : "1024",
    generationTemperature: typeof value.generationTemperature === "string" ? value.generationTemperature : "",
    generationTopP: typeof value.generationTopP === "string" ? value.generationTopP : "",
    generationTopK: typeof value.generationTopK === "string" ? value.generationTopK : "",
    generationFrequencyPenalty: typeof value.generationFrequencyPenalty === "string" ? value.generationFrequencyPenalty : "",
    generationPresencePenalty: typeof value.generationPresencePenalty === "string" ? value.generationPresencePenalty : "",
    recentHintLimit: typeof value.recentHintLimit === "string" ? value.recentHintLimit : "20",
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
