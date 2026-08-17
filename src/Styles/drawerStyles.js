export const NAV_SELECTOR = ".mari-topbar-panel-nav";
export const NAV_CONTAINER_ID = "ph-nav-container";

const drawerStyles = `
  @keyframes ph-snackbar-in {
    from { opacity: 0; transform: translateY(0.5rem); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ph-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  #${NAV_CONTAINER_ID} {
    display: inline-flex;
    align-items: center;
  }
  #${NAV_CONTAINER_ID} button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--primary, #CCC);
    cursor: pointer;
    flex-shrink: 0;
  }
  #${NAV_CONTAINER_ID} button:hover,
  #${NAV_CONTAINER_ID} button.ph-active {
    background: #333;
    color: var(--primary, #CCC);
    box-shadow: inset 0 0 0 0.0625rem var(--primary, #CCC);
  }
  .ph-drawer {
    position: fixed;
    top: 3rem;
    left: 0;
    transform: translateX(-100%);
    width: min(47.5rem, 92vw);
    height: calc(100dvh - 3rem);
    z-index: 9990;
    background: transparent;
    border-right: 0.0625rem solid #333;
    box-shadow: 0.25rem 0 1.5rem rgba(0,0,0,.4);
    display: flex;
    flex-direction: column;
    font-family: Montserrat, sans-serif;
    font-size: 0.8125rem;
    color: #CCC;
    transition: transform 0.2s cubic-bezier(.22, 1, .36, 1);
  }
  .ph-drawer.ph-open {
    transform: translateX(0);
  }
  .ph-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    border-bottom: 0.0625rem solid #333;
    background: #000;
    flex-shrink: 0;
  }
  .ph-drawer-header h1 {
    margin: 0;
    font-size: 1.0625rem;
    line-height: 1.25;
    font-family: Nova Flat, sans-serif;
    font-weight: 400;
    letter-spacing: 0;
  }
  .ph-drawer-header p {
    margin: 0.125rem 0 0;
    font-size: 0.75rem;
    color: #888;
    font-family: Iceberg, sans-serif;
  }
  .ph-drawer-header button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.875rem;
    height: 1.875rem;
    background: transparent;
    border: 0.0625rem solid transparent;
    color: #888;
    cursor: pointer;
    border-radius: 0.375rem;
  }
  .ph-drawer-header button:hover {
    background: #333;
    border-color: #333;
    color: #CCC;
  }
  .ph-help-chip {
    position: absolute;
    right: 0.875rem;
    bottom: 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.5rem;
    border-radius: 999rem;
    background: #111;
    color: #888;
    border: 0.0625rem solid #333;
    font-size: 0.75rem;
    font-family: Iceberg, sans-serif;
    pointer-events: none;
  }
  @media (max-width: 45rem) {
    .ph-drawer {
      width: 100vw;
    }
  }
`;

export function injectDrawerStyles() {
  const style = document.createElement("style");
  style.textContent = drawerStyles;
  document.head.appendChild(style);
  return () => style.remove();
}
