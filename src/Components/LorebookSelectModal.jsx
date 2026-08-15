import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, Search, X } from "lucide-react";
import { lorebookApi, makeLorebookEntryPointer } from "../API/lorebooks.js";
import { formStyles } from "../Styles/formStyles.js";
import { promptPickerStyles } from "../Styles/promptPickerStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

function includesNeedle(value, needle) {
  return value.toLowerCase().includes(needle);
}

function entrySearchText(entry) {
  return [entry.name, entry.description, entry.content, entry.keys.join(" "), entry.secondaryKeys.join(" ")].join(" ");
}

function tagsLabel(tags) {
  return tags?.length ? tags.join(", ") : "no tags";
}

export function LorebookSelectModal({ selectedPointers = [], onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (selectedBook) return undefined;

    let cancelled = false;
    setLoading(true);
    setStatus("Loading lorebooks.");
    lorebookApi
      .list(query)
      .then((items) => {
        if (cancelled) return;
        setBooks(items);
        setStatus(items.length ? "" : "No matching lorebooks.");
      })
      .catch((err) => {
        if (!cancelled) setStatus(err instanceof Error ? err.message : "Could not load lorebooks.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, selectedBook]);

  useEffect(() => {
    if (!selectedBook) return undefined;

    let cancelled = false;
    setLoading(true);
    setStatus("Loading entries.");
    lorebookApi
      .listEntries(selectedBook.id)
      .then((items) => {
        if (cancelled) return;
        setEntries(items);
        setStatus(items.length ? "" : "No entries in this lorebook.");
      })
      .catch((err) => {
        if (!cancelled) setStatus(err instanceof Error ? err.message : "Could not load entries.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBook]);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => includesNeedle(entrySearchText(entry), needle));
  }, [entries, query]);

  function selectEntry(entry) {
    onSelect({ ...entry, lorebookName: selectedBook?.name || entry.lorebookName });
    onClose();
  }

  if (selectedEntry) {
    const pointer = makeLorebookEntryPointer(selectedEntry);
    const selected = selectedPointers.includes(pointer);

    return (
      <div style={promptPickerStyles.modalBackdrop} role="presentation" onMouseDown={onClose}>
        <div
          style={promptPickerStyles.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Lorebook entry viewer"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header style={promptPickerStyles.modalHeader}>
            <div style={viewStyles.pageHeader}>
              <h2 style={viewStyles.heading}>{selectedEntry.name}</h2>
              <p style={viewStyles.muted}>{selectedBook?.name || selectedEntry.lorebookId}</p>
            </div>
            <div style={promptPickerStyles.toolbar}>
              <button type="button" style={formStyles.iconButton} title="Back" aria-label="Back" onClick={() => setSelectedEntry(null)}>
                <ArrowLeft size="0.9375rem" />
              </button>
              <button
                type="button"
                style={{
                  ...formStyles.primaryButton,
                  ...(selected ? formStyles.disabledButton : undefined),
                }}
                onClick={() => selectEntry(selectedEntry)}
                disabled={selected}
              >
                <Check size="0.9375rem" />
                {selected ? "Attached" : "Attach"}
              </button>
              <button type="button" style={formStyles.iconButton} title="Close" aria-label="Close" onClick={onClose}>
                <X size="0.9375rem" />
              </button>
            </div>
          </header>
          <pre style={{ ...promptPickerStyles.promptBody, ...promptPickerStyles.entryPreview }}>
            {selectedEntry.content || "No content."}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div style={promptPickerStyles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <div
        style={promptPickerStyles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Lorebook selector"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header style={promptPickerStyles.modalHeader}>
          <div style={viewStyles.pageHeader}>
            <h2 style={viewStyles.heading}>{selectedBook ? selectedBook.name : "Attach Lorebook Context"}</h2>
            <p style={viewStyles.muted}>
              {selectedBook ? "Choose an entry to include as a user context document." : "Search lorebooks, then select entries for hint context."}
            </p>
          </div>
          <div style={promptPickerStyles.toolbar}>
            {selectedBook ? (
              <button
                type="button"
                style={formStyles.iconButton}
                title="Back"
                aria-label="Back"
                onClick={() => {
                  setSelectedBook(null);
                  setSelectedEntry(null);
                  setEntries([]);
                }}
              >
                <ArrowLeft size="0.9375rem" />
              </button>
            ) : null}
            <button type="button" style={formStyles.iconButton} title="Close" aria-label="Close" onClick={onClose}>
              <X size="0.9375rem" />
            </button>
          </div>
        </header>

        <label style={formStyles.field}>
          <span style={formStyles.label}>{selectedBook ? "Search Entries" : "Search Lorebooks"}</span>
          <span style={promptPickerStyles.searchShell}>
            <Search size="0.875rem" />
            <input
              autoFocus
              style={promptPickerStyles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={selectedBook ? "Entry name, keyword, or content" : "Lorebook name, description, or tag"}
            />
          </span>
        </label>

        {!selectedBook ? (
          <div style={promptPickerStyles.cardGrid}>
            {books.map((book) => (
              <button key={book.id} type="button" style={promptPickerStyles.card} onClick={() => setSelectedBook(book)}>
                <span style={promptPickerStyles.cardHeader}>
                  <BookOpen size="1rem" />
                  <span style={promptPickerStyles.cardTitle}>{book.name}</span>
                </span>
                <span style={promptPickerStyles.cardDescription}>{book.description || book.category}</span>
                <span style={promptPickerStyles.cardMeta}>{tagsLabel(book.tags)}</span>
              </button>
            ))}
            {!books.length ? <div style={viewStyles.empty}>{loading ? "Loading lorebooks." : status}</div> : null}
          </div>
        ) : (
          <div style={promptPickerStyles.cardGrid}>
            {filteredEntries.map((entry) => {
              const pointer = makeLorebookEntryPointer(entry);
              const selected = selectedPointers.includes(pointer);
              return (
                <button
                  key={entry.id}
                  type="button"
                  style={{
                    ...promptPickerStyles.card,
                    ...(selected ? promptPickerStyles.cardSelected : undefined),
                  }}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <span style={promptPickerStyles.cardTitle}>{entry.name}</span>
                  <span style={promptPickerStyles.cardDescription}>{entry.description || entry.content || "Lorebook entry"}</span>
                  <span style={promptPickerStyles.cardMeta}>{selected ? "Attached" : entry.keys.length ? entry.keys.join(", ") : "No keys"}</span>
                </button>
              );
            })}
            {!filteredEntries.length ? <div style={viewStyles.empty}>{loading ? "Loading entries." : status}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
