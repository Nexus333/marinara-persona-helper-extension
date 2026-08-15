import { runPersonaCommand } from "./personaBackend.js";

const PROMPT_DOMAIN = "prompt";

function toStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function toStringRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry) => typeof entry[1] === "string"));
}

function normalizeCategory(category = {}) {
  return {
    id: typeof category.id === "string" ? category.id : "",
    name: typeof category.name === "string" ? category.name : "",
    description: typeof category.description === "string" ? category.description : "",
  };
}

function ensureDefaultCategory(categories) {
  if (categories.some((category) => category.id === "unsorted")) return categories;
  return [{ id: "unsorted", name: "Unsorted", description: "Default prompt category." }, ...categories];
}

function normalizeSummary(prompt = {}) {
  return {
    id: typeof prompt.id === "string" ? prompt.id : "",
    name: typeof prompt.name === "string" ? prompt.name : "",
    description: typeof prompt.description === "string" ? prompt.description : "",
    content_type: typeof prompt.content_type === "string" && prompt.content_type ? prompt.content_type : "unsorted",
    tags: toStringArray(prompt.tags),
  };
}

function normalizeParameters(parameters) {
  if (!Array.isArray(parameters)) return [];
  return parameters
    .filter((parameter) => parameter && typeof parameter === "object" && typeof parameter.name === "string")
    .map((parameter) => ({
      name: parameter.name,
      choices: toStringArray(parameter.choices),
      allows_custom: typeof parameter.allows_custom === "boolean" ? parameter.allows_custom : true,
    }));
}

function normalizeDefaults(defaults) {
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) return undefined;
  const inputs = toStringRecord(defaults.inputs);
  const parameters = toStringRecord(defaults.parameters);
  return {
    ...(Object.keys(inputs).length ? { inputs } : {}),
    ...(Object.keys(parameters).length ? { parameters } : {}),
  };
}

function normalizeRequirement(requirement = {}) {
  return {
    var_name: typeof requirement.var_name === "string" ? requirement.var_name : "",
    kind: requirement.kind === "parameter" ? "parameter" : "input",
    entry_id: typeof requirement.entry_id === "string" ? requirement.entry_id : "",
    section_id: typeof requirement.section_id === "string" ? requirement.section_id : "",
    default: typeof requirement.default === "string" ? requirement.default : null,
  };
}

function normalizeSection(section = {}) {
  return {
    id: typeof section.id === "string" ? section.id : "",
    name: typeof section.name === "string" ? section.name : "",
    description: typeof section.description === "string" ? section.description : "",
    content_type: typeof section.content_type === "string" && section.content_type ? section.content_type : "unsorted",
    tags: toStringArray(section.tags),
    body: typeof section.body === "string" ? section.body : "",
    slots: toStringArray(section.slots),
    parameters: normalizeParameters(section.parameters),
  };
}

function normalizeEntry(entry = {}) {
  const defaults = normalizeDefaults(entry.defaults);
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    type: "section",
    section_id: typeof entry.section_id === "string" ? entry.section_id : "",
    enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
    ...(typeof entry.label === "string" ? { label: entry.label } : {}),
    ...(defaults ? { defaults } : {}),
    section: normalizeSection(entry.section),
  };
}

function normalizePrompt(prompt = {}) {
  return {
    ...normalizeSummary(prompt),
    defaults: toStringRecord(prompt.defaults),
    requirements: Array.isArray(prompt.requirements) ? prompt.requirements.map(normalizeRequirement) : [],
    entries: Array.isArray(prompt.entries) ? prompt.entries.map(normalizeEntry) : [],
  };
}

function cleanSearch(parameters = {}) {
  return {
    ...(parameters.query?.trim() ? { query: parameters.query.trim() } : {}),
    ...(parameters.content_type && parameters.content_type !== "all" ? { content_type: parameters.content_type } : {}),
    ...(parameters.tags?.length ? { tags: parameters.tags } : {}),
  };
}

export const promptApi = {
  async list() {
    const data = await runPersonaCommand(PROMPT_DOMAIN, "list", {});
    return Array.isArray(data.items) ? data.items.map(normalizeSummary) : [];
  },

  async search(parameters = {}) {
    const data = await runPersonaCommand(PROMPT_DOMAIN, "search", cleanSearch(parameters));
    return Array.isArray(data.items) ? data.items.map(normalizeSummary) : [];
  },

  async get(id) {
    return normalizePrompt(await runPersonaCommand(PROMPT_DOMAIN, "get", { id }));
  },

  async listCategories() {
    const data = await runPersonaCommand(PROMPT_DOMAIN, "list_categories", {});
    return ensureDefaultCategory(Array.isArray(data.items) ? data.items.map(normalizeCategory) : []);
  },
};
