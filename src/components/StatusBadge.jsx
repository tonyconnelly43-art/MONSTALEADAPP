const colors = {
  New: { bg: '#1a1a2e', border: '#39ff14', text: '#39ff14' },
  Reviewed: { bg: '#1a1a2e', border: '#00b4ff', text: '#00b4ff' },
  Contacted: { bg: '#1a1a2e', border: '#ff6b00', text: '#ff6b00' },
  'Followed Up': { bg: '#1a1a2e', border: '#ffd700', text: '#ffd700' },
  Booked: { bg: '#1a1a2e', border: '#bf00ff', text: '#bf00ff' },
  Won: { bg: '#0a2e0a', border: '#39ff14', text: '#39ff14' },
  Lost: { bg: '#2e0a0a', border: '#ff3333', text: '#ff3333' },
};

export default function StatusBadge({ status }) {
  const c = colors[status] || colors.New;
  return (
    <span
      className="status-badge"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {status}
    </span>
  );
}
