import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, RefreshCw, ScrollText, X } from "lucide-react";
import { promptApi } from "../API/prompt.js";
import { formStyles } from "../Styles/formStyles.js";
import { promptPickerStyles } from "../Styles/promptPickerStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

function tagsLabel(tags) {
  return tags?.length ? tags.join(", ") : "no tags";
}

function filterPrompts(prompts, localFilter, sort) {
  const needle = localFilter.trim().toLowerCase();
  const filtered = needle
    ? prompts.filter((prompt) => {
        const haystack = [prompt.name, prompt.description, prompt.content_type, ...prompt.tags].join(" ").toLowerCase();
        return haystack.includes(needle);
      })
    : prompts;

  return [...filtered].sort((left, right) => {
    if (sort === "category") {
      const categoryCompare = left.content_type.localeCompare(right.content_type);
      if (categoryCompare) return categoryCompare;
    }
    return left.name.localeCompare(right.name);
  });
}

function fieldListLabel(fields) {
  return fields.length ? fields.join(", ") : "";
}

export function PromptSelectModal({ selectedPromptId, onSelect, onClose, selecting = false, requiredFields = [] }) {
  const [query, setQuery] = useState("");
  const [localFilter, setLocalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [categories, setCategories] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPrompts = (nextQuery = query, nextCategory = categoryFilter) =>
    requiredFields.length
      ? promptApi.fieldSearch(requiredFields, { query: nextQuery, content_type: nextCategory })
      : promptApi.search({ query: nextQuery, content_type: nextCategory });

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setError("");
      try {
        const [categoryItems, promptItems] = await Promise.all([
          promptApi.listCategories(),
          loadPrompts(query, categoryFilter),
        ]);
        if (cancelled) return;
        setCategories(categoryItems);
        setPrompts(promptItems);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load prompts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runSearch(nextQuery = query, nextCategory = categoryFilter) {
    setLoading(true);
    setError("");
    try {
      setPrompts(await loadPrompts(nextQuery, nextCategory));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search prompts.");
    } finally {
      setLoading(false);
    }
  }

  async function openPrompt(id) {
    setDetailLoading(true);
    setError("");
    try {
      setSelectedDetail(await promptApi.get(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load prompt.");
    } finally {
      setDetailLoading(false);
    }
  }

  const libraryCards = useMemo(() => filterPrompts(prompts, localFilter, sort), [localFilter, prompts, sort]);
  const selectedCategory = categories.find((category) => category.id === selectedDetail?.content_type);
  const requiredFieldLabel = fieldListLabel(requiredFields);

  return (
    <div style={promptPickerStyles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <div
        style={promptPickerStyles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Choose action prompt"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header style={promptPickerStyles.modalHeader}>
          <div style={viewStyles.pageHeader}>
            <h2 style={viewStyles.heading}>{selectedDetail ? selectedDetail.name : "Choose Prompt"}</h2>
            <p style={viewStyles.muted}>
              {requiredFieldLabel
                ? `Only prompts containing ${requiredFieldLabel} are shown.`
                : "Select the reusable prompt Persona Helper will use when drafting action hints."}
            </p>
          </div>
          <div style={promptPickerStyles.toolbar}>
            {selectedDetail ? (
              <>
                <button type="button" style={formStyles.iconButton} title="Back" aria-label="Back" onClick={() => setSelectedDetail(null)}>
                  <ArrowLeft size="0.9375rem" />
                </button>
                <button
                  type="button"
                  style={{
                    ...formStyles.primaryButton,
                    ...(selecting ? formStyles.disabledButton : undefined),
                  }}
                  onClick={() => onSelect(selectedDetail)}
                  title="Select prompt"
                  disabled={selecting}
                >
                  <Check size="0.9375rem" />
                  {selecting ? "Validating" : "Select"}
                </button>
              </>
            ) : (
              <button type="button" style={formStyles.iconButton} title="Refresh" aria-label="Refresh" onClick={() => runSearch()}>
                <RefreshCw size="0.9375rem" />
              </button>
            )}
            <button type="button" style={formStyles.iconButton} title="Close" aria-label="Close" onClick={onClose}>
              <X size="0.9375rem" />
            </button>
          </div>
        </header>

        {selectedDetail ? (
          <section style={promptPickerStyles.detailPanel}>
            <div style={promptPickerStyles.detailGrid}>
              <div style={{ ...promptPickerStyles.detailBlock, ...promptPickerStyles.detailScrollBlock }}>
                <p style={viewStyles.kicker}>Details</p>
                <p style={viewStyles.body}>{selectedDetail.description || "No description."}</p>
                <p style={viewStyles.muted}>{selectedCategory?.name || selectedDetail.content_type || "Unsorted"}</p>
                <p style={viewStyles.muted}>{tagsLabel(selectedDetail.tags)}</p>
              </div>
              <div style={{ ...promptPickerStyles.detailBlock, ...promptPickerStyles.detailScrollBlock }}>
                <p style={viewStyles.kicker}>Inputs</p>
                {selectedDetail.requirements.length ? (
                  selectedDetail.requirements.map((requirement) => (
                    <p key={`${requirement.entry_id}-${requirement.kind}-${requirement.var_name}`} style={viewStyles.body}>
                      {requirement.var_name} ({requirement.kind})
                    </p>
                  ))
                ) : (
                  <p style={viewStyles.muted}>No inputs or parameters declared.</p>
                )}
              </div>
              <div style={promptPickerStyles.detailBlock}>
                <p style={viewStyles.kicker}>Parameters</p>
                {Object.keys(selectedDetail.defaults).length ? (
                  Object.entries(selectedDetail.defaults).map(([key, value]) => (
                    <p key={key} style={viewStyles.body}>
                      {key}: {value}
                    </p>
                  ))
                ) : (
                  <p style={viewStyles.muted}>No top-level defaults.</p>
                )}
              </div>
            </div>

            <div style={viewStyles.list}>
              {selectedDetail.entries.map((entry) => (
                <article key={entry.id} style={promptPickerStyles.detailBlock}>
                  <div style={viewStyles.panelHeader}>
                    <div style={viewStyles.stack}>
                      <p style={viewStyles.kicker}>{entry.label || entry.section.name || "Prompt Section"}</p>
                      <p style={viewStyles.muted}>
                        {entry.enabled ? "Enabled" : "Disabled"} | {entry.section.slots.length} input
                        {entry.section.slots.length === 1 ? "" : "s"} | {entry.section.parameters.length} parameter
                        {entry.section.parameters.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <pre style={promptPickerStyles.promptBody}>{entry.section.body || "No prompt body."}</pre>
                </article>
              ))}
              {!selectedDetail.entries.length ? <div style={viewStyles.empty}>This prompt has no sections.</div> : null}
            </div>
          </section>
        ) : (
          <>
            <div style={promptPickerStyles.controls}>
              <input
                style={formStyles.input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runSearch();
                }}
                placeholder="Search prompts"
              />
              <select
                style={formStyles.input}
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  runSearch(query, event.target.value);
                }}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select style={formStyles.input} value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="name">Name</option>
                <option value="category">Category</option>
              </select>
            </div>
            <input
              style={formStyles.input}
              value={localFilter}
              onChange={(event) => setLocalFilter(event.target.value)}
              placeholder="Filter visible cards"
            />

            {error ? <div style={viewStyles.empty}>{error}</div> : null}
            {loading ? (
              <div style={viewStyles.empty}>Loading prompts.</div>
            ) : (
              <div style={promptPickerStyles.cardGrid}>
                {libraryCards.map((prompt) => (
                  <div
                    key={prompt.id}
                    role="button"
                    tabIndex={0}
                    style={{
                      ...promptPickerStyles.card,
                      ...(prompt.id === selectedPromptId ? { borderColor: "#CCC" } : undefined),
                    }}
                    onClick={() => openPrompt(prompt.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openPrompt(prompt.id);
                      }
                    }}
                  >
                    <div style={promptPickerStyles.cardHeader}>
                      <ScrollText size="1rem" />
                      <span style={promptPickerStyles.cardTitle}>{prompt.name}</span>
                    </div>
                    <div style={promptPickerStyles.cardDescription}>{prompt.description || "No description."}</div>
                    <div style={promptPickerStyles.cardMetaRow}>
                      <span style={promptPickerStyles.cardMeta}>{prompt.content_type || "unsorted"}</span>
                      <span style={promptPickerStyles.cardMeta}>{tagsLabel(prompt.tags)}</span>
                    </div>
                  </div>
                ))}
                {!libraryCards.length ? (
                  <div style={viewStyles.empty}>
                    {requiredFieldLabel
                      ? `No prompts found with the required fields: ${requiredFieldLabel}.`
                      : "No prompts found."}
                  </div>
                ) : null}
              </div>
            )}
            {detailLoading ? <div style={viewStyles.empty}>Loading prompt details.</div> : null}
          </>
        )}
      </div>
    </div>
  );
}
