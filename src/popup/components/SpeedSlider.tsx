import { delaySecToLabel, formatDelay } from "../../engine/difficulty";
import { DELAY_MAX_SEC, DELAY_MIN_SEC } from "../../shared/constants";
import { Slider } from "./Slider";

interface SpeedSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function SpeedSlider({ value, onChange, disabled }: SpeedSliderProps) {
  return (
    <div className={`slider-wrap ${disabled ? "muted-block" : ""}`}>
      <div className="section-label">
        <span>Move Delay</span>
        <span className="section-value">{formatDelay(value)}</span>
      </div>
      <div className="slider-labels">
        <span>Fast</span>
        <span>Deliberate</span>
      </div>
      <Slider
        min={DELAY_MIN_SEC}
        max={DELAY_MAX_SEC}
        step={0.1}
        value={value}
        onChange={onChange}
        disabled={disabled}
        ariaLabel="Move delay"
      />
      <p className="hint-text">{delaySecToLabel(value)} pacing</p>
    </div>
  );
}
