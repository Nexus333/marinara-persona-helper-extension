import { useEffect, useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { createLocalGoal, deleteLocalGoal, loadLocalGoals, updateLocalGoal } from "../API/goals.js";
import { getPersonaContext } from "../API/marinara.js";
import { Field } from "../Components/Field.jsx";
import { formStyles } from "../Styles/formStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

const emptyDraft = {
  title: "",
  intent: "",
  approach: "",
  collectionName: "Default",
  type: "mastery",
};

export function GoalsView({ activeTab }) {
  const [goals, setGoals] = useState(() => loadLocalGoals());
  const [draft, setDraft] = useState(emptyDraft);
  const [persona, setPersona] = useState({ personaId: null, persona: null });

  useEffect(() => {
    getPersonaContext().then(setPersona).catch(() => {});
  }, []);

  const visibleGoals = useMemo(() => {
    const personaId = persona.personaId || "unscoped";
    return goals.filter((goal) => goal.personaId === personaId || (!persona.personaId && goal.personaId === "unscoped"));
  }, [goals, persona.personaId]);

  function refresh() {
    setGoals(loadLocalGoals());
  }

  function createGoal() {
    if (!draft.title.trim() || !draft.intent.trim()) return;
    createLocalGoal({ ...draft, personaId: persona.personaId });
    setDraft(emptyDraft);
    refresh();
  }

  if (activeTab === "focus") {
    const focused = visibleGoals.find((goal) => goal.priority) || visibleGoals[0];
    return (
      <div style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>Focus</h2>
          <p style={viewStyles.muted}>The current goal context that will eventually feed `@goal(...)`.</p>
        </header>
        {focused ? (
          <article style={viewStyles.panel}>
            <div style={viewStyles.panelHeader}>
              <div>
                <h3 style={viewStyles.title}>{focused.title}</h3>
                <p style={viewStyles.muted}>{focused.collectionName} / {focused.type}</p>
              </div>
              <button
                type="button"
                style={formStyles.iconButton}
                title="Toggle priority"
                onClick={() => {
                  updateLocalGoal(focused.id, { priority: !focused.priority });
                  refresh();
                }}
              >
                <Star size={15} fill={focused.priority ? "currentColor" : "none"} />
              </button>
            </div>
            <p style={viewStyles.body}>{focused.intent}</p>
            {focused.approach ? <p style={viewStyles.note}>Approach: {focused.approach}</p> : null}
          </article>
        ) : (
          <div style={viewStyles.empty}>Create a goal to establish focus for this persona.</div>
        )}
      </div>
    );
  }

  return (
    <div style={viewStyles.grid}>
      <section style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>Goals</h2>
          <p style={viewStyles.muted}>
            {persona.persona?.name ? `Scoped to ${persona.persona.name}.` : "No active persona context detected."}
          </p>
        </header>
        <div style={viewStyles.list}>
          {visibleGoals.length ? visibleGoals.map((goal) => (
            <article key={goal.id} style={viewStyles.panel}>
              <div style={viewStyles.panelHeader}>
                <div>
                  <h3 style={viewStyles.title}>{goal.title}</h3>
                  <p style={viewStyles.muted}>{goal.collectionName} / {goal.type}</p>
                </div>
                <div style={formStyles.iconGroup}>
                  <button
                    type="button"
                    style={formStyles.iconButton}
                    title="Toggle priority"
                    onClick={() => {
                      updateLocalGoal(goal.id, { priority: !goal.priority });
                      refresh();
                    }}
                  >
                    <Star size={15} fill={goal.priority ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    style={formStyles.iconButton}
                    title="Delete goal"
                    onClick={() => {
                      deleteLocalGoal(goal.id);
                      refresh();
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p style={viewStyles.body}>{goal.intent}</p>
              {goal.approach ? <p style={viewStyles.note}>Approach: {goal.approach}</p> : null}
            </article>
          )) : (
            <div style={viewStyles.empty}>No goals yet. Capture one aspiration to start shaping the arc.</div>
          )}
        </div>
      </section>
      <section style={viewStyles.panel}>
        <h3 style={viewStyles.title}>New Goal</h3>
        <Field label="Title">
          <input
            style={formStyles.input}
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Become a legendary dragon slayer"
          />
        </Field>
        <Field label="Intent">
          <textarea
            style={formStyles.textarea}
            value={draft.intent}
            onChange={(event) => setDraft((current) => ({ ...current, intent: event.target.value }))}
            placeholder="What does this persona want?"
          />
        </Field>
        <Field label="Approach">
          <textarea
            style={formStyles.textareaSmall}
            value={draft.approach}
            onChange={(event) => setDraft((current) => ({ ...current, approach: event.target.value }))}
            placeholder="How do they want to pursue it?"
          />
        </Field>
        <div style={formStyles.row}>
          <Field label="Collection">
            <input
              style={formStyles.input}
              value={draft.collectionName}
              onChange={(event) => setDraft((current) => ({ ...current, collectionName: event.target.value }))}
            />
          </Field>
          <Field label="Type">
            <select
              style={formStyles.input}
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="mastery">Mastery</option>
              <option value="achievement">Achievement</option>
            </select>
          </Field>
        </div>
        <button type="button" style={formStyles.primaryButton} onClick={createGoal}>
          <Plus size={15} />
          Create Goal
        </button>
      </section>
    </div>
  );
}
