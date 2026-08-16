import { loadPersonaHelperSettings } from "./settings.js";

export function getBackendBaseUrl(settings = loadPersonaHelperSettings()) {
  const port = String(settings.backendPort || "").trim() || "5003";
  return `http://localhost:${port}`;
}

export async function runPersonaCommand(domain, command, parameters = {}) {
  const commandName = `${domain}.${command}`;
  let res;

  try {
    res = await fetch(`${getBackendBaseUrl()}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, command, parameters }),
    });
  } catch (error) {
    throw new Error(error?.message || `Could not reach Persona Helper backend for ${commandName}`);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Persona Helper command failed: ${commandName}`);
  }
  if (data && typeof data === "object" && "success" in data) {
    if (!data.success) {
      throw new Error(data.message || `Persona Helper command failed: ${commandName}`);
    }
    return data.data ?? {};
  }
  return data ?? {};
}

export async function getGoalSchema() {
  const res = await fetch(`${getBackendBaseUrl()}/schema/goal`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Could not load goal schema");
  }
  return data ?? {};
}

const runGoalCommand = (command, parameters = {}) => runPersonaCommand("goal", command, parameters);

export const goalCommands = {
  createCollection: (parameters = {}) => runGoalCommand("create_collection", parameters),
  getCollection: (parameters = {}) => runGoalCommand("get_collection", parameters),
  listCollections: (parameters = {}) => runGoalCommand("list_collections", parameters),
  updateCollection: (parameters = {}) => runGoalCommand("update_collection", parameters),
  deleteCollection: (parameters = {}) => runGoalCommand("delete_collection", parameters),
  getChat: (parameters = {}) => runGoalCommand("get_chat", parameters),
  listChats: (parameters = {}) => runGoalCommand("list_chats", parameters),
  updateChat: (parameters = {}) => runGoalCommand("update_chat", parameters),
  deleteChat: (parameters = {}) => runGoalCommand("delete_chat", parameters),
  create: (parameters = {}) => runGoalCommand("create", parameters),
  get: (parameters = {}) => runGoalCommand("get", parameters),
  list: (parameters = {}) => runGoalCommand("list", parameters),
  search: (parameters = {}) => runGoalCommand("search", parameters),
  update: (parameters = {}) => runGoalCommand("update", parameters),
  delete: (parameters = {}) => runGoalCommand("delete", parameters),
  duplicate: (parameters = {}) => runGoalCommand("duplicate", parameters),
  audit: (parameters = {}) => runGoalCommand("audit", parameters),
  reconcile: (parameters = {}) => runGoalCommand("reconcile", parameters),
  addNodes: (parameters = {}) => runGoalCommand("add_nodes", parameters),
  updateNode: (parameters = {}) => runGoalCommand("update_node", parameters),
  promoteNode: (parameters = {}) => runGoalCommand("promote_node", parameters),
  collapseNode: (parameters = {}) => runGoalCommand("collapse_node", parameters),
  deleteNode: (parameters = {}) => runGoalCommand("delete_node", parameters),
};
