import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, Flag, Lightbulb, Settings, X } from "lucide-react";
import { NavButton } from "../Components/NavButton.jsx";
import { PrimaryRail } from "../Components/PrimaryRail.jsx";
import { TopTabs } from "../Components/TopTabs.jsx";
import { NAV_CONTAINER_ID, NAV_SELECTOR } from "../Styles/drawerStyles.js";
import { navigationStyles } from "../Styles/navigationStyles.js";
import { ActionsView } from "./ActionsView.jsx";
import { GoalsView } from "./GoalsView.jsx";
import { SettingsView } from "./SettingsView.jsx";

const RAIL_ITEMS = [
  { id: "goals", label: "Goals", icon: Flag },
  { id: "actions", label: "Actions", icon: Lightbulb },
  { id: "settings", label: "Settings", icon: Settings },
];

const TAB_ITEMS = {
  goals: [
    { id: "library", label: "Library" },
    { id: "focus", label: "Focus" },
  ],
  actions: [
    { id: "hints", label: "Hints" },
    { id: "recent", label: "Recent" },
    { id: "setup", label: "Setup" },
  ],
  settings: [
    { id: "backend", label: "Backend" },
    { id: "defaults", label: "Defaults" },
    { id: "about", label: "About" },
  ],
};

const DEFAULT_TABS = {
  goals: "library",
  actions: "hints",
  settings: "backend",
};

export function DrawerView() {
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState("goals");
  const [activeTabs, setActiveTabs] = useState(DEFAULT_TABS);
  const [navContainer, setNavContainer] = useState(null);

  useEffect(() => {
    function mount() {
      const nav = document.querySelector(NAV_SELECTOR);
      if (!nav) return;
      let container = document.getElementById(NAV_CONTAINER_ID);
      if (!container) {
        container = document.createElement("div");
        container.id = NAV_CONTAINER_ID;
        nav.insertBefore(container, nav.firstChild);
      }
      setNavContainer(container);
    }

    mount();
    const observer = new MutationObserver(() => {
      if (!document.getElementById(NAV_CONTAINER_ID)) mount();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const activeTab = activeTabs[activeView];
  const setActiveTab = (tab) => {
    setActiveTabs((current) => ({ ...current, [activeView]: tab }));
  };

  return (
    <>
      {navContainer &&
        createPortal(<NavButton active={open} onClick={() => setOpen((value) => !value)} />, navContainer)}
      <aside className={`ph-drawer${open ? " ph-open" : ""}`} aria-label="Persona Helper drawer">
        <header className="ph-drawer-header">
          <div>
            <h1>Persona Helper</h1>
            <p>Goals and next moves</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} title="Close">
            <X size="0.9375rem" />
          </button>
        </header>
        <div style={navigationStyles.shell}>
          <PrimaryRail activeId={activeView} items={RAIL_ITEMS} onSelect={setActiveView} />
          <main style={navigationStyles.main}>
            <TopTabs activeId={activeTab} tabs={TAB_ITEMS[activeView]} onSelect={setActiveTab} />
            <section style={navigationStyles.content}>
              {activeView === "goals" ? (
                <GoalsView activeTab={activeTabs.goals} />
              ) : activeView === "actions" ? (
                <ActionsView activeTab={activeTabs.actions} />
              ) : (
                <SettingsView activeTab={activeTabs.settings} />
              )}
            </section>
          </main>
        </div>
        <div className="ph-help-chip" title="Boilerplate scaffold">
          <CircleHelp size="0.875rem" />
          <span>Draft</span>
        </div>
      </aside>
    </>
  );
}
