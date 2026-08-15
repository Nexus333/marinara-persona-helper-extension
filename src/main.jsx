import { createRoot } from "react-dom/client";
import { DrawerView } from "./Views/DrawerView.jsx";
import { injectDrawerStyles } from "./Styles/drawerStyles.js";
import { injectFontLinks } from "./Styles/fontLinks.js";

const container = document.createElement("div");
container.id = "ph-root";
document.body.appendChild(container);

const removeDrawerStyles = injectDrawerStyles();
const removeFontLinks = injectFontLinks();
const root = createRoot(container);

root.render(<DrawerView />);

marinara.onCleanup(() => {
  root.unmount();
  container.remove();
  removeDrawerStyles();
  removeFontLinks();
});
