import { loadPersonaHelperSettings } from "./settings.js";

export function getBackendBaseUrl(settings = loadPersonaHelperSettings()) {
  const port = String(settings.backendPort || "").trim() || "5004";
  return `http://localhost:${port}`;
}

export async function runPersonaCommand(domain, command, parameters = {}) {
  const res = await fetch(`${getBackendBaseUrl()}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, command, parameters }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Persona Helper command failed: ${domain}.${command}`);
  }
  return data;
}

export const goalCommands = {
  list: (parameters = {}) => runPersonaCommand("personaGoal", "list", parameters),
  create: (parameters = {}) => runPersonaCommand("personaGoal", "create", parameters),
  update: (parameters = {}) => runPersonaCommand("personaGoal", "update", parameters),
  delete: (parameters = {}) => runPersonaCommand("personaGoal", "delete", parameters),
};
