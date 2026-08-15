import { runPersonaCommand } from "./personaBackend.js";

const EXTRACTION_DOMAIN = "extraction";

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      return item.text || item.value || item.content || item.action_hint || "";
    })
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeStructuredItems(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object" && !Array.isArray(item));
}

export const extractionApi = {
  async getPrompt(format, field) {
    const data = await runPersonaCommand(EXTRACTION_DOMAIN, "get_prompt", { format, field });
    return typeof data.prompt === "string" ? data.prompt : "";
  },

  async parse(format, field, output, capture = true) {
    const data = await runPersonaCommand(EXTRACTION_DOMAIN, "parse", { format, field, output, capture });
    console.info("[Persona Helper] Extraction parse result", data);
    return normalizeItems(Array.isArray(data) ? data : data.items ?? data.data ?? data.result ?? data.values);
  },

  async getStructuredPrompt(format, schema) {
    const data = await runPersonaCommand(EXTRACTION_DOMAIN, "get_prompt_structured", { format, schema });
    return typeof data.prompt === "string" ? data.prompt : "";
  },

  async parseStructured(format, schema, output, capture = true) {
    const data = await runPersonaCommand(EXTRACTION_DOMAIN, "parse_structured", { format, schema, output, capture });
    console.info("[Persona Helper] Structured extraction parse result", data);
    return normalizeStructuredItems(data.items);
  },
};
