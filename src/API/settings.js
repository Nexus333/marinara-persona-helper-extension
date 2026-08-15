const SETTINGS_KEY = "persona-helper-settings";

export const DEFAULT_PERSONA_HELPER_SETTINGS = {
  backendPort: "5004",
  allowLocalFallback: true,
  preferredConnectionId: "",
};

export function loadPersonaHelperSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_PERSONA_HELPER_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_PERSONA_HELPER_SETTINGS };
  }
}

export function savePersonaHelperSettings(settings) {
  const next = { ...DEFAULT_PERSONA_HELPER_SETTINGS, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
