import { useEffect, useState } from "react";
import { CircleHelp, Save } from "lucide-react";
import { getConnections } from "../API/marinara.js";
import { loadPersonaHelperSettings, savePersonaHelperSettings } from "../API/settings.js";
import { Field } from "../Components/Field.jsx";
import { InfoModal } from "../Components/InfoModal.jsx";
import { StatusSnackbar } from "../Components/StatusSnackbar.jsx";
import { formStyles } from "../Styles/formStyles.js";
import { overlayStyles } from "../Styles/overlayStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

export function SettingsView({ activeTab }) {
  const [settings, setSettings] = useState(() => loadPersonaHelperSettings());
  const [connections, setConnections] = useState([]);
  const [status, setStatus] = useState("Settings are stored in local browser storage.");
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getConnections()
      .then((items) => {
        if (!cancelled) setConnections(items);
      })
      .catch((error) => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Could not load connections.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateSettings(patch) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function save() {
    const saved = savePersonaHelperSettings(settings);
    setSettings(saved);
    setStatus("Settings saved.");
  }

  if (activeTab === "about") {
    return (
      <div style={viewStyles.stack}>
        <header style={viewStyles.pageHeader}>
          <h2 style={viewStyles.heading}>About</h2>
          <p style={viewStyles.muted}>Persona Helper converts player intent into story direction.</p>
        </header>
        <article style={viewStyles.panel}>
          <p style={viewStyles.body}>
            Goals are persistent aspirations scoped to persona and collection. Actions are quick hints for
            getting unstuck without turning the extension into a quest manager.
          </p>
          <p style={viewStyles.note}>
            This scaffold is local-first. Backend command integration and `@goal(...)` preprocessing are future steps.
          </p>
          <button type="button" style={formStyles.primaryButton} onClick={() => setAboutOpen(true)}>
            <CircleHelp size={15} />
            View Boundaries
          </button>
        </article>
        {aboutOpen ? (
          <InfoModal title="Persona Helper Boundaries" onClose={() => setAboutOpen(false)}>
            <p style={viewStyles.body}>
              Persona Helper tracks intent and suggests playable next moves. It should not become a project board,
              narrative event log, or replacement for Story Manager.
            </p>
            <p style={overlayStyles.modalNote}>
              Goals are persistent. Actions are throwaway hints. The backend stores goal shape, while generation and
              extraction workflows can stay frontend-owned until a shared command surface needs them.
            </p>
          </InfoModal>
        ) : null}
        <StatusSnackbar message={status} />
      </div>
    );
  }

  return (
    <div style={viewStyles.stack}>
      <header style={viewStyles.pageHeader}>
        <h2 style={viewStyles.heading}>{activeTab === "backend" ? "Backend" : "Defaults"}</h2>
        <p style={viewStyles.muted}>
          {activeTab === "backend"
            ? "Command endpoint settings for Persona Helper storage."
            : "Generation defaults pulled from Marinara connections."}
        </p>
      </header>
      <section style={viewStyles.panel}>
        {activeTab === "backend" ? (
          <>
            <Field label="Backend port">
              <input
                style={formStyles.input}
                value={settings.backendPort}
                onChange={(event) => updateSettings({ backendPort: event.target.value })}
                inputMode="numeric"
                placeholder="5003"
              />
            </Field>
            <p style={viewStyles.muted}>Backend URL: http://localhost:{settings.backendPort || "5003"}</p>
          </>
        ) : (
          <>
            <Field label="Preferred connection" hint="Used by the future action hint generation flow.">
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
            <label style={formStyles.toggleRow}>
              <input
                type="checkbox"
                checked={settings.allowConnectionFallback}
                onChange={(event) => updateSettings({ allowConnectionFallback: event.target.checked })}
              />
              <span>Allow connection fallback</span>
            </label>
            <p style={viewStyles.muted}>If fallback is disabled, generation requires a preferred connection.</p>
          </>
        )}
        <button type="button" style={formStyles.primaryButton} onClick={save}>
          <Save size={15} />
          Save Settings
        </button>
      </section>
      <StatusSnackbar message={status} />
    </div>
  );
}
