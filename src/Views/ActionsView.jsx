import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Clipboard, Edit3, Lightbulb, PlusCircle, RotateCcw, ScrollText, Trash2 } from "lucide-react";
import { Field } from "../Components/Field.jsx";
import { PromptSelectModal } from "../Components/PromptSelectModal.jsx";
import { StatusSnackbar } from "../Components/StatusSnackbar.jsx";
import { formStyles } from "../Styles/formStyles.js";
import { promptPickerStyles } from "../Styles/promptPickerStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

const ACTIVE_HINTS_KEY = "persona-helper-active-action-hints";
const RECENT_HINTS_KEY = "persona-helper-recent-action-hints";
const ACTION_PROMPT_KEY = "persona-helper-action-prompt";
const RECENT_LIMIT = 20;

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
  const [selectedPrompt, setSelectedPrompt] = useState(() => readStoredPrompt());
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [editingHintId, setEditingHintId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    writeStoredHints(ACTIVE_HINTS_KEY, activeHints);
  }, [activeHints]);

  useEffect(() => {
    writeStoredHints(RECENT_HINTS_KEY, recentHints.slice(0, RECENT_LIMIT));
  }, [recentHints]);

  useEffect(() => {
    writeStoredPrompt(selectedPrompt);
  }, [selectedPrompt]);

  const composerLabel = useMemo(() => {
    if (editingHintId) return "Edit Hint";
    return activeHints.length ? "Draft More Hints" : "Draft Hints";
  }, [activeHints.length, editingHintId]);

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
      }).slice(0, RECENT_LIMIT);
    });
  }

  function generatePlaceholderHints() {
    const intention = draft.intention.trim();
    const approach = draft.approach.trim();
    const notes = draft.notes.trim();

    if (editingHintId) {
      const text = intention || approach || notes;
      if (!text) return;
      setActiveHints((current) =>
        current.map((hint) => (hint.id === editingHintId ? { ...hint, text, updatedAt: new Date().toISOString() } : hint)),
      );
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
        notes
          ? `Respect this boundary while creating pressure: ${notes}.`
          : "Ask for one obstacle that creates choice pressure without blocking the goal.",
      ),
    ];

    setActiveHints(nextHints);
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
    showMessage("Hint removed.");
  }

  function removeRecentHint(id) {
    setRecentHints((current) => current.filter((hint) => hint.id !== id));
    showMessage("Recent hint removed.");
  }

  function moveToActive(hint) {
    const restored = { ...hint, id: createHint(hint.text, "recent").id, source: "recent" };
    setActiveHints((current) => [restored, ...current.filter((item) => item.text !== hint.text)]);
    showMessage("Hint moved to active.");
  }

  function selectActionPrompt(prompt) {
    setSelectedPrompt(prompt);
    setPromptModalOpen(false);
    showMessage("Action prompt selected.");
  }

  function renderHintCard(hint, mode) {
    const isRecent = mode === "recent";
    return (
      <article key={hint.id} style={viewStyles.panel}>
        <div style={viewStyles.panelHeader}>
          <div style={viewStyles.stack}>
            <div style={viewStyles.cardMeta}>
              <p style={viewStyles.kicker}>{isRecent ? "Recent Hint" : "Active Hint"}</p>
              <p style={viewStyles.muted}>{formatTimestamp(hint.createdAt)}</p>
            </div>
            <p style={viewStyles.body}>{hint.text}</p>
          </div>
          <div style={viewStyles.cardToolbar} aria-label="Hint actions">
            {isRecent ? (
              <button type="button" style={formStyles.iconButton} title="Move to active" onClick={() => moveToActive(hint)}>
                <PlusCircle size={14} />
              </button>
            ) : null}
            <button type="button" style={formStyles.iconButton} title="Copy hint" onClick={() => copyHint(hint.text)}>
              <Clipboard size={14} />
            </button>
            {!isRecent ? (
              <button type="button" style={formStyles.iconButton} title="Edit hint" onClick={() => editHint(hint)}>
                <Edit3 size={14} />
              </button>
            ) : null}
            <button
              type="button"
              style={formStyles.iconButton}
              title={isRecent ? "Remove recent hint" : "Remove hint"}
              onClick={() => (isRecent ? removeRecentHint(hint.id) : removeActiveHint(hint.id))}
            >
              <Trash2 size={14} />
            </button>
          </div>
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

  if (activeTab === "setup") {
    return (
      <div style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>Setup</h2>
          <p style={viewStyles.muted}>Choose the reusable prompt Persona Helper will use to draft action hints.</p>
        </header>
        {selectedPrompt ? (
          <section style={promptPickerStyles.selectedCard}>
            <div style={viewStyles.stack}>
              <div style={viewStyles.cardMeta}>
                <p style={viewStyles.kicker}>Selected Prompt</p>
                <p style={viewStyles.muted}>{selectedPrompt.content_type || "unsorted"}</p>
              </div>
              <div style={viewStyles.panelHeader}>
                <ScrollText size={16} />
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
              <button type="button" style={formStyles.iconButton} title="Clear prompt" onClick={() => setSelectedPrompt(null)}>
                <Trash2 size={14} />
              </button>
            </div>
          </section>
        ) : (
          <section style={viewStyles.panel}>
            <div style={viewStyles.pageHeader}>
              <h3 style={viewStyles.title}>No action prompt selected</h3>
              <p style={viewStyles.muted}>Hints can use placeholder drafting now, but API generation needs a selected prompt first.</p>
            </div>
            <button type="button" style={formStyles.primaryButton} onClick={() => setPromptModalOpen(true)}>
              <ScrollText size={15} />
              Choose Prompt
            </button>
          </section>
        )}
        {promptModalOpen ? (
          <PromptSelectModal
            selectedPromptId={selectedPrompt?.id}
            onSelect={selectActionPrompt}
            onClose={() => setPromptModalOpen(false)}
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
          {composerOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
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
                <Field label="Notes" hint="Optional constraints, context, or boundaries.">
                  <textarea
                    style={formStyles.textareaSmall}
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="What should the hint respect?"
                  />
                </Field>
              </>
            ) : null}
            <div style={formStyles.iconGroup}>
              <button type="button" style={formStyles.primaryButton} onClick={generatePlaceholderHints}>
                <Lightbulb size={15} />
                {editingHintId ? "Save Hint" : "Draft Hints"}
              </button>
              {editingHintId ? (
                <button type="button" style={formStyles.iconButton} title="Cancel edit" onClick={resetComposer}>
                  <RotateCcw size={14} />
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      <section style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>Hints</h2>
          <p style={viewStyles.muted}>Active next-move options for the current persona context.</p>
        </header>
        <div style={viewStyles.list}>
          {activeHints.length ? (
            activeHints.map((hint) => renderHintCard(hint, "active"))
          ) : (
            <div style={viewStyles.empty}>Open the composer to draft a small set of next-move options.</div>
          )}
        </div>
      </section>
      <StatusSnackbar message={message} />
    </div>
  );
}
