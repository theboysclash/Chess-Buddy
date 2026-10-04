import { PillToggle } from "./PillToggle";

interface AutoPlayControlProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  hint?: string;
}

export function AutoPlayControl({ enabled, onChange, hint }: AutoPlayControlProps) {
  return (
    <div className="auto-play-block">
      <div className="pill-toggle-row">
        <span className="section-label" style={{ margin: 0 }}>Auto Play</span>
        <PillToggle
          checked={enabled}
          onChange={onChange}
          label="Toggle auto play"
        />
      </div>
      <p className="hint-text">
        {enabled ? "Automatic moves enabled" : "Manual move mode"}
        {hint ? ` · ${hint}` : ""}
      </p>
    </div>
  );
}
