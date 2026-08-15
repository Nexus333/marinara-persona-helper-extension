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
    color: #CCC;
    cursor: pointer;
    flex-shrink: 0;
  }
  #${NAV_CONTAINER_ID} button:hover,
  #${NAV_CONTAINER_ID} button.ph-active {
    background: #333;
    color: #CCC;
    box-shadow: inset 0 0 0 1px #CCC;
  }
  .ph-drawer {
    position: fixed;
    top: 48px;
    right: 0;
    transform: translateX(100%);
    width: min(760px, 92vw);
    height: calc(100dvh - 48px);
    z-index: 9990;
    background: transparent;
    border-left: 1px solid #333;
    box-shadow: -4px 0 24px rgba(0,0,0,.4);
    display: flex;
    flex-direction: column;
    font-family: Montserrat, sans-serif;
    font-size: 13px;
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
    padding: 14px 16px;
    border-bottom: 1px solid #333;
    background: #000;
    flex-shrink: 0;
  }
  .ph-drawer-header h1 {
    margin: 0;
    font-size: 17px;
    line-height: 1.25;
    font-family: Nova Flat, sans-serif;
    font-weight: 400;
    letter-spacing: 0;
  }
  .ph-drawer-header p {
    margin: 2px 0 0;
    font-size: 12px;
    color: #888;
    font-family: Iceberg, sans-serif;
  }
  .ph-drawer-header button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    background: transparent;
    border: 1px solid transparent;
    color: #888;
    cursor: pointer;
    border-radius: 6px;
  }
  .ph-drawer-header button:hover {
    background: #333;
    border-color: #333;
    color: #CCC;
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
    background: #111;
    color: #888;
    border: 1px solid #333;
    font-size: 12px;
    font-family: Iceberg, sans-serif;
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
