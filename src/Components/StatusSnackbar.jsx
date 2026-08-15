import { useEffect, useState } from "react";
import { overlayStyles } from "../Styles/overlayStyles.js";

export function StatusSnackbar({ message }) {
  const [visible, setVisible] = useState(Boolean(String(message || "").trim()));

  useEffect(() => {
    const trimmed = String(message || "").trim();
    setVisible(Boolean(trimmed));
    if (!trimmed) return undefined;

    const timeout = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!visible || !String(message || "").trim()) return null;

  return (
    <div style={overlayStyles.snackbar} role="status" aria-live="polite">
      {message}
    </div>
  );
}
