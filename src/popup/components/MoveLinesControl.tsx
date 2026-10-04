export type TopMovesCount = 1 | 2 | 3;

interface MoveLinesControlProps {
  value: TopMovesCount;
  onChange: (value: TopMovesCount) => void;
}

const OPTIONS: TopMovesCount[] = [1, 2, 3];

export function MoveLinesControl({ value, onChange }: MoveLinesControlProps) {
  return (
    <div className="move-lines-control">
      <span className="move-lines-label">Move lines</span>
      <div className="move-lines-options" role="group" aria-label="Number of move lines to show">
        {OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={`move-lines-option ${value === n ? "active" : ""}`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
          >
            {n === 1 ? "Best" : `Top ${n}`}
          </button>
        ))}
      </div>
    </div>
  );
}
