import { X } from "lucide-react";
import { formStyles } from "../Styles/formStyles.js";
import { overlayStyles } from "../Styles/overlayStyles.js";

export function InfoModal({ title, children, onClose }) {
  return (
    <div style={overlayStyles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <div
        style={overlayStyles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={overlayStyles.modalHeader}>
          <h3 style={overlayStyles.modalTitle}>{title}</h3>
          <button type="button" style={formStyles.iconButton} title="Close" aria-label="Close" onClick={onClose}>
            <X size="0.9375rem" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
