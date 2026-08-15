import { formStyles } from "../Styles/formStyles.js";

export function Field({ label, children, hint }) {
  return (
    <label style={formStyles.field}>
      <span style={formStyles.label}>{label}</span>
      {children}
      {hint ? <span style={formStyles.hint}>{hint}</span> : null}
    </label>
  );
}
