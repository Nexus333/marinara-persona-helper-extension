export const CSRF_HEADERS = {
  "x-marinara-csrf": "1",
  "Content-Type": "application/json",
};

export function getActiveChatId() {
  return localStorage.getItem("marinara-active-chat-id");
}

export async function getPersonaContext() {
  if (!globalThis.marinara?.context?.get) {
    return {
      chatId: getActiveChatId(),
      characterId: null,
      characterIds: [],
      characters: [],
      personaId: null,
      persona: null,
    };
  }

  const context = await marinara.context.get();
  return {
    chatId: context?.chatId ?? getActiveChatId(),
    characterId: context?.characterId ?? null,
    characterIds: Array.isArray(context?.characterIds) ? context.characterIds : [],
    characters: Array.isArray(context?.characters) ? context.characters : [],
    personaId: context?.personaId ?? null,
    persona: context?.persona ?? null,
  };
}

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getDisplayName(item, fallback) {
  return String(item?.name || item?.displayName || item?.title || item?.id || fallback).trim();
}

export async function getPersonas() {
  const res = await fetch("/api/characters/personas/list", {
    headers: { "x-marinara-csrf": "1" },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || data?.message || "Could not load personas");
  return normalizeListResponse(data)
    .map((persona) => ({
      mode: "persona",
      key: String(persona?.id || persona?.name || "").trim(),
      label: getDisplayName(persona, "Persona"),
      source: "marinara",
      raw: persona,
    }))
    .filter((subject) => subject.key);
}

export async function getCharacters() {
  const res = await fetch("/api/characters", {
    headers: { "x-marinara-csrf": "1" },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || data?.message || "Could not load characters");
  return normalizeListResponse(data)
    .map((character) => ({
      mode: "character",
      key: String(character?.id || character?.name || "").trim(),
      label: getDisplayName(character, "Character"),
      source: "marinara",
      raw: character,
    }))
    .filter((subject) => subject.key);
}

export async function getConnections() {
  const res = await fetch("/api/connections", {
    headers: { "x-marinara-csrf": "1" },
  });
  if (!res.ok) throw new Error("Could not load connections");
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

export async function getFirstConnectionId() {
  const list = await getConnections();
  if (!list.length) throw new Error("No connections configured");
  return list[0].id;
}

export async function getRecentMessages(chatId, limit) {
  const safeLimit = Math.max(1, Math.floor(Number(limit) || 1));
  const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages?limit=${safeLimit}`, {
    headers: { "x-marinara-csrf": "1" },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Could not load message history");
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items
    .map((item) => ({
      id: typeof item?.id === "string" ? item.id : "",
      role: typeof item?.role === "string" ? item.role : "",
      content: typeof item?.content === "string" ? item.content : "",
      createdAt: typeof item?.createdAt === "string" ? item.createdAt : "",
    }))
    .filter((item) => item.id && item.content.trim())
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || "");
      const rightTime = Date.parse(right.createdAt || "");
      if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return 0;
      return leftTime - rightTime;
    });
}

export async function resolveGenerationConnectionId(preferredConnectionId, allowConnectionFallback) {
  const connections = await getConnections();
  const preferredId = String(preferredConnectionId || "").trim();
  const preferred = preferredId ? connections.find((connection) => connection.id === preferredId) : null;
  const fallback = allowConnectionFallback ? connections[0] : null;
  const selected = preferred || fallback;
  if (!selected) throw new Error("Choose a preferred connection in Settings or allow fallback.");

  return {
    id: selected.id,
    label: `${preferred ? "Preferred" : "Fallback"}: ${selected.name}${selected.model ? ` (${selected.model})` : ""}`,
  };
}

export async function generate(connectionId, messages, params = {}) {
  const rawMessages = messages.map(({ role, content }) => ({ role, content }));
  const res = await fetch("/api/generate/raw", {
    method: "POST",
    headers: CSRF_HEADERS,
    body: JSON.stringify({
      connectionId,
      messages: rawMessages,
      parameters: { maxTokens: 512, ...params },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Generation failed");

  const content = typeof data?.content === "string" ? data.content : "";
  const thinking = extractThinking(data);
  console.info("[Persona Helper] Raw LLM response", data);
  console.info("[Persona Helper] Raw LLM content", content);
  if (thinking) console.info("[Persona Helper] Raw LLM thinking", thinking);

  return {
    content,
    thinking,
    raw: data,
  };
}

function extractThinking(data) {
  if (!data || typeof data !== "object") return "";

  for (const key of ["thinking", "reasoning", "reasoning_content"]) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key];
  }

  const extra = data.extra && typeof data.extra === "object" ? data.extra : null;
  if (extra) {
    for (const key of ["thinking", "reasoning", "reasoning_content"]) {
      if (typeof extra[key] === "string" && extra[key].trim()) return extra[key];
    }
  }

  const details = Array.isArray(data.reasoning_details)
    ? data.reasoning_details
    : Array.isArray(extra?.reasoning_details)
      ? extra.reasoning_details
      : [];

  return details
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      return item.text || item.summary || item.thinking || item.content || "";
    })
    .filter((value) => typeof value === "string" && value.trim())
    .join("\n\n");
}
