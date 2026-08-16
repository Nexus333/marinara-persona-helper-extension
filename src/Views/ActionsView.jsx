import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Edit3,
  Lightbulb,
  LoaderCircle,
  PlusCircle,
  RotateCcw,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";
import { Field } from "../Components/Field.jsx";
import { LorebookSelectModal } from "../Components/LorebookSelectModal.jsx";
import { PromptSelectModal } from "../Components/PromptSelectModal.jsx";
import { StatusSnackbar } from "../Components/StatusSnackbar.jsx";
import { extractionApi } from "../API/extraction.js";
import { makeLorebookEntryPointer } from "../API/lorebooks.js";
import { generate, getActiveChatId, getConnections, getRecentMessages, resolveGenerationConnectionId } from "../API/marinara.js";
import { promptApi } from "../API/prompt.js";
import { loadPersonaHelperSettings, savePersonaHelperSettings } from "../API/settings.js";
import { formStyles } from "../Styles/formStyles.js";
import { promptPickerStyles } from "../Styles/promptPickerStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

const ACTIVE_HINTS_KEY = "persona-helper-active-action-hints";
const RECENT_HINTS_KEY = "persona-helper-recent-action-hints";
const ACTION_PROMPT_KEY = "persona-helper-action-prompt";
const ACTION_PROMPT_VALIDATION_KEY = "persona-helper-action-prompt-validation";
const ACTION_PROMPT_OVERRIDES_KEY = "persona-helper-action-prompt-overrides";
const ACTION_CONTEXT_ENTRIES_KEY = "persona-helper-action-context-entries";
const SHOW_PROMPT_KEY = "persona-helper-show-prompt";
const SHOW_GENERATION_OUTPUT_KEY = "persona-helper-show-generation-output";
const PROMPT_SYSTEM_TEXT_KEY = "persona-helper-prompt-system-text";
const PROMPT_MESSAGE_SET_KEY = "persona-helper-prompt-message-set";
const RAW_GENERATION_OUTPUT_KEY = "persona-helper-raw-generation-output";
const RAW_GENERATION_THINKING_KEY = "persona-helper-raw-generation-thinking";
const ACTION_REQUIRED_FIELDS = ["intention", "approach"];
const ACTION_HINT_EXTRACTION_FORMAT = "xml";
const ACTION_HINT_EXTRACTION_FIELD = "action_hint";
const AUTHOR_NOTE_DOCUMENT_NAME = "Authors_Note";
const AUTHOR_NOTE_DOCUMENT_SOURCE = "persona-helper";
const DRAFTING_STATUSES = [
  "Drafting hints",
  "Compiling suggestions",
  "Checking context",
  "Shaping options",
  "Parsing possibilities",
  "Tuning choices",
];
const DRAFTING_BASE_COLOR = "#777";
const DRAFTING_PULSE_COLOR = "#CCC";
const DRAFTING_PULSE_TRAIL_COLOR = "#999";
const DRAFTING_ELLIPSIS = "...";

const EMPTY_DRAFT = {
  intention: "",
  approach: "",
  notes: "",
};

function createHint(text, source = "generated") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text,
    source,
    createdAt: new Date().toISOString(),
  };
}

function readStoredHints(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((hint) => hint && hint.id && hint.text) : [];
  } catch {
    return [];
  }
}

function writeStoredHints(key, hints) {
  window.localStorage.setItem(key, JSON.stringify(hints));
}

function readStoredPrompt() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACTION_PROMPT_KEY) || "null");
    return parsed && typeof parsed === "object" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredPrompt(prompt) {
  if (!prompt) {
    window.localStorage.removeItem(ACTION_PROMPT_KEY);
    return;
  }
  window.localStorage.setItem(ACTION_PROMPT_KEY, JSON.stringify(prompt));
}

function readStoredObject(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredObject(key, value) {
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readStoredBoolean(key) {
  return window.localStorage.getItem(key) === "true";
}

function writeStoredBoolean(key, value) {
  window.localStorage.setItem(key, value ? "true" : "false");
}

function readStoredString(key) {
  return window.localStorage.getItem(key) || "";
}

function writeStoredString(key, value) {
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}

function readStoredContextEntries() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACTION_CONTEXT_ENTRIES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry?.id && entry?.lorebookId && entry?.name);
  } catch {
    return [];
  }
}

function writeStoredContextEntries(entries) {
  window.localStorage.setItem(ACTION_CONTEXT_ENTRIES_KEY, JSON.stringify(entries));
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

function makeOverrideRows(prompt, validation) {
  if (!prompt || !validation) return [];
  const requirementMap = createRequirementMap(prompt);
  const requiredFields = new Set(ACTION_REQUIRED_FIELDS);
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

function makeActionRows(prompt, validation) {
  if (!prompt || !validation) return [];
  const requirementMap = createRequirementMap(prompt);

  return ACTION_REQUIRED_FIELDS.flatMap((name) => {
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
    if (!requirement.var_name || ACTION_REQUIRED_FIELDS.includes(requirement.var_name)) return;
    const current = additional.get(requirement.var_name);
    additional.set(requirement.var_name, {
      required: current?.required || requirement.default === null,
    });
  });

  const missingFields = ACTION_REQUIRED_FIELDS.filter((field) => !fieldNames.has(field));
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

function escapeDocumentContent(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  const trimmed = notes.trim();
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

function buildPromptMessageSet({ draft, systemPrompt, contextEntries, chatHistory = "", extractionPrompt = "" }) {
  const attachedDocuments = wrapContextDocuments(contextEntries);
  const authorNote = wrapAuthorNoteDocument(draft.notes);
  const requestContext = buildGenerationContextRequest(draft);

  return JSON.stringify(
    [
      {
        block: "chat_history",
        role: "user",
        content: chatHistory || "Recent chat messages from the current chat will be inserted here when available.",
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
        content: requestContext || "Action hint generation context will be inserted here.",
      },
      {
        block: "extraction_prompt",
        role: "user",
        content: extractionPrompt.trim() || `${ACTION_HINT_EXTRACTION_FORMAT}:${ACTION_HINT_EXTRACTION_FIELD}`,
      },
    ],
    null,
    2,
  );
}

function messageName(value) {
  const normalized = value.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 64);
  return normalized || undefined;
}

function buildGenerationContextRequest(draft) {
  const parts = [
    draft.intention.trim() ? `Intention: ${draft.intention.trim()}` : "",
    draft.approach.trim() ? `Approach: ${draft.approach.trim()}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function buildGenerationMessages({ draft, systemPrompt, contextEntries, chatHistory = "", extractionPrompt = "" }) {
  const attachedDocuments = wrapContextDocuments(contextEntries);
  const authorNote = wrapAuthorNoteDocument(draft.notes);
  const requestContext = buildGenerationContextRequest(draft);
  return [
    ...(chatHistory
      ? [
          {
            role: "user",
            content: chatHistory,
            name: messageName("Chat History"),
          },
        ]
      : []),
    ...(attachedDocuments
      ? [
          {
            role: "user",
            content: attachedDocuments,
            name: messageName("Attached Documents"),
          },
        ]
      : []),
    ...(systemPrompt.trim()
      ? [
          {
            role: "system",
            content: systemPrompt.trim(),
            name: messageName("Persona Helper"),
          },
        ]
      : []),
    ...(authorNote
      ? [
          {
            role: "user",
            content: authorNote,
            name: messageName("Authors Note"),
          },
        ]
      : []),
    ...(requestContext
      ? [
          {
            role: "user",
            content: requestContext,
            name: messageName("Generation Context"),
          },
        ]
      : []),
    {
      role: "user",
      content: extractionPrompt.trim() || "Return concise action hints as separate XML items.",
      name: messageName("Extraction Prompt"),
    },
  ];
}

async function getActionHintExtractionPrompt() {
  return extractionApi.getPrompt(ACTION_HINT_EXTRACTION_FORMAT, ACTION_HINT_EXTRACTION_FIELD);
}

async function getCurrentChatHistory(settings) {
  const limit = chatHistoryLimit(settings);
  if (!limit) return "";
  const chatId = getActiveChatId();
  if (!chatId) return "";
  try {
    const messages = await getRecentMessages(chatId, limit);
    return wrapChatHistory(messages);
  } catch (err) {
    console.warn("[Persona Helper] Could not load current chat history.", err);
    return "";
  }
}

async function parseGeneratedHints(output) {
  const extracted = await extractionApi.parse(ACTION_HINT_EXTRACTION_FORMAT, ACTION_HINT_EXTRACTION_FIELD, output, true);
  return extracted.slice(0, 12);
}

function parseHintOutput(output) {
  return output
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
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

function recentHintLimit(settings) {
  const parsed = optionalInt(settings.recentHintLimit);
  if (parsed === undefined) return 20;
  return Math.min(200, Math.max(1, parsed));
}

function chatHistoryLimit(settings) {
  const parsed = optionalInt(settings.chatHistoryLimit);
  if (parsed === undefined) return 20;
  return Math.min(200, Math.max(0, parsed));
}

function randomDraftingStatus(current = "") {
  const options = DRAFTING_STATUSES.filter((status) => status !== current);
  const list = options.length ? options : DRAFTING_STATUSES;
  return list[Math.floor(Math.random() * list.length)] || "Drafting hints";
}

function draftingCharacterColor(index, pulse) {
  const distance = Math.abs(index - pulse);
  if (distance === 0) return DRAFTING_PULSE_COLOR;
  if (distance === 1) return DRAFTING_PULSE_TRAIL_COLOR;
  return DRAFTING_BASE_COLOR;
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

function buildActionGenerationContext({ draft, prompt, validation, promptOverrides, contextEntries = [] }) {
  const actionValues = {
    intention: draft.intention.trim(),
    approach: draft.approach.trim(),
  };
  const overrides = {};

  [...makeActionRows(prompt, validation), ...makeOverrideRows(prompt, validation)].forEach((row) => {
    if (!row.entryId) return;
    const value = ACTION_REQUIRED_FIELDS.includes(row.name) ? actionValues[row.name] : (promptOverrides[row.id] ?? "");
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

  return {
    overrides,
    documents: [wrapContextDocuments(contextEntries), wrapAuthorNoteDocument(draft.notes)].filter(Boolean).join("\n\n"),
  };
}

function createDefaultOverrides(prompt, validation, current = {}) {
  return Object.fromEntries(
    makeOverrideRows(prompt, validation).map((row) => [row.id, current[row.id] ?? current[row.name] ?? row.defaultValue ?? ""]),
  );
}

function formatTimestamp(value) {
  if (!value) return "Draft";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Draft";
  }
}

export function ActionsView({ activeTab }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [composerOpen, setComposerOpen] = useState(true);
  const [activeHints, setActiveHints] = useState(() => readStoredHints(ACTIVE_HINTS_KEY));
  const [recentHints, setRecentHints] = useState(() => readStoredHints(RECENT_HINTS_KEY));
  const [selectedHintId, setSelectedHintId] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState(() => readStoredPrompt());
  const [promptValidation, setPromptValidation] = useState(() => readStoredObject(ACTION_PROMPT_VALIDATION_KEY));
  const [promptOverrides, setPromptOverrides] = useState(() => readStoredObject(ACTION_PROMPT_OVERRIDES_KEY) || {});
  const [contextEntries, setContextEntries] = useState(() => readStoredContextEntries());
  const [contextOpen, setContextOpen] = useState(false);
  const [lorebookModalOpen, setLorebookModalOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(() => readStoredBoolean(SHOW_PROMPT_KEY));
  const [showGenerationOutput, setShowGenerationOutput] = useState(() => readStoredBoolean(SHOW_GENERATION_OUTPUT_KEY));
  const [capturedSystemPrompt, setCapturedSystemPrompt] = useState(() => readStoredString(PROMPT_SYSTEM_TEXT_KEY));
  const [capturedMessageSet, setCapturedMessageSet] = useState(() => readStoredString(PROMPT_MESSAGE_SET_KEY));
  const [rawGenerationOutput, setRawGenerationOutput] = useState(() => readStoredString(RAW_GENERATION_OUTPUT_KEY));
  const [rawGenerationThinking, setRawGenerationThinking] = useState(() => readStoredString(RAW_GENERATION_THINKING_KEY));
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [promptPreviewTab, setPromptPreviewTab] = useState("system");
  const [rawGenerationOpen, setRawGenerationOpen] = useState(false);
  const [rawGenerationTab, setRawGenerationTab] = useState("output");
  const [gettingPrompt, setGettingPrompt] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draftingStatus, setDraftingStatus] = useState(() => randomDraftingStatus());
  const [draftingPulse, setDraftingPulse] = useState(0);
  const [settings, setSettings] = useState(() => loadPersonaHelperSettings());
  const [connections, setConnections] = useState([]);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [editingHintId, setEditingHintId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    writeStoredHints(ACTIVE_HINTS_KEY, activeHints);
  }, [activeHints]);

  useEffect(() => {
    if (!selectedHintId) return;
    const exists = [...activeHints, ...recentHints].some((hint) => hint.id === selectedHintId);
    if (!exists) setSelectedHintId("");
  }, [activeHints, recentHints, selectedHintId]);

  useEffect(() => {
    writeStoredHints(RECENT_HINTS_KEY, recentHints.slice(0, recentHintLimit(settings)));
  }, [recentHints, settings]);

  useEffect(() => {
    const limit = recentHintLimit(settings);
    setRecentHints((current) => (current.length > limit ? current.slice(0, limit) : current));
  }, [settings.recentHintLimit]);

  useEffect(() => {
    if (!generating) return undefined;
    setDraftingStatus((current) => randomDraftingStatus(current));
    setDraftingPulse(0);
    const interval = window.setInterval(() => {
      setDraftingStatus((current) => randomDraftingStatus(current));
    }, 1400);
    const pulseInterval = window.setInterval(() => {
      setDraftingPulse((current) => current + 1);
    }, 260);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(pulseInterval);
    };
  }, [generating]);

  useEffect(() => {
    writeStoredPrompt(selectedPrompt);
  }, [selectedPrompt]);

  useEffect(() => {
    writeStoredObject(ACTION_PROMPT_VALIDATION_KEY, promptValidation);
  }, [promptValidation]);

  useEffect(() => {
    writeStoredObject(ACTION_PROMPT_OVERRIDES_KEY, promptOverrides);
  }, [promptOverrides]);

  useEffect(() => {
    writeStoredContextEntries(contextEntries);
  }, [contextEntries]);

  useEffect(() => {
    writeStoredBoolean(SHOW_PROMPT_KEY, showPrompt);
  }, [showPrompt]);

  useEffect(() => {
    writeStoredBoolean(SHOW_GENERATION_OUTPUT_KEY, showGenerationOutput);
  }, [showGenerationOutput]);

  useEffect(() => {
    writeStoredString(PROMPT_SYSTEM_TEXT_KEY, capturedSystemPrompt);
  }, [capturedSystemPrompt]);

  useEffect(() => {
    writeStoredString(PROMPT_MESSAGE_SET_KEY, capturedMessageSet);
  }, [capturedMessageSet]);

  useEffect(() => {
    writeStoredString(RAW_GENERATION_OUTPUT_KEY, rawGenerationOutput);
  }, [rawGenerationOutput]);

  useEffect(() => {
    writeStoredString(RAW_GENERATION_THINKING_KEY, rawGenerationThinking);
  }, [rawGenerationThinking]);

  useEffect(() => {
    if (!selectedPrompt) return;
    const summary = createPromptContractSummary(selectedPrompt);
    setPromptValidation(summary);
    setPromptOverrides((current) => createDefaultOverrides(selectedPrompt, summary, current));
  }, [selectedPrompt]);

  useEffect(() => {
    let cancelled = false;
    getConnections()
      .then((items) => {
        if (!cancelled) setConnections(items);
      })
      .catch((err) => {
        if (!cancelled) showMessage(err instanceof Error ? err.message : "Could not load connections.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const composerLabel = useMemo(() => {
    if (editingHintId) return "Edit Hint";
    return activeHints.length ? "Draft More Hints" : "Draft Hints";
  }, [activeHints.length, editingHintId]);

  const overrideRows = useMemo(
    () => makeOverrideRows(selectedPrompt, promptValidation),
    [promptValidation, selectedPrompt],
  );

  const promptSystemPreview = useMemo(() => {
    if (capturedSystemPrompt.trim()) return capturedSystemPrompt;
    return stitchSelectedPromptText(selectedPrompt);
  }, [capturedSystemPrompt, selectedPrompt]);

  const promptMessageSetPreview = useMemo(() => {
    if (capturedMessageSet.trim()) return capturedMessageSet;
    return buildPromptMessageSet({ draft, systemPrompt: promptSystemPreview, contextEntries });
  }, [capturedMessageSet, contextEntries, draft, promptSystemPreview]);

  function showMessage(nextMessage) {
    setMessage("");
    window.setTimeout(() => setMessage(nextMessage), 0);
  }

  function resetComposer() {
    setDraft(EMPTY_DRAFT);
    setEditingHintId(null);
  }

  function appendToRecent(hints) {
    setRecentHints((current) => {
      const merged = [...hints, ...current];
      const seen = new Set();
      return merged.filter((hint) => {
        const fingerprint = hint.text.trim().toLowerCase();
        if (!fingerprint || seen.has(fingerprint)) return false;
        seen.add(fingerprint);
        return true;
      }).slice(0, recentHintLimit(settings));
    });
  }

  function generatePlaceholderHints() {
    const intention = draft.intention.trim();
    const approach = draft.approach.trim();
    const notes = draft.notes.trim();
    const generationContext = buildActionGenerationContext({
      draft,
      prompt: selectedPrompt,
      validation: promptValidation,
      promptOverrides,
      contextEntries,
    });

    if (editingHintId) {
      const text = intention || approach || notes;
      if (!text) return;
      setActiveHints((current) =>
        current.map((hint) => (hint.id === editingHintId ? { ...hint, text, updatedAt: new Date().toISOString() } : hint)),
      );
      setSelectedHintId(editingHintId);
      resetComposer();
      setComposerOpen(false);
      showMessage("Hint updated.");
      return;
    }

    if (!intention) return;

    const nextHints = [
      createHint(`Find one scene detail that can become leverage toward: ${intention}.`),
      createHint(
        approach
          ? `Make the next move express the approach: ${approach}.`
          : "Choose an approach before asking the scene for a consequence.",
      ),
      createHint(
        generationContext.documents || contextEntries.length
          ? "Use the attached context, then ask for one obstacle that creates choice pressure without blocking the goal."
          : "Ask for one obstacle that creates choice pressure without blocking the goal.",
      ),
    ];

    setActiveHints(nextHints);
    setSelectedHintId(nextHints[0].id);
    appendToRecent(nextHints);
    resetComposer();
    setComposerOpen(false);
    showMessage("Hints drafted.");
  }

  async function copyHint(text) {
    try {
      await navigator.clipboard.writeText(text);
      showMessage("Hint copied.");
    } catch {
      showMessage("Copy failed.");
    }
  }

  function editHint(hint) {
    setDraft({ intention: hint.text, approach: "", notes: "" });
    setEditingHintId(hint.id);
    setComposerOpen(true);
  }

  function removeActiveHint(id) {
    setActiveHints((current) => current.filter((hint) => hint.id !== id));
    if (selectedHintId === id) setSelectedHintId("");
    showMessage("Hint removed.");
  }

  function removeRecentHint(id) {
    setRecentHints((current) => current.filter((hint) => hint.id !== id));
    if (selectedHintId === id) setSelectedHintId("");
    showMessage("Recent hint removed.");
  }

  function moveToActive(hint) {
    const restored = { ...hint, id: createHint(hint.text, "recent").id, source: "recent" };
    setActiveHints((current) => [restored, ...current.filter((item) => item.text !== hint.text)]);
    setSelectedHintId(restored.id);
    showMessage("Hint moved to active.");
  }

  function clearActiveHints() {
    setActiveHints([]);
    setSelectedHintId("");
    showMessage("Hints cleared.");
  }

  function selectActionPrompt(prompt) {
    const summary = createPromptContractSummary(prompt);
    setSelectedPrompt(prompt);
    setPromptValidation(summary);
    setPromptOverrides((current) => createDefaultOverrides(prompt, summary, current));
    setPromptModalOpen(false);
    showMessage(summary?.valid ? "Action prompt selected." : "Prompt selected, but required fields are missing.");
  }

  function clearActionPrompt() {
    setSelectedPrompt(null);
    setPromptValidation(null);
    setPromptOverrides({});
  }

  function updatePromptOverride(name, value) {
    setPromptOverrides((current) => ({ ...current, [name]: value }));
  }

  function updateSettings(patch) {
    setSettings((current) => savePersonaHelperSettings({ ...current, ...patch }));
  }

  async function executeActionPrompt() {
    if (!selectedPrompt?.id) {
      showMessage("Choose an action prompt first.");
      return "";
    }

    const validation = await promptApi.validateContract(selectedPrompt.id, ACTION_REQUIRED_FIELDS);
    setPromptValidation(validation);
    if (!validation.valid) {
      clearActionPrompt();
      showMessage("Selected prompt no longer matches the action contract.");
      return "";
    }

    const request = buildActionGenerationContext({
      draft,
      prompt: selectedPrompt,
      validation,
      promptOverrides,
      contextEntries,
    });
    const execution = await promptApi.execute({
      id: selectedPrompt.id,
      ...(Object.keys(request.overrides).length ? { overrides: request.overrides } : {}),
    });
    return execution.text.trim();
  }

  async function getActionPrompt() {
    setGettingPrompt(true);
    try {
      const systemPrompt = await executeActionPrompt();
      if (!systemPrompt.trim()) return "";
      const extractionPrompt = await getActionHintExtractionPrompt();
      const chatHistory = await getCurrentChatHistory(settings);
      const messages = buildGenerationMessages({ draft, systemPrompt, contextEntries, chatHistory, extractionPrompt });
      const messageSet = JSON.stringify(messages, null, 2);
      setCapturedSystemPrompt(systemPrompt);
      setCapturedMessageSet(messageSet);
      setPromptPreviewOpen(true);
      setPromptPreviewTab("system");
      showMessage("Prompt ready.");
      return systemPrompt;
    } catch (err) {
      showMessage(err instanceof Error ? err.message : "Could not get prompt.");
      return "";
    } finally {
      setGettingPrompt(false);
    }
  }

  async function generateActionHints() {
    if (!draft.intention.trim()) {
      showMessage("Add an intention before generating.");
      return;
    }

    setGenerating(true);
    try {
      const systemPrompt = await executeActionPrompt();
      if (!systemPrompt.trim()) return;

      const extractionPrompt = await getActionHintExtractionPrompt();
      const chatHistory = await getCurrentChatHistory(settings);
      const messages = buildGenerationMessages({ draft, systemPrompt, contextEntries, chatHistory, extractionPrompt });
      const connection = await resolveGenerationConnectionId(settings.preferredConnectionId, settings.allowConnectionFallback);
      const generation = await generate(connection.id, messages, generationParameters(settings));
      const trimmedOutput = generation.content.trim();
      const trimmedThinking = generation.thinking.trim();
      let hintLines = [];
      let usedExtractor = true;
      try {
        hintLines = await parseGeneratedHints(trimmedOutput);
      } catch (err) {
        usedExtractor = false;
        console.warn("[Persona Helper] Extraction parse failed; using local hint parser.", err);
        hintLines = parseHintOutput(trimmedOutput);
      }
      const parsedHints = hintLines.map((line) => createHint(line, usedExtractor ? "extracted" : "generated"));

      setCapturedMessageSet(JSON.stringify(messages, null, 2));
      setRawGenerationOutput(trimmedOutput);
      setRawGenerationThinking(trimmedThinking);
      setRawGenerationOpen(true);
      setRawGenerationTab("output");

      if (parsedHints.length) {
        setActiveHints(parsedHints);
        setSelectedHintId(parsedHints[0].id);
        appendToRecent(parsedHints);
      }
      setComposerOpen(false);
      showMessage(
        parsedHints.length
          ? `${usedExtractor ? "Extracted" : "Generated"} with ${connection.label}.`
          : "Generation returned no parsed hints.",
      );
    } catch (err) {
      showMessage(err instanceof Error ? err.message : "Could not generate hints.");
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

  function renderContextPanel() {
    return (
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
              <p style={viewStyles.muted}>Attach lorebook entries as user context documents for hint generation.</p>
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
                    <button type="button" style={formStyles.iconButton} title="Remove context" onClick={() => removeContextEntry(entry)}>
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
    );
  }

  function renderPromptPreview() {
    if (!showPrompt) return null;
    const promptViewerText =
      promptPreviewTab === "messages"
        ? promptMessageSetPreview
        : promptSystemPreview || "No backend prompt captured yet. Select a prompt, then run generation once execution is wired.";

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
            <div style={viewStyles.rawTabs} role="tablist" aria-label="Prompt preview">
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
            <div style={viewStyles.debugActionRow}>
              <button
                type="button"
                style={{
                  ...formStyles.primaryButton,
                  ...(gettingPrompt ? formStyles.disabledButton : undefined),
                }}
                onClick={() => void getActionPrompt()}
                disabled={gettingPrompt}
              >
                <ScrollText size="0.9375rem" />
                {gettingPrompt ? "Getting Prompt" : "Get Prompt"}
              </button>
            </div>
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
            <div style={viewStyles.rawTabs} role="tablist" aria-label="Raw generation output">
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
            <div style={viewStyles.debugActionRow}>
              {generating ? (
                <div style={viewStyles.draftingIndicator} role="status" aria-live="polite">
                  <LoaderCircle size="0.9375rem" style={viewStyles.draftingSpinner} />
                  {renderDraftingStatus()}
                </div>
              ) : (
                <button type="button" style={formStyles.primaryButton} onClick={() => void generateActionHints()}>
                  <Lightbulb size="0.9375rem" />
                  Generate
                </button>
              )}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  function renderDraftingStatus() {
    const statusText = `${draftingStatus}${DRAFTING_ELLIPSIS}`;
    const pulseIndex = draftingPulse % (statusText.length + 4);

    return (
      <span style={viewStyles.draftingStatus}>
        <span style={viewStyles.draftingStatusText} aria-label={statusText}>
          {statusText.split("").map((char, index) => (
            <span
              key={`${char}-${index}`}
              aria-hidden="true"
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

  function renderHintCard(hint, mode) {
    const isRecent = mode === "recent";
    const isSelected = selectedHintId === hint.id;
    const selectHint = () => setSelectedHintId((current) => (current === hint.id ? "" : hint.id));
    const runHintAction = (event, action) => {
      event.stopPropagation();
      action();
    };

    return (
      <article
        key={hint.id}
        tabIndex={0}
        aria-label={`${isSelected ? "Selected" : "Select"} ${isRecent ? "recent" : "active"} hint`}
        style={{
          ...viewStyles.panel,
          ...viewStyles.selectablePanel,
          ...(isSelected ? viewStyles.selectedPanel : undefined),
        }}
        onClick={selectHint}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          selectHint();
        }}
      >
        <div style={viewStyles.panelHeader}>
          <div style={viewStyles.stack}>
            <div style={viewStyles.cardMeta}>
              <p style={viewStyles.kicker}>{isRecent ? "Recent Hint" : "Active Hint"}</p>
              <p style={viewStyles.muted}>{formatTimestamp(hint.createdAt)}</p>
            </div>
            <p style={viewStyles.body}>{hint.text}</p>
          </div>
          {isSelected ? (
            <div style={viewStyles.cardToolbar} aria-label="Hint actions">
              {isRecent ? (
                <button type="button" style={formStyles.iconButton} title="Move to active" onClick={(event) => runHintAction(event, () => moveToActive(hint))}>
                  <PlusCircle size="0.875rem" />
                </button>
              ) : null}
              <button type="button" style={formStyles.iconButton} title="Copy hint" onClick={(event) => runHintAction(event, () => copyHint(hint.text))}>
                <Clipboard size="0.875rem" />
              </button>
              {!isRecent ? (
                <button type="button" style={formStyles.iconButton} title="Edit hint" onClick={(event) => runHintAction(event, () => editHint(hint))}>
                  <Edit3 size="0.875rem" />
                </button>
              ) : null}
              <button
                type="button"
                style={formStyles.iconButton}
                title={isRecent ? "Remove recent hint" : "Remove hint"}
                onClick={(event) => runHintAction(event, () => (isRecent ? removeRecentHint(hint.id) : removeActiveHint(hint.id)))}
              >
                <Trash2 size="0.875rem" />
              </button>
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  if (activeTab === "recent") {
    return (
      <div style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>Recent</h2>
          <p style={viewStyles.muted}>Generated hints stay here as a lightweight backlog.</p>
        </header>
        <div style={viewStyles.list}>
          {recentHints.length ? (
            recentHints.map((hint) => renderHintCard(hint, "recent"))
          ) : (
            <div style={viewStyles.empty}>No generated hints yet.</div>
          )}
        </div>
        <StatusSnackbar message={message} />
      </div>
    );
  }

  if (activeTab === "about") {
    return <ActionsAboutView />;
  }

  if (activeTab === "setup") {
    return (
      <div style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>Setup</h2>
          <p style={viewStyles.muted}>Choose the reusable prompt Persona Helper will use to draft action hints.</p>
        </header>
        <div style={viewStyles.sectionHeader}>
          <h3 style={viewStyles.title}>Initial Setup</h3>
          <p style={viewStyles.muted}>Bind the prompt and defaults used by the action hint workflow.</p>
        </div>
        {selectedPrompt ? (
          <>
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
                <button type="button" style={formStyles.primaryButton} onClick={() => setPromptModalOpen(true)}>
                  Choose
                </button>
                <button type="button" style={formStyles.iconButton} title="Clear prompt" onClick={clearActionPrompt}>
                  <Trash2 size="0.875rem" />
                </button>
              </div>
            </section>

            <section style={viewStyles.panel}>
              <div style={viewStyles.pageHeader}>
                <h3 style={viewStyles.title}>Contract</h3>
                {promptValidation?.valid ? (
                  <p style={viewStyles.muted}>Ready for action hints: intention and approach are available.</p>
                ) : (
                  <p style={viewStyles.muted}>
                    Missing required action field{promptValidation?.missing_fields?.length === 1 ? "" : "s"}:{" "}
                    {promptValidation?.missing_fields?.join(", ") || "validation unavailable"}.
                  </p>
                )}
              </div>
              <div style={viewStyles.badgeRow}>
                {ACTION_REQUIRED_FIELDS.map((fieldName) => (
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
                    <Field
                      key={row.id}
                      label={row.name}
                      hint={`${row.required ? "Required" : "Optional"} ${row.kind} from ${row.sectionName}.`}
                    >
                      <input
                        style={formStyles.input}
                        value={promptOverrides[row.id] ?? ""}
                        onChange={(event) => updatePromptOverride(row.id, event.target.value)}
                        placeholder={row.defaultValue || "Override value"}
                      />
                    </Field>
                  ))}
                </div>
              ) : (
                <p style={viewStyles.muted}>No additional prompt fields need defaults.</p>
              )}
            </section>
          </>
        ) : (
          <section style={viewStyles.panel}>
            <div style={viewStyles.pageHeader}>
              <h3 style={viewStyles.title}>No action prompt selected</h3>
              <p style={viewStyles.muted}>Hints can use placeholder drafting now, but API generation needs a selected prompt first.</p>
            </div>
            <button type="button" style={formStyles.primaryButton} onClick={() => setPromptModalOpen(true)}>
              <ScrollText size="0.9375rem" />
              Choose Prompt
            </button>
          </section>
        )}
        <div style={viewStyles.sectionHeader}>
          <h3 style={viewStyles.title}>Generation Settings</h3>
          <p style={viewStyles.muted}>Choose the connection and model parameters used by Generate.</p>
        </div>
        <section style={viewStyles.panel}>
          <Field label="Preferred connection" hint="Used first when generating action hints.">
            <select
              style={formStyles.input}
              value={settings.preferredConnectionId}
              onChange={(event) => updateSettings({ preferredConnectionId: event.target.value })}
            >
              <option value="">No preferred connection</option>
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}
                  {connection.model ? ` (${connection.model})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <label style={formStyles.switchRow}>
            <span style={viewStyles.stack}>
              <span style={formStyles.label}>Allow connection fallback</span>
              <span style={formStyles.hint}>Use the first available Marinara connection when no preferred connection is available.</span>
            </span>
            <input
              type="checkbox"
              style={formStyles.switchInput}
              checked={settings.allowConnectionFallback}
              onChange={(event) => updateSettings({ allowConnectionFallback: event.target.checked })}
            />
            <span
              aria-hidden="true"
              style={{
                ...formStyles.switchTrack,
                ...(settings.allowConnectionFallback ? formStyles.switchTrackOn : undefined),
              }}
            >
              <span
                style={{
                  ...formStyles.switchThumb,
                  ...(settings.allowConnectionFallback ? formStyles.switchThumbOn : undefined),
                }}
              />
            </span>
          </label>
          <div style={viewStyles.fieldGrid}>
            <Field label="Chat history limit" hint="Recent messages from the current chat. Use 0 to disable.">
              <input
                style={formStyles.input}
                value={settings.chatHistoryLimit}
                onChange={(event) => updateSettings({ chatHistoryLimit: event.target.value })}
                inputMode="numeric"
                placeholder="20"
              />
            </Field>
            <Field label="Recent hint limit" hint="Maximum hints to keep in Recent.">
              <input
                style={formStyles.input}
                value={settings.recentHintLimit}
                onChange={(event) => updateSettings({ recentHintLimit: event.target.value })}
                inputMode="numeric"
                placeholder="20"
              />
            </Field>
            <Field label="Max tokens">
              <input
                style={formStyles.input}
                value={settings.generationMaxTokens}
                onChange={(event) => updateSettings({ generationMaxTokens: event.target.value })}
                inputMode="numeric"
                placeholder="1024"
              />
            </Field>
            <Field label="Temperature">
              <input
                style={formStyles.input}
                value={settings.generationTemperature}
                onChange={(event) => updateSettings({ generationTemperature: event.target.value })}
                inputMode="decimal"
                placeholder="provider default"
              />
            </Field>
            <Field label="Top P">
              <input
                style={formStyles.input}
                value={settings.generationTopP}
                onChange={(event) => updateSettings({ generationTopP: event.target.value })}
                inputMode="decimal"
                placeholder="provider default"
              />
            </Field>
            <Field label="Top K">
              <input
                style={formStyles.input}
                value={settings.generationTopK}
                onChange={(event) => updateSettings({ generationTopK: event.target.value })}
                inputMode="numeric"
                placeholder="provider default"
              />
            </Field>
            <Field label="Frequency penalty">
              <input
                style={formStyles.input}
                value={settings.generationFrequencyPenalty}
                onChange={(event) => updateSettings({ generationFrequencyPenalty: event.target.value })}
                inputMode="decimal"
                placeholder="provider default"
              />
            </Field>
            <Field label="Presence penalty">
              <input
                style={formStyles.input}
                value={settings.generationPresencePenalty}
                onChange={(event) => updateSettings({ generationPresencePenalty: event.target.value })}
                inputMode="decimal"
                placeholder="provider default"
              />
            </Field>
          </div>
        </section>
        <div style={viewStyles.sectionHeader}>
          <h3 style={viewStyles.title}>Debug</h3>
          <p style={viewStyles.muted}>Expose prompt and generation artifacts while tuning the workflow.</p>
        </div>
        <section style={viewStyles.panel}>
          <label style={formStyles.switchRow}>
            <span style={viewStyles.stack}>
              <span style={formStyles.label}>Show prompt</span>
              <span style={formStyles.hint}>Reveal the backend system prompt and assembled message format while drafting hints.</span>
            </span>
            <input
              type="checkbox"
              style={formStyles.switchInput}
              checked={showPrompt}
              onChange={(event) => setShowPrompt(event.target.checked)}
            />
            <span
              aria-hidden="true"
              style={{
                ...formStyles.switchTrack,
                ...(showPrompt ? formStyles.switchTrackOn : undefined),
              }}
            >
              <span
                style={{
                  ...formStyles.switchThumb,
                  ...(showPrompt ? formStyles.switchThumbOn : undefined),
                }}
              />
            </span>
          </label>
        </section>
        <section style={viewStyles.panel}>
          <label style={formStyles.switchRow}>
            <span style={viewStyles.stack}>
              <span style={formStyles.label}>Show generation output</span>
              <span style={formStyles.hint}>Reveal a raw-output accordion when action hints are generated.</span>
            </span>
            <input
              type="checkbox"
              style={formStyles.switchInput}
              checked={showGenerationOutput}
              onChange={(event) => setShowGenerationOutput(event.target.checked)}
            />
            <span
              aria-hidden="true"
              style={{
                ...formStyles.switchTrack,
                ...(showGenerationOutput ? formStyles.switchTrackOn : undefined),
              }}
            >
              <span
                style={{
                  ...formStyles.switchThumb,
                  ...(showGenerationOutput ? formStyles.switchThumbOn : undefined),
                }}
              />
            </span>
          </label>
        </section>
        {promptModalOpen ? (
          <PromptSelectModal
            selectedPromptId={selectedPrompt?.id}
            onSelect={selectActionPrompt}
            onClose={() => setPromptModalOpen(false)}
            requiredFields={ACTION_REQUIRED_FIELDS}
          />
        ) : null}
        <StatusSnackbar message={message} />
      </div>
    );
  }

  return (
    <div style={viewStyles.stack}>
      <section style={viewStyles.panel}>
        <button
          type="button"
          style={viewStyles.disclosureButton}
          aria-expanded={composerOpen}
          onClick={() => setComposerOpen((value) => !value)}
        >
          <span>{composerLabel}</span>
          {composerOpen ? <ChevronDown size="1.0625rem" /> : <ChevronRight size="1.0625rem" />}
        </button>
        {composerOpen ? (
          <>
            <Field label="Intention">
              <textarea
                style={formStyles.textarea}
                value={draft.intention}
                onChange={(event) => setDraft((current) => ({ ...current, intention: event.target.value }))}
                placeholder={editingHintId ? "Hint text" : "What are you trying to accomplish?"}
              />
            </Field>
            {!editingHintId ? (
              <>
                <Field label="Approach">
                  <textarea
                    style={formStyles.textareaSmall}
                    value={draft.approach}
                    onChange={(event) => setDraft((current) => ({ ...current, approach: event.target.value }))}
                    placeholder="How do you want to accomplish it?"
                  />
                </Field>
                <Field label="Notes" hint="Optional author note document added before the final request.">
                  <textarea
                    style={formStyles.textareaSmall}
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="What should the hint respect?"
                  />
                </Field>
                {renderContextPanel()}
              </>
            ) : null}
            <div style={formStyles.iconGroup}>
              {generating && !editingHintId ? (
                <div style={viewStyles.draftingIndicator} role="status" aria-live="polite">
                  <LoaderCircle size="0.9375rem" style={viewStyles.draftingSpinner} />
                  {renderDraftingStatus()}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    style={formStyles.primaryButton}
                    onClick={() => (editingHintId ? generatePlaceholderHints() : void generateActionHints())}
                  >
                    <Lightbulb size="0.9375rem" />
                    {editingHintId ? "Save Hint" : "Draft Hints"}
                  </button>
                  {editingHintId ? (
                    <button type="button" style={formStyles.iconButton} title="Cancel edit" onClick={resetComposer}>
                      <RotateCcw size="0.875rem" />
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </>
        ) : null}
      </section>

      <section style={viewStyles.stack}>
        <header style={viewStyles.panelHeader}>
          <div style={viewStyles.pageHeader}>
            <h2 style={viewStyles.heading}>Hints</h2>
            <p style={viewStyles.muted}>Active next-move options for the current persona context.</p>
          </div>
          {activeHints.length ? (
            <button type="button" style={formStyles.secondaryButton} onClick={clearActiveHints}>
              <Trash2 size="0.875rem" />
              Clear
            </button>
          ) : null}
        </header>
        <div style={viewStyles.list}>
          {activeHints.length ? (
            activeHints.map((hint) => renderHintCard(hint, "active"))
          ) : (
            <div style={viewStyles.empty}>Open the composer to draft a small set of next-move options.</div>
          )}
        </div>
        {renderPromptPreview()}
        {renderRawGenerationOutput()}
      </section>
      {lorebookModalOpen ? (
        <LorebookSelectModal
          selectedPointers={contextEntries.map(makeLorebookEntryPointer)}
          onSelect={attachContextEntry}
          onClose={() => setLorebookModalOpen(false)}
        />
      ) : null}
      <StatusSnackbar message={message} />
    </div>
  );
}

function ActionsAboutView() {
  return (
    <div style={viewStyles.stack}>
      <header style={viewStyles.pageHeader}>
        <h2 style={viewStyles.heading}>About Actions</h2>
        <p style={viewStyles.muted}>Action hints turn intention into playable next moves.</p>
      </header>

      <section style={viewStyles.panel}>
        <div style={viewStyles.panelHeader}>
          <div>
            <h3 style={viewStyles.title}>What It Surfaces</h3>
            <p style={viewStyles.muted}>Small options the player can act on now, without committing them as canon or long-term structure.</p>
          </div>
          <span style={viewStyles.badge}>
            <Lightbulb size="0.875rem" />
          </span>
        </div>
        <div style={viewStyles.list}>
          <p style={viewStyles.body}>Use Actions when the player has intent but wants help choosing a concrete move.</p>
          <p style={viewStyles.body}>Hints should preserve agency. They suggest angles, risks, openings, and tactics, then get used, edited, or discarded.</p>
        </div>
      </section>

      <section style={viewStyles.grid}>
        <article style={viewStyles.panel}>
          <div style={viewStyles.panelHeader}>
            <h3 style={viewStyles.title}>Core Flow</h3>
            <span style={viewStyles.badge}>
              <Clipboard size="0.875rem" />
            </span>
          </div>
          <div style={viewStyles.list}>
            <p style={viewStyles.body}>Describe the intention and approach.</p>
            <p style={viewStyles.body}>Attach optional context from lorebooks or notes.</p>
            <p style={viewStyles.body}>Draft hints, review them, then keep only the ones worth using.</p>
          </div>
        </article>

        <article style={viewStyles.panel}>
          <div style={viewStyles.panelHeader}>
            <h3 style={viewStyles.title}>Boundaries</h3>
            <span style={viewStyles.badge}>
              <CircleHelp size="0.875rem" />
            </span>
          </div>
          <div style={viewStyles.list}>
            <p style={viewStyles.body}>Actions are not the goal tracker, scene log, or campaign planner.</p>
            <p style={viewStyles.body}>Recent is a lightweight backlog. Setup owns prompt selection and debug visibility.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
