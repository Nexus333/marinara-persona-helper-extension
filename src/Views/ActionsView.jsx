import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Field } from "../Components/Field.jsx";
import { formStyles } from "../Styles/formStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

export function ActionsView({ activeTab }) {
  const [draft, setDraft] = useState({
    intention: "",
    approach: "",
    notes: "",
  });
  const [suggestions, setSuggestions] = useState([]);

  function generatePlaceholderHints() {
    const intention = draft.intention.trim();
    if (!intention) return;
    const approach = draft.approach.trim();
    setSuggestions([
      `Find one scene detail that can become leverage toward: ${intention}.`,
      approach
        ? `Make the next move express the approach: ${approach}.`
        : "Choose an approach before asking the scene for a consequence.",
      "Ask for one obstacle that creates choice pressure without blocking the goal.",
    ]);
  }

  if (activeTab === "history") {
    return (
      <div style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>Recent</h2>
          <p style={viewStyles.muted}>Action hints are throwaway in v1, so this tab is a placeholder.</p>
        </header>
        <div style={viewStyles.empty}>No persisted action history.</div>
      </div>
    );
  }

  return (
    <div style={viewStyles.grid}>
      <section style={viewStyles.panel}>
        <h2 style={viewStyles.heading}>Action Hint</h2>
        <Field label="Intention">
          <textarea
            style={formStyles.textarea}
            value={draft.intention}
            onChange={(event) => setDraft((current) => ({ ...current, intention: event.target.value }))}
            placeholder="What are you trying to accomplish?"
          />
        </Field>
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
        <button type="button" style={formStyles.primaryButton} onClick={generatePlaceholderHints}>
          <Lightbulb size={15} />
          Draft Hints
        </button>
      </section>
      <section style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>Suggestions</h2>
          <p style={viewStyles.muted}>Temporary placeholder output until the prompt/extractor flow lands.</p>
        </header>
        <div style={viewStyles.list}>
          {suggestions.length ? suggestions.map((suggestion, index) => (
            <article key={suggestion} style={viewStyles.panel}>
              <p style={viewStyles.kicker}>Option {index + 1}</p>
              <p style={viewStyles.body}>{suggestion}</p>
            </article>
          )) : (
            <div style={viewStyles.empty}>Fill the form to create a small set of next-move options.</div>
          )}
        </div>
      </section>
    </div>
  );
}
