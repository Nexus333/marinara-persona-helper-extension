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
      personaId: null,
      persona: null,
    };
  }

  const context = await marinara.context.get();
  return {
    chatId: context?.chatId ?? getActiveChatId(),
    personaId: context?.personaId ?? null,
    persona: context?.persona ?? null,
  };
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
