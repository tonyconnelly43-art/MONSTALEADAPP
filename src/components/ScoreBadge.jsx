export default function ScoreBadge({ score, label }) {
  const color =
    score >= 8 ? '#39ff14' :
    score >= 5 ? '#ff6b00' :
    '#ff3333';

  return (
    <div className="score-badge" title={label}>
      <div className="score-ring" style={{ '--score-color': color }}>
        <span style={{ color }}>{score}</span>
      </div>
      {label && <div className="score-label">{label}</div>}
    </div>
  );
}
