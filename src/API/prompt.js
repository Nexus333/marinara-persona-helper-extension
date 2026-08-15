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

function normalizeContractValidation(result = {}) {
  return {
    valid: result.valid === true,
    missing_fields: toStringArray(result.missing_fields),
    additional_required_fields: toStringArray(result.additional_required_fields),
    additional_optional_fields: toStringArray(result.additional_optional_fields),
    available_fields: toStringArray(result.available_fields),
  };
}

function normalizeExecutionValue(value) {
  return Array.isArray(value) ? toStringArray(value) : typeof value === "string" ? value : "";
}

function normalizeValueRecord(record = {}) {
  return {
    default: typeof record.default === "string" ? record.default : null,
    resolved: normalizeExecutionValue(record.resolved),
  };
}

function normalizeValueRecordMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry) => entry[1] && typeof entry[1] === "object" && !Array.isArray(entry[1]))
      .map(([key, record]) => [key, normalizeValueRecord(record)]),
  );
}

function normalizeExecutionEntry(entry = {}) {
  return {
    entry_id: typeof entry.entry_id === "string" ? entry.entry_id : "",
    type: "section",
    section_id: typeof entry.section_id === "string" ? entry.section_id : "",
    ...(typeof entry.label === "string" ? { label: entry.label } : {}),
    output: typeof entry.output === "string" ? entry.output : "",
    inputs: normalizeValueRecordMap(entry.inputs),
    parameters: normalizeValueRecordMap(entry.parameters),
  };
}

function normalizeExecution(execution = {}) {
  return {
    text: typeof execution.text === "string" ? execution.text : "",
    context: execution.context && typeof execution.context === "object" && !Array.isArray(execution.context) ? execution.context : {},
    entries: Array.isArray(execution.entries) ? execution.entries.map(normalizeExecutionEntry) : [],
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

  async fieldSearch(fields, parameters = {}) {
    const data = await runPersonaCommand(PROMPT_DOMAIN, "field_search", {
      fields: toStringArray(fields),
      ...cleanSearch(parameters),
    });
    return Array.isArray(data.items) ? data.items.map(normalizeSummary) : [];
  },

  async get(id) {
    return normalizePrompt(await runPersonaCommand(PROMPT_DOMAIN, "get", { id }));
  },

  async validateContract(id, requiredFields) {
    return normalizeContractValidation(
      await runPersonaCommand(PROMPT_DOMAIN, "validate_contract", {
        id,
        required_fields: toStringArray(requiredFields),
      }),
    );
  },

  async execute(request) {
    return normalizeExecution(await runPersonaCommand(PROMPT_DOMAIN, "execute", request));
  },

  async listCategories() {
    const data = await runPersonaCommand(PROMPT_DOMAIN, "list_categories", {});
    return ensureDefaultCategory(Array.isArray(data.items) ? data.items.map(normalizeCategory) : []);
  },
};
