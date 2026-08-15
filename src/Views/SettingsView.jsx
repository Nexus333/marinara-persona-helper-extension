import { useState } from "react";
import { Save } from "lucide-react";
import { loadPersonaHelperSettings, savePersonaHelperSettings } from "../API/settings.js";
import { Field } from "../Components/Field.jsx";
import { formStyles } from "../Styles/formStyles.js";
import { viewStyles } from "../Styles/viewStyles.js";

export function SettingsView({ activeTab }) {
  const [settings, setSettings] = useState(() => loadPersonaHelperSettings());
  const [saved, setSaved] = useState(false);

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
        </article>
      </div>
    );
  }

  return (
    <div style={viewStyles.stack}>
      <header style={viewStyles.pageHeader}>
        <h2 style={viewStyles.heading}>Backend</h2>
        <p style={viewStyles.muted}>Connection settings for the future Persona Helper command surface.</p>
      </header>
      <section style={viewStyles.panel}>
        <Field label="Backend port">
          <input
            style={formStyles.input}
            value={settings.backendPort}
            onChange={(event) => {
              setSaved(false);
              setSettings((current) => ({ ...current, backendPort: event.target.value }));
            }}
          />
        </Field>
        <Field label="Preferred connection id" hint="Reserved for the action hint generation flow.">
          <input
            style={formStyles.input}
            value={settings.preferredConnectionId}
            onChange={(event) => {
              setSaved(false);
              setSettings((current) => ({ ...current, preferredConnectionId: event.target.value }));
            }}
            placeholder="Optional"
          />
        </Field>
        <label style={formStyles.toggleRow}>
          <input
            type="checkbox"
            checked={settings.allowLocalFallback}
            onChange={(event) => {
              setSaved(false);
              setSettings((current) => ({ ...current, allowLocalFallback: event.target.checked }));
            }}
          />
          <span>Allow local fallback while backend commands are unavailable</span>
        </label>
        <button
          type="button"
          style={formStyles.primaryButton}
          onClick={() => {
            savePersonaHelperSettings(settings);
            setSaved(true);
          }}
        >
          <Save size={15} />
          Save Settings
        </button>
        <p style={viewStyles.muted}>{saved ? "Saved." : "Changes save only when confirmed."}</p>
      </section>
    </div>
  );
}
