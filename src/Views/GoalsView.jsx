import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
} from "@xyflow/react";
import {
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Database,
  EyeOff,
  FolderCog,
  Library,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ScrollText,
  Star,
  Target,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { getBackendBaseUrl, getGoalSchema, goalCommands } from "../API/personaBackend.js";
import { extractionApi } from "../API/extraction.js";
import {
  generate,
  getCharacterDetails,
  getCharacterSummaries,
  getCharacters,
  getConnections,
  getPersonaContext,
  getPersonas,
  getRecentMessages,
  resolveGenerationConnectionId,
} from "../API/marinara.js";
import { makeLorebookEntryPointer } from "../API/lorebooks.js";
import { promptApi } from "../API/prompt.js";
import { loadPersonaHelperSettings, savePersonaHelperSettings } from "../API/settings.js";
import { LorebookSelectModal } from "../Components/LorebookSelectModal.jsx";
import { PromptSelectModal } from "../Components/PromptSelectModal.jsx";
import { StatusSnackbar } from "../Components/StatusSnackbar.jsx";
import { formStyles } from "../Styles/formStyles.js";
import { promptPickerStyles } from "../Styles/promptPickerStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

const SUBJECT_SELECTION_KEY = "persona-helper-goal-subject-by-chat";
const GOAL_PROMPT_KEY = "persona-helper-goal-directive-prompt";
const GOAL_PROMPT_VALIDATION_KEY = "persona-helper-goal-directive-prompt-validation";
const GOAL_PROMPT_OVERRIDES_KEY = "persona-helper-goal-directive-prompt-overrides";
const GOAL_CONTEXT_ENTRIES_KEY = "persona-helper-goal-directive-context-entries";
const GOAL_SHOW_PROMPT_KEY = "persona-helper-goal-show-prompt";
const GOAL_SHOW_GENERATION_OUTPUT_KEY = "persona-helper-goal-show-generation-output";
const GOAL_PROMPT_SYSTEM_TEXT_KEY = "persona-helper-goal-prompt-system-text";
const GOAL_PROMPT_MESSAGE_SET_KEY = "persona-helper-goal-prompt-message-set";
const GOAL_RAW_GENERATION_OUTPUT_KEY = "persona-helper-goal-raw-generation-output";
const GOAL_RAW_GENERATION_THINKING_KEY = "persona-helper-goal-raw-generation-thinking";
const GOAL_INCLUDE_CHAT_HISTORY_KEY = "persona-helper-goal-include-chat-history";
const GOAL_REQUIRED_FIELDS = ["milestone"];
const GOAL_DIRECTIVE_EXTRACTION_FORMAT = "xml";
const GOAL_DIRECTIVE_EXTRACTION_FIELD = "directive";
const AUTHOR_NOTE_DOCUMENT_NAME = "Authors_Note";
const AUTHOR_NOTE_DOCUMENT_SOURCE = "persona-helper-goals";
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
const XYFLOW_STYLE_ID = "persona-helper-xyflow-styles";
const XYFLOW_STYLES = `
.react-flow{direction:ltr;--xy-edge-stroke-default:#555;--xy-edge-stroke-width-default:1.5;--xy-edge-stroke-selected-default:#CCC;--xy-controls-button-background-color-default:#111;--xy-controls-button-background-color-hover-default:#222;--xy-controls-button-color-default:#CCC;--xy-controls-button-color-hover-default:#EEE;--xy-controls-button-border-color-default:#333;--xy-controls-box-shadow-default:0 0 0 1px rgba(51,51,51,.8);--xy-minimap-background-color-default:#111;--xy-minimap-mask-background-color-default:rgba(0,0,0,.55);--xy-minimap-node-background-color-default:#333;--xy-background-color-default:#000;background-color:var(--xy-background-color,var(--xy-background-color-default))}
.react-flow__container{position:absolute;width:100%;height:100%;top:0;left:0}
.react-flow__background{pointer-events:none;z-index:-1}
.react-flow__pane{z-index:1;touch-action:none}
.react-flow__pane.draggable{cursor:grab}.react-flow__pane.dragging{cursor:grabbing}
.react-flow__viewport{transform-origin:0 0;z-index:2;pointer-events:none}
.react-flow__renderer{z-index:4}.react-flow__selection{z-index:6}
.react-flow .react-flow__edges{position:absolute}.react-flow .react-flow__edges svg{overflow:visible;position:absolute;pointer-events:none}
.react-flow__edge{pointer-events:visibleStroke}.react-flow__edge-path{stroke:var(--xy-edge-stroke,var(--xy-edge-stroke-default));stroke-width:var(--xy-edge-stroke-width,var(--xy-edge-stroke-width-default));fill:none}.react-flow__edge.selected .react-flow__edge-path{stroke:var(--xy-edge-stroke-selected,var(--xy-edge-stroke-selected-default))}
.react-flow__arrowhead polyline{stroke:var(--xy-edge-stroke,var(--xy-edge-stroke-default))}.react-flow__arrowhead polyline.arrowclosed{fill:var(--xy-edge-stroke,var(--xy-edge-stroke-default))}
.react-flow__nodes{pointer-events:none;transform-origin:0 0}.react-flow__node{position:absolute;user-select:none;pointer-events:all;transform-origin:0 0;box-sizing:border-box;cursor:default}.react-flow__node.selectable{cursor:pointer}
.react-flow__handle{position:absolute;width:6px;height:6px;min-width:6px;min-height:6px;border:0;border-radius:50%;background:transparent;pointer-events:none}.react-flow__handle-left{left:-3px;top:50%;transform:translateY(-50%)}.react-flow__handle-right{right:-3px;top:50%;transform:translateY(-50%)}
.react-flow__panel{position:absolute;z-index:5;margin:15px}.react-flow__panel.top{top:0}.react-flow__panel.bottom{bottom:0}.react-flow__panel.left{left:0}.react-flow__panel.right{right:0}
.react-flow__controls{display:flex;flex-direction:column;box-shadow:var(--xy-controls-box-shadow,var(--xy-controls-box-shadow-default))}.react-flow__controls-button{display:flex;justify-content:center;align-items:center;height:26px;width:26px;padding:4px;border:0;border-bottom:1px solid var(--xy-controls-button-border-color,var(--xy-controls-button-border-color-default));background:var(--xy-controls-button-background-color,var(--xy-controls-button-background-color-default));color:var(--xy-controls-button-color,var(--xy-controls-button-color-default));cursor:pointer}.react-flow__controls-button:hover{background:var(--xy-controls-button-background-color-hover,var(--xy-controls-button-background-color-hover-default));color:var(--xy-controls-button-color-hover,var(--xy-controls-button-color-hover-default))}.react-flow__controls-button svg{width:100%;max-width:12px;max-height:12px;fill:currentColor}
.react-flow__minimap{background:var(--xy-minimap-background-color,var(--xy-minimap-background-color-default))}.react-flow__minimap-svg{display:block}.react-flow__minimap-mask{fill:var(--xy-minimap-mask-background-color,var(--xy-minimap-mask-background-color-default))}.react-flow__minimap-node{fill:var(--xy-minimap-node-background-color,var(--xy-minimap-node-background-color-default))}
.react-flow__background-pattern.dots{fill:#333}.react-flow__attribution{display:none}
`;

const GOALS_TABS = {
  tasks: {
    icon: ListChecks,
    title: "Milestones",
    description: "Current chat goals, milestone focus, directives, and manual progress controls.",
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
  about: {
    icon: CircleHelp,
    title: "About",
    description: "How goals, milestones, directives, and subject scope fit into play.",
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

function getRecordLabel(record, fallback) {
  return String(
    getRecordDataLabel(record) ||
    record?.label ||
    record?.name ||
    record?.displayName ||
    record?.display_name ||
    record?.title ||
    getRecordDataLabel(record?.raw) ||
    record?.raw?.name ||
    record?.raw?.displayName ||
    record?.raw?.display_name ||
    fallback,
  ).trim();
}

function getRecordAvatarUrl(record) {
  return String(
    record?.avatarUrl ||
    record?.avatar_url ||
    record?.avatarPath ||
    record?.avatar_path ||
    record?.thumbnailUrl ||
    record?.thumbnail_url ||
    record?.raw?.avatarUrl ||
    record?.raw?.avatar_url ||
    record?.raw?.avatarPath ||
    record?.raw?.avatar_path ||
    "",
  ).trim();
}

function getRecordAvatarCrop(record) {
  return record?.avatarCrop || record?.avatar_crop || record?.raw?.avatarCrop || record?.raw?.avatar_crop || null;
}

function getRecordDataLabel(record) {
  try {
    const parsed = typeof record?.data === "string" ? JSON.parse(record.data) : record?.data;
    if (parsed && typeof parsed === "object" && typeof parsed.name === "string" && parsed.name.trim()) {
      return parsed.name.trim();
    }
  } catch {
    return "";
  }
  return "";
}

function findRecordByKey(records, key) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) return null;
  return records.find((record) => {
    const candidates = [
      record?.key,
      record?.id,
      record?.name,
      record?.characterId,
      record?.character_id,
      record?.raw?.id,
      record?.raw?.name,
      record?.raw?.characterId,
      record?.raw?.character_id,
    ];
    return candidates.some((candidate) => String(candidate || "").trim() === normalizedKey);
  }) || null;
}

function getContextSubject(context, personas = []) {
  if (!context.personaId) return null;
  const record = findRecordByKey(personas, context.personaId);
  return {
    mode: "persona",
    key: context.personaId,
    label: getRecordLabel(context.persona, getRecordLabel(record, context.personaId)),
    avatarUrl: getRecordAvatarUrl(context.persona) || getRecordAvatarUrl(record),
    avatarCrop: getRecordAvatarCrop(context.persona) || getRecordAvatarCrop(record),
    source: "marinara",
    current: true,
  };
}

function getContextCharacterSubjects(context, characters = []) {
  const fromRecords = Array.isArray(context.characters)
    ? context.characters.map((character) => {
        const key = String(character?.id || character?.characterId || character?.name || "").trim();
        const record = findRecordByKey(characters, key);
        return {
          mode: "character",
          key,
          label: getRecordLabel(character, getRecordLabel(record, key || "Character")),
          avatarUrl: getRecordAvatarUrl(character) || getRecordAvatarUrl(record),
          avatarCrop: getRecordAvatarCrop(character) || getRecordAvatarCrop(record),
          source: "marinara",
          current: true,
        };
      })
    : [];
  const recordIds = new Set(fromRecords.map((subject) => subject.key));
  const ids = [
    context.characterId,
    ...(Array.isArray(context.characterIds) ? context.characterIds : []),
  ]
    .map((id) => String(id || "").trim())
    .filter((id) => id && !recordIds.has(id))
    .map((id) => {
      const record = findRecordByKey(characters, id);
      return {
        mode: "character",
        key: id,
        label: getRecordLabel(record, id),
        avatarUrl: getRecordAvatarUrl(record),
        avatarCrop: getRecordAvatarCrop(record),
        source: "marinara",
        current: true,
      };
    });

  return [...fromRecords, ...ids].filter((subject) => subject.key);
}

function normalizeAvatarCrop(crop) {
  if (!crop) return null;
  if (typeof crop === "string") {
    try {
      return JSON.parse(crop);
    } catch {
      return null;
    }
  }
  return typeof crop === "object" ? crop : null;
}

function getAvatarCropStyle(crop) {
  const normalized = normalizeAvatarCrop(crop);
  if (!normalized) return {};

  if ("zoom" in normalized) {
    if (normalized.fullImage) {
      return {
        objectFit: "contain",
        transform: `scale(${normalized.zoom}) translate(${normalized.offsetX}%, ${normalized.offsetY}%)`,
      };
    }
    if (normalized.zoom <= 1) return {};
    return {
      transform: `scale(${normalized.zoom}) translate(${normalized.offsetX}%, ${normalized.offsetY}%)`,
    };
  }

  const { srcX, srcY, srcWidth, srcHeight } = normalized;
  if (srcWidth <= 0 || srcHeight <= 0) return {};
  return {
    position: "absolute",
    width: `${100 / srcWidth}%`,
    height: `${100 / srcHeight}%`,
    left: `${(-srcX / srcWidth) * 100}%`,
    top: `${(-srcY / srcHeight) * 100}%`,
    maxWidth: "none",
    maxHeight: "none",
    objectFit: "fill",
  };
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

function readStoredObject(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredObject(key, value) {
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

function readStoredBoolean(key, defaultValue = false) {
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === "true";
}

function writeStoredBoolean(key, value) {
  localStorage.setItem(key, value ? "true" : "false");
}

function writeStoredString(key, value) {
  if (!value) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, value);
}

function readStoredPrompt() {
  return readStoredObject(GOAL_PROMPT_KEY);
}

function writeStoredPrompt(prompt) {
  writeStoredObject(GOAL_PROMPT_KEY, prompt);
}

function readStoredContextEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GOAL_CONTEXT_ENTRIES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry?.id && entry?.lorebookId && entry?.name);
  } catch {
    return [];
  }
}

function writeStoredContextEntries(entries) {
  localStorage.setItem(GOAL_CONTEXT_ENTRIES_KEY, JSON.stringify(entries));
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

function createRequirementMap(prompt) {
  const entriesById = new Map((prompt?.entries || []).map((entry) => [entry.id, entry]));
  const requirementMap = new Map();

  (prompt?.requirements || []).forEach((requirement) => {
    const entry = entriesById.get(requirement.entry_id);
    const entryDefaults = entry?.defaults?.[requirement.kind === "parameter" ? "parameters" : "inputs"] || {};
    const normalized = {
      ...requirement,
      default: requirement.default ?? entryDefaults[requirement.var_name] ?? "",
      sectionName: entry?.section?.name || entry?.label || "Prompt section",
    };
    const current = requirementMap.get(requirement.var_name) || [];
    requirementMap.set(requirement.var_name, [...current, normalized]);
  });

  return requirementMap;
}

function overrideKey(requirement) {
  return `${requirement.entry_id}:${requirement.kind}:${requirement.var_name}`;
}

function makeGoalOverrideRows(prompt, validation) {
  if (!prompt || !validation) return [];
  const requirementMap = createRequirementMap(prompt);
  const requiredFields = new Set(GOAL_REQUIRED_FIELDS);
  const requiredRows = (validation.additional_required_fields || []).map((name) => ({ name, required: true }));
  const optionalRows = (validation.additional_optional_fields || []).map((name) => ({ name, required: false }));

  return [...requiredRows, ...optionalRows]
    .filter((row) => !requiredFields.has(row.name))
    .flatMap((row) => {
      const requirements = requirementMap.get(row.name) || [{ var_name: row.name, kind: "input", entry_id: "", default: "" }];
      return requirements.map((requirement) => ({
        ...row,
        id: overrideKey(requirement),
        entryId: requirement.entry_id,
        kind: requirement.kind || "input",
        defaultValue: requirement.default || "",
        sectionName: requirement.sectionName || "Prompt section",
      }));
    });
}

function makeGoalRows(prompt, validation) {
  if (!prompt || !validation) return [];
  const requirementMap = createRequirementMap(prompt);

  return GOAL_REQUIRED_FIELDS.flatMap((name) => {
    const requirements = requirementMap.get(name) || [];
    return requirements.map((requirement) => ({
      name,
      id: overrideKey(requirement),
      entryId: requirement.entry_id,
      kind: requirement.kind || "input",
    }));
  });
}

function createPromptContractSummary(prompt) {
  if (!prompt) return null;
  const fieldNames = new Set((prompt.requirements || []).map((requirement) => requirement.var_name).filter(Boolean));
  const additional = new Map();

  (prompt.requirements || []).forEach((requirement) => {
    if (!requirement.var_name || GOAL_REQUIRED_FIELDS.includes(requirement.var_name)) return;
    const current = additional.get(requirement.var_name);
    additional.set(requirement.var_name, {
      required: current?.required || requirement.default === null,
    });
  });

  const missingFields = GOAL_REQUIRED_FIELDS.filter((field) => !fieldNames.has(field));
  const additionalRequired = [];
  const additionalOptional = [];

  additional.forEach((value, field) => {
    if (value.required) additionalRequired.push(field);
    else additionalOptional.push(field);
  });

  return {
    valid: missingFields.length === 0,
    missing_fields: missingFields,
    additional_required_fields: additionalRequired,
    additional_optional_fields: additionalOptional,
    available_fields: [...fieldNames],
  };
}

function createDefaultOverrides(prompt, validation, current = {}) {
  return Object.fromEntries(
    makeGoalOverrideRows(prompt, validation).map((row) => [row.id, current[row.id] ?? current[row.name] ?? row.defaultValue ?? ""]),
  );
}

function escapeDocumentContent(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeDocumentAttribute(value) {
  return escapeDocumentContent(value).replace(/"/g, "&quot;");
}

function wrapContextDocuments(entries) {
  if (!entries.length) return "";
  return `<additional_context>\n${entries
    .map((entry, index) => {
      const name = escapeDocumentAttribute(entry.name || `Document ${index + 1}`);
      const source = escapeDocumentAttribute(entry.lorebookName || entry.lorebookId || "lorebook");
      return `  <document index="${index + 1}" name="${name}" source="${source}">\n${escapeDocumentContent(entry.content || "")}\n  </document>`;
    })
    .join("\n\n")}\n</additional_context>`;
}

function wrapAuthorNoteDocument(notes) {
  const trimmed = String(notes || "").trim();
  if (!trimmed) return "";
  return `<additional_context>\n  <document index="1" name="${AUTHOR_NOTE_DOCUMENT_NAME}" source="${AUTHOR_NOTE_DOCUMENT_SOURCE}">\n${escapeDocumentContent(trimmed)}\n  </document>\n</additional_context>`;
}

function wrapChatHistory(messages) {
  if (!messages.length) return "";
  return `<chat_history>\n${messages
    .map((message, index) => {
      const role = escapeDocumentAttribute(message.role || "message");
      return `  <message index="${index + 1}" role="${role}">\n${escapeDocumentContent(message.content || "")}\n  </message>`;
    })
    .join("\n\n")}\n</chat_history>`;
}

function stitchSelectedPromptText(prompt) {
  if (!prompt?.entries?.length) return "";
  return prompt.entries
    .filter((entry) => entry.enabled !== false)
    .map((entry) => entry.section?.body || "")
    .filter((body) => body.trim())
    .join("\n\n");
}

function messageName(value) {
  const normalized = value.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 64);
  return normalized || undefined;
}

function buildDirectiveGenerationContext({ activeSubject, chatId, goal, milestone, notes }) {
  return [
    `Subject: ${activeSubject?.label || "Not selected"}`,
    `Backend persona namespace: ${activeSubject?.key || "not-selected"}`,
    `Chat ID: ${chatId || "not-detected"}`,
    `Goal: ${goal?.name || "Untitled goal"}`,
    `Milestone: ${getNodeText(milestone) || "Untitled milestone"}`,
    "",
    "Generate candidate directives under this milestone.",
    "Directives are reviewable affordances, requirements, cautions, actions, or constraints that move toward or away from the milestone.",
    "Do not assume the candidates are final. The player will edit and approve them before they are stored.",
    notes?.trim() ? `\nNotes:\n${notes.trim()}` : "",
  ].filter(Boolean).join("\n");
}

function buildPromptMessageSet({ activeSubject, chatId, contextEntries, extractionPrompt = "", goal, includeChatHistory = true, milestone, notes = "", systemPrompt }) {
  const attachedDocuments = wrapContextDocuments(contextEntries);
  const authorNote = wrapAuthorNoteDocument(notes);
  const requestContext = buildDirectiveGenerationContext({ activeSubject, chatId, goal, milestone, notes });

  return JSON.stringify(
    [
      {
        block: "chat_history",
        role: "user",
        content: includeChatHistory
          ? "Recent chat messages from the current chat will be inserted here when available."
          : "Chat history is disabled for this directive generation run.",
      },
      {
        block: "attached_documents",
        role: "user",
        content: attachedDocuments || "<additional_context>...user attached documents...</additional_context>",
      },
      {
        block: "system_prompt",
        role: "system",
        content: systemPrompt.trim() || "Backend prompt output will be inserted here.",
      },
      {
        block: "authors_notes",
        role: "user",
        content: authorNote || "<additional_context><document name=\"Authors_Note\">...</document></additional_context>",
      },
      {
        block: "generation_context",
        role: "user",
        content: requestContext || "Directive generation context will be inserted here.",
      },
      {
        block: "extraction_prompt",
        role: "user",
        content: extractionPrompt.trim() || `${GOAL_DIRECTIVE_EXTRACTION_FORMAT}:${GOAL_DIRECTIVE_EXTRACTION_FIELD}`,
      },
    ],
    null,
    2,
  );
}

function buildGenerationMessages({ activeSubject, chatHistory = "", chatId, contextEntries, extractionPrompt = "", goal, milestone, notes = "", systemPrompt }) {
  const attachedDocuments = wrapContextDocuments(contextEntries);
  const authorNote = wrapAuthorNoteDocument(notes);
  const requestContext = buildDirectiveGenerationContext({ activeSubject, chatId, goal, milestone, notes });
  return [
    ...(chatHistory ? [{ role: "user", content: chatHistory, name: messageName("Chat History") }] : []),
    ...(attachedDocuments ? [{ role: "user", content: attachedDocuments, name: messageName("Attached Documents") }] : []),
    ...(systemPrompt.trim() ? [{ role: "system", content: systemPrompt.trim(), name: messageName("Persona Helper Goals") }] : []),
    ...(authorNote ? [{ role: "user", content: authorNote, name: messageName("Authors Note") }] : []),
    { role: "user", content: requestContext, name: messageName("Directive Context") },
    {
      role: "user",
      content: extractionPrompt.trim() || "Return concise directives as separate XML items.",
      name: messageName("Extraction Prompt"),
    },
  ];
}

function buildGoalGenerationContext({ milestone, prompt, validation, promptOverrides }) {
  const goalValues = {
    milestone: getNodeText(milestone),
  };
  const overrides = {};

  [...makeGoalRows(prompt, validation), ...makeGoalOverrideRows(prompt, validation)].forEach((row) => {
    if (!row.entryId) return;
    const value = GOAL_REQUIRED_FIELDS.includes(row.name) ? goalValues[row.name] : (promptOverrides[row.id] ?? "");
    if (!value.trim()) return;
    const kind = row.kind === "parameter" ? "parameters" : "inputs";
    overrides[row.entryId] = {
      ...(overrides[row.entryId] || {}),
      [kind]: {
        ...(overrides[row.entryId]?.[kind] || {}),
        [row.name]: value,
      },
    };
  });

  return { overrides };
}

function optionalFloat(value) {
  if (!String(value || "").trim()) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalInt(value) {
  if (!String(value || "").trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function generationParameters(settings) {
  return {
    maxTokens: optionalInt(settings.generationMaxTokens) ?? 1024,
    ...(optionalFloat(settings.generationTemperature) !== undefined ? { temperature: optionalFloat(settings.generationTemperature) } : {}),
    ...(optionalFloat(settings.generationTopP) !== undefined ? { topP: optionalFloat(settings.generationTopP) } : {}),
    ...(optionalInt(settings.generationTopK) !== undefined ? { topK: optionalInt(settings.generationTopK) } : {}),
    ...(optionalFloat(settings.generationFrequencyPenalty) !== undefined
      ? { frequencyPenalty: optionalFloat(settings.generationFrequencyPenalty) }
      : {}),
    ...(optionalFloat(settings.generationPresencePenalty) !== undefined
      ? { presencePenalty: optionalFloat(settings.generationPresencePenalty) }
      : {}),
  };
}

function chatHistoryLimit(settings) {
  const parsed = optionalInt(settings.chatHistoryLimit);
  if (parsed === undefined) return 20;
  return Math.min(200, Math.max(0, parsed));
}

async function getGoalDirectiveExtractionPrompt() {
  return extractionApi.getPrompt(GOAL_DIRECTIVE_EXTRACTION_FORMAT, GOAL_DIRECTIVE_EXTRACTION_FIELD);
}

async function getCurrentChatHistory(chatId, settings) {
  const limit = chatHistoryLimit(settings);
  if (!chatId || !limit) return "";
  try {
    const messages = await getRecentMessages(chatId, limit);
    return wrapChatHistory(messages);
  } catch (err) {
    console.warn("[Persona Helper] Could not load current chat history.", err);
    return "";
  }
}

async function parseGeneratedDirectives(output) {
  const extracted = await extractionApi.parse(GOAL_DIRECTIVE_EXTRACTION_FORMAT, GOAL_DIRECTIVE_EXTRACTION_FIELD, output, true);
  return extracted.slice(0, 24);
}

function parseDirectiveOutput(output) {
  return parseCandidateLines(output).map((item) => item.text).slice(0, 24);
}

function createDirectiveCandidate(text = "", source = "generated") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    selected: true,
    text,
    source,
    resolutionMode: "checklist",
    target: 1,
  };
}

function serializeDirectiveCandidate(candidate) {
  return serializeLiveNodeDraft({
    text: candidate.text,
    resolutionMode: candidate.resolutionMode,
    target: candidate.target,
  });
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
    initialNodes: [],
    assignAfterSave: false,
  };
}

function createTaskDraft(text = "") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    resolutionMode: "checklist",
    target: 1,
    expanded: true,
    children: [],
  };
}

function serializeTaskDrafts(nodes = []) {
  return (Array.isArray(nodes) ? nodes : [])
    .map((node) => ({
      text: String(node.text || "").trim(),
      resolution_mode: node.resolutionMode || "checklist",
      ...(node.resolutionMode === "accumulation" ? { target: Math.max(1, Number(node.target) || 1) } : {}),
      children: serializeTaskDrafts(node.children || []),
    }))
    .filter((node) => node.text);
}

function filterCompletedNodes(nodes, hideCompleted) {
  if (!hideCompleted) return nodes;
  return nodes
    .map((node) => {
      const children = filterCompletedNodes(node.children || [], hideCompleted);
      if (isNodeDone(node) && children.length === 0) return null;
      return { ...node, children };
    })
    .filter(Boolean);
}

function isNodeDone(node) {
  return node?.state === "done" || node?.state === "completed";
}

function getNodeText(node) {
  return String(node?.text || node?.name || "").trim();
}

function getNodeMode(node) {
  return node?.resolution_mode || node?.resolutionMode || "checklist";
}

function getNodeProgress(node) {
  return Math.max(0, Number(node?.progress) || 0);
}

function getNodeTarget(node) {
  return Math.max(1, Number(node?.target) || 1);
}

function getNodePathLabel(path = []) {
  return path
    .map((node, index) => {
      if (index === 0) return getNodeText(node) || node?.id || "Root";
      return node?.id || getNodeText(node) || "unknown";
    })
    .join(" / ");
}

function createLiveNodeDraft() {
  return {
    text: "",
    resolutionMode: "checklist",
    target: 1,
  };
}

function serializeLiveNodeDraft(draft) {
  const resolutionMode = draft?.resolutionMode || "checklist";
  return {
    text: String(draft?.text || "").trim(),
    resolution_mode: resolutionMode,
    ...(resolutionMode === "accumulation" ? { target: getNodeTarget(draft) } : {}),
  };
}

function findGoalNode(nodes = [], id, parentId = null, path = []) {
  for (const node of nodes) {
    const nextPath = [...path, node];
    if (node.id === id) return { node, parentId, path: nextPath };
    const childMatch = findGoalNode(node.children || [], id, node.id, nextPath);
    if (childMatch) return childMatch;
  }
  return null;
}

function countDirectChildren(node) {
  return Array.isArray(node?.children) ? node.children.length : 0;
}

function useXyflowStyles() {
  useEffect(() => {
    if (document.getElementById(XYFLOW_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = XYFLOW_STYLE_ID;
    style.textContent = XYFLOW_STYLES;
    document.head.appendChild(style);
  }, []);
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
    setSubjectState((current) => ({ ...current, loading: true, error: "" }));
    const contextCharacterIds = [
      context.characterId,
      ...(Array.isArray(context.characterIds) ? context.characterIds : []),
    ].filter(Boolean);

    Promise.allSettled([getPersonas(), getCharacters(), getCharacterSummaries(contextCharacterIds), getCharacterDetails(contextCharacterIds)])
      .then(([personasResult, charactersResult, contextSummariesResult, contextCharactersResult]) => {
        if (!active) return;
        const personas = personasResult.status === "fulfilled" ? personasResult.value : [];
        const characters = charactersResult.status === "fulfilled" ? charactersResult.value : [];
        const fetchedContextSummaries = contextSummariesResult.status === "fulfilled" ? contextSummariesResult.value : [];
        const fetchedContextCharacters = contextCharactersResult.status === "fulfilled" ? contextCharactersResult.value : [];
        const characterRecords = dedupeSubjects([...fetchedContextSummaries, ...fetchedContextCharacters, ...characters]);
        const contextSubject = getContextSubject(context, personas);
        const contextCharacters = getContextCharacterSubjects(context, characterRecords);
        const options = dedupeSubjects([contextSubject, ...contextCharacters, ...personas, ...characterRecords, extrasSubject].filter(Boolean));
        const storedKey = context.chatId ? loadSubjectSelections()[context.chatId] : "";
        const fallbackKey = contextSubject?.key || options[0]?.key || "";
        const activeKey = options.some((subject) => subject.key === storedKey) ? storedKey : fallbackKey;
        const loadError = [personasResult, charactersResult, contextSummariesResult, contextCharactersResult]
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
        const contextSubject = getContextSubject(context);
        const contextCharacters = getContextCharacterSubjects(context);
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

  if (tab === "setup" || tab === "about") {
    return (
      <div style={viewStyles.stack}>
        <GoalsHeader tab={tab} />
        {tab === "setup" ? (
          <SetupView
            activeSubject={activeSubject}
            backendStatus={backendStatus}
            context={context}
            contextStatus={contextStatus}
            subjectState={subjectState}
          />
        ) : (
          <GoalsAboutView />
        )}
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
          subjectOptions={subjectState.options}
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

function GoalsAboutView() {
  return (
    <div style={viewStyles.stack}>
      <section style={viewStyles.panel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Purpose</h3>
            <p style={viewStyles.muted}>Goals make durable intent visible for the current subject and chat.</p>
          </div>
          <span style={viewStyles.badge}>
            <Target size="0.875rem" />
          </span>
        </div>
        <div style={viewStyles.list}>
          <p style={viewStyles.body}>Use Goals to capture what a persona, character, or extras group is trying to accomplish.</p>
          <p style={viewStyles.body}>The Milestones view narrows that intent into the part of the tree that matters right now, so the player can track progress without staring at the whole structure.</p>
        </div>
      </section>

      <section style={viewStyles.grid}>
        <article style={viewStyles.panel}>
          <div style={viewStyles.panelHeader}>
            <h3 style={viewStyles.title}>Milestones</h3>
            <span style={viewStyles.badge}>
              <Star size="0.875rem" />
            </span>
          </div>
          <div style={viewStyles.list}>
            <p style={viewStyles.body}>Milestones are meaningful movement toward a goal, not necessarily ordered steps.</p>
            <p style={viewStyles.body}>A milestone can represent influence gained, a risk contained, a relationship changed, or a condition satisfied.</p>
          </div>
        </article>

        <article style={viewStyles.panel}>
          <div style={viewStyles.panelHeader}>
            <h3 style={viewStyles.title}>Directives</h3>
            <span style={viewStyles.badge}>
              <ListChecks size="0.875rem" />
            </span>
          </div>
          <div style={viewStyles.list}>
            <p style={viewStyles.body}>Directives describe actions, requirements, opportunities, constraints, and things to avoid.</p>
            <p style={viewStyles.body}>They can move the subject toward a milestone or keep them from undermining it.</p>
          </div>
        </article>
      </section>

      <section style={viewStyles.panel}>
        <div style={viewStyles.panelHeader}>
          <h3 style={viewStyles.title}>Scope</h3>
          <span style={viewStyles.badge}>
            <Users size="0.875rem" />
          </span>
        </div>
        <div style={viewStyles.list}>
          <p style={viewStyles.body}>Every goal tree belongs to a subject namespace and can be assigned to the current chat.</p>
          <p style={viewStyles.body}>Library is for finding, creating, duplicating, and assigning goal structures. Milestones is for the active chat view and contextual cleanup.</p>
        </div>
      </section>
    </div>
  );
}

function SubjectSwitcher({ activeSubject, context, onSelect, setSubjectState, subjectState }) {
  return (
    <section style={viewStyles.panel}>
      <button
        type="button"
        style={viewStyles.disclosureButtonSmall}
        onClick={() => setSubjectState((current) => ({ ...current, expanded: !current.expanded }))}
      >
        <span style={viewStyles.inlineTitle}>
          {subjectState.expanded ? <ChevronDown size="0.875rem" /> : <ChevronRight size="0.875rem" />}
          <SubjectIcon subject={activeSubject} />
          {activeSubject?.label || "Choose subject"}
        </span>
        <span style={viewStyles.muted}>{context.chatId ? "Current chat" : "No chat"}</span>
      </button>
      {subjectState.expanded ? (
        <SubjectPickerDialog
          activeKey={activeSubject?.key || ""}
          error={subjectState.error}
          onClose={() => setSubjectState((current) => ({ ...current, expanded: false, query: "" }))}
          onQueryChange={(query) => setSubjectState((current) => ({ ...current, query }))}
          onSelect={onSelect}
          query={subjectState.query}
          subjects={subjectState.options}
          title="Choose Subject"
        />
      ) : null}
    </section>
  );
}

function SubjectPickerDialog({ activeKey, error, onClose, onQueryChange, onSelect, query, subjects, title }) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const visibleSubjects = subjects.filter((subject) => {
    if (!normalizedQuery) return true;
    return `${subject.label} ${subject.key} ${subject.mode} ${subject.source}`.toLowerCase().includes(normalizedQuery);
  });

  return (
    <div style={viewStyles.modalBackdrop}>
      <section style={viewStyles.modalPanel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>{title}</h3>
            <p style={viewStyles.muted}>{subjects.length} available subject{subjects.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" style={formStyles.iconButton} title="Close subject picker" onClick={onClose}>
            <X size="0.875rem" />
          </button>
        </div>
        <input
          autoFocus
          style={formStyles.input}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search personas, characters, extras"
        />
        {error ? <p style={viewStyles.note}>{error}</p> : null}
        <div style={viewStyles.subjectCardGrid}>
          {visibleSubjects.map((subject) => {
            const selected = subject.key === activeKey;
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
                <SubjectIcon subject={subject} />
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
      </section>
    </div>
  );
}

function TasksView({ activeSubject, backendReady, chatId, onOpenLibrary }) {
  const [binding, setBinding] = useState(null);
  const [scopeId, setScopeId] = useState("all");
  const [groups, setGroups] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [addDrafts, setAddDrafts] = useState({});
  const [focusedNodeIds, setFocusedNodeIds] = useState({});
  const [mapGoal, setMapGoal] = useState(null);
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const [deleteNodeDraft, setDeleteNodeDraft] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(() => readStoredPrompt());
  const [promptValidation, setPromptValidation] = useState(() => readStoredObject(GOAL_PROMPT_VALIDATION_KEY));
  const [promptOverrides, setPromptOverrides] = useState(() => readStoredObject(GOAL_PROMPT_OVERRIDES_KEY) || {});
  const [contextEntries, setContextEntries] = useState(() => readStoredContextEntries());
  const [showPrompt] = useState(() => readStoredBoolean(GOAL_SHOW_PROMPT_KEY));
  const [showGenerationOutput] = useState(() => readStoredBoolean(GOAL_SHOW_GENERATION_OUTPUT_KEY));
  const [capturedSystemPrompt, setCapturedSystemPrompt] = useState(() => readStoredString(GOAL_PROMPT_SYSTEM_TEXT_KEY));
  const [capturedMessageSet, setCapturedMessageSet] = useState(() => readStoredString(GOAL_PROMPT_MESSAGE_SET_KEY));
  const [rawGenerationOutput, setRawGenerationOutput] = useState(() => readStoredString(GOAL_RAW_GENERATION_OUTPUT_KEY));
  const [rawGenerationThinking, setRawGenerationThinking] = useState(() => readStoredString(GOAL_RAW_GENERATION_THINKING_KEY));
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [promptPreviewTab, setPromptPreviewTab] = useState("system");
  const [rawGenerationOpen, setRawGenerationOpen] = useState(false);
  const [rawGenerationTab, setRawGenerationTab] = useState("output");
  const [directiveDraft, setDirectiveDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [draftingStatus, setDraftingStatus] = useState(() => randomGoalDraftingStatus());
  const [draftingPulse, setDraftingPulse] = useState(0);
  const [settings, setSettings] = useState(() => loadPersonaHelperSettings());
  const [connections, setConnections] = useState([]);
  const [includeChatHistory, setIncludeChatHistory] = useState(() => readStoredBoolean(GOAL_INCLUDE_CHAT_HISTORY_KEY, true));
  const [message, setMessage] = useState("");

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
      setStatus({ loading: false, error: error?.message || "Could not load milestones." });
    }
  }

  function showMessage(nextMessage) {
    setMessage("");
    window.setTimeout(() => setMessage(nextMessage), 0);
  }

  function updateGenerationSettings(patch) {
    setSettings((current) => savePersonaHelperSettings({ ...current, ...patch }));
  }

  function updateIncludeChatHistory(nextValue) {
    setIncludeChatHistory(nextValue);
    writeStoredBoolean(GOAL_INCLUDE_CHAT_HISTORY_KEY, nextValue);
  }

  useEffect(() => {
    setScopeId("all");
    setGroups([]);
    setBinding(null);
    setFocusedNodeIds({});
    setMapGoal(null);
    loadTasks("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendReady, persona, chatId]);

  useEffect(() => {
    const onSettingsChange = () => setSettings(loadPersonaHelperSettings());
    window.addEventListener("persona-helper-settings-change", onSettingsChange);
    return () => window.removeEventListener("persona-helper-settings-change", onSettingsChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getConnections()
      .then((items) => {
        if (!cancelled) setConnections(items);
      })
      .catch((error) => {
        if (!cancelled) showMessage(error?.message || "Could not load generation connections.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    writeStoredPrompt(selectedPrompt);
  }, [selectedPrompt]);

  useEffect(() => {
    writeStoredObject(GOAL_PROMPT_VALIDATION_KEY, promptValidation);
  }, [promptValidation]);

  useEffect(() => {
    writeStoredObject(GOAL_PROMPT_OVERRIDES_KEY, promptOverrides);
  }, [promptOverrides]);

  useEffect(() => {
    writeStoredContextEntries(contextEntries);
  }, [contextEntries]);

  useEffect(() => {
    writeStoredString(GOAL_PROMPT_SYSTEM_TEXT_KEY, capturedSystemPrompt);
  }, [capturedSystemPrompt]);

  useEffect(() => {
    writeStoredString(GOAL_PROMPT_MESSAGE_SET_KEY, capturedMessageSet);
  }, [capturedMessageSet]);

  useEffect(() => {
    writeStoredString(GOAL_RAW_GENERATION_OUTPUT_KEY, rawGenerationOutput);
  }, [rawGenerationOutput]);

  useEffect(() => {
    writeStoredString(GOAL_RAW_GENERATION_THINKING_KEY, rawGenerationThinking);
  }, [rawGenerationThinking]);

  useEffect(() => {
    if (!selectedPrompt) return;
    const summary = createPromptContractSummary(selectedPrompt);
    setPromptValidation(summary);
    setPromptOverrides((current) => createDefaultOverrides(selectedPrompt, summary, current));
  }, [selectedPrompt]);

  useEffect(() => {
    if (!generating) return undefined;
    setDraftingStatus((current) => randomGoalDraftingStatus(current));
    setDraftingPulse(0);
    const interval = window.setInterval(() => {
      setDraftingStatus((current) => randomGoalDraftingStatus(current));
    }, 1400);
    const pulseInterval = window.setInterval(() => {
      setDraftingPulse((current) => current + 1);
    }, 260);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(pulseInterval);
    };
  }, [generating]);

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
      setStatus({ loading: false, error: error?.message || "Could not update milestone." });
    }
  }

  async function deleteNode(goal, node) {
    if (!goal?.id || !node?.id) return;
    const match = findGoalNode(goal.nodes || [], node.id);
    setStatus({ loading: true, error: "" });
    try {
      const result = await goalCommands.deleteNode({
        persona,
        goal_id: goal.id,
        node_id: node.id,
      });
      setGroups((current) => replaceGoalInGroups(current, result));
      setFocusedNodeIds((current) => ({ ...current, [goal.id]: match?.parentId || "" }));
      setDeleteNodeDraft(null);
      setStatus({ loading: false, error: "" });
      showMessage("Milestone removed.");
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not remove milestone." });
    }
  }

  async function addChild(goal, parentId) {
    const draftKey = `${goal.id}:${parentId || "root"}`;
    const draft = addDrafts[draftKey] || createLiveNodeDraft();
    const nodeDraft = serializeLiveNodeDraft(draft);
    if (!nodeDraft.text) return;
    setStatus({ loading: true, error: "" });
    try {
      const result = await goalCommands.addNodes({
        persona,
        goal_id: goal.id,
        parent_id: parentId || null,
        nodes: [nodeDraft],
      });
      setAddDrafts((current) => ({ ...current, [draftKey]: createLiveNodeDraft() }));
      setGroups((current) => replaceGoalInGroups(current, result));
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not add directive." });
    }
  }

  async function addGeneratedDirectives(draft = directiveDraft) {
    if (!draft?.goal?.id || !draft?.parent?.id) return;
    const nodes = (draft.candidates || [])
      .filter((candidate) => candidate.selected)
      .map(serializeDirectiveCandidate)
      .filter((node) => node.text);
    if (!nodes.length) {
      showMessage("Select at least one directive to add.");
      return;
    }

    setStatus({ loading: true, error: "" });
    try {
      const result = await goalCommands.addNodes({
        persona,
        goal_id: draft.goal.id,
        parent_id: draft.parent.id,
        nodes,
      });
      setGroups((current) => replaceGoalInGroups(current, result));
      setDirectiveDraft(null);
      setStatus({ loading: false, error: "" });
      showMessage(`${nodes.length} directive${nodes.length === 1 ? "" : "s"} added.`);
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not add generated directives." });
    }
  }

  function openDirectiveDraft(goal, parent) {
    if (!selectedPrompt?.id) {
      showMessage("Choose a directive prompt in Setup first.");
      return;
    }
    setDirectiveDraft({
      goal,
      parent,
      notes: "",
      candidates: [],
      usedExtractor: true,
    });
  }

  async function executeDirectivePrompt(milestone) {
    if (!selectedPrompt?.id) throw new Error("Choose a directive prompt in Setup first.");

    const validation = await promptApi.validateContract(selectedPrompt.id, GOAL_REQUIRED_FIELDS);
    setPromptValidation(validation);
    if (!validation.valid) {
      setSelectedPrompt(null);
      setPromptOverrides({});
      throw new Error("Selected prompt no longer matches the directive contract.");
    }

    const request = buildGoalGenerationContext({
      milestone,
      prompt: selectedPrompt,
      validation,
      promptOverrides,
    });
    const execution = await promptApi.execute({
      id: selectedPrompt.id,
      ...(Object.keys(request.overrides).length ? { overrides: request.overrides } : {}),
    });
    return execution.text.trim();
  }

  async function generateDirectiveDrafts(targetDraft = directiveDraft) {
    if (!targetDraft?.parent) return;
    setGenerating(true);
    try {
      const systemPrompt = await executeDirectivePrompt(targetDraft.parent);
      if (!systemPrompt.trim()) return;

      const extractionPrompt = await getGoalDirectiveExtractionPrompt();
      const chatHistory = includeChatHistory ? await getCurrentChatHistory(chatId, settings) : "";
      const messages = buildGenerationMessages({
        activeSubject,
        chatHistory,
        chatId,
        contextEntries,
        extractionPrompt,
        goal: targetDraft.goal,
        milestone: targetDraft.parent,
        notes: targetDraft.notes,
        systemPrompt,
      });
      const connection = await resolveGenerationConnectionId(settings.preferredConnectionId, settings.allowConnectionFallback);
      const generation = await generate(connection.id, messages, generationParameters(settings));
      const trimmedOutput = generation.content.trim();
      const trimmedThinking = generation.thinking.trim();
      let directiveLines = [];
      let usedExtractor = true;
      try {
        directiveLines = await parseGeneratedDirectives(trimmedOutput);
      } catch (err) {
        usedExtractor = false;
        console.warn("[Persona Helper] Directive extraction parse failed; using local parser.", err);
        directiveLines = parseDirectiveOutput(trimmedOutput);
      }
      const candidates = directiveLines.map((line) => createDirectiveCandidate(line, usedExtractor ? "extracted" : "generated"));

      setCapturedSystemPrompt(systemPrompt);
      setCapturedMessageSet(JSON.stringify(messages, null, 2));
      setRawGenerationOutput(trimmedOutput);
      setRawGenerationThinking(trimmedThinking);
      setPromptPreviewOpen(true);
      setPromptPreviewTab("system");
      setRawGenerationOpen(true);
      setRawGenerationTab("output");
      setDirectiveDraft((current) => ({
        ...(current || targetDraft),
        candidates,
        usedExtractor,
      }));
      showMessage(
        candidates.length
          ? `${usedExtractor ? "Extracted" : "Generated"} ${candidates.length} directive${candidates.length === 1 ? "" : "s"} with ${connection.label}.`
          : "Generation returned no parsed directives.",
      );
    } catch (error) {
      showMessage(error?.message || "Could not generate directives.");
    } finally {
      setGenerating(false);
    }
  }

  function attachContextEntry(entry) {
    setContextEntries((current) => {
      const pointer = makeLorebookEntryPointer(entry);
      if (current.some((item) => makeLorebookEntryPointer(item) === pointer)) return current;
      return [...current, entry];
    });
    showMessage("Context attached.");
  }

  function removeContextEntry(entry) {
    const pointer = makeLorebookEntryPointer(entry);
    setContextEntries((current) => current.filter((item) => makeLorebookEntryPointer(item) !== pointer));
    showMessage("Context removed.");
  }

  function focusNode(goal, nodeId) {
    setFocusedNodeIds((current) => ({ ...current, [goal.id]: nodeId || "" }));
  }

  async function openFullTree(goal) {
    setStatus({ loading: true, error: "" });
    try {
      const result = await goalCommands.get({ persona, id: goal.id });
      setGroups((current) => replaceGoalInGroups(current, result));
      setMapGoal(result);
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

  function renderPromptPreview() {
    if (!showPrompt) return null;
    const promptViewerText =
      promptPreviewTab === "messages"
        ? capturedMessageSet || "No message set captured yet."
        : capturedSystemPrompt || stitchSelectedPromptText(selectedPrompt) || "No backend prompt captured yet.";

    return (
      <section style={viewStyles.panel}>
        <button
          type="button"
          style={viewStyles.disclosureButtonSmall}
          aria-expanded={promptPreviewOpen}
          onClick={() => setPromptPreviewOpen((value) => !value)}
        >
          <span>Prompt Preview</span>
          {promptPreviewOpen ? <ChevronDown size="1rem" /> : <ChevronRight size="1rem" />}
        </button>
        {promptPreviewOpen ? (
          <div style={viewStyles.rawViewer}>
            <div style={viewStyles.rawTabs} role="tablist" aria-label="Directive prompt preview">
              <button
                type="button"
                role="tab"
                aria-selected={promptPreviewTab === "system"}
                style={{
                  ...viewStyles.rawTabButton,
                  ...(promptPreviewTab === "system" ? viewStyles.rawTabButtonActive : undefined),
                }}
                onClick={() => setPromptPreviewTab("system")}
              >
                System Prompt
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={promptPreviewTab === "messages"}
                style={{
                  ...viewStyles.rawTabButton,
                  ...(promptPreviewTab === "messages" ? viewStyles.rawTabButtonActive : undefined),
                }}
                onClick={() => setPromptPreviewTab("messages")}
              >
                Message Set
              </button>
            </div>
            <pre style={viewStyles.rawOutput}>{promptViewerText}</pre>
          </div>
        ) : null}
      </section>
    );
  }

  function renderRawGenerationOutput() {
    if (!showGenerationOutput) return null;
    const rawViewerText =
      rawGenerationTab === "thinking"
        ? rawGenerationThinking || "No thinking output captured for the last generation."
        : rawGenerationOutput || "No generation output captured yet.";

    return (
      <section style={viewStyles.panel}>
        <button
          type="button"
          style={viewStyles.disclosureButtonSmall}
          aria-expanded={rawGenerationOpen}
          onClick={() => setRawGenerationOpen((value) => !value)}
        >
          <span>Raw Generation Output</span>
          {rawGenerationOpen ? <ChevronDown size="1rem" /> : <ChevronRight size="1rem" />}
        </button>
        {rawGenerationOpen ? (
          <div style={viewStyles.rawViewer}>
            <div style={viewStyles.rawTabs} role="tablist" aria-label="Raw directive generation output">
              <button
                type="button"
                role="tab"
                aria-selected={rawGenerationTab === "output"}
                style={{
                  ...viewStyles.rawTabButton,
                  ...(rawGenerationTab === "output" ? viewStyles.rawTabButtonActive : undefined),
                }}
                onClick={() => setRawGenerationTab("output")}
              >
                Output
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rawGenerationTab === "thinking"}
                style={{
                  ...viewStyles.rawTabButton,
                  ...(rawGenerationTab === "thinking" ? viewStyles.rawTabButtonActive : undefined),
                }}
                onClick={() => setRawGenerationTab("thinking")}
              >
                Thinking
              </button>
            </div>
            <pre style={viewStyles.rawOutput}>{rawViewerText}</pre>
          </div>
        ) : null}
      </section>
    );
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
        <div style={viewStyles.panelHeader}>
          <div style={viewStyles.badgeRow}>
            <span style={viewStyles.badge}>
              <SubjectIcon subject={activeSubject} />
              {activeSubject?.label || "No subject"}
            </span>
            <span style={viewStyles.badge}>Chat: {chatId || "Not detected"}</span>
            <span style={{ ...viewStyles.badge, ...(!backendReady ? viewStyles.badgeMuted : null) }}>
              {backendReady ? "Backend ready" : "Backend unavailable"}
            </span>
            <span style={viewStyles.badge}>{bindingLabel}</span>
          </div>
          <div style={viewStyles.taskHeaderToggle}>
            <SwitchField
              checked={hideCompleted}
              label="Hide completed"
              onChange={setHideCompleted}
            />
          </div>
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
              <button type="button" style={formStyles.iconButton} title="Refresh milestones" onClick={() => loadTasks(scopeId)}>
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
                <p style={viewStyles.note}>Assign a collection or goal from Library to start using this chat's milestones.</p>
                <button type="button" style={formStyles.secondaryButton} onClick={onOpenLibrary}>
                  Open Library
                </button>
              </div>
            )}
          </>
        ) : null}
        <StatusSnackbar message={status.error} />
      </section>

      {!backendReady ? <div style={viewStyles.empty}>Goal backend is unavailable.</div> : null}
      {backendReady && !chatId ? <div style={viewStyles.empty}>No active chat detected.</div> : null}
      {backendReady && chatId && !persona ? <div style={viewStyles.empty}>Choose a subject to load milestones.</div> : null}
      {backendReady && chatId && persona && !status.loading && !groups.length ? (
        <div style={viewStyles.empty}>No assigned goal trees for this scope.</div>
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
              focusedNodeId={focusedNodeIds[goal.id] || ""}
              goal={goal}
              hideCompleted={hideCompleted}
              key={goal.id}
              onDraftChange={setAddDrafts}
              onFocusNode={focusNode}
              onGenerateDirectives={openDirectiveDraft}
              onRequestDeleteNode={(goal, node) => setDeleteNodeDraft({ goal, node })}
              onSetCurrentFocus={setCurrentFocus}
              onShowFullTree={openFullTree}
              onUpdateNode={updateNode}
            />
          ))}
        </section>
      ))}
      {mapGoal ? (
        <GoalMapDialog
          focusedNodeId={focusedNodeIds[mapGoal.id] || ""}
          goal={mapGoal}
          onClose={() => setMapGoal(null)}
          onSelectNode={(nodeId) => {
            focusNode(mapGoal, nodeId);
            setMapGoal(null);
          }}
        />
      ) : null}
      {renderPromptPreview()}
      {renderRawGenerationOutput()}
      {directiveDraft ? (
        <DirectiveDraftDialog
          connections={connections}
          contextEntries={contextEntries}
          draft={directiveDraft}
          generating={generating}
          includeChatHistory={includeChatHistory}
          onAddBlank={() => setDirectiveDraft((current) => ({
            ...current,
            candidates: [...(current?.candidates || []), createDirectiveCandidate("", "manual")],
          }))}
          onAttachContext={attachContextEntry}
          onClose={() => setDirectiveDraft(null)}
          onConfirm={() => addGeneratedDirectives()}
          onGenerate={() => generateDirectiveDrafts()}
          onRemoveContext={removeContextEntry}
          onIncludeChatHistoryChange={updateIncludeChatHistory}
          onSettingsChange={updateGenerationSettings}
          onUpdate={setDirectiveDraft}
          renderDraftingStatus={renderDraftingStatus}
          settings={settings}
        />
      ) : null}
      {deleteNodeDraft ? (
        <DeleteNodeDialog
          draft={deleteNodeDraft}
          onCancel={() => setDeleteNodeDraft(null)}
          onConfirm={() => deleteNode(deleteNodeDraft.goal, deleteNodeDraft.node)}
        />
      ) : null}
      <StatusSnackbar message={message} />
    </div>
  );
}

function DirectiveDraftDialog({
  connections,
  contextEntries,
  draft,
  generating,
  includeChatHistory,
  onAddBlank,
  onAttachContext,
  onClose,
  onConfirm,
  onGenerate,
  onIncludeChatHistoryChange,
  onRemoveContext,
  onSettingsChange,
  onUpdate,
  renderDraftingStatus,
  settings,
}) {
  const [contextOpen, setContextOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lorebookModalOpen, setLorebookModalOpen] = useState(false);
  const selectedCount = (draft.candidates || []).filter((candidate) => candidate.selected && candidate.text.trim()).length;

  function updateCandidate(id, patch) {
    onUpdate((current) => ({
      ...current,
      candidates: (current?.candidates || []).map((candidate) => (candidate.id === id ? { ...candidate, ...patch } : candidate)),
    }));
  }

  function removeCandidate(id) {
    onUpdate((current) => ({
      ...current,
      candidates: (current?.candidates || []).filter((candidate) => candidate.id !== id),
    }));
  }

  return (
    <div style={viewStyles.modalBackdrop}>
      <section style={{ ...viewStyles.modalPanel, width: "min(48rem, 100%)" }}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Generate Directives</h3>
            <p style={viewStyles.muted}>Add directives under: {getNodeText(draft.parent) || "Untitled milestone"}</p>
          </div>
          <button type="button" style={formStyles.iconButton} title="Close directive drafts" onClick={onClose}>
            <X size="0.875rem" />
          </button>
        </div>

        <label style={formStyles.field}>
          <span style={formStyles.label}>Notes</span>
          <textarea
            style={formStyles.textareaSmall}
            value={draft.notes || ""}
            onChange={(event) => onUpdate((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Optional guidance for this generation"
          />
        </label>

        <section style={viewStyles.panel}>
          <button
            type="button"
            style={viewStyles.disclosureButtonSmall}
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((value) => !value)}
          >
            <span>Generation Settings</span>
            {settingsOpen ? <ChevronDown size="1rem" /> : <ChevronRight size="1rem" />}
          </button>
          {settingsOpen ? (
            <div style={viewStyles.stack}>
              <label style={formStyles.field}>
                <span style={formStyles.label}>Preferred connection</span>
                <select
                  style={formStyles.input}
                  value={settings.preferredConnectionId}
                  onChange={(event) => onSettingsChange({ preferredConnectionId: event.target.value })}
                >
                  <option value="">No preferred connection</option>
                  {connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.name}
                      {connection.model ? ` (${connection.model})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <SwitchField
                checked={settings.allowConnectionFallback}
                label="Allow connection fallback"
                onChange={(checked) => onSettingsChange({ allowConnectionFallback: checked })}
              />
              <SwitchField
                checked={includeChatHistory}
                label="Include chat history"
                onChange={onIncludeChatHistoryChange}
              />
              <div style={viewStyles.fieldGrid}>
                {includeChatHistory ? (
                  <label style={formStyles.field}>
                    <span style={formStyles.label}>Messages back</span>
                    <input
                      style={formStyles.input}
                      value={settings.chatHistoryLimit}
                      onChange={(event) => onSettingsChange({ chatHistoryLimit: event.target.value })}
                      inputMode="numeric"
                      placeholder="20"
                    />
                  </label>
                ) : null}
                <label style={formStyles.field}>
                  <span style={formStyles.label}>Max tokens</span>
                  <input
                    style={formStyles.input}
                    value={settings.generationMaxTokens}
                    onChange={(event) => onSettingsChange({ generationMaxTokens: event.target.value })}
                    inputMode="numeric"
                    placeholder="1024"
                  />
                </label>
                <label style={formStyles.field}>
                  <span style={formStyles.label}>Temperature</span>
                  <input
                    style={formStyles.input}
                    value={settings.generationTemperature}
                    onChange={(event) => onSettingsChange({ generationTemperature: event.target.value })}
                    inputMode="decimal"
                    placeholder="provider default"
                  />
                </label>
                <label style={formStyles.field}>
                  <span style={formStyles.label}>Top P</span>
                  <input
                    style={formStyles.input}
                    value={settings.generationTopP}
                    onChange={(event) => onSettingsChange({ generationTopP: event.target.value })}
                    inputMode="decimal"
                    placeholder="provider default"
                  />
                </label>
                <label style={formStyles.field}>
                  <span style={formStyles.label}>Top K</span>
                  <input
                    style={formStyles.input}
                    value={settings.generationTopK}
                    onChange={(event) => onSettingsChange({ generationTopK: event.target.value })}
                    inputMode="numeric"
                    placeholder="provider default"
                  />
                </label>
                <label style={formStyles.field}>
                  <span style={formStyles.label}>Frequency penalty</span>
                  <input
                    style={formStyles.input}
                    value={settings.generationFrequencyPenalty}
                    onChange={(event) => onSettingsChange({ generationFrequencyPenalty: event.target.value })}
                    inputMode="decimal"
                    placeholder="provider default"
                  />
                </label>
                <label style={formStyles.field}>
                  <span style={formStyles.label}>Presence penalty</span>
                  <input
                    style={formStyles.input}
                    value={settings.generationPresencePenalty}
                    onChange={(event) => onSettingsChange({ generationPresencePenalty: event.target.value })}
                    inputMode="decimal"
                    placeholder="provider default"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </section>

        <section style={viewStyles.panel}>
          <button
            type="button"
            style={viewStyles.disclosureButtonSmall}
            aria-expanded={contextOpen}
            onClick={() => setContextOpen((value) => !value)}
          >
            <span>Lorebook Context</span>
            {contextOpen ? <ChevronDown size="1rem" /> : <ChevronRight size="1rem" />}
          </button>
          {contextOpen ? (
            <div style={viewStyles.stack}>
              <div style={viewStyles.panelHeader}>
                <p style={viewStyles.muted}>Attach additional context for directive generation.</p>
                <button type="button" style={formStyles.primaryButton} onClick={() => setLorebookModalOpen(true)}>
                  <BookOpen size="0.9375rem" />
                  Attach
                </button>
              </div>
              <div style={viewStyles.scrollStack}>
                {contextEntries.map((entry) => (
                  <article key={makeLorebookEntryPointer(entry)} style={promptPickerStyles.detailBlock}>
                    <div style={viewStyles.panelHeader}>
                      <div style={viewStyles.stack}>
                        <p style={viewStyles.kicker}>{entry.name}</p>
                        <p style={viewStyles.muted}>{entry.lorebookName || entry.lorebookId}</p>
                      </div>
                      <button type="button" style={formStyles.iconButton} title="Remove context" onClick={() => onRemoveContext(entry)}>
                        <X size="0.875rem" />
                      </button>
                    </div>
                    <pre style={promptPickerStyles.promptBody}>{entry.content || "No content."}</pre>
                  </article>
                ))}
                {!contextEntries.length ? <div style={viewStyles.empty}>No lorebook context attached.</div> : null}
              </div>
            </div>
          ) : null}
        </section>

        <div style={viewStyles.panelHeader}>
          <div>
            <h4 style={viewStyles.title}>Draft Candidates</h4>
            <p style={viewStyles.muted}>{selectedCount} selected for commit</p>
          </div>
          <div style={viewStyles.cardToolbar}>
            <button type="button" style={formStyles.secondaryButton} onClick={onAddBlank}>
              <Plus size="0.875rem" />
              Blank
            </button>
            {generating ? (
              <div style={viewStyles.draftingIndicator} role="status" aria-live="polite">
                <LoaderCircle size="0.9375rem" style={viewStyles.draftingSpinner} />
                {renderDraftingStatus()}
              </div>
            ) : (
              <button type="button" style={formStyles.primaryButton} onClick={onGenerate}>
                <Lightbulb size="0.9375rem" />
                {draft.candidates?.length ? "Regenerate" : "Generate"}
              </button>
            )}
          </div>
        </div>

        <div style={viewStyles.scrollStack}>
          {(draft.candidates || []).map((candidate) => {
            const isAccumulation = candidate.resolutionMode === "accumulation";
            return (
              <article key={candidate.id} style={promptPickerStyles.detailBlock}>
                <div style={viewStyles.panelHeader}>
                  <SwitchField
                    checked={candidate.selected}
                    label={candidate.selected ? "Selected" : "Skipped"}
                    onChange={(checked) => updateCandidate(candidate.id, { selected: checked })}
                  />
                  <button type="button" style={formStyles.iconButton} title="Remove candidate" onClick={() => removeCandidate(candidate.id)}>
                    <Trash2 size="0.8125rem" />
                  </button>
                </div>
                <textarea
                  style={formStyles.textareaSmall}
                  value={candidate.text}
                  onChange={(event) => updateCandidate(candidate.id, { text: event.target.value })}
                  placeholder="Directive text"
                />
                <div style={viewStyles.nodeControls}>
                  <select
                    aria-label="Directive resolution"
                    style={{ ...formStyles.input, maxWidth: "12rem" }}
                    value={candidate.resolutionMode}
                    onChange={(event) => updateCandidate(candidate.id, { resolutionMode: event.target.value })}
                  >
                    <option value="checklist">Checklist</option>
                    <option value="accumulation">Accumulation</option>
                  </select>
                  {isAccumulation ? (
                    <input
                      aria-label="Accumulation target"
                      min="1"
                      style={{ ...formStyles.input, maxWidth: "5rem" }}
                      type="number"
                      value={candidate.target}
                      onChange={(event) => updateCandidate(candidate.id, { target: Math.max(1, Number(event.target.value) || 1) })}
                    />
                  ) : null}
                  <span style={{ ...viewStyles.badge, ...viewStyles.badgeMuted }}>{candidate.source}</span>
                </div>
              </article>
            );
          })}
          {!draft.candidates?.length ? <div style={viewStyles.empty}>Generate directives to review candidates before adding them.</div> : null}
        </div>

        <div style={viewStyles.debugActionRow}>
          <button type="button" style={formStyles.secondaryButton} onClick={onClose}>
            <X size="0.875rem" />
            Cancel
          </button>
          <button type="button" style={formStyles.primaryButton} onClick={onConfirm} disabled={!selectedCount || generating}>
            <CheckCircle2 size="0.875rem" />
            Add Selected
          </button>
        </div>
      </section>
      {lorebookModalOpen ? (
        <LorebookSelectModal
          selectedPointers={contextEntries.map(makeLorebookEntryPointer)}
          onSelect={onAttachContext}
          onClose={() => setLorebookModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

function DeleteNodeDialog({ draft, onCancel, onConfirm }) {
  const node = draft?.node || {};
  const childCount = countDirectChildren(node);
  return (
    <div style={viewStyles.modalBackdrop}>
      <section style={viewStyles.modalPanel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Remove Milestone</h3>
            <p style={viewStyles.muted}>This removes the selected milestone or directive from the live goal tree.</p>
          </div>
          <button type="button" style={formStyles.iconButton} title="Cancel removal" onClick={onCancel}>
            <X size="0.875rem" />
          </button>
        </div>
        <div style={viewStyles.empty}>
          <p style={viewStyles.body}>{getNodeText(node) || "Untitled directive"}</p>
          {childCount ? (
            <p style={viewStyles.note}>
              This directive has {childCount} child directive{childCount === 1 ? "" : "s"}. Removing it may remove that subtree too.
            </p>
          ) : null}
        </div>
        <div style={viewStyles.debugActionRow}>
          <button type="button" style={formStyles.secondaryButton} onClick={onCancel}>
            <X size="0.875rem" />
            Cancel
          </button>
          <button type="button" style={formStyles.primaryButton} onClick={onConfirm}>
            <Trash2 size="0.875rem" />
            Remove
          </button>
        </div>
      </section>
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
  focusedNodeId,
  goal,
  hideCompleted,
  onDraftChange,
  onFocusNode,
  onGenerateDirectives,
  onRequestDeleteNode,
  onSetCurrentFocus,
  onShowFullTree,
  onUpdateNode,
}) {
  const rootNodes = Array.isArray(goal.nodes) ? goal.nodes : [];
  const focusedMatch = focusedNodeId ? findGoalNode(rootNodes, focusedNodeId) : null;
  const focusedNode = focusedMatch?.node || null;
  const focusedChildren = focusedNode ? filterCompletedNodes(focusedNode.children || [], hideCompleted) : [];
  const visibleRoots = filterCompletedNodes(rootNodes, hideCompleted);
  const addParentId = focusedNode?.id || null;

  return (
    <article style={viewStyles.panel}>
      <div style={viewStyles.panelHeader}>
        <div>
          <h3 style={viewStyles.title}>{goal.name}</h3>
          <p style={viewStyles.muted}>
            {focusedNode
              ? getNodePathLabel(focusedMatch.path)
              : `${goal.type} / ${goal.status}${goal.priority ? " / priority" : ""}`}
          </p>
        </div>
        <div style={viewStyles.cardToolbar}>
          {focusedNode ? (
            <button type="button" style={formStyles.secondaryButton} onClick={() => onFocusNode(goal, focusedMatch.parentId || "")}>
              <ChevronRight size="0.875rem" style={{ transform: "rotate(180deg)" }} />
              Back
            </button>
          ) : null}
          {focusedNode ? (
            <button type="button" style={formStyles.secondaryButton} onClick={() => onFocusNode(goal, "")}>
              Root
            </button>
          ) : null}
          <button type="button" style={formStyles.secondaryButton} onClick={() => onShowFullTree(goal)}>
            Map
          </button>
        </div>
      </div>

      {focusedNode ? (
        <LiveTaskCard
          goal={goal}
          node={focusedNode}
          onDeleteNode={onRequestDeleteNode}
          onSetCurrentFocus={onSetCurrentFocus}
          onUpdateNode={onUpdateNode}
        />
      ) : (
        <div style={viewStyles.taskDraftRow}>
          <div style={viewStyles.panelHeader}>
            <div>
              <h4 style={viewStyles.title}>Goal Root</h4>
              <p style={viewStyles.muted}>{visibleRoots.length} visible milestone{visibleRoots.length === 1 ? "" : "s"}</p>
            </div>
          </div>
        </div>
      )}

      <section style={viewStyles.stack}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h4 style={viewStyles.title}>{focusedNode ? "Directives" : "Milestones"}</h4>
            <p style={viewStyles.muted}>
              {focusedNode
                ? `${focusedChildren.length} visible directive${focusedChildren.length === 1 ? "" : "s"}`
                : `${visibleRoots.length} visible milestone${visibleRoots.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        {(focusedNode ? focusedChildren : visibleRoots).length ? (
          <div style={viewStyles.nodeTree}>
            {(focusedNode ? focusedChildren : visibleRoots).map((node) => (
              <LiveTaskLinkRow key={node.id} node={node} onNavigate={(nodeId) => onFocusNode(goal, nodeId)} />
            ))}
          </div>
        ) : (
          <div style={viewStyles.empty}>No visible {focusedNode ? "directives" : "milestones"} at this tier.</div>
        )}
        <LiveNodeAddForm
          draft={addDrafts[`${goal.id}:${addParentId || "root"}`] || createLiveNodeDraft()}
          onAdd={() => addChild(goal, addParentId)}
          onChange={(draft) => onDraftChange((current) => ({ ...current, [`${goal.id}:${addParentId || "root"}`]: draft }))}
          onGenerate={focusedNode ? () => onGenerateDirectives(goal, focusedNode) : null}
          tierLabel={focusedNode ? "directive" : "milestone"}
        />
      </section>
    </article>
  );
}

function LiveTaskCard({ goal, node, onDeleteNode, onSetCurrentFocus, onUpdateNode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    text: getNodeText(node),
    resolutionMode: getNodeMode(node),
    target: getNodeTarget(node),
  }));
  const isAccumulation = getNodeMode(node) === "accumulation";
  const progress = getNodeProgress(node);
  const target = getNodeTarget(node);
  const checked = isNodeDone(node);
  const draftIsAccumulation = draft.resolutionMode === "accumulation";

  useEffect(() => {
    if (!isEditing) {
      setDraft({
        text: getNodeText(node),
        resolutionMode: getNodeMode(node),
        target: getNodeTarget(node),
      });
    }
  }, [isEditing, node]);

  function updateProgress(nextProgress) {
    const boundedProgress = Math.max(0, nextProgress);
    onUpdateNode(goal, node, {
      progress: boundedProgress,
      state: boundedProgress >= target ? "done" : "in_progress",
    });
  }

  function openEditor() {
    setDraft({
      text: getNodeText(node),
      resolutionMode: getNodeMode(node),
      target: getNodeTarget(node),
    });
    setIsEditing(true);
  }

  function saveEditor() {
    const nextText = draft.text.trim();
    const payload = {};
    if (nextText && nextText !== getNodeText(node)) payload.text = nextText;
    if (draft.resolutionMode !== getNodeMode(node)) payload.resolution_mode = draft.resolutionMode;
    if (draft.resolutionMode === "accumulation" && draft.target !== target) payload.target = Math.max(1, draft.target);
    if (Object.keys(payload).length) onUpdateNode(goal, node, payload);
    setIsEditing(false);
  }

  return (
    <div style={viewStyles.taskDraftRow}>
      <div style={viewStyles.taskDraftMain}>
        <div style={viewStyles.taskCheckLabel}>
          {isAccumulation ? (
            <span style={viewStyles.progressPill}>{progress} / {target}</span>
          ) : (
            <span style={viewStyles.taskCompletionSwitch}>
              <SwitchField
                checked={checked}
                label="Complete"
                onChange={(nextChecked) => onUpdateNode(goal, node, { state: nextChecked ? "done" : "open" })}
              />
            </span>
          )}
          <span style={viewStyles.subjectText}>
            <span style={viewStyles.contextLabel}>{getNodeMode(node)} / {node.state}</span>
          </span>
        </div>
        <div style={viewStyles.nodeControls}>
          <button type="button" style={formStyles.secondaryButton} onClick={() => onSetCurrentFocus(goal, node)}>
            <Target size="0.8125rem" />
            Current
          </button>
          {isEditing ? (
            <>
              <button type="button" style={formStyles.iconButton} title="Save milestone edits" onClick={saveEditor}>
                <Save size="0.8125rem" />
              </button>
              <button type="button" style={formStyles.iconButton} title="Remove directive" onClick={() => onDeleteNode(goal, node)}>
                <Trash2 size="0.8125rem" />
              </button>
              <button type="button" style={formStyles.iconButton} title="Cancel milestone edits" onClick={() => setIsEditing(false)}>
                <X size="0.8125rem" />
              </button>
            </>
          ) : (
            <button type="button" style={formStyles.iconButton} title="Edit milestone" onClick={openEditor}>
              <Pencil size="0.8125rem" />
            </button>
          )}
        </div>
      </div>

      <p style={viewStyles.focusedNodeText}>{getNodeText(node) || "Untitled milestone"}</p>

      {isEditing ? (
        <>
          <label style={formStyles.field}>
            <span style={formStyles.label}>Milestone or directive</span>
            <input
              aria-label="Milestone or directive text"
              style={formStyles.input}
              value={draft.text}
              onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
            />
          </label>

          <div style={viewStyles.nodeControls}>
            <select
              aria-label="Resolution mode"
              style={{ ...formStyles.input, maxWidth: "11rem" }}
              value={draft.resolutionMode}
              onChange={(event) => setDraft((current) => ({ ...current, resolutionMode: event.target.value }))}
            >
              <option value="checklist">Checklist</option>
              <option value="accumulation">Accumulation</option>
            </select>
            {draftIsAccumulation ? (
              <input
                aria-label="Accumulation target"
                min="1"
                style={{ ...formStyles.input, maxWidth: "5rem" }}
                type="number"
                value={draft.target}
                onChange={(event) => setDraft((current) => ({ ...current, target: Math.max(1, Number(event.target.value) || 1) }))}
              />
            ) : null}
          </div>
        </>
      ) : null}

      {isAccumulation ? (
        <div style={viewStyles.nodeControls}>
          <button type="button" style={formStyles.iconButton} onClick={() => updateProgress(progress - 1)}>-</button>
          <span style={viewStyles.badge}>{progress} / {target}</span>
          <button type="button" style={formStyles.iconButton} onClick={() => updateProgress(progress + 1)}>+</button>
        </div>
      ) : null}
    </div>
  );
}

function LiveTaskLinkRow({ node, onNavigate }) {
  const isAccumulation = getNodeMode(node) === "accumulation";
  const childCount = countDirectChildren(node);
  return (
    <button type="button" style={viewStyles.taskLinkRow} onClick={() => onNavigate(node.id)}>
      <span style={viewStyles.subjectText}>
        <span style={viewStyles.contextText}>{getNodeText(node) || "Untitled milestone"}</span>
        <span style={viewStyles.contextLabel}>
          {isAccumulation ? `${getNodeProgress(node)} / ${getNodeTarget(node)}` : node.state} / {childCount} directive{childCount === 1 ? "" : "s"}
        </span>
      </span>
      <ChevronRight size="0.875rem" />
    </button>
  );
}

function LiveNodeAddForm({ draft, onAdd, onChange, onGenerate, tierLabel }) {
  const isAccumulation = draft.resolutionMode === "accumulation";
  const label = tierLabel || "milestone";
  const columns = `minmax(0, 1fr) minmax(8rem, 10rem) ${isAccumulation ? "minmax(4rem, 5rem)" : ""} auto ${onGenerate ? "auto" : ""}`
    .replace(/\s+/g, " ")
    .trim();
  return (
    <div style={{ ...viewStyles.nodeAddPanel, gridTemplateColumns: columns }}>
      <input
        style={formStyles.input}
        value={draft.text}
        onChange={(event) => onChange({ ...draft, text: event.target.value })}
        placeholder={`Add ${label} at this tier`}
      />
      <select
        aria-label={`New ${label} resolution`}
        style={formStyles.input}
        value={draft.resolutionMode}
        onChange={(event) => onChange({ ...draft, resolutionMode: event.target.value })}
      >
        <option value="checklist">Checklist</option>
        <option value="accumulation">Accumulation</option>
      </select>
      {isAccumulation ? (
        <input
          aria-label={`New ${label} target`}
          min="1"
          style={formStyles.input}
          type="number"
          value={draft.target}
          onChange={(event) => onChange({ ...draft, target: Math.max(1, Number(event.target.value) || 1) })}
        />
      ) : null}
      <button type="button" style={formStyles.iconButton} title={`Add ${label}`} onClick={onAdd}>
        <Plus size="0.8125rem" />
      </button>
      {onGenerate ? (
        <button type="button" style={formStyles.iconButton} title="Generate directives" onClick={onGenerate}>
          <Lightbulb size="0.8125rem" />
        </button>
      ) : null}
    </div>
  );
}

function buildGoalFlow(nodes = [], focusedNodeId = "") {
  const graphNodes = [];
  const graphEdges = [];
  let row = 0;

  function visit(node, depth, parentId = "") {
    const y = row * 96;
    row += 1;
    graphNodes.push({
      id: node.id,
      type: "goalNode",
      position: { x: depth * 260, y },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: getNodeText(node) || "Untitled milestone",
        mode: getNodeMode(node),
        progress: getNodeProgress(node),
        target: getNodeTarget(node),
        state: node.state,
        focused: node.id === focusedNodeId,
        done: isNodeDone(node),
      },
    });
    if (parentId) {
      graphEdges.push({
        id: `${parentId}:${node.id}`,
        source: parentId,
        target: node.id,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#999", strokeWidth: 1.75 },
        type: "smoothstep",
      });
    }
    (node.children || []).forEach((child) => visit(child, depth + 1, node.id));
  }

  nodes.forEach((node) => visit(node, 0));
  return { nodes: graphNodes, edges: graphEdges };
}

function GoalFlowNode({ data }) {
  return (
    <div
      style={{
        ...viewStyles.flowNode,
        ...(data.focused ? viewStyles.flowNodeFocused : null),
        ...(data.done ? viewStyles.flowNodeDone : null),
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: "none" }} />
      <span style={viewStyles.contextText}>{data.label}</span>
      <span style={viewStyles.contextLabel}>
        {data.mode === "accumulation" ? `${data.progress} / ${data.target}` : data.state}
      </span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

function GoalMapDialog({ focusedNodeId, goal, onClose, onSelectNode }) {
  useXyflowStyles();
  const graph = useMemo(() => buildGoalFlow(goal.nodes || [], focusedNodeId), [focusedNodeId, goal]);
  const nodeTypes = useMemo(() => ({ goalNode: GoalFlowNode }), []);

  return (
    <div style={viewStyles.modalBackdrop}>
      <section style={viewStyles.mapModalPanel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>{goal.name}</h3>
            <p style={viewStyles.muted}>Full goal map. Select a milestone or directive to focus it.</p>
          </div>
          <button type="button" style={formStyles.iconButton} title="Close map" onClick={onClose}>
            <X size="0.875rem" />
          </button>
        </div>
        <div style={viewStyles.flowCanvas}>
          <ReactFlow
            colorMode="dark"
            edges={graph.edges}
            fitView
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: "#999", strokeWidth: 1.75 },
              type: "smoothstep",
            }}
            maxZoom={1.6}
            minZoom={0.35}
            nodes={graph.nodes}
            nodesDraggable={false}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => onSelectNode(node.id)}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} />
            <MiniMap pannable zoomable />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </section>
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
  const [selectedPrompt, setSelectedPrompt] = useState(() => readStoredPrompt());
  const [promptValidation, setPromptValidation] = useState(() => readStoredObject(GOAL_PROMPT_VALIDATION_KEY));
  const [promptOverrides, setPromptOverrides] = useState(() => readStoredObject(GOAL_PROMPT_OVERRIDES_KEY) || {});
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(() => readStoredBoolean(GOAL_SHOW_PROMPT_KEY));
  const [showGenerationOutput, setShowGenerationOutput] = useState(() => readStoredBoolean(GOAL_SHOW_GENERATION_OUTPUT_KEY));
  const [status, setStatus] = useState({ loading: false, error: "", message: "" });

  useEffect(() => {
    writeStoredPrompt(selectedPrompt);
  }, [selectedPrompt]);

  useEffect(() => {
    writeStoredObject(GOAL_PROMPT_VALIDATION_KEY, promptValidation);
  }, [promptValidation]);

  useEffect(() => {
    writeStoredObject(GOAL_PROMPT_OVERRIDES_KEY, promptOverrides);
  }, [promptOverrides]);

  useEffect(() => {
    writeStoredBoolean(GOAL_SHOW_PROMPT_KEY, showPrompt);
  }, [showPrompt]);

  useEffect(() => {
    writeStoredBoolean(GOAL_SHOW_GENERATION_OUTPUT_KEY, showGenerationOutput);
  }, [showGenerationOutput]);

  useEffect(() => {
    if (!selectedPrompt) return;
    const summary = createPromptContractSummary(selectedPrompt);
    setPromptValidation(summary);
    setPromptOverrides((current) => createDefaultOverrides(selectedPrompt, summary, current));
  }, [selectedPrompt]);

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

  function selectDirectivePrompt(prompt) {
    const summary = createPromptContractSummary(prompt);
    setSelectedPrompt(prompt);
    setPromptValidation(summary);
    setPromptOverrides((current) => createDefaultOverrides(prompt, summary, current));
    setPromptModalOpen(false);
    setStatus({
      loading: false,
      error: "",
      message: summary?.valid ? "Directive prompt selected." : "Prompt selected, but milestone is missing.",
    });
  }

  function clearDirectivePrompt() {
    setSelectedPrompt(null);
    setPromptValidation(null);
    setPromptOverrides({});
  }

  function updatePromptOverride(name, value) {
    setPromptOverrides((current) => ({ ...current, [name]: value }));
  }

  const bindingTargets = binding?.targets || [];
  const cleanupBindings = chatBindings.filter((item) => {
    const chatId = item.chat_id || item.id || "";
    return chatId && chatId !== context.chatId;
  });
  const overrideRows = makeGoalOverrideRows(selectedPrompt, promptValidation);

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
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Directive Prompt</h3>
            <p style={viewStyles.muted}>Choose the reusable prompt used when drafting directives under a focused milestone.</p>
          </div>
          <button type="button" style={formStyles.primaryButton} onClick={() => setPromptModalOpen(true)}>
            <ScrollText size="0.9375rem" />
            {selectedPrompt ? "Choose" : "Choose Prompt"}
          </button>
        </div>
        {selectedPrompt ? (
          <div style={viewStyles.stack}>
            <section style={promptPickerStyles.selectedCard}>
              <div style={viewStyles.stack}>
                <div style={viewStyles.cardMeta}>
                  <p style={viewStyles.kicker}>Selected Prompt</p>
                  <p style={viewStyles.muted}>{selectedPrompt.content_type || "unsorted"}</p>
                </div>
                <div style={viewStyles.panelHeader}>
                  <ScrollText size="1rem" />
                  <h3 style={viewStyles.title}>{selectedPrompt.name}</h3>
                </div>
                <p style={viewStyles.body}>{selectedPrompt.description || "No description."}</p>
                <p style={viewStyles.muted}>
                  {selectedPrompt.entries?.length || 0} section{selectedPrompt.entries?.length === 1 ? "" : "s"} |{" "}
                  {selectedPrompt.requirements?.length || 0} requirement{selectedPrompt.requirements?.length === 1 ? "" : "s"}
                </p>
              </div>
              <div style={viewStyles.cardToolbar}>
                <button type="button" style={formStyles.iconButton} title="Clear prompt" onClick={clearDirectivePrompt}>
                  <Trash2 size="0.875rem" />
                </button>
              </div>
            </section>

            <div style={viewStyles.stack}>
              <div>
                <h4 style={viewStyles.title}>Contract</h4>
                {promptValidation?.valid ? (
                  <p style={viewStyles.muted}>Ready for directive generation: milestone is available.</p>
                ) : (
                  <p style={viewStyles.muted}>
                    Missing required directive field{promptValidation?.missing_fields?.length === 1 ? "" : "s"}:{" "}
                    {promptValidation?.missing_fields?.join(", ") || "validation unavailable"}.
                  </p>
                )}
              </div>
              <div style={viewStyles.badgeRow}>
                {GOAL_REQUIRED_FIELDS.map((fieldName) => (
                  <span
                    key={fieldName}
                    style={{
                      ...viewStyles.badge,
                      ...(promptValidation?.missing_fields?.includes(fieldName) ? viewStyles.badgeMuted : undefined),
                    }}
                  >
                    {fieldName}
                  </span>
                ))}
              </div>
              {overrideRows.length ? (
                <div style={viewStyles.scrollStack}>
                  {overrideRows.map((row) => (
                    <label key={row.id} style={formStyles.field}>
                      <span style={formStyles.label}>{row.name}</span>
                      <span style={formStyles.hint}>{row.required ? "Required" : "Optional"} {row.kind} from {row.sectionName}.</span>
                      <input
                        style={formStyles.input}
                        value={promptOverrides[row.id] ?? ""}
                        onChange={(event) => updatePromptOverride(row.id, event.target.value)}
                        placeholder={row.defaultValue || "Override value"}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p style={viewStyles.muted}>No additional prompt fields need defaults.</p>
              )}
            </div>
          </div>
        ) : (
          <div style={viewStyles.empty}>Directive generation needs a prompt with the milestone field.</div>
        )}
      </section>

      <section style={viewStyles.panel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Debug</h3>
            <p style={viewStyles.muted}>Expose prompt and generation artifacts while tuning directive generation.</p>
          </div>
        </div>
        <div style={viewStyles.stack}>
          <SwitchField
            checked={showPrompt}
            label="Show prompt"
            onChange={setShowPrompt}
          />
          <SwitchField
            checked={showGenerationOutput}
            label="Show generation output"
            onChange={setShowGenerationOutput}
          />
        </div>
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
          <span style={viewStyles.muted}>{cleanupBindings.length} stale chat binding{cleanupBindings.length === 1 ? "" : "s"}</span>
        </button>
        {cleanupOpen ? (
          <div style={viewStyles.stack}>
            <p style={viewStyles.muted}>Delete stale binding entries for the resolved backend persona namespace. The current chat is hidden here.</p>
            {cleanupBindings.length ? (
              <div style={viewStyles.scrollStack}>
                {cleanupBindings.map((item) => {
                  const chatId = item.chat_id || item.id || "";
                  const targets = item.targets || [];
                  return (
                    <div key={chatId} style={viewStyles.targetRow}>
                      <span style={{ ...viewStyles.badge, ...viewStyles.badgeMuted }}>saved</span>
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
              <div style={viewStyles.empty}>No stale chat bindings found for this subject.</div>
            )}
          </div>
        ) : null}
      </section>

      {promptModalOpen ? (
        <PromptSelectModal
          selectedPromptId={selectedPrompt?.id}
          onSelect={selectDirectivePrompt}
          onClose={() => setPromptModalOpen(false)}
          requiredFields={GOAL_REQUIRED_FIELDS}
        />
      ) : null}
      <StatusSnackbar message={status.error || status.message} />
    </div>
  );
}

function LibraryView({ activeSubject, backendReady, chatId, subjectOptions = [] }) {
  const persona = activeSubject?.key || "";
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [goals, setGoals] = useState([]);
  const [chatBinding, setChatBinding] = useState(null);
  const [includeSuspended, setIncludeSuspended] = useState(true);
  const [railOpen, setRailOpen] = useState(false);
  const [railMode, setRailMode] = useState("search");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState([]);
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionDraft, setCollectionDraft] = useState({ mode: "idle", id: "", name: "", description: "", tags: "" });
  const [goalDraft, setGoalDraft] = useState(null);
  const [duplicateDraft, setDuplicateDraft] = useState(null);
  const [duplicateCollections, setDuplicateCollections] = useState([]);
  const [duplicateBinding, setDuplicateBinding] = useState(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
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
      setSelectedGoalId("");
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
      setSelectedGoalId((current) => (Array.isArray(goalResult.items) && goalResult.items.some((goal) => goal.id === current) ? current : ""));
      setChatBinding(bindingResult ? { ...bindingResult, targets: bindingResult.targets || [] } : null);
      if (!libraryQuery.trim()) {
        setLibraryResults([
          ...nextCollections.map((collection) => ({ ...collection, result_type: "collection" })),
          ...(Array.isArray(goalResult.items) ? goalResult.items.map((goal) => ({ ...goal, result_type: "goal" })) : []),
        ]);
      }
      setStatus({ loading: false, error: "", message: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not load goal library.", message: "" });
    }
  }

  useEffect(() => {
    setCollections([]);
    setGoals([]);
    setSelectedCollectionId("");
    setSelectedGoalId("");
    setGoalDraft(null);
    setDuplicateDraft(null);
    setLibraryResults([]);
    setCollectionDraft({ mode: "idle", id: "", name: "", description: "", tags: "" });
    loadLibrary("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendReady, persona, chatId, includeSuspended]);

  async function selectCollection(collectionId) {
    setSelectedCollectionId(collectionId);
    setSelectedGoalId("");
    setGoalDraft(null);
    await loadLibrary(collectionId);
  }

  useEffect(() => {
    if (!duplicateDraft?.targetPersona) {
      setDuplicateCollections([]);
      setDuplicateBinding(null);
      return;
    }

    let active = true;
    const targetPersona = duplicateDraft.targetPersona;
    setDuplicateLoading(true);
    Promise.all([
      targetPersona === persona ? Promise.resolve({ items: collections }) : goalCommands.listCollections({ persona: targetPersona }),
      chatId ? goalCommands.getChat({ persona: targetPersona, chat_id: chatId }).catch(() => null) : Promise.resolve(null),
    ])
      .then(([collectionResult, bindingResult]) => {
        if (!active) return;
        setDuplicateCollections(Array.isArray(collectionResult.items) ? collectionResult.items : []);
        setDuplicateBinding(bindingResult ? { ...bindingResult, targets: bindingResult.targets || [] } : null);
        setDuplicateLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setDuplicateCollections([]);
        setDuplicateBinding(null);
        setDuplicateLoading(false);
        setStatus({ loading: false, error: error?.message || "Could not load duplicate target collections.", message: "" });
      });

    return () => {
      active = false;
    };
  }, [chatId, collections, duplicateDraft?.targetPersona, persona]);

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
    return ensureCollectionForPersona(persona, collectionId, collections);
  }

  async function ensureCollectionForPersona(targetPersona, collectionId, availableCollections = []) {
    if (collectionId) return collectionId;
    const existing = availableCollections.find((collection) => collection.name?.toLowerCase() === "unsorted");
    if (existing) return existing.id;
    const result = await goalCommands.createCollection({
      persona: targetPersona,
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
      const nodes = serializeTaskDrafts(goalDraft.initialNodes);
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
      collectionId: goal.collection_id || selectedCollectionId,
      name: goal.name || "",
      description: goal.description || "",
      tags: tagsToText(goal.tags),
      type: goal.type || "achievement",
      status: goal.status || "active",
      narrativeState: goal.narrative_state || "pursuing",
      priority: Boolean(goal.priority),
      initialNodes: [],
      assignAfterSave: false,
    });
  }

  function startGoalDuplicate(goal) {
    const targetPersona = activeSubject?.key || persona;
    setDuplicateDraft({
      goal,
      name: `${goal.name || "Goal"} copy`,
      targetPersona,
      collectionId: "",
      resetProgress: true,
      assignAfterSave: false,
    });
  }

  async function duplicateGoal() {
    if (!duplicateDraft?.goal?.id || !persona || !duplicateDraft.targetPersona) return;
    const targetPersona = duplicateDraft.targetPersona;
    setStatus({ loading: true, error: "", message: "" });
    try {
      const collectionId = await ensureCollectionForPersona(targetPersona, duplicateDraft.collectionId, duplicateCollections);
      const created = await goalCommands.duplicate({
        persona,
        id: duplicateDraft.goal.id,
        collection_id: collectionId,
        target_persona: targetPersona !== persona ? targetPersona : undefined,
        reset_progress: duplicateDraft.resetProgress,
        name: duplicateDraft.name.trim() || undefined,
      });

      const targetBinding = duplicateBinding || null;
      const targetBoundTargets = targetBinding?.targets || [];
      const targetCollectionBound = isTargetBound(targetBoundTargets, { type: "collection", id: collectionId });
      const targetGoalBound = isTargetBound(targetBoundTargets, { type: "goal", id: created.id });

      if (duplicateDraft.assignAfterSave && chatId && !targetCollectionBound && !targetGoalBound) {
        const nextBinding = await goalCommands.updateChat({
          persona: targetPersona,
          chat_id: chatId,
          targets: toUpdateTargets([...targetBoundTargets, { type: "goal", id: created.id }]),
        });
        if (targetPersona === persona) setChatBinding({ ...nextBinding, targets: nextBinding.targets || [] });
        setDuplicateBinding({ ...nextBinding, targets: nextBinding.targets || [] });
      }

      setDuplicateDraft(null);
      if (targetPersona === persona) {
        await loadLibrary(collectionId);
        setSelectedGoalId(created.id);
      }
      setStatus({ loading: false, error: "", message: targetPersona === persona ? "Goal duplicated." : "Goal duplicated to target subject." });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not duplicate goal.", message: "" });
    }
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

  async function searchLibrary(nextQuery = libraryQuery) {
    if (!persona) return;
    setStatus({ loading: true, error: "", message: "" });
    try {
      const result = await goalCommands.search({
        persona,
        query: nextQuery.trim(),
        include_suspended: includeSuspended,
      });
      setLibraryResults(Array.isArray(result.items) ? result.items : []);
      setStatus({ loading: false, error: "", message: "" });
    } catch (error) {
      setStatus({ loading: false, error: error?.message || "Could not search goal library.", message: "" });
    }
  }

  async function openLibraryResult(result) {
    const type = getSearchResultType(result);
    if (type === "collection") {
      await selectCollection(result.id);
      return;
    }
    startGoalEdit(result);
  }

  const visibleCollections = collections.filter((collection) => {
    const query = collectionQuery.trim().toLowerCase();
    if (!query) return true;
    return `${collection.name} ${collection.description} ${(collection.tags || []).join(" ")}`.toLowerCase().includes(query);
  });

  return (
    <div style={viewStyles.stack}>
      <section style={viewStyles.panel}>
        <div style={viewStyles.badgeRow}>
          <span style={viewStyles.badge}>
            <SubjectIcon subject={activeSubject} />
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
        <section style={{ ...viewStyles.libraryLayout, ...(!railOpen ? viewStyles.libraryLayoutRailClosed : null) }}>
          <aside style={{ ...viewStyles.libraryRail, ...(!railOpen ? viewStyles.libraryRailCollapsed : null) }}>
            {!railOpen ? (
              <div style={viewStyles.railIconStack} aria-label="Library tools">
                <button
                  type="button"
                  style={formStyles.iconButton}
                  title="New goal"
                  onClick={() => setGoalDraft(createBlankGoalDraft(selectedCollectionId))}
                >
                  <Plus size="0.875rem" />
                </button>
                <span style={viewStyles.sideRailDivider} />
                <button
                  type="button"
                  style={formStyles.iconButton}
                  title="Search and filters"
                  onClick={() => {
                    setRailMode("search");
                    setRailOpen(true);
                  }}
                >
                  <Search size="0.875rem" />
                </button>
                <button
                  type="button"
                  style={formStyles.iconButton}
                  title="Collection management"
                  onClick={() => {
                    setRailMode("collections");
                    setRailOpen(true);
                  }}
                >
                  <FolderCog size="0.875rem" />
                </button>
                <button
                  type="button"
                  style={formStyles.iconButton}
                  title="Refresh library"
                  onClick={() => loadLibrary(selectedCollectionId)}
                >
                  <RefreshCw size="0.875rem" style={status.loading ? viewStyles.draftingSpinner : null} />
                </button>
                <button type="button" style={formStyles.iconButton} title="Open rail" onClick={() => setRailOpen(true)}>
                  <PanelLeftOpen size="0.875rem" />
                </button>
              </div>
            ) : (
              <>
            <div style={viewStyles.panelHeader}>
              <div>
                <h3 style={viewStyles.title}>Library</h3>
                <p style={viewStyles.muted}>Search and management</p>
              </div>
              <div style={viewStyles.cardToolbar}>
                <button
                  type="button"
                  style={formStyles.iconButton}
                  title="New goal"
                  onClick={() => setGoalDraft(createBlankGoalDraft(selectedCollectionId))}
                >
                  <Plus size="0.875rem" />
                </button>
                <button
                  type="button"
                  style={formStyles.iconButton}
                  title="Close rail"
                  onClick={() => setRailOpen(false)}
                >
                  <PanelLeftClose size="0.875rem" />
                </button>
                <button
                  type="button"
                  style={formStyles.iconButton}
                  title="Refresh library"
                  onClick={() => loadLibrary(selectedCollectionId)}
                >
                  <RefreshCw size="0.875rem" style={status.loading ? viewStyles.draftingSpinner : null} />
                </button>
              </div>
            </div>
            <div style={viewStyles.sideToolTabs} role="tablist" aria-label="Library sidebar tools">
              <button
                type="button"
                style={{ ...viewStyles.sideToolTab, ...(railMode === "search" ? viewStyles.sideToolTabActive : null) }}
                onClick={() => setRailMode("search")}
              >
                <Search size="0.8125rem" />
                Search
              </button>
              <button
                type="button"
                style={{ ...viewStyles.sideToolTab, ...(railMode === "collections" ? viewStyles.sideToolTabActive : null) }}
                onClick={() => setRailMode("collections")}
              >
                <FolderCog size="0.8125rem" />
                Collections
              </button>
            </div>

            {railMode === "search" ? (
              <div style={viewStyles.stack}>
                <label style={formStyles.field}>
                  <span style={formStyles.label}>Search</span>
                  <div style={viewStyles.nodeAddRow}>
                    <input
                      style={formStyles.input}
                      value={libraryQuery}
                      onChange={(event) => setLibraryQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") searchLibrary(event.currentTarget.value);
                      }}
                      placeholder="Goals and collections"
                    />
                    <button type="button" style={formStyles.iconButton} title="Search library" onClick={() => searchLibrary()}>
                      <Search size="0.875rem" />
                    </button>
                  </div>
                </label>
                <div style={viewStyles.scrollStack}>
                  {libraryResults.map((result) => {
                    const type = getSearchResultType(result);
                    const bound = isTargetBound(boundTargets, { type, id: result.id });
                    return (
                      <button
                        key={`${type}:${result.id}`}
                        type="button"
                        style={viewStyles.libraryListButton}
                        onClick={() => openLibraryResult(result)}
                      >
                        <span style={viewStyles.subjectText}>
                          <span style={viewStyles.contextText}>{result.name}</span>
                          <span style={viewStyles.contextLabel}>
                            {type === "collection"
                              ? `${(result.goal_ids || []).length} goal${(result.goal_ids || []).length === 1 ? "" : "s"}`
                              : `${result.type || "goal"} / ${result.status || "active"}`}
                          </span>
                        </span>
                        <span style={{ ...viewStyles.badge, ...(bound ? null : viewStyles.badgeMuted) }}>{type}</span>
                      </button>
                    );
                  })}
                  {!libraryResults.length ? <div style={viewStyles.empty}>Search goals and collections for this subject.</div> : null}
                </div>
              </div>
            ) : (
              <div style={viewStyles.stack}>
                <label style={formStyles.field}>
                  <span style={formStyles.label}>Filter</span>
                  <input
                    style={formStyles.input}
                    value={collectionQuery}
                    onChange={(event) => setCollectionQuery(event.target.value)}
                    placeholder="Collection name"
                  />
                </label>
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
              </div>
            )}
              </>
            )}
          </aside>

          <div style={viewStyles.libraryDetail}>
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
                    <span style={viewStyles.librarySwitch}>
                      <SwitchField
                        checked={includeSuspended}
                        label="Show suspended"
                        onChange={setIncludeSuspended}
                      />
                    </span>
                  </div>
                </div>

                <div style={viewStyles.panel}>
                  <div style={viewStyles.panelHeader}>
                    <div>
                      <h3 style={viewStyles.title}>Goals</h3>
                      <p style={viewStyles.muted}>{goals.length} in this collection</p>
                    </div>
                  </div>
                  {goals.length ? (
                    <div style={viewStyles.scrollStack}>
                      {goals.map((goal) => (
                        <GoalLibraryRow
                          boundTargets={boundTargets}
                          collectionBound={collectionBound}
                          goal={goal}
                          isSelected={goal.id === selectedGoalId}
                          key={goal.id}
                          onBind={() => bindTarget({ type: "goal", id: goal.id })}
                          onDelete={() => deleteGoal(goal)}
                          onDuplicate={() => startGoalDuplicate(goal)}
                          onEdit={() => startGoalEdit(goal)}
                          onSelect={() => setSelectedGoalId(goal.id)}
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
              <div style={viewStyles.empty}>
                <p style={viewStyles.note}>Use the Library rail to create a goal or add a collection for this subject.</p>
              </div>
            )}
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

      {duplicateDraft ? (
        <GoalDuplicateDialog
          activeSubject={activeSubject}
          binding={duplicateBinding}
          chatId={chatId}
          collections={duplicateCollections}
          draft={duplicateDraft}
          loading={duplicateLoading}
          onCancel={() => setDuplicateDraft(null)}
          onChange={setDuplicateDraft}
          onDuplicate={duplicateGoal}
          subjectOptions={subjectOptions}
        />
      ) : null}

      <StatusSnackbar message={status.error || status.message} />
    </div>
  );
}

function GoalLibraryRow({
  boundTargets,
  collectionBound,
  goal,
  isSelected,
  onBind,
  onDelete,
  onDuplicate,
  onEdit,
  onSelect,
  onTogglePriority,
  onToggleStatus,
}) {
  const goalBound = isTargetBound(boundTargets, { type: "goal", id: goal.id });
  return (
    <article
      style={{
        ...viewStyles.goalLibraryCard,
        ...(isSelected ? viewStyles.goalLibraryCardSelected : null),
      }}
    >
      <button type="button" style={viewStyles.goalLibrarySelectButton} onClick={onSelect}>
        <span style={{ ...viewStyles.badge, ...(goal.priority ? null : viewStyles.badgeMuted) }}>
          {goal.priority ? <Star size="0.75rem" /> : null}
          {goal.type}
        </span>
        <span style={viewStyles.subjectText}>
          <span style={viewStyles.contextText}>{goal.name}</span>
          <span style={viewStyles.goalDescription}>{goal.description || "No description"}</span>
          <span style={viewStyles.contextLabel}>
            {goal.status}{goal.type === "achievement" && goal.narrative_state ? ` / ${goal.narrative_state}` : ""}
            {goalBound || collectionBound ? " / assigned to chat" : ""}
          </span>
        </span>
        <ChevronRight size="0.875rem" />
      </button>
      {isSelected ? (
        <div style={viewStyles.goalCardActions}>
          <button type="button" style={{ ...formStyles.secondaryButton, ...formStyles.compactButton }} title="Edit goal" onClick={onEdit}>
            <Pencil size="0.8125rem" />
            Edit
          </button>
          <button type="button" style={{ ...formStyles.secondaryButton, ...formStyles.compactButton }} title="Duplicate goal" onClick={onDuplicate}>
            <Copy size="0.8125rem" />
            Duplicate
          </button>
          <button type="button" style={{ ...formStyles.secondaryButton, ...formStyles.compactButton }} title="Toggle priority" onClick={onTogglePriority}>
            <Star size="0.8125rem" />
            {goal.priority ? "Unmark priority" : "Priority"}
          </button>
          <button type="button" style={{ ...formStyles.secondaryButton, ...formStyles.compactButton }} title="Suspend or resume" onClick={onToggleStatus}>
            {goal.status === "suspended" ? <RefreshCw size="0.8125rem" /> : <EyeOff size="0.8125rem" />}
            {goal.status === "suspended" ? "Resume" : "Suspend"}
          </button>
          <button
            type="button"
            style={{ ...formStyles.secondaryButton, ...formStyles.compactButton }}
            title="Assign goal"
            onClick={onBind}
            disabled={goalBound || collectionBound}
          >
            {goalBound || collectionBound ? <CheckCircle2 size="0.8125rem" /> : <Target size="0.8125rem" />}
            {goalBound || collectionBound ? "Assigned" : "Assign"}
          </button>
          <button type="button" style={{ ...formStyles.secondaryButton, ...formStyles.compactButton }} title="Delete goal" onClick={onDelete}>
            <Trash2 size="0.8125rem" />
            Delete
          </button>
        </div>
      ) : null}
    </article>
  );
}

function GoalDuplicateDialog({
  activeSubject,
  binding,
  chatId,
  collections,
  draft,
  loading,
  onCancel,
  onChange,
  onDuplicate,
  subjectOptions,
}) {
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState("");
  const targetSubject = subjectOptions.find((subject) => subject.key === draft.targetPersona) || null;
  const collectionBound = draft.collectionId
    ? isTargetBound(binding?.targets || [], { type: "collection", id: draft.collectionId })
    : (collections || []).some((collection) => (
        collection.name?.toLowerCase() === "unsorted" &&
        isTargetBound(binding?.targets || [], { type: "collection", id: collection.id })
      ));

  return (
    <div style={viewStyles.modalBackdrop}>
      <section style={viewStyles.modalPanel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Duplicate Goal</h3>
            <p style={viewStyles.muted}>{draft.goal?.name || "Selected goal"}</p>
          </div>
          <button type="button" style={formStyles.iconButton} title="Close duplicate goal" onClick={onCancel}>
            <X size="0.875rem" />
          </button>
        </div>

        <label style={formStyles.field}>
          <span style={formStyles.label}>Name</span>
          <input
            style={formStyles.input}
            value={draft.name}
            onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
            placeholder="Duplicate goal name"
          />
        </label>

        <div style={viewStyles.fieldGrid}>
          <div style={formStyles.field}>
            <span style={formStyles.label}>Target subject</span>
            <div style={viewStyles.subjectSelectCard}>
              <SubjectIcon subject={targetSubject || activeSubject} />
              <span style={viewStyles.subjectText}>
                <span style={viewStyles.contextText}>{targetSubject?.label || activeSubject?.label || draft.targetPersona}</span>
                <span style={viewStyles.contextLabel}>{targetSubject?.mode || activeSubject?.mode || "subject"}</span>
              </span>
              <button type="button" style={{ ...formStyles.secondaryButton, ...formStyles.compactButton }} onClick={() => setSubjectPickerOpen(true)}>
                Change
              </button>
            </div>
          </div>
          <label style={formStyles.field}>
            <span style={formStyles.label}>Target collection</span>
            <select
              disabled={loading}
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
        </div>

        <div style={viewStyles.stack}>
          <SwitchField
            checked={draft.resetProgress}
            label="Reset progress"
            onChange={(checked) => onChange((current) => ({ ...current, resetProgress: checked }))}
          />
          {chatId ? (
            <SwitchField
              checked={draft.assignAfterSave}
              label="Assign to current chat after save"
              onChange={(checked) => onChange((current) => ({ ...current, assignAfterSave: checked }))}
            />
          ) : null}
        </div>

        <div style={viewStyles.badgeRow}>
          <span style={viewStyles.badge}>
            <SubjectIcon subject={targetSubject || activeSubject} />
            {targetSubject?.label || activeSubject?.label || draft.targetPersona}
          </span>
          <span style={{ ...viewStyles.badge, ...(collectionBound ? null : viewStyles.badgeMuted) }}>
            {collectionBound ? "Target collection already assigned" : "Target collection not assigned"}
          </span>
        </div>
        {collectionBound ? (
          <p style={viewStyles.note}>The target collection is already assigned to this chat, so the duplicate does not need a separate goal binding.</p>
        ) : null}

        <div style={viewStyles.debugActionRow}>
          <button type="button" style={formStyles.secondaryButton} onClick={onCancel}>
            <X size="0.875rem" />
            Cancel
          </button>
          <button type="button" style={formStyles.primaryButton} onClick={onDuplicate} disabled={loading || !draft.targetPersona}>
            <Copy size="0.875rem" />
            Duplicate
          </button>
        </div>
        {subjectPickerOpen ? (
          <SubjectPickerDialog
            activeKey={draft.targetPersona}
            onClose={() => {
              setSubjectPickerOpen(false);
              setSubjectQuery("");
            }}
            onQueryChange={setSubjectQuery}
            onSelect={(subject) => {
              onChange((current) => ({ ...current, targetPersona: subject.key, collectionId: "" }));
              setSubjectPickerOpen(false);
              setSubjectQuery("");
            }}
            query={subjectQuery}
            subjects={subjectOptions}
            title="Choose Target Subject"
          />
        ) : null}
      </section>
    </div>
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
              ? "This collection is assigned to the chat, so new goals here already appear in Milestones."
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
        <TaskDraftEditor
          nodes={draft.initialNodes}
          onChange={(nodes) => onChange((current) => ({ ...current, initialNodes: nodes }))}
        />
      ) : null}
      <div style={viewStyles.stack}>
        <SwitchField
          checked={draft.priority}
          label="Priority"
          onChange={(checked) => onChange((current) => ({ ...current, priority: checked }))}
        />
        {draft.mode === "create" && hasChat && !collectionBound ? (
          <SwitchField
            checked={draft.assignAfterSave}
            label="Assign to current chat after save"
            onChange={(checked) => onChange((current) => ({ ...current, assignAfterSave: checked }))}
          />
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

function updateTaskDraft(nodes, id, updater) {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    return { ...node, children: updateTaskDraft(node.children || [], id, updater) };
  });
}

function removeTaskDraft(nodes, id) {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeTaskDraft(node.children || [], id) }));
}

function findTaskDraft(nodes, id, parentId = null, path = []) {
  for (const node of nodes) {
    const nextPath = [...path, node];
    if (node.id === id) return { node, parentId, path: nextPath };
    const childMatch = findTaskDraft(node.children || [], id, node.id, nextPath);
    if (childMatch) return childMatch;
  }
  return null;
}

function directSubtaskLabel(node) {
  const count = Array.isArray(node.children) ? node.children.length : 0;
  return `${count} directive${count === 1 ? "" : "s"}`;
}

function TaskDraftEditor({ nodes, onChange }) {
  const taskNodes = Array.isArray(nodes) ? nodes : [];
  const [focusedTaskId, setFocusedTaskId] = useState("");
  const [rootPickerOpen, setRootPickerOpen] = useState(false);
  const focusedMatch = focusedTaskId ? findTaskDraft(taskNodes, focusedTaskId) : null;
  const focusedTask = focusedMatch?.node || null;
  const focusedParentId = focusedMatch?.parentId || "";

  function addRoot() {
    const task = createTaskDraft();
    onChange([...taskNodes, task]);
    setFocusedTaskId(task.id);
  }

  function updateNode(id, patch) {
    onChange(updateTaskDraft(taskNodes, id, (node) => ({ ...node, ...patch })));
  }

  function addChild(id) {
    const child = createTaskDraft();
    onChange(updateTaskDraft(taskNodes, id, (node) => ({
      ...node,
      children: [...(node.children || []), child],
    })));
    setFocusedTaskId(child.id);
  }

  function deleteFocused() {
    if (!focusedTask) return;
    onChange(removeTaskDraft(taskNodes, focusedTask.id));
    setFocusedTaskId(focusedParentId);
  }

  function returnToRoot() {
    if (taskNodes.length <= 1) {
      setFocusedTaskId(taskNodes[0]?.id || "");
      return;
    }
    setRootPickerOpen(true);
  }

  return (
    <section style={viewStyles.stack}>
      <div style={viewStyles.panelHeader}>
        <div>
          <h3 style={viewStyles.title}>Initial Milestones</h3>
          <p style={viewStyles.muted}>
            {focusedTask
              ? "Edit one milestone or directive, then navigate through its child directives."
              : "Create milestones that move the subject toward the goal."}
          </p>
        </div>
        <div style={viewStyles.cardToolbar}>
          {focusedTask ? (
            <button type="button" style={formStyles.secondaryButton} onClick={() => setFocusedTaskId(focusedParentId)}>
              <ChevronRight size="0.875rem" style={{ transform: "rotate(180deg)" }} />
              Back
            </button>
          ) : null}
          {focusedTask ? (
            <button type="button" style={formStyles.secondaryButton} onClick={returnToRoot}>
              Root
            </button>
          ) : null}
          {!focusedTask ? (
            <button type="button" style={formStyles.secondaryButton} onClick={addRoot}>
              <Plus size="0.875rem" />
              Add milestone
            </button>
          ) : null}
        </div>
      </div>

      {focusedTask ? (
        <TaskDraftCard
          node={focusedTask}
          onAddChild={addChild}
          onDelete={deleteFocused}
          onNavigate={setFocusedTaskId}
          onRoot={returnToRoot}
          onUpdate={updateNode}
          path={focusedMatch.path}
        />
      ) : taskNodes.length ? (
        <div style={viewStyles.taskDraftRow}>
          <div style={viewStyles.panelHeader}>
            <div>
              <h4 style={viewStyles.title}>Goal Root</h4>
              <p style={viewStyles.muted}>{taskNodes.length} milestone{taskNodes.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div style={viewStyles.nodeTree}>
            {taskNodes.map((node) => (
              <TaskLinkRow key={node.id} node={node} onNavigate={setFocusedTaskId} />
            ))}
          </div>
        </div>
      ) : (
        <div style={viewStyles.empty}>No initial milestones yet.</div>
      )}
      {rootPickerOpen ? (
        <RootPickerDialog
          nodes={taskNodes}
          onClose={() => setRootPickerOpen(false)}
          onSelect={(id) => {
            setFocusedTaskId(id);
            setRootPickerOpen(false);
          }}
          onShowRootList={() => {
            setFocusedTaskId("");
            setRootPickerOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function TaskDraftCard({ node, onAddChild, onDelete, onNavigate, onRoot, onUpdate, path }) {
  const children = Array.isArray(node.children) ? node.children : [];
  const isAccumulation = node.resolutionMode === "accumulation";

  return (
    <div style={viewStyles.taskDraftRow}>
      <div style={viewStyles.panelHeader}>
        <div>
          <h4 style={viewStyles.title}>{node.text.trim() || "Untitled milestone"}</h4>
          <p style={viewStyles.muted}>
            {path.map((item) => item.text.trim() || "Untitled").join(" / ")}
          </p>
        </div>
        <div style={viewStyles.cardToolbar}>
          <button type="button" style={formStyles.iconButton} title="Back to root" onClick={onRoot}>
            <ChevronRight size="0.8125rem" style={{ transform: "rotate(180deg)" }} />
          </button>
          <button type="button" style={formStyles.iconButton} title="Delete milestone or directive" onClick={onDelete}>
            <Trash2 size="0.8125rem" />
          </button>
        </div>
      </div>

      <label style={formStyles.field}>
        <span style={formStyles.label}>Milestone or directive</span>
        <input
          style={formStyles.input}
          value={node.text}
          onChange={(event) => onUpdate(node.id, { text: event.target.value })}
          placeholder="What should move toward or away from this outcome?"
        />
      </label>

      <div style={viewStyles.nodeControls}>
        <select
          style={{ ...formStyles.input, maxWidth: "10rem" }}
          value={node.resolutionMode}
          onChange={(event) => onUpdate(node.id, { resolutionMode: event.target.value })}
        >
          <option value="checklist">Checklist</option>
          <option value="accumulation">Accumulation</option>
        </select>
        {isAccumulation ? (
          <input
            min="1"
            style={{ ...formStyles.input, maxWidth: "5rem" }}
            type="number"
            value={node.target}
            onChange={(event) => onUpdate(node.id, { target: Math.max(1, Number(event.target.value) || 1) })}
            aria-label="Accumulation target"
          />
        ) : null}
      </div>

      <div style={viewStyles.panelHeader}>
        <div>
          <h4 style={viewStyles.title}>Directives</h4>
          <p style={viewStyles.muted}>{children.length} directive{children.length === 1 ? "" : "s"}</p>
        </div>
        <button type="button" style={formStyles.secondaryButton} onClick={() => onAddChild(node.id)}>
          <Plus size="0.875rem" />
          Add directive
        </button>
      </div>
      {children.length ? (
        <div style={viewStyles.nodeTree}>
          {children.map((child) => (
            <TaskLinkRow key={child.id} node={child} onNavigate={onNavigate} />
          ))}
        </div>
      ) : (
        <div style={viewStyles.empty}>No directives under this milestone.</div>
      )}
    </div>
  );
}

function RootPickerDialog({ nodes, onClose, onSelect, onShowRootList }) {
  return (
    <div style={viewStyles.modalBackdrop}>
      <section style={viewStyles.modalPanel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>Choose Root Milestone</h3>
            <p style={viewStyles.muted}>Jump to a milestone, or return to the root list.</p>
          </div>
          <button type="button" style={formStyles.iconButton} title="Close root picker" onClick={onClose}>
            <X size="0.875rem" />
          </button>
        </div>
        <button type="button" style={viewStyles.taskLinkRow} onClick={onShowRootList}>
          <span style={viewStyles.subjectText}>
            <span style={viewStyles.contextText}>Root milestone list</span>
            <span style={viewStyles.contextLabel}>{nodes.length} milestone{nodes.length === 1 ? "" : "s"}</span>
          </span>
          <ChevronRight size="0.875rem" />
        </button>
        <div style={viewStyles.scrollStack}>
          {nodes.map((node) => (
            <TaskLinkRow key={node.id} node={node} onNavigate={onSelect} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TaskLinkRow({ node, onNavigate }) {
  return (
    <button type="button" style={viewStyles.taskLinkRow} onClick={() => onNavigate(node.id)}>
      <span style={viewStyles.subjectText}>
        <span style={viewStyles.contextText}>{node.text.trim() || "Untitled milestone"}</span>
        <span style={viewStyles.contextLabel}>{directSubtaskLabel(node)}</span>
      </span>
      <ChevronRight size="0.875rem" />
    </button>
  );
}

function SwitchField({ checked, label, onChange }) {
  return (
    <label style={formStyles.switchRow}>
      <span style={viewStyles.subjectText}>
        <span style={viewStyles.contextText}>{label}</span>
      </span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={formStyles.switchInput}
        type="checkbox"
      />
      <span style={{ ...formStyles.switchTrack, ...(checked ? formStyles.switchTrackOn : null) }} aria-hidden="true">
        <span style={{ ...formStyles.switchThumb, ...(checked ? formStyles.switchThumbOn : null) }} />
      </span>
    </label>
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

function SubjectIcon({ subject, mode }) {
  const resolvedMode = subject?.mode || mode;
  if (subject?.avatarUrl) {
    return (
      <span style={viewStyles.subjectAvatarFrame}>
        <img
          alt=""
          src={subject.avatarUrl}
          style={{
            ...viewStyles.subjectAvatarImage,
            ...getAvatarCropStyle(subject.avatarCrop),
          }}
        />
      </span>
    );
  }
  if (resolvedMode === "character") return <Users size="0.875rem" />;
  if (resolvedMode === "extras") return <Users size="0.875rem" />;
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
