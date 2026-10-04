import { formatStrengthDisplay, strengthToElo } from "../../engine/difficulty";
import { STRENGTH_MAX, STRENGTH_MIN } from "../../shared/constants";
import { Slider } from "./Slider";

interface StrengthSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function StrengthSlider({ value, onChange }: StrengthSliderProps) {
  const display = formatStrengthDisplay(value);
  const lowElo = strengthToElo(STRENGTH_MIN);

  return (
    <div className="slider-wrap">
      <div className="section-label">
        <span>Playing Strength</span>
        <span className="section-value strength-value">{display}</span>
      </div>
      <div className="slider-labels">
        <span>{lowElo} Elo</span>
        <span>Expert</span>
      </div>
      <Slider
        min={STRENGTH_MIN}
        max={STRENGTH_MAX}
        step={1}
        value={value}
        onChange={onChange}
        ariaLabel="Playing strength"
      />
    </div>
  );
}
