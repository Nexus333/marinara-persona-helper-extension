import { navigationStyles } from "../Styles/navigationStyles.js";

export function TopTabs({ activeId, tabs, onSelect }) {
  return (
    <div style={navigationStyles.tabs} role="tablist" aria-label="Persona Helper view tabs">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            style={{
              ...navigationStyles.tabButton,
              ...(active ? navigationStyles.tabButtonActive : undefined),
            }}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
