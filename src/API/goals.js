const GOALS_KEY = "persona-helper-local-goals";

export function makeId(prefix = "goal") {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadLocalGoals() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GOALS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  return goals;
}

export function createLocalGoal({ personaId, collectionName, title, intent, approach, type }) {
  const now = new Date().toISOString();
  const goal = {
    id: makeId(),
    personaId: personaId || "unscoped",
    collectionName: collectionName || "Default",
    title: title.trim(),
    intent: intent.trim(),
    approach: approach.trim(),
    type,
    visibility: "active",
    narrativeState: type === "achievement" ? "pursuing" : null,
    priority: false,
    nodes: [],
    currentNodeId: null,
    createdAt: now,
    updatedAt: now,
  };
  return saveLocalGoals([goal, ...loadLocalGoals()])[0];
}

export function updateLocalGoal(id, patch) {
  const now = new Date().toISOString();
  const goals = loadLocalGoals().map((goal) => (
    goal.id === id ? { ...goal, ...patch, updatedAt: now } : goal
  ));
  saveLocalGoals(goals);
  return goals.find((goal) => goal.id === id) || null;
}

export function deleteLocalGoal(id) {
  saveLocalGoals(loadLocalGoals().filter((goal) => goal.id !== id));
}
