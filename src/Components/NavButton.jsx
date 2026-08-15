import { Compass } from "lucide-react";

export function NavButton({ active, onClick }) {
  return (
    <button title="Persona Helper" className={active ? "ph-active" : ""} onClick={onClick}>
      <Compass size={16} />
    </button>
  );
}
