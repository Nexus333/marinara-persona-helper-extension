import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  EyeOff,
  Library,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Star,
  Target,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { getBackendBaseUrl, getGoalSchema, goalCommands } from "../API/personaBackend.js";
import { getCharacters, getPersonaContext, getPersonas } from "../API/marinara.js";
import { formStyles } from "../Styles/formStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

const SUBJECT_SELECTION_KEY = "persona-helper-goal-subject-by-chat";
const SETUP_PROMPT_DEBUG_KEY = "persona-helper-goal-setup-prompt-debug";
const SETUP_RAW_DEBUG_KEY = "persona-helper-goal-setup-raw-debug";
const SETUP_PARSED_DEBUG_KEY = "persona-helper-goal-setup-parsed-debug";
const SETUP_ERROR_DEBUG_KEY = "persona-helper-goal-setup-error-debug";
const GOAL_DRAFTING_STATUSES = [
  "Assembling prompt",
  "Checking goal context",
  "Parsing candidates",
  "Preparing diagnostics",
];
const DRAFTING_BASE_COLOR = "#777";
const DRAFTING_PULSE_COLOR = "#CCC";
const DRAFTING_PULSE_TRAIL_COLOR = "#999";
const DRAFTING_ELLIPSIS = "...";

const GOALS_TABS = {
  tasks: {
    icon: ListChecks,
    title: "Tasks",
    description: "Current chat task list, chat scope, focused subtree, and manual progress controls.",
  },
  library: {
    icon: Library,
    title: "Library",
    description: "Subject collections, goal management, search, duplication, and chat assignment.",
  },
  setup: {
    icon: Settings,
    title: "Setup",
    description: "Application data, backend status, generation debug, and chat binding cleanup.",
  },
};

const emptyContext = {
  chatId: null,
  characterId: null,
  characterIds: [],
  characters: [],
  personaId: null,
  persona: null,
};

const extrasSubject = {
  mode: "extras",
  key: "_extras",
  label: "Extras / Minor Characters",
  source: "extension",
};

function targetKey(target) {
  return `${target.type}:${target.id}`;
}

function loadSubjectSelections() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUBJECT_SELECTION_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveSubjectSelection(chatId, subjectKey) {
  if (!chatId || !subjectKey) return;
  const selections = loadSubjectSelections();
  selections[chatId] = subjectKey;
  localStorage.setItem(SUBJECT_SELECTION_KEY, JSON.stringify(selections));
}

function dedupeSubjects(subjects) {
  const seen = new Set();
  return subjects.filter((subject) => {
    if (!subject?.key || seen.has(subject.key)) return false;
    seen.add(subject.key);
    return true;
  });
}

function getContextSubject(context) {
  if (!context.personaId) return null;
  return {
    mode: "persona",
    key: context.personaId,
    label: context.persona?.name || context.personaId,
    source: "marinara",
    current: true,
  };
}

function getContextCharacterSubjects(context) {
  const fromRecords = Array.isArray(context.characters)
    ? context.characters.map((character) => ({
        mode: "character",
        key: String(character?.id || character?.name || "").trim(),
        label: String(character?.name || character?.id || "Character").trim(),
        source: "marinara",
        current: true,
      }))
    : [];
  const recordIds = new Set(fromRecords.map((subject) => subject.key));
  const ids = [
    context.characterId,
    ...(Array.isArray(context.characterIds) ? context.characterIds : []),
  ]
    .map((id) => String(id || "").trim())
    .filter((id) => id && !recordIds.has(id))
    .map((id) => ({
      mode: "character",
      key: id,
      label: id,
      source: "marinara",
      current: true,
    }));

  return [...fromRecords, ...ids].filter((subject) => subject.key);
}

function toUpdateTargets(targets = []) {
  return targets.map((target) => ({ id: target.id, type: target.type }));
}

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tagsToText(tags) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

function readStoredString(key) {
  return localStorage.getItem(key) || "";
}

function writeStoredString(key, value) {
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
}

function randomGoalDraftingStatus(current = "") {
  const options = GOAL_DRAFTING_STATUSES.filter((status) => status !== current);
  const list = options.length ? options : GOAL_DRAFTING_STATUSES;
  return list[Math.floor(Math.random() * list.length)] || "Assembling prompt";
}

function draftingCharacterColor(index, pulse) {
  const distance = Math.abs(index - pulse);
  if (distance === 0) return DRAFTING_PULSE_COLOR;
  if (distance === 1) return DRAFTING_PULSE_TRAIL_COLOR;
  return DRAFTING_BASE_COLOR;
}

function parseCandidateLines(raw) {
  return String(raw || "")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .map((text) => ({ text, resolution_mode: "checklist" }));
}

function buildGoalDebugPrompt({ activeSubject, context, generationMode, promptNotes }) {
  const subjectLabel = activeSubject?.label || "No subject selected";
  const subjectKey = activeSubject?.key || "not-selected";
  const chatId = context.chatId || "not-detected";
  const task = generationMode === "initial"
    ? "Draft an initial goal tree as reviewable candidate nodes."
    : "Draft subtasks under the selected goal node as reviewable candidate nodes.";

  return [
    "Persona Helper Goal Generation Debug",
    "",
    `Task: ${task}`,
    `Chat ID: ${chatId}`,
    `Subject: ${subjectLabel}`,
    `Backend persona namespace: ${subjectKey}`,
    "",
    "Generation framing:",
    "- Treat parents as milestones, directions, requirements, opportunities, or constraints.",
    "- Do not create truth. Return candidates for user review.",
    "- Keep each node concrete and short.",
    "",
    "User notes:",
    promptNotes.trim() || "None supplied.",
  ].join("\n");
}

function createBlankGoalDraft(collectionId = "") {
  return {
    id: "",
    mode: "create",
    collectionId,
    name: "",
    description: "",
    tags: "",
    type: "achievement",
    status: "active",
    narrativeState: "pursuing",
    priority: false,
    initialNodes: "",
    assignAfterSave: false,
  };
}

function filterCompletedNodes(nodes, hideCompleted) {
  if (!hideCompleted) return nodes;
  return nodes
    .map((node) => {
      const children = filterCompletedNodes(node.children || [], hideCompleted);
      if (node.state === "done" && children.length === 0) return null;
      return { ...node, children };
    })
    .filter(Boolean);
}

export function GoalsView({ activeTab, onSelectTab }) {
  const tab = GOALS_TABS[activeTab] ? activeTab : "tasks";
  const [context, setContext] = useState(emptyContext);
  const [contextStatus, setContextStatus] = useState({ loading: true, error: "" });
  const [backendStatus, setBackendStatus] = useState({ loading: true, ok: false, error: "", commandCount: 0 });
  const [subjectState, setSubjectState] = useState({
    loading: true,
    error: "",
    options: [extrasSubject],
    activeKey: "",
    expanded: false,
    query: "",
  });

  useEffect(() => {
    let active = true;
    setContextStatus({ loading: true, error: "" });

    getPersonaContext()
      .then((nextContext) => {
        if (!active) return;
        setContext({ ...emptyContext, ...nextContext });
        setContextStatus({ loading: false, error: "" });
      })
      .catch((error) => {
        if (!active) return;
        setContext(emptyContext);
        setContextStatus({ loading: false, error: error?.message || "Could not resolve Marinara context." });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setBackendStatus({ loading: true, ok: false, error: "", commandCount: 0 });

    getGoalSchema()
      .then((schema) => {
        if (!active) return;
        setBackendStatus({
          loading: false,
          ok: true,
          error: "",
          commandCount: Object.keys(schema || {}).length,
        });
      })
      .catch((error) => {
        if (!active) return;
        setBackendStatus({
          loading: false,
          ok: false,
          error: error?.message || "Could not load goal schema.",
          commandCount: 0,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const contextSubject = getContextSubject(context);
    const contextCharacters = getContextCharacterSubjects(context);
    setSubjectState((current) => ({ ...current, loading: true, error: "" }));

    Promise.allSettled([getPersonas(), getCharacters()])
      .then(([personasResult, charactersResult]) => {
        if (!active) return;
        const personas = personasResult.status === "fulfilled" ? personasResult.value : [];
        const characters = charactersResult.status === "fulfilled" ? charactersResult.value : [];
        const options = dedupeSubjects([contextSubject, ...contextCharacters, ...personas, ...characters, extrasSubject].filter(Boolean));
        const storedKey = context.chatId ? loadSubjectSelections()[context.chatId] : "";
        const fallbackKey = contextSubject?.key || options[0]?.key || "";
        const activeKey = options.some((subject) => subject.key === storedKey) ? storedKey : fallbackKey;
        const loadError = [personasResult, charactersResult]
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason?.message)
          .filter(Boolean)
          .join(" ");
        setSubjectState((current) => ({
          ...current,
          loading: false,
          error: loadError,
          options,
          activeKey,
        }));
      })
      .catch((error) => {
        if (!active) return;
        setSubjectState((current) => ({
          ...current,
          loading: false,
          error: error?.message || "Could not load subjects.",
          options: dedupeSubjects([contextSubject, ...contextCharacters, extrasSubject].filter(Boolean)),
          activeKey: contextSubject?.key || extrasSubject.key,
        }));
      });

    return () => {
      active = false;
    };
  }, [context.chatId, context.personaId, context.persona, context.characterId, context.characterIds, context.characters]);

  const activeSubject = useMemo(() => {
    return subjectState.options.find((subject) => subject.key === subjectState.activeKey) || null;
  }, [subjectState.activeKey, subjectState.options]);

  function selectSubject(subject) {
    setSubjectState((current) => ({ ...current, activeKey: subject.key, expanded: false, query: "" }));
    saveSubjectSelection(context.chatId, subject.key);
  }

  if (tab === "setup") {
    return (
      <div style={viewStyles.stack}>
        <GoalsHeader tab={tab} />
        <SetupView
          activeSubject={activeSubject}
          backendStatus={backendStatus}
          context={context}
          contextStatus={contextStatus}
          subjectState={subjectState}
        />
      </div>
    );
  }

  return (
    <div style={viewStyles.stack}>
      <GoalsHeader tab={tab} />
      <SubjectSwitcher
        activeSubject={activeSubject}
        context={context}
        onSelect={selectSubject}
        setSubjectState={setSubjectState}
        subjectState={subjectState}
      />
      {tab === "tasks" ? (
        <TasksView
          activeSubject={activeSubject}
          backendReady={backendStatus.ok}
          chatId={context.chatId}
          onOpenLibrary={() => onSelectTab?.("library")}
        />
      ) : (
        <LibraryView
          activeSubject={activeSubject}
          backendReady={backendStatus.ok}
          chatId={context.chatId}
        />
      )}
    </div>
  );
}

function GoalsHeader({ tab }) {
  const meta = GOALS_TABS[tab] || GOALS_TABS.tasks;
  const Icon = meta.icon;

  return (
    <header style={viewStyles.pageHeader}>
      <div style={viewStyles.cardMeta}>
        <div>
          <h2 style={viewStyles.heading}>{meta.title}</h2>
          <p style={viewStyles.muted}>{meta.description}</p>
        </div>
        <span style={viewStyles.badge}>
          <Icon size="0.875rem" />
        </span>
      </div>
    </header>
  );
}

function SubjectSwitcher({ activeSubject, context, onSelect, setSubjectState, subjectState }) {
  const query = subjectState.query.trim().toLowerCase();
  const visibleSubjects = subjectState.options.filter((subject) => {
    if (!query) return true;
    return `${subject.label} ${subject.key} ${subject.mode}`.toLowerCase().includes(query);
  });

  return (
    <section style={viewStyles.panel}>
      <button
        type="button"
        style={viewStyles.disclosureButtonSmall}
        onClick={() => setSubjectState((current) => ({ ...current, expanded: !current.expanded }))}
      >
        <span style={viewStyles.inlineTitle}>
          {subjectState.expanded ? <ChevronDown size="0.875rem" /> : <ChevronRight size="0.875rem" />}
          <SubjectIcon mode={activeSubject?.mode} />
          {activeSubject?.label || "Choose subject"}
        </span>
        <span style={viewStyles.muted}>{context.chatId ? "Current chat" : "No chat"}</span>
      </button>
      {subjectState.expanded ? (
        <div style={viewStyles.stack}>
          <input
            style={formStyles.input}
            value={subjectState.query}
            onChange={(event) => setSubjectState((current) => ({ ...current, query: event.target.value }))}
            placeholder="Search personas, characters, extras"
          />
          {subjectState.error ? <p style={viewStyles.note}>{subjectState.error}</p> : null}
          <div style={viewStyles.scrollStack}>
            {visibleSubjects.map((subject) => {
              const selected = subject.key === activeSubject?.key;
              return (
                <button
                  key={`${subject.mode}:${subject.key}`}
                  type="button"
                  style={{
                    ...viewStyles.subjectOption,
                    ...(selected ? viewStyles.subjectOptionSelected : null),
                  }}
                  onClick={() => onSelect(subject)}
                >
                  <SubjectIcon mode={subject.mode} />
                  <span style={viewStyles.subjectText}>
                    <span style={viewStyles.contextText}>{subject.label}</span>
                    <span style={viewStyles.contextLabel}>{subject.mode} / {subject.source}</span>
                  </span>
                  {selected ? <CheckCircle2 size="0.875rem" /> : null}
                </button>
              );
            })}
            {!visibleSubjects.length ? <div style={viewStyles.empty}>No matching subjects.</div> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TasksView({ activeSubject, backendReady, chatId, onOpenLibrary }) {
  const [binding, setBinding] = useState(null);
  const [scopeId, setScopeId] = useState("all");
  const [groups, setGroups] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [addDrafts, setAddDrafts] = useState({});
  const [scopeExpanded, setScopeExpanded] = useState(true);

  const persona = activeSubject?.key || "";

  async function loadTasks(nextScopeId = scopeId) {
    if (!backendReady || !persona || !chatId) {
      setBinding(null);
      setGroups([]);
      return;
    }
    setStatus({ loading: true, error: "" });
    try {
      const nextBinding = await goalCommands.getChat({ persona, chat_id: chatId });
      const targets = Array.isArray(nextBinding.targets) ? nextBinding.targets : [];
      const validScope = nextScopeId === "all" || targets.some((target) => targetKey(target) === nextScopeId)
        ? nextScopeId
        : "all";
      const nextGroups = await loadTaskGroups(persona, targets, validScope);
      setBinding({ ...nextBinding, targets });
      setScopeId(validScope);
      setGroups(nextGroups);
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setBinding(null);
      setGroups([]);
      setStatus({ loading: false, error: error?.message || "Could not load tasks." });
    }
  }

  useEffect(() => {
    setScopeId("all");
    setGroups([]);
    setBinding(null);
    loadTasks("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendReady, persona, chatId]);

  async function selectScope(nextScopeId) {
    setScopeId(nextScopeId);
    await loadTasks(nextScopeId);
  }

  async function removeTarget(target) {
    if (!binding || !persona || !chatId) return;
    setStatus({ loading: true, error: "" });
    try {
      const nextTargets = binding.targets.filter((item) => targetKey(item) !== targetKey(target));
      const nextBinding = await goalCommands.updateChat({
        persona,
        chat_id: chatId,
        targets: toUpdateTargets(nextTargets),
      });
      setBinding(nextBinding);
      setScopeId("all");
      setGroups(await loadTaskGroups(persona, nextBinding.targets || [], "all"));
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not remove chat target." });
    }
  }

  async function updateNode(goal, node, patch) {
    setStatus({ loading: true, error: "" });
    try {
      const result = await goalCommands.updateNode({
        persona,
        goal_id: goal.id,
        node_id: node.id,
        ...patch,
      });
      setGroups((current) => replaceGoalInGroups(current, result));
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not update node." });
    }
  }

  async function addChild(goal, parentId) {
    const draftKey = `${goal.id}:${parentId || "root"}`;
    const text = String(addDrafts[draftKey] || "").trim();
    if (!text) return;
    setStatus({ loading: true, error: "" });
    try {
      const result = await goalCommands.addNodes({
        persona,
        goal_id: goal.id,
        parent_id: parentId || null,
        nodes: [{ text, resolution_mode: "checklist" }],
      });
      setAddDrafts((current) => ({ ...current, [draftKey]: "" }));
      setGroups((current) => replaceGoalInGroups(current, result));
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not add child task." });
    }
  }

  async function focusNode(goal, node) {
    setStatus({ loading: true, error: "" });
    try {
      const result = await goalCommands.get({ persona, id: goal.id, node_id: node.id });
      setGroups((current) => replaceGoalInGroups(current, result));
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not focus subtree." });
    }
  }

  async function showFullTree(goal) {
    setStatus({ loading: true, error: "" });
    try {
      const result = await goalCommands.get({ persona, id: goal.id });
      setGroups((current) => replaceGoalInGroups(current, result));
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not load full tree." });
    }
  }

  async function setCurrentFocus(goal, node) {
    setStatus({ loading: true, error: "" });
    try {
      await goalCommands.update({ persona, id: goal.id, current_node_id: node.id });
      const result = await goalCommands.get({ persona, id: goal.id });
      setGroups((current) => replaceGoalInGroups(current, result));
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not set current focus." });
    }
  }

  const targets = binding?.targets || [];
  const bindingLabel = !backendReady
    ? "Backend unavailable"
    : !chatId
      ? "No active chat"
      : !persona
        ? "No subject"
        : status.loading
          ? "Loading binding"
          : `${targets.length} bound target${targets.length === 1 ? "" : "s"}`;

  return (
    <div style={viewStyles.stack}>
      <section style={viewStyles.panel}>
        <div style={viewStyles.badgeRow}>
          <span style={viewStyles.badge}>
            <SubjectIcon mode={activeSubject?.mode} />
            {activeSubject?.label || "No subject"}
          </span>
          <span style={viewStyles.badge}>Chat: {chatId || "Not detected"}</span>
          <span style={{ ...viewStyles.badge, ...(!backendReady ? viewStyles.badgeMuted : null) }}>
            {backendReady ? "Backend ready" : "Backend unavailable"}
          </span>
          <span style={viewStyles.badge}>{bindingLabel}</span>
        </div>
      </section>

      <section style={viewStyles.panel}>
        <button
          type="button"
          style={viewStyles.disclosureButtonSmall}
          onClick={() => setScopeExpanded((value) => !value)}
        >
          <span style={viewStyles.inlineTitle}>
            {scopeExpanded ? <ChevronDown size="0.875rem" /> : <ChevronRight size="0.875rem" />}
            Chat Scope
          </span>
          <span style={viewStyles.muted}>{targets.length ? `${targets.length} assigned` : "Unbound"}</span>
        </button>
        {scopeExpanded ? (
          <>
            <div style={viewStyles.panelHeader}>
              <p style={viewStyles.muted}>{targets.length ? "Choose a collection or goal focus for this chat." : "No assigned goals or collections"}</p>
              <button type="button" style={formStyles.iconButton} title="Refresh tasks" onClick={() => loadTasks(scopeId)}>
                <RefreshCw size="0.875rem" style={status.loading ? viewStyles.draftingSpinner : null} />
              </button>
            </div>
            <div style={viewStyles.badgeRow}>
              <button
                type="button"
                style={{ ...formStyles.secondaryButton, ...(scopeId === "all" ? formStyles.primaryButton : null) }}
                onClick={() => selectScope("all")}
              >
                All
              </button>
              {targets.map((target) => (
                <button
                  key={targetKey(target)}
                  type="button"
                  style={{ ...formStyles.secondaryButton, ...(scopeId === targetKey(target) ? formStyles.primaryButton : null) }}
                  onClick={() => selectScope(targetKey(target))}
                >
                  {target.name || target.id}
                </button>
              ))}
            </div>
            {targets.length ? (
              <div style={viewStyles.scrollStack}>
                {targets.map((target) => (
                  <div key={targetKey(target)} style={viewStyles.targetRow}>
                    <span style={{ ...viewStyles.badge, ...viewStyles.badgeMuted }}>{target.type}</span>
                    <span style={viewStyles.contextText}>{target.name || target.id}</span>
                    <button type="button" style={formStyles.iconButton} title="Remove from chat" onClick={() => removeTarget(target)}>
                      <Trash2 size="0.8125rem" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={viewStyles.empty}>
                <p style={viewStyles.note}>Assign a collection or goal from Library to start using this chat's task list.</p>
                <button type="button" style={formStyles.secondaryButton} onClick={onOpenLibrary}>
                  Open Library
                </button>
              </div>
            )}
          </>
        ) : null}
        {status.error ? <p style={viewStyles.note}>{status.error}</p> : null}
      </section>

      <section style={viewStyles.panel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>View</h3>
            <p style={viewStyles.muted}>Display controls only. These do not mutate backend state.</p>
          </div>
          <label style={formStyles.toggleRow}>
            <input
              checked={hideCompleted}
              onChange={(event) => setHideCompleted(event.target.checked)}
              type="checkbox"
            />
            <EyeOff size="0.875rem" />
            Hide completed
          </label>
        </div>
      </section>

      {!backendReady ? <div style={viewStyles.empty}>Goal backend is unavailable.</div> : null}
      {backendReady && !chatId ? <div style={viewStyles.empty}>No active chat detected.</div> : null}
      {backendReady && chatId && !persona ? <div style={viewStyles.empty}>Choose a subject to load tasks.</div> : null}
      {backendReady && chatId && persona && !status.loading && !groups.length ? (
        <div style={viewStyles.empty}>No assigned task trees for this scope.</div>
      ) : null}

      {groups.map((group) => (
        <section key={group.key} style={viewStyles.stack}>
          <div style={viewStyles.sectionHeader}>
            <h3 style={viewStyles.title}>{group.label}</h3>
            <p style={viewStyles.muted}>{group.kind}</p>
          </div>
          {group.goals.map((goal) => (
            <GoalTree
              addChild={addChild}
              addDrafts={addDrafts}
              goal={goal}
              hideCompleted={hideCompleted}
              key={goal.id}
              onDraftChange={setAddDrafts}
              onFocusNode={focusNode}
              onSetCurrentFocus={setCurrentFocus}
              onShowFullTree={showFullTree}
              onUpdateNode={updateNode}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

async function loadTaskGroups(persona, targets, scopeId) {
  const selectedTargets = scopeId === "all" ? targets : targets.filter((target) => targetKey(target) === scopeId);
  const seenGoalIds = new Set();
  const groups = [];

  for (const target of selectedTargets) {
    if (target.type === "collection") {
      const list = await goalCommands.list({ persona, collection_id: target.id });
      const metadata = Array.isArray(list.items) ? list.items : [];
      const goals = [];
      for (const item of metadata) {
        if (scopeId === "all" && seenGoalIds.has(item.id)) continue;
        const goal = await goalCommands.get({ persona, id: item.id });
        seenGoalIds.add(goal.id);
        goals.push(goal);
      }
      groups.push({
        key: targetKey(target),
        kind: "Collection",
        label: target.name || target.id,
        goals,
      });
    } else if (target.type === "goal") {
      if (scopeId === "all" && seenGoalIds.has(target.id)) continue;
      const goal = await goalCommands.get({ persona, id: target.id });
      seenGoalIds.add(goal.id);
      groups.push({
        key: targetKey(target),
        kind: "Goal",
        label: target.name || goal.name || target.id,
        goals: [goal],
      });
    }
  }

  return groups.filter((group) => group.goals.length);
}

function replaceGoalInGroups(groups, nextGoal) {
  return groups.map((group) => ({
    ...group,
    goals: group.goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal)),
  }));
}

function GoalTree({
  addChild,
  addDrafts,
  goal,
  hideCompleted,
  onDraftChange,
  onFocusNode,
  onSetCurrentFocus,
  onShowFullTree,
  onUpdateNode,
}) {
  const nodes = filterCompletedNodes(goal.nodes || [], hideCompleted);
  return (
    <article style={viewStyles.panel}>
      <div style={viewStyles.panelHeader}>
        <div>
          <h3 style={viewStyles.title}>{goal.name}</h3>
          <p style={viewStyles.muted}>{goal.type} / {goal.status}{goal.priority ? " / priority" : ""}</p>
        </div>
        <button type="button" style={formStyles.secondaryButton} onClick={() => onShowFullTree(goal)}>
          Show full tree
        </button>
      </div>
      {nodes.length ? (
        <div style={viewStyles.nodeTree}>
          {nodes.map((node) => (
            <GoalNode
              addChild={addChild}
              addDrafts={addDrafts}
              depth={0}
              goal={goal}
              key={node.id}
              node={node}
              onDraftChange={onDraftChange}
              onFocusNode={onFocusNode}
              onSetCurrentFocus={onSetCurrentFocus}
              onUpdateNode={onUpdateNode}
            />
          ))}
        </div>
      ) : (
        <div style={viewStyles.empty}>No visible nodes in this tree.</div>
      )}
    </article>
  );
}

function GoalNode({ addChild, addDrafts, depth, goal, node, onDraftChange, onFocusNode, onSetCurrentFocus, onUpdateNode }) {
  const draftKey = `${goal.id}:${node.id || "root"}`;
  const isAccumulation = node.resolution_mode === "accumulation";
  const progress = Number(node.progress) || 0;
  const target = Math.max(0, Number(node.target) || 0);

  return (
    <div style={{ ...viewStyles.nodeRow, marginInlineStart: `${Math.min(depth, 5) * 0.875}rem` }}>
      <div style={viewStyles.nodeMain}>
        <select
          aria-label="Node state"
          style={formStyles.input}
          value={node.state}
          onChange={(event) => onUpdateNode(goal, node, { state: event.target.value })}
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
        <input
          aria-label="Node text"
          key={`${node.id}:${node.text || node.name || ""}`}
          style={formStyles.input}
          defaultValue={node.text || node.name || ""}
          onBlur={(event) => {
            const nextText = event.target.value.trim();
            if (nextText && nextText !== (node.text || node.name || "")) onUpdateNode(goal, node, { text: nextText });
          }}
        />
      </div>
      {isAccumulation ? (
        <div style={viewStyles.nodeControls}>
          <button type="button" style={formStyles.iconButton} onClick={() => onUpdateNode(goal, node, { progress: Math.max(0, progress - 1) })}>-</button>
          <span style={viewStyles.badge}>{progress} / {target}</span>
          <button type="button" style={formStyles.iconButton} onClick={() => onUpdateNode(goal, node, { progress: progress + 1 })}>+</button>
          <input
            aria-label="Accumulation target"
            key={`${node.id}:target:${target}`}
            min="0"
            style={{ ...formStyles.input, maxWidth: "5rem" }}
            type="number"
            defaultValue={target}
            onBlur={(event) => {
              const nextTarget = Math.max(0, Number(event.target.value) || 0);
              if (nextTarget !== target) onUpdateNode(goal, node, { target: nextTarget });
            }}
          />
        </div>
      ) : null}
      <div style={viewStyles.nodeControls}>
        <button type="button" style={formStyles.secondaryButton} onClick={() => onFocusNode(goal, node)}>Focus here</button>
        <button type="button" style={formStyles.secondaryButton} onClick={() => onSetCurrentFocus(goal, node)}>
          <Target size="0.8125rem" />
          Current
        </button>
      </div>
      <div style={viewStyles.nodeAddRow}>
        <input
          style={formStyles.input}
          value={addDrafts[draftKey] || ""}
          onChange={(event) => onDraftChange((current) => ({ ...current, [draftKey]: event.target.value }))}
          placeholder="Add child task"
        />
        <button type="button" style={formStyles.iconButton} title="Add child task" onClick={() => addChild(goal, node.id)}>
          <Plus size="0.8125rem" />
        </button>
      </div>
      {(node.children || []).map((child) => (
        <GoalNode
          addChild={addChild}
          addDrafts={addDrafts}
          depth={depth + 1}
          goal={goal}
          key={child.id}
          node={child}
          onDraftChange={onDraftChange}
          onFocusNode={onFocusNode}
          onSetCurrentFocus={onSetCurrentFocus}
          onUpdateNode={onUpdateNode}
        />
      ))}
    </div>
  );
}

function StatusPanel({ activeSubject, backendStatus, context, contextStatus, subjectState }) {
  return (
    <section style={viewStyles.panel}>
      <div style={viewStyles.panelHeader}>
        <div>
          <h3 style={viewStyles.title}>Application Data</h3>
          <p style={viewStyles.muted}>Raw context used by backend goal commands.</p>
        </div>
        <Database size="1rem" />
      </div>
      <div style={viewStyles.list}>
        <ContextValue label="Backend URL" value={getBackendBaseUrl()} />
        <ContextValue label="Backend status" value={backendStatus.loading ? "Checking" : backendStatus.ok ? "Ready" : "Unavailable"} />
        <ContextValue label="Goal commands" value={backendStatus.ok ? `${backendStatus.commandCount}` : "Unavailable"} />
        <ContextValue label="Chat ID" value={context.chatId || "Not detected"} />
        <ContextValue label="Subject" value={activeSubject?.label || "Not selected"} />
        <ContextValue label="Subject mode" value={activeSubject?.mode || "Not selected"} />
        <ContextValue label="Subject source" value={activeSubject?.source || "Not selected"} />
        <ContextValue label="Backend persona key" value={activeSubject?.key || "Not selected"} />
      </div>
      {contextStatus.error ? <p style={viewStyles.note}>{contextStatus.error}</p> : null}
      {subjectState.error ? <p style={viewStyles.note}>{subjectState.error}</p> : null}
      {backendStatus.error ? <p style={viewStyles.note}>{backendStatus.error}</p> : null}
    </section>
  );
}

function SetupView({ activeSubject, backendStatus, context, contextStatus, subjectState }) {
  const persona = activeSubject?.key || "";
  const [binding, setBinding] = useState(null);
  const [chatBindings, setChatBindings] = useState([]);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState("subtask");
  const [promptNotes, setPromptNotes] = useState("");
  const [assembledPrompt, setAssembledPrompt] = useState(() => readStoredString(SETUP_PROMPT_DEBUG_KEY));
  const [rawOutput, setRawOutput] = useState(() => readStoredString(SETUP_RAW_DEBUG_KEY));
  const [parsedCandidates, setParsedCandidates] = useState(() => readStoredString(SETUP_PARSED_DEBUG_KEY));
  const [generationErrors, setGenerationErrors] = useState(() => readStoredString(SETUP_ERROR_DEBUG_KEY));
  const [status, setStatus] = useState({ loading: false, error: "", message: "" });
  const [debugRunning, setDebugRunning] = useState(false);
  const [draftingStatus, setDraftingStatus] = useState(() => randomGoalDraftingStatus());
  const [draftingPulse, setDraftingPulse] = useState(0);

  useEffect(() => {
    writeStoredString(SETUP_PROMPT_DEBUG_KEY, assembledPrompt);
  }, [assembledPrompt]);

  useEffect(() => {
    writeStoredString(SETUP_RAW_DEBUG_KEY, rawOutput);
  }, [rawOutput]);

  useEffect(() => {
    writeStoredString(SETUP_PARSED_DEBUG_KEY, parsedCandidates);
  }, [parsedCandidates]);

  useEffect(() => {
    writeStoredString(SETUP_ERROR_DEBUG_KEY, generationErrors);
  }, [generationErrors]);

  useEffect(() => {
    if (!debugRunning) return undefined;
    const interval = window.setInterval(() => {
      setDraftingPulse((pulse) => pulse + 1);
      setDraftingStatus((current) => (Math.random() > 0.68 ? randomGoalDraftingStatus(current) : current));
    }, 180);
    return () => window.clearInterval(interval);
  }, [debugRunning]);

  async function loadSetupData() {
    if (!backendStatus.ok || !persona) {
      setBinding(null);
      setChatBindings([]);
      return;
    }
    setStatus({ loading: true, error: "", message: "" });
    try {
      const [bindingResult, chatsResult] = await Promise.all([
        context.chatId ? goalCommands.getChat({ persona, chat_id: context.chatId }) : Promise.resolve(null),
        goalCommands.listChats({ persona }),
      ]);
      setBinding(bindingResult ? { ...bindingResult, targets: bindingResult.targets || [] } : null);
      setChatBindings(Array.isArray(chatsResult.items) ? chatsResult.items : []);
      setStatus({ loading: false, error: "", message: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not load setup data.", message: "" });
    }
  }

  useEffect(() => {
    setBinding(null);
    setChatBindings([]);
    loadSetupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendStatus.ok, persona, context.chatId]);

  async function deleteChatBinding(chatId) {
    if (!persona || !chatId) return;
    setStatus({ loading: true, error: "", message: "" });
    try {
      await goalCommands.deleteChat({ persona, chat_id: chatId });
      await loadSetupData();
      setStatus({ loading: false, error: "", message: "Chat binding deleted." });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not delete chat binding.", message: "" });
    }
  }

  async function buildDebugPanels() {
    setDebugRunning(true);
    setGenerationErrors("");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      const prompt = buildGoalDebugPrompt({ activeSubject, context, generationMode, promptNotes });
      const parsed = parseCandidateLines(rawOutput);
      setAssembledPrompt(prompt);
      setParsedCandidates(JSON.stringify(parsed, null, 2));
      setGenerationErrors(parsed.length || !rawOutput.trim() ? "" : "Raw output did not contain parseable candidate lines.");
    } catch (error) {
      setGenerationErrors(error?.message || "Could not build generation debug panels.");
    } finally {
      setDebugRunning(false);
    }
  }

  function renderDraftingStatus() {
    const statusText = `${draftingStatus}${DRAFTING_ELLIPSIS}`;
    const pulseIndex = draftingPulse % (statusText.length + 4);

    return (
      <span style={viewStyles.draftingStatus}>
        <span style={viewStyles.draftingStatusText} aria-label={statusText}>
          {statusText.split("").map((char, index) => (
            <span
              aria-hidden="true"
              key={`${char}-${index}`}
              style={{
                ...viewStyles.draftingStatusChar,
                color: char.trim() ? draftingCharacterColor(index, pulseIndex) : "transparent",
              }}
            >
              {char === " " ? "\u00a0" : char}
            </span>
          ))}
        </span>
      </span>
    );
  }

  const bindingTargets = binding?.targets || [];

  return (
    <div style={viewStyles.stack}>
      <section style={viewStyles.grid}>
        <StatusPanel
          activeSubject={activeSubject}
          backendStatus={backendStatus}
          context={context}
          contextStatus={contextStatus}
          subjectState={subjectState}
        />
        <section style={viewStyles.panel}>
          <div style={viewStyles.panelHeader}>
            <div>
              <h3 style={viewStyles.title}>Current Chat Binding</h3>
              <p style={viewStyles.muted}>{bindingTargets.length} target{bindingTargets.length === 1 ? "" : "s"} for this subject and chat.</p>
            </div>
            <button type="button" style={formStyles.iconButton} title="Refresh setup data" onClick={loadSetupData}>
              <RefreshCw size="0.875rem" style={status.loading ? viewStyles.draftingSpinner : null} />
            </button>
          </div>
          <div style={viewStyles.list}>
            <ContextValue label="Binding chat id" value={binding?.chat_id || context.chatId || "Not detected"} />
            <ContextValue label="Binding persona key" value={binding?.persona || persona || "Not selected"} />
          </div>
          {bindingTargets.length ? (
            <div style={viewStyles.scrollStack}>
              {bindingTargets.map((target) => (
                <div key={targetKey(target)} style={viewStyles.targetRow}>
                  <span style={{ ...viewStyles.badge, ...viewStyles.badgeMuted }}>{target.type}</span>
                  <span style={viewStyles.subjectText}>
                    <span style={viewStyles.contextText}>{target.name || target.id}</span>
                    <span style={viewStyles.contextLabel}>{target.id}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={viewStyles.empty}>No current-chat binding targets found for this subject.</div>
          )}
        </section>
      </section>

      <section style={viewStyles.panel}>
        <button
          type="button"
          style={viewStyles.disclosureButtonSmall}
          onClick={() => setCleanupOpen((value) => !value)}
        >
          <span style={viewStyles.inlineTitle}>
            {cleanupOpen ? <ChevronDown size="0.875rem" /> : <ChevronRight size="0.875rem" />}
            Advanced Chat Cleanup
          </span>
          <span style={viewStyles.muted}>{chatBindings.length} saved chat binding{chatBindings.length === 1 ? "" : "s"}</span>
        </button>
        {cleanupOpen ? (
          <div style={viewStyles.stack}>
            <p style={viewStyles.muted}>Delete stale binding entries for the resolved backend persona namespace. This does not delete goals or collections.</p>
            {chatBindings.length ? (
              <div style={viewStyles.scrollStack}>
                {chatBindings.map((item) => {
                  const chatId = item.chat_id || item.id || "";
                  const targets = item.targets || [];
                  return (
                    <div key={chatId} style={viewStyles.targetRow}>
                      <span style={{ ...viewStyles.badge, ...(chatId === context.chatId ? null : viewStyles.badgeMuted) }}>
                        {chatId === context.chatId ? "current" : "saved"}
                      </span>
                      <span style={viewStyles.subjectText}>
                        <span style={viewStyles.contextText}>{chatId}</span>
                        <span style={viewStyles.contextLabel}>{targets.length} target{targets.length === 1 ? "" : "s"}</span>
                      </span>
                      <button type="button" style={formStyles.iconButton} title="Delete chat binding" onClick={() => deleteChatBinding(chatId)}>
                        <Trash2 size="0.8125rem" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={viewStyles.empty}>No saved chat bindings found for this subject.</div>
            )}
          </div>
        ) : null}
      </section>

      <section style={viewStyles.panel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Generation Debug</h3>
            <p style={viewStyles.muted}>Preview the prompt context and parse raw candidate output before Phase 7 writes nodes.</p>
          </div>
          {debugRunning ? (
            <div style={viewStyles.draftingIndicator} role="status" aria-live="polite">
              <LoaderCircle size="0.9375rem" style={viewStyles.draftingSpinner} />
              {renderDraftingStatus()}
            </div>
          ) : (
            <button type="button" style={formStyles.primaryButton} onClick={() => void buildDebugPanels()}>
              <RefreshCw size="0.875rem" />
              Build Debug
            </button>
          )}
        </div>
        <div style={viewStyles.fieldGrid}>
          <label style={formStyles.field}>
            <span style={formStyles.label}>Generation target</span>
            <select style={formStyles.input} value={generationMode} onChange={(event) => setGenerationMode(event.target.value)}>
              <option value="subtask">Subtask generation</option>
              <option value="initial">Initial goal tree</option>
            </select>
          </label>
          <label style={formStyles.field}>
            <span style={formStyles.label}>Notes</span>
            <input
              style={formStyles.input}
              value={promptNotes}
              onChange={(event) => setPromptNotes(event.target.value)}
              placeholder="Optional prompt/debug notes"
            />
          </label>
        </div>
        <div style={viewStyles.rawViewer}>
          <label style={formStyles.field}>
            <span style={formStyles.label}>Assembled prompt</span>
            <textarea
              style={{ ...formStyles.textareaSmall, minHeight: "9rem" }}
              value={assembledPrompt}
              onChange={(event) => setAssembledPrompt(event.target.value)}
            />
          </label>
          <label style={formStyles.field}>
            <span style={formStyles.label}>Raw generation output</span>
            <textarea
              style={{ ...formStyles.textareaSmall, minHeight: "7rem" }}
              value={rawOutput}
              onChange={(event) => setRawOutput(event.target.value)}
              placeholder="Paste raw output here to test candidate parsing"
            />
          </label>
          <label style={formStyles.field}>
            <span style={formStyles.label}>Parsed candidates</span>
            <pre style={viewStyles.rawOutput}>{parsedCandidates || "No parsed candidates yet."}</pre>
          </label>
          <label style={formStyles.field}>
            <span style={formStyles.label}>Generation errors</span>
            <pre style={viewStyles.rawOutput}>{generationErrors || "No generation errors captured."}</pre>
          </label>
        </div>
      </section>

      {status.error ? <p style={viewStyles.note}>{status.error}</p> : null}
      {status.message ? <p style={viewStyles.note}>{status.message}</p> : null}
    </div>
  );
}

function LibraryView({ activeSubject, backendReady, chatId }) {
  const persona = activeSubject?.key || "";
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [goals, setGoals] = useState([]);
  const [chatBinding, setChatBinding] = useState(null);
  const [includeSuspended, setIncludeSuspended] = useState(true);
  const [railQuery, setRailQuery] = useState("");
  const [collectionDraft, setCollectionDraft] = useState({ mode: "idle", id: "", name: "", description: "", tags: "" });
  const [goalDraft, setGoalDraft] = useState(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentResults, setAssignmentResults] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "", message: "" });

  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) || null;
  const boundTargets = chatBinding?.targets || [];
  const collectionBound = selectedCollection ? isTargetBound(boundTargets, { type: "collection", id: selectedCollection.id }) : false;
  const draftCollectionId = goalDraft?.collectionId || selectedCollectionId;
  const draftCollectionBound = draftCollectionId ? isTargetBound(boundTargets, { type: "collection", id: draftCollectionId }) : false;

  async function loadLibrary(nextCollectionId = selectedCollectionId) {
    if (!backendReady || !persona) {
      setCollections([]);
      setGoals([]);
      setChatBinding(null);
      return;
    }

    setStatus({ loading: true, error: "", message: "" });
    try {
      const collectionResult = await goalCommands.listCollections({ persona });
      const nextCollections = Array.isArray(collectionResult.items) ? collectionResult.items : [];
      const nextSelectedId = nextCollections.some((collection) => collection.id === nextCollectionId)
        ? nextCollectionId
        : nextCollections[0]?.id || "";
      const [goalResult, bindingResult] = await Promise.all([
        nextSelectedId
          ? goalCommands.list({ persona, collection_id: nextSelectedId, include_suspended: includeSuspended })
          : Promise.resolve({ items: [] }),
        chatId ? goalCommands.getChat({ persona, chat_id: chatId }) : Promise.resolve(null),
      ]);

      setCollections(nextCollections);
      setSelectedCollectionId(nextSelectedId);
      setGoals(Array.isArray(goalResult.items) ? goalResult.items : []);
      setChatBinding(bindingResult ? { ...bindingResult, targets: bindingResult.targets || [] } : null);
      setStatus({ loading: false, error: "", message: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not load goal library.", message: "" });
    }
  }

  useEffect(() => {
    setCollections([]);
    setGoals([]);
    setSelectedCollectionId("");
    setGoalDraft(null);
    setCollectionDraft({ mode: "idle", id: "", name: "", description: "", tags: "" });
    loadLibrary("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendReady, persona, chatId, includeSuspended]);

  async function selectCollection(collectionId) {
    setSelectedCollectionId(collectionId);
    setGoalDraft(null);
    await loadLibrary(collectionId);
  }

  async function saveCollection() {
    const name = collectionDraft.name.trim();
    if (!persona || !name) return;

    setStatus({ loading: true, error: "", message: "" });
    try {
      const payload = {
        persona,
        name,
        description: collectionDraft.description.trim(),
        tags: parseTags(collectionDraft.tags),
      };
      const result = collectionDraft.mode === "edit"
        ? await goalCommands.updateCollection({ ...payload, id: collectionDraft.id })
        : await goalCommands.createCollection(payload);
      setCollectionDraft({ mode: "idle", id: "", name: "", description: "", tags: "" });
      await loadLibrary(result.id);
      setStatus({ loading: false, error: "", message: collectionDraft.mode === "edit" ? "Collection updated." : "Collection created." });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not save collection.", message: "" });
    }
  }

  async function deleteCollection(collection) {
    if (!persona || !collection?.id) return;
    setStatus({ loading: true, error: "", message: "" });
    try {
      await goalCommands.deleteCollection({ persona, id: collection.id });
      const nextSelected = collections.find((item) => item.id !== collection.id)?.id || "";
      await loadLibrary(nextSelected);
      setStatus({ loading: false, error: "", message: "Collection deleted." });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not delete collection.", message: "" });
    }
  }

  function startCollectionEdit(collection) {
    setCollectionDraft({
      mode: "edit",
      id: collection.id,
      name: collection.name || "",
      description: collection.description || "",
      tags: tagsToText(collection.tags),
    });
  }

  async function ensureCollection(collectionId) {
    if (collectionId) return collectionId;
    const existing = collections.find((collection) => collection.name?.toLowerCase() === "unsorted");
    if (existing) return existing.id;
    const result = await goalCommands.createCollection({
      persona,
      name: "Unsorted",
      description: "Default collection for goals that are not filed elsewhere.",
      tags: [],
    });
    return result.id;
  }

  async function saveGoal() {
    if (!goalDraft || !persona || !goalDraft.name.trim()) return;
    setStatus({ loading: true, error: "", message: "" });
    try {
      if (goalDraft.mode === "edit") {
        const result = await goalCommands.update({
          persona,
          id: goalDraft.id,
          name: goalDraft.name.trim(),
          description: goalDraft.description.trim(),
          tags: parseTags(goalDraft.tags),
          status: goalDraft.status,
          narrative_state: goalDraft.type === "achievement" ? goalDraft.narrativeState || "pursuing" : null,
          priority: goalDraft.priority,
        });
        setGoals((current) => current.map((goal) => (goal.id === result.id ? result : goal)));
        setGoalDraft(null);
        setStatus({ loading: false, error: "", message: "Goal updated." });
        return;
      }

      const collectionId = await ensureCollection(goalDraft.collectionId);
      const nodes = goalDraft.initialNodes
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text, resolution_mode: "checklist" }));
      const created = await goalCommands.create({
        persona,
        collection_id: collectionId,
        name: goalDraft.name.trim(),
        description: goalDraft.description.trim(),
        tags: parseTags(goalDraft.tags),
        type: goalDraft.type,
        nodes,
      });
      const targetCollectionBound = isTargetBound(boundTargets, { type: "collection", id: collectionId });

      if (goalDraft.assignAfterSave && chatId && !isTargetBound(boundTargets, { type: "goal", id: created.id }) && !targetCollectionBound) {
        const nextBinding = await goalCommands.updateChat({
          persona,
          chat_id: chatId,
          targets: toUpdateTargets([...boundTargets, { type: "goal", id: created.id }]),
        });
        setChatBinding({ ...nextBinding, targets: nextBinding.targets || [] });
      }

      setGoalDraft(null);
      await loadLibrary(collectionId);
      setStatus({ loading: false, error: "", message: "Goal created." });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not save goal.", message: "" });
    }
  }

  function startGoalEdit(goal) {
    setGoalDraft({
      id: goal.id,
      mode: "edit",
      collectionId: selectedCollectionId,
      name: goal.name || "",
      description: goal.description || "",
      tags: tagsToText(goal.tags),
      type: goal.type || "achievement",
      status: goal.status || "active",
      narrativeState: goal.narrative_state || "pursuing",
      priority: Boolean(goal.priority),
      initialNodes: "",
      assignAfterSave: false,
    });
  }

  async function updateGoalMetadata(goal, patch) {
    setStatus({ loading: true, error: "", message: "" });
    try {
      const result = await goalCommands.update({ persona, id: goal.id, ...patch });
      setGoals((current) => current.map((item) => (item.id === result.id ? result : item)));
      setStatus({ loading: false, error: "", message: "Goal updated." });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not update goal.", message: "" });
    }
  }

  async function deleteGoal(goal) {
    if (!persona || !goal?.id) return;
    setStatus({ loading: true, error: "", message: "" });
    try {
      await goalCommands.delete({ persona, id: goal.id });
      await loadLibrary(selectedCollectionId);
      setStatus({ loading: false, error: "", message: "Goal deleted." });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not delete goal.", message: "" });
    }
  }

  async function bindTarget(target) {
    if (!persona || !chatId || !target?.id || isTargetBound(boundTargets, target)) return;
    setStatus({ loading: true, error: "", message: "" });
    try {
      const nextBinding = await goalCommands.updateChat({
        persona,
        chat_id: chatId,
        targets: toUpdateTargets([...boundTargets, target]),
      });
      setChatBinding({ ...nextBinding, targets: nextBinding.targets || [] });
      setAssignmentOpen(false);
      setStatus({ loading: false, error: "", message: "Assigned to current chat." });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not assign target.", message: "" });
    }
  }

  async function searchAssignments() {
    if (!persona) return;
    setStatus({ loading: true, error: "", message: "" });
    try {
      const result = await goalCommands.search({
        persona,
        query: assignmentQuery.trim(),
        include_suspended: includeSuspended,
      });
      setAssignmentResults(Array.isArray(result.items) ? result.items : []);
      setStatus({ loading: false, error: "", message: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not search goal library.", message: "" });
    }
  }

  const visibleCollections = collections.filter((collection) => {
    const query = railQuery.trim().toLowerCase();
    if (!query) return true;
    return `${collection.name} ${collection.description} ${(collection.tags || []).join(" ")}`.toLowerCase().includes(query);
  });

  return (
    <div style={viewStyles.stack}>
      <section style={viewStyles.panel}>
        <div style={viewStyles.badgeRow}>
          <span style={viewStyles.badge}>
            <SubjectIcon mode={activeSubject?.mode} />
            {activeSubject?.label || "No subject"}
          </span>
          <span style={viewStyles.badge}>Chat: {chatId || "Not detected"}</span>
          <span style={{ ...viewStyles.badge, ...(!backendReady ? viewStyles.badgeMuted : null) }}>
            {backendReady ? "Backend ready" : "Backend unavailable"}
          </span>
          <span style={viewStyles.badge}>{boundTargets.length} chat target{boundTargets.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      {!backendReady ? <div style={viewStyles.empty}>Goal backend is unavailable.</div> : null}
      {backendReady && !persona ? <div style={viewStyles.empty}>Choose a subject to manage the library.</div> : null}

      {backendReady && persona ? (
        <section style={viewStyles.libraryLayout}>
          <aside style={viewStyles.libraryRail}>
            <div style={viewStyles.panelHeader}>
              <div>
                <h3 style={viewStyles.title}>Collections</h3>
                <p style={viewStyles.muted}>{collections.length} total</p>
              </div>
              <button
                type="button"
                style={formStyles.iconButton}
                title="Refresh library"
                onClick={() => loadLibrary(selectedCollectionId)}
              >
                <RefreshCw size="0.875rem" style={status.loading ? viewStyles.draftingSpinner : null} />
              </button>
            </div>
            <input
              style={formStyles.input}
              value={railQuery}
              onChange={(event) => setRailQuery(event.target.value)}
              placeholder="Filter collections"
            />
            <div style={viewStyles.scrollStack}>
              {visibleCollections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  style={{
                    ...viewStyles.libraryListButton,
                    ...(collection.id === selectedCollectionId ? viewStyles.libraryListButtonSelected : null),
                  }}
                  onClick={() => selectCollection(collection.id)}
                >
                  <span style={viewStyles.subjectText}>
                    <span style={viewStyles.contextText}>{collection.name}</span>
                    <span style={viewStyles.contextLabel}>{(collection.goal_ids || []).length} goal{(collection.goal_ids || []).length === 1 ? "" : "s"}</span>
                  </span>
                  {isTargetBound(boundTargets, { type: "collection", id: collection.id }) ? <CheckCircle2 size="0.875rem" /> : null}
                </button>
              ))}
              {!visibleCollections.length ? <div style={viewStyles.empty}>No collections found.</div> : null}
            </div>

            <div style={viewStyles.stack}>
              <h4 style={viewStyles.title}>{collectionDraft.mode === "edit" ? "Edit Collection" : "New Collection"}</h4>
              <input
                style={formStyles.input}
                value={collectionDraft.name}
                onChange={(event) => setCollectionDraft((draft) => ({ ...draft, name: event.target.value }))}
                placeholder="Collection name"
              />
              <textarea
                style={formStyles.textareaSmall}
                value={collectionDraft.description}
                onChange={(event) => setCollectionDraft((draft) => ({ ...draft, description: event.target.value }))}
                placeholder="Description"
              />
              <input
                style={formStyles.input}
                value={collectionDraft.tags}
                onChange={(event) => setCollectionDraft((draft) => ({ ...draft, tags: event.target.value }))}
                placeholder="Tags, comma separated"
              />
              <div style={viewStyles.badgeRow}>
                <button type="button" style={formStyles.primaryButton} onClick={saveCollection}>
                  <Save size="0.875rem" />
                  Save
                </button>
                {collectionDraft.mode === "edit" ? (
                  <button
                    type="button"
                    style={formStyles.secondaryButton}
                    onClick={() => setCollectionDraft({ mode: "idle", id: "", name: "", description: "", tags: "" })}
                  >
                    <X size="0.875rem" />
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </aside>

          <div style={viewStyles.libraryDetail}>
            {selectedCollection ? (
              <>
                <div style={viewStyles.panel}>
                  <div style={viewStyles.panelHeader}>
                    <div>
                      <h3 style={viewStyles.title}>{selectedCollection.name}</h3>
                      <p style={viewStyles.muted}>{selectedCollection.description || "No description"}</p>
                    </div>
                    <div style={viewStyles.cardToolbar}>
                      <button type="button" style={formStyles.iconButton} title="Edit collection" onClick={() => startCollectionEdit(selectedCollection)}>
                        <Pencil size="0.875rem" />
                      </button>
                      <button type="button" style={formStyles.iconButton} title="Delete collection" onClick={() => deleteCollection(selectedCollection)}>
                        <Trash2 size="0.875rem" />
                      </button>
                    </div>
                  </div>
                  <div style={viewStyles.badgeRow}>
                    {(selectedCollection.tags || []).map((tag) => <span key={tag} style={viewStyles.badge}>{tag}</span>)}
                    <span style={{ ...viewStyles.badge, ...(collectionBound ? null : viewStyles.badgeMuted) }}>
                      {collectionBound ? "Assigned to chat" : "Not assigned"}
                    </span>
                  </div>
                  <div style={viewStyles.badgeRow}>
                    <button
                      type="button"
                      style={collectionBound ? formStyles.secondaryButton : formStyles.primaryButton}
                      onClick={() => bindTarget({ type: "collection", id: selectedCollection.id })}
                      disabled={!chatId || collectionBound}
                    >
                      <Target size="0.875rem" />
                      {collectionBound ? "Collection assigned" : "Assign collection"}
                    </button>
                    <button type="button" style={formStyles.secondaryButton} onClick={() => setAssignmentOpen(true)} disabled={!chatId}>
                      <Search size="0.875rem" />
                      Assign from search
                    </button>
                    <label style={formStyles.toggleRow}>
                      <input
                        checked={includeSuspended}
                        onChange={(event) => setIncludeSuspended(event.target.checked)}
                        type="checkbox"
                      />
                      Show suspended
                    </label>
                  </div>
                </div>

                <div style={viewStyles.panel}>
                  <div style={viewStyles.panelHeader}>
                    <div>
                      <h3 style={viewStyles.title}>Goals</h3>
                      <p style={viewStyles.muted}>{goals.length} in this collection</p>
                    </div>
                    <button type="button" style={formStyles.primaryButton} onClick={() => setGoalDraft(createBlankGoalDraft(selectedCollection.id))}>
                      <Plus size="0.875rem" />
                      New Goal
                    </button>
                  </div>
                  {goals.length ? (
                    <div style={viewStyles.scrollStack}>
                      {goals.map((goal) => (
                        <GoalLibraryRow
                          boundTargets={boundTargets}
                          collectionBound={collectionBound}
                          goal={goal}
                          key={goal.id}
                          onBind={() => bindTarget({ type: "goal", id: goal.id })}
                          onDelete={() => deleteGoal(goal)}
                          onEdit={() => startGoalEdit(goal)}
                          onTogglePriority={() => updateGoalMetadata(goal, { priority: !goal.priority })}
                          onToggleStatus={() => updateGoalMetadata(goal, { status: goal.status === "suspended" ? "active" : "suspended" })}
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={viewStyles.empty}>No goals in this collection yet.</div>
                  )}
                </div>
              </>
            ) : (
              <div style={viewStyles.empty}>Create a collection to start filing goals for this subject.</div>
            )}

            {goalDraft ? (
              <GoalEditor
                collectionBound={draftCollectionBound}
                collections={collections}
                draft={goalDraft}
                hasChat={Boolean(chatId)}
                onCancel={() => setGoalDraft(null)}
                onChange={setGoalDraft}
                onSave={saveGoal}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {assignmentOpen ? (
        <AssignmentDialog
          boundTargets={boundTargets}
          onBind={bindTarget}
          onClose={() => setAssignmentOpen(false)}
          onQueryChange={setAssignmentQuery}
          onSearch={searchAssignments}
          query={assignmentQuery}
          results={assignmentResults}
        />
      ) : null}

      {status.error ? <p style={viewStyles.note}>{status.error}</p> : null}
      {status.message ? <p style={viewStyles.note}>{status.message}</p> : null}
    </div>
  );
}

function GoalLibraryRow({ boundTargets, collectionBound, goal, onBind, onDelete, onEdit, onTogglePriority, onToggleStatus }) {
  const goalBound = isTargetBound(boundTargets, { type: "goal", id: goal.id });
  return (
    <article style={viewStyles.targetRow}>
      <span style={{ ...viewStyles.badge, ...(goal.priority ? null : viewStyles.badgeMuted) }}>
        {goal.priority ? <Star size="0.75rem" /> : null}
        {goal.type}
      </span>
      <span style={viewStyles.subjectText}>
        <span style={viewStyles.contextText}>{goal.name}</span>
        <span style={viewStyles.contextLabel}>
          {goal.status}{goal.type === "achievement" && goal.narrative_state ? ` / ${goal.narrative_state}` : ""}
        </span>
      </span>
      <span style={viewStyles.cardToolbar}>
        <button type="button" style={formStyles.iconButton} title="Edit goal" onClick={onEdit}>
          <Pencil size="0.8125rem" />
        </button>
        <button type="button" style={formStyles.iconButton} title="Toggle priority" onClick={onTogglePriority}>
          <Star size="0.8125rem" />
        </button>
        <button type="button" style={formStyles.iconButton} title="Suspend or resume" onClick={onToggleStatus}>
          {goal.status === "suspended" ? <RefreshCw size="0.8125rem" /> : <EyeOff size="0.8125rem" />}
        </button>
        <button type="button" style={formStyles.iconButton} title="Assign goal" onClick={onBind} disabled={goalBound || collectionBound}>
          {goalBound || collectionBound ? <CheckCircle2 size="0.8125rem" /> : <Target size="0.8125rem" />}
        </button>
        <button type="button" style={formStyles.iconButton} title="Delete goal" onClick={onDelete}>
          <Trash2 size="0.8125rem" />
        </button>
      </span>
    </article>
  );
}

function GoalEditor({ collectionBound, collections, draft, hasChat, onCancel, onChange, onSave }) {
  return (
    <section style={viewStyles.panel}>
      <div style={viewStyles.panelHeader}>
        <div>
          <h3 style={viewStyles.title}>{draft.mode === "edit" ? "Edit Goal" : "New Goal"}</h3>
          <p style={viewStyles.muted}>
            {collectionBound && draft.mode === "create"
              ? "This collection is assigned to the chat, so new goals here already appear in Tasks."
              : "Save updates the backend goal metadata."}
          </p>
        </div>
        <button type="button" style={formStyles.iconButton} title="Close editor" onClick={onCancel}>
          <X size="0.875rem" />
        </button>
      </div>
      <div style={viewStyles.fieldGrid}>
        <label style={formStyles.field}>
          <span style={formStyles.label}>Name</span>
          <input style={formStyles.input} value={draft.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label style={formStyles.field}>
          <span style={formStyles.label}>Collection</span>
          <select
            disabled={draft.mode === "edit"}
            style={formStyles.input}
            value={draft.collectionId}
            onChange={(event) => onChange((current) => ({ ...current, collectionId: event.target.value }))}
          >
            <option value="">Unsorted</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>{collection.name}</option>
            ))}
          </select>
        </label>
        <label style={formStyles.field}>
          <span style={formStyles.label}>Type</span>
          <select
            disabled={draft.mode === "edit"}
            style={formStyles.input}
            value={draft.type}
            onChange={(event) => onChange((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="achievement">Achievement</option>
            <option value="mastery">Mastery</option>
          </select>
        </label>
        <label style={formStyles.field}>
          <span style={formStyles.label}>Status</span>
          <select style={formStyles.input} value={draft.status} onChange={(event) => onChange((current) => ({ ...current, status: event.target.value }))}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        {draft.type === "achievement" ? (
          <label style={formStyles.field}>
            <span style={formStyles.label}>Narrative state</span>
            <select
              style={formStyles.input}
              value={draft.narrativeState}
              onChange={(event) => onChange((current) => ({ ...current, narrativeState: event.target.value }))}
            >
              <option value="pursuing">Pursuing</option>
              <option value="satisfied">Satisfied</option>
              <option value="failed">Failed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </label>
        ) : null}
        <label style={formStyles.field}>
          <span style={formStyles.label}>Tags</span>
          <input
            style={formStyles.input}
            value={draft.tags}
            onChange={(event) => onChange((current) => ({ ...current, tags: event.target.value }))}
            placeholder="Tags, comma separated"
          />
        </label>
      </div>
      <label style={formStyles.field}>
        <span style={formStyles.label}>Description</span>
        <textarea style={formStyles.textareaSmall} value={draft.description} onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))} />
      </label>
      {draft.mode === "create" ? (
        <label style={formStyles.field}>
          <span style={formStyles.label}>Initial tasks</span>
          <textarea
            style={formStyles.textareaSmall}
            value={draft.initialNodes}
            onChange={(event) => onChange((current) => ({ ...current, initialNodes: event.target.value }))}
            placeholder="One root task per line"
          />
        </label>
      ) : null}
      <div style={viewStyles.badgeRow}>
        <label style={formStyles.toggleRow}>
          <input
            checked={draft.priority}
            onChange={(event) => onChange((current) => ({ ...current, priority: event.target.checked }))}
            type="checkbox"
          />
          Priority
        </label>
        {draft.mode === "create" && hasChat && !collectionBound ? (
          <label style={formStyles.toggleRow}>
            <input
              checked={draft.assignAfterSave}
              onChange={(event) => onChange((current) => ({ ...current, assignAfterSave: event.target.checked }))}
              type="checkbox"
            />
            Assign to current chat after save
          </label>
        ) : null}
      </div>
      <div style={viewStyles.badgeRow}>
        <button type="button" style={formStyles.primaryButton} onClick={onSave}>
          <Save size="0.875rem" />
          Save goal
        </button>
        <button type="button" style={formStyles.secondaryButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function AssignmentDialog({ boundTargets, onBind, onClose, onQueryChange, onSearch, query, results }) {
  return (
    <div style={viewStyles.modalBackdrop}>
      <section style={viewStyles.modalPanel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Assign to Current Chat</h3>
            <p style={viewStyles.muted}>Search collections and goals, then add one target to this chat.</p>
          </div>
          <button type="button" style={formStyles.iconButton} title="Close assignment" onClick={onClose}>
            <X size="0.875rem" />
          </button>
        </div>
        <div style={viewStyles.nodeAddRow}>
          <input style={formStyles.input} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search collections and goals" />
          <button type="button" style={formStyles.iconButton} title="Search" onClick={onSearch}>
            <Search size="0.875rem" />
          </button>
        </div>
        <div style={viewStyles.scrollStack}>
          {results.map((result) => {
            const type = getSearchResultType(result);
            const bound = isTargetBound(boundTargets, { type, id: result.id });
            return (
              <button
                key={`${type}:${result.id}`}
                type="button"
                style={viewStyles.subjectOption}
                onClick={() => onBind({ type, id: result.id })}
                disabled={bound}
              >
                <span style={{ ...viewStyles.badge, ...(type === "collection" ? null : viewStyles.badgeMuted) }}>{type}</span>
                <span style={viewStyles.subjectText}>
                  <span style={viewStyles.contextText}>{result.name}</span>
                  <span style={viewStyles.contextLabel}>
                    {type === "collection" ? `${(result.goal_ids || []).length} goals` : result.status}
                  </span>
                </span>
                {bound ? <CheckCircle2 size="0.875rem" /> : <Target size="0.875rem" />}
              </button>
            );
          })}
          {!results.length ? <div style={viewStyles.empty}>Run a search to find assignable collections and goals.</div> : null}
        </div>
      </section>
    </div>
  );
}

function isTargetBound(targets, target) {
  return targets.some((item) => item.type === target.type && item.id === target.id);
}

function getSearchResultType(result) {
  const rawType = String(result?.result_type || "").toLowerCase();
  if (rawType.includes("collection")) return "collection";
  return "goal";
}

function PhasePanel({ title, description, items }) {
  return (
    <section style={viewStyles.panel}>
      <h3 style={viewStyles.title}>{title}</h3>
      <p style={viewStyles.body}>{description}</p>
      <ul style={viewStyles.cleanList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function SubjectIcon({ mode }) {
  if (mode === "character") return <Users size="0.875rem" />;
  if (mode === "extras") return <Users size="0.875rem" />;
  return <UserRound size="0.875rem" />;
}

function ContextValue({ label, value }) {
  return (
    <div style={viewStyles.contextValue}>
      <span style={viewStyles.contextLabel}>{label}</span>
      <span style={viewStyles.contextText}>{value}</span>
    </div>
  );
}
