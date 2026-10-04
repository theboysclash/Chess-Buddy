interface PillToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function PillToggle({ checked, onChange, disabled, label }: PillToggleProps) {
  return (
    <button
      type="button"
      className={`pill-toggle ${checked ? "on" : ""}`}
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      {checked ? "ON" : "OFF"}
    </button>
  );
}
