const HEADERS = {
  "x-marinara-csrf": "1",
  "Content-Type": "application/json",
};

function getString(value) {
  return typeof value === "string" ? value : "";
}

function getBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function getStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function getRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function normalizeLorebook(value) {
  const row = getRecord(value);
  const id = getString(row?.id);
  if (!row || !id) return null;

  return {
    id,
    name: getString(row.name) || "Untitled Lorebook",
    description: getString(row.description),
    category: getString(row.category) || "uncategorized",
    enabled: getBoolean(row.enabled, true),
    hiddenFromLibrary: getBoolean(row.hiddenFromLibrary),
    tags: getStringArray(row.tags),
  };
}

function normalizeEntry(value) {
  const row = getRecord(value);
  const id = getString(row?.id);
  const lorebookId = getString(row?.lorebookId);
  if (!row || !id || !lorebookId) return null;

  return {
    id,
    lorebookId,
    lorebookName: getString(row.lorebookName),
    name: getString(row.name) || "Untitled Entry",
    description: getString(row.description),
    content: getString(row.content),
    keys: getStringArray(row.keys),
    secondaryKeys: getStringArray(row.secondaryKeys),
    enabled: getBoolean(row.enabled, true),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: HEADERS });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(getString(getRecord(data)?.error) || "Lorebook request failed.");
  return data;
}

export function makeLorebookEntryPointer(entry) {
  return `@lorebook:${entry.lorebookId}/${entry.id}`;
}

export const lorebookApi = {
  async list(search = "") {
    const params = new URLSearchParams({ limit: "100", offset: "0", sort: "name" });
    const trimmedSearch = search.trim();
    if (trimmedSearch) params.set("search", trimmedSearch);

    const data = await fetchJson(`/api/lorebooks?${params.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : data;
    return Array.isArray(items) ? items.map(normalizeLorebook).filter(Boolean) : [];
  },

  async listEntries(lorebookId) {
    const data = await fetchJson(`/api/lorebooks/${encodeURIComponent(lorebookId)}/entries`);
    return Array.isArray(data) ? data.map(normalizeEntry).filter(Boolean) : [];
  },

  async getEntry(lorebookId, entryId) {
    const data = await fetchJson(`/api/lorebooks/${encodeURIComponent(lorebookId)}/entries/${encodeURIComponent(entryId)}`);
    const entry = normalizeEntry(data);
    if (!entry) throw new Error("Lorebook entry not found.");
    return entry;
  },
};
