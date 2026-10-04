import { PillToggle } from "./PillToggle";

interface AutoPlayControlProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function AutoPlayControl({ enabled, onChange, disabled }: AutoPlayControlProps) {
  return (
    <div>
      <div className="pill-toggle-row">
        <span className="section-label" style={{ margin: 0 }}>Auto Play</span>
        <PillToggle
          checked={enabled}
          onChange={onChange}
          disabled={disabled}
          label="Toggle auto play"
        />
      </div>
      <p className="hint-text">{enabled ? "Automatic moves enabled" : "Manual move mode"}</p>
    </div>
  );
}
