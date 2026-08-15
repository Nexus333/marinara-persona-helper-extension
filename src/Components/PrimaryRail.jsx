import { useState } from "react";
import { navigationStyles } from "../Styles/navigationStyles.js";

export function PrimaryRail({ activeId, items, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <nav style={navigationStyles.rail} aria-label="Persona Helper primary navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        const hovered = item.id === hoveredId;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            style={{
              ...navigationStyles.railButton,
              ...(active ? navigationStyles.railButtonActive : undefined),
            }}
            onClick={() => onSelect(item.id)}
            onFocus={() => setHoveredId(item.id)}
            onBlur={() => setHoveredId(null)}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {active && <span style={navigationStyles.railActiveIndicator} />}
            <Icon size="1rem" />
            {hovered && <span style={navigationStyles.railTooltip}>{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
