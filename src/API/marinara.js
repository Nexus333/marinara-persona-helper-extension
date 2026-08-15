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
  return res.json();
}
