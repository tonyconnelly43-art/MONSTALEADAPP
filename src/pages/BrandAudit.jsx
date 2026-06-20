import { useState } from 'react';
import { Zap, CheckCircle, XCircle, Circle, ExternalLink, ClipboardList } from 'lucide-react';

const CHECKLIST = [
  { id: 'logo', label: 'Does the logo look professional?', tip: 'Check for clean vectors, modern typography, and intentional color palette.' },
  { id: 'modern', label: 'Does the site look modern and clean?', tip: 'Look for cluttered layouts, outdated design patterns, or poor typography.' },
  { id: 'cta', label: 'Is there a strong, clear Call-to-Action?', tip: 'Check for "Call Now", "Get a Free Quote", or "Book Online" above the fold.' },
  { id: 'wraps', label: 'Do they show vehicle wraps or brand consistency?', tip: 'Look for wrapped trucks in photos. Consistent colors across materials = strong brand.' },
  { id: 'reviews', label: 'Are reviews or social proof visible on the site?', tip: 'Embedded Google reviews, testimonials, or star ratings matter for trust.' },
  { id: 'servicearea', label: 'Do they have service area pages?', tip: 'City/suburb-specific landing pages are key for local SEO dominance.' },
  { id: 'socialmedia', label: 'Do they have active social media presence?', tip: 'Check for linked accounts and recent posts. Inactive = opportunity.' },
  { id: 'mobile', label: 'Is the website mobile-friendly?', tip: 'Most home service searches happen on mobile. A broken mobile site is a red flag.' },
  { id: 'speed', label: 'Does the site load fast?', tip: 'Slow sites lose customers. Check if images are optimized and hosting is decent.' },
  { id: 'photos', label: 'Do they show real job photos or team photos?', tip: 'Stock photos scream "no brand." Real photos build authenticity and trust.' },
];

const STATES = { yes: 'yes', no: 'no', unsure: 'unsure' };

export default function BrandAudit() {
  const [url, setUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [started, setStarted] = useState(false);
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState('');

  function startAudit() {
    if (!url.trim()) return;
    setStarted(true);
    setChecks({});
    setNotes('');
  }

  function setCheck(id, val) {
    setChecks(prev => ({ ...prev, [id]: prev[id] === val ? undefined : val }));
  }

  const yesCount = Object.values(checks).filter(v => v === 'yes').length;
  const noCount = Object.values(checks).filter(v => v === 'no').length;
  const total = CHECKLIST.length;
  const answered = Object.values(checks).filter(Boolean).length;
  const score = answered ? Math.round((yesCount / answered) * 10) : 0;

  const scoreLabel =
    score >= 8 ? { text: 'Strong Brand', color: '#39ff14' } :
    score >= 5 ? { text: 'Needs Work', color: '#ff6b00' } :
    { text: 'Major Opportunity', color: '#ff3333' };

  function copyReport() {
    const lines = [
      `BRAND AUDIT REPORT — ${companyName || url}`,
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      ...CHECKLIST.map(c => `[${checks[c.id] === 'yes' ? '✓' : checks[c.id] === 'no' ? '✗' : '-'}] ${c.label}`),
      '',
      `Score: ${score}/10 — ${scoreLabel.text}`,
      '',
      notes ? `Notes:\n${notes}` : '',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    alert('Report copied to clipboard!');
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand Audit</h1>
          <p className="page-subtitle">Quickly evaluate a company's brand strength</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title" style={{ marginBottom: 16 }}>Start an Audit</h2>
        <div className="audit-inputs">
          <input
            className="input"
            placeholder="Company name (optional)"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, flex: 2 }}>
            <input
              className="input"
              placeholder="Website URL (e.g. peakprohvac.com)"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startAudit()}
            />
            {url && (
              <a href={`https://${url.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                <ExternalLink size={15} /> Open
              </a>
            )}
          </div>
          <button className="btn btn--primary" onClick={startAudit} disabled={!url.trim()}>
            <Zap size={16} /> Start Audit
          </button>
        </div>
      </div>

      {started && (
        <>
          <div className="audit-header-bar">
            <div className="audit-meta">
              Auditing: <strong style={{ color: '#39ff14' }}>{companyName || url}</strong>
              <span className="audit-progress">({answered}/{total} answered)</span>
            </div>
            {answered > 0 && (
              <div className="audit-score-bar">
                <span style={{ color: scoreLabel.color, fontWeight: 700, fontSize: 20 }}>{score}/10</span>
                <span className="score-label-text" style={{ color: scoreLabel.color }}>{scoreLabel.text}</span>
              </div>
            )}
          </div>

          <div className="checklist-grid">
            {CHECKLIST.map(item => (
              <div key={item.id} className={`checklist-item ${checks[item.id] ? `checklist-item--${checks[item.id]}` : ''}`}>
                <div className="checklist-question">
                  <span>{item.label}</span>
                </div>
                <p className="checklist-tip">{item.tip}</p>
                <div className="checklist-btns">
                  <button
                    className={`check-btn check-btn--yes ${checks[item.id] === 'yes' ? 'active' : ''}`}
                    onClick={() => setCheck(item.id, 'yes')}
                  >
                    <CheckCircle size={16} /> Yes
                  </button>
                  <button
                    className={`check-btn check-btn--no ${checks[item.id] === 'no' ? 'active' : ''}`}
                    onClick={() => setCheck(item.id, 'no')}
                  >
                    <XCircle size={16} /> No
                  </button>
                  <button
                    className={`check-btn check-btn--unsure ${checks[item.id] === 'unsure' ? 'active' : ''}`}
                    onClick={() => setCheck(item.id, 'unsure')}
                  >
                    <Circle size={16} /> Unsure
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>Audit Notes</h3>
            <textarea
              className="input textarea"
              rows={5}
              placeholder="Add observations, specific issues, or pitch angles..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {answered >= 5 && (
            <div className="audit-summary card">
              <div className="audit-summary-left">
                <div className="summary-big" style={{ color: scoreLabel.color }}>{score}<span>/10</span></div>
                <div className="summary-verdict" style={{ color: scoreLabel.color }}>{scoreLabel.text}</div>
                <div className="summary-counts">
                  <span className="count-yes">✓ {yesCount} passing</span>
                  <span className="count-no">✗ {noCount} failing</span>
                </div>
              </div>
              <div className="audit-summary-right">
                <p style={{ color: '#aaa', marginBottom: 12 }}>
                  {noCount > 0
                    ? `${noCount} area${noCount > 1 ? 's' : ''} identified where Monsta Media can provide massive value.`
                    : 'This brand looks solid. Look for subtle SEO or vehicle wrap opportunities.'}
                </p>
                <button className="btn btn--primary" onClick={copyReport}>
                  <ClipboardList size={15} /> Copy Audit Report
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
