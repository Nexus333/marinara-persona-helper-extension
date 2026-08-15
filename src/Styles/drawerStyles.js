export const NAV_SELECTOR = ".mari-topbar-panel-nav";
export const NAV_CONTAINER_ID = "ph-nav-container";

const drawerStyles = `
  #${NAV_CONTAINER_ID} {
    display: inline-flex;
    align-items: center;
  }
  #${NAV_CONTAINER_ID} button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--primary, #ffb3d9);
    cursor: pointer;
    flex-shrink: 0;
  }
  #${NAV_CONTAINER_ID} button:hover,
  #${NAV_CONTAINER_ID} button.ph-active {
    background: color-mix(in srgb, var(--primary, #ffb3d9) 14%, transparent);
    color: var(--primary, #ffb3d9);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary, #ffb3d9) 28%, transparent);
  }
  .ph-drawer {
    position: fixed;
    top: 48px;
    right: 0;
    transform: translateX(100%);
    width: min(760px, 92vw);
    height: calc(100dvh - 48px);
    z-index: 9990;
    background: oklch(18% 0.032 315);
    border-left: 1px solid color-mix(in srgb, var(--primary, #ffb3d9) 26%, transparent);
    box-shadow: -8px 0 28px rgba(3, 1, 10, 0.48);
    display: flex;
    flex-direction: column;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 13px;
    color: oklch(91% 0.018 312);
    transition: transform 0.2s cubic-bezier(.22, 1, .36, 1);
  }
  .ph-drawer.ph-open {
    transform: translateX(0);
  }
  .ph-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--primary, #ffb3d9) 18%, transparent);
    background: oklch(13% 0.026 315);
    flex-shrink: 0;
  }
  .ph-drawer-header h1 {
    margin: 0;
    font-size: 17px;
    line-height: 1.25;
    font-weight: 700;
    letter-spacing: 0;
  }
  .ph-drawer-header p {
    margin: 2px 0 0;
    font-size: 12px;
    color: oklch(76% 0.04 315);
  }
  .ph-drawer-header button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    background: transparent;
    border: 1px solid transparent;
    color: oklch(80% 0.035 315);
    cursor: pointer;
    border-radius: 6px;
  }
  .ph-drawer-header button:hover {
    background: oklch(23% 0.036 315);
    border-color: color-mix(in srgb, var(--primary, #ffb3d9) 22%, transparent);
  }
  .ph-help-chip {
    position: absolute;
    right: 14px;
    bottom: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 999px;
    background: oklch(24% 0.034 315);
    color: oklch(82% 0.04 315);
    border: 1px solid color-mix(in srgb, var(--primary, #ffb3d9) 20%, transparent);
    font-size: 12px;
    pointer-events: none;
  }
  @media (max-width: 720px) {
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
