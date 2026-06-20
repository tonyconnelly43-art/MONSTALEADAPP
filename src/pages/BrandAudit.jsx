import { useState } from 'react';
import { Zap, CheckCircle, XCircle, Circle, ExternalLink, ClipboardList, Monitor, AlertTriangle, Globe } from 'lucide-react';

const CHECKLIST = [
  { id: 'logo', label: 'Does the logo look professional?', tip: 'Check for clean vectors, modern typography, and intentional color palette.' },
  { id: 'modern', label: 'Does the site look modern and clean?', tip: 'Look for cluttered layouts, outdated design patterns, or poor typography.' },
  { id: 'cta', label: 'Is there a strong, clear Call-to-Action?', tip: 'Check for "Call Now", "Get a Free Quote", or "Book Online" above the fold.' },
  { id: 'wraps', label: 'Do they show vehicle wraps or brand consistency?', tip: 'Look for wrapped trucks in photos. Consistent colors = strong brand.' },
  { id: 'reviews', label: 'Are reviews or social proof visible on the site?', tip: 'Embedded Google reviews, testimonials, or star ratings matter for trust.' },
  { id: 'servicearea', label: 'Do they have service area pages?', tip: 'City/suburb-specific landing pages are key for local SEO dominance.' },
  { id: 'socialmedia', label: 'Do they have active social media presence?', tip: 'Check for linked accounts and recent posts. Inactive = opportunity.' },
  { id: 'mobile', label: 'Is the website mobile-friendly?', tip: 'Most home service searches happen on mobile. A broken mobile site = lost leads.' },
  { id: 'speed', label: 'Does the site load fast?', tip: 'Slow sites lose customers. Watch how long it takes the preview to load.' },
  { id: 'photos', label: 'Do they show real job photos or team photos?', tip: 'Stock photos hurt credibility. Real photos build trust.' },
];

function cleanUrl(raw) {
  const s = raw.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `https://${s}`;
}

export default function BrandAudit() {
  const [urlInput, setUrlInput] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState('');
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  function startAudit() {
    if (!urlInput.trim()) return;
    const full = cleanUrl(urlInput);
    setActiveUrl(full);
    setChecks({});
    setNotes('');
    setIframeBlocked(false);
    setIframeLoaded(false);
  }

  function setCheck(id, val) {
    setChecks(prev => ({ ...prev, [id]: prev[id] === val ? undefined : val }));
  }

  const yesCount = Object.values(checks).filter(v => v === 'yes').length;
  const noCount = Object.values(checks).filter(v => v === 'no').length;
  const answered = Object.values(checks).filter(Boolean).length;
  const score = answered ? Math.round((yesCount / answered) * 10) : 0;

  const scoreLabel =
    score >= 8 ? { text: 'Strong Brand', color: '#39d353' } :
    score >= 5 ? { text: 'Needs Work', color: '#ff9500' } :
    { text: 'Major Opportunity', color: '#ff4444' };

  function copyReport() {
    const report = [
      `BRAND AUDIT — ${companyName || activeUrl}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `URL: ${activeUrl}`,
      '',
      '--- CHECKLIST ---',
      ...CHECKLIST.map(c => `[${checks[c.id] === 'yes' ? '✓' : checks[c.id] === 'no' ? '✗' : '-'}] ${c.label}`),
      '',
      `Brand Score: ${score}/10 — ${scoreLabel.text}`,
      `Passing: ${yesCount}  |  Failing: ${noCount}`,
      '',
      notes ? `Notes:\n${notes}` : '',
    ].join('\n');
    navigator.clipboard.writeText(report);
    alert('Report copied to clipboard!');
  }

  const domain = activeUrl ? activeUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand Audit</h1>
          <p className="page-subtitle">Preview any business website and score their branding</p>
        </div>
      </div>

      {/* Input bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="audit-inputs">
          <input
            className="input"
            placeholder="Company name (optional)"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input
              className="input"
              placeholder="Website URL — e.g. goodhopehvac.com"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startAudit()}
            />
            {activeUrl && (
              <a href={activeUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                <ExternalLink size={15} /> Open
              </a>
            )}
          </div>
          <button className="btn btn--primary" onClick={startAudit} disabled={!urlInput.trim()}>
            <Zap size={15} /> Load Site
          </button>
        </div>
      </div>

      {activeUrl && (
        <div className="audit-workspace">
          {/* Left: Site preview */}
          <div className="audit-preview-col">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Browser chrome */}
              <div className="browser-bar">
                <div className="browser-dots"><span /><span /><span /></div>
                {faviconUrl && <img src={faviconUrl} alt="" width={14} height={14} style={{ borderRadius: 2 }} />}
                <div className="browser-url">{domain}</div>
                <a href={activeUrl} target="_blank" rel="noreferrer" className="icon-btn" title="Open in new tab">
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* iframe or blocked message */}
              {iframeBlocked ? (
                <div className="iframe-blocked">
                  <AlertTriangle size={32} color="#ff9500" />
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>This site blocks previews</div>
                  <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 14, maxWidth: 280, textAlign: 'center' }}>
                    Some sites prevent embedding. Open it in a new tab to review it while filling out the checklist.
                  </div>
                  <a href={activeUrl} target="_blank" rel="noreferrer" className="btn btn--primary">
                    <ExternalLink size={15} /> Open {domain}
                  </a>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {!iframeLoaded && (
                    <div className="iframe-loading">
                      <Globe size={28} color="var(--border)" />
                      <div style={{ color: 'var(--text2)', fontSize: 13 }}>Loading {domain}...</div>
                    </div>
                  )}
                  <iframe
                    src={activeUrl}
                    title="Site Preview"
                    className="site-iframe"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={() => setIframeLoaded(true)}
                    onError={() => setIframeBlocked(true)}
                    style={{ opacity: iframeLoaded ? 1 : 0 }}
                  />
                </div>
              )}
            </div>

            {/* Score summary under preview */}
            {answered >= 3 && (
              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: scoreLabel.color, lineHeight: 1 }}>
                      {score}<span style={{ fontSize: 18, opacity: 0.6 }}>/10</span>
                    </div>
                    <div style={{ color: scoreLabel.color, fontWeight: 700, marginTop: 4 }}>{scoreLabel.text}</div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12 }}>
                      <span style={{ color: '#39d353' }}>✓ {yesCount} passing</span>
                      <span style={{ color: '#ff4444' }}>✗ {noCount} failing</span>
                      <span style={{ color: 'var(--text2)' }}>— {CHECKLIST.length - answered} left</span>
                    </div>
                  </div>
                  <button className="btn btn--primary" onClick={copyReport}>
                    <ClipboardList size={15} /> Copy Report
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Checklist */}
          <div className="audit-checklist-col">
            <div className="audit-header-bar" style={{ marginBottom: 10 }}>
              <div className="audit-meta">
                {faviconUrl && <img src={faviconUrl} alt="" width={14} height={14} style={{ marginRight: 6, borderRadius: 2, verticalAlign: 'middle' }} />}
                <strong style={{ color: '#cc1a1a' }}>{companyName || domain}</strong>
                <span className="audit-progress" style={{ marginLeft: 8 }}>({answered}/{CHECKLIST.length})</span>
              </div>
              {answered > 0 && (
                <div style={{ color: scoreLabel.color, fontWeight: 700 }}>{score}/10</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CHECKLIST.map(item => (
                <div key={item.id} className={`checklist-item checklist-item--compact ${checks[item.id] ? `checklist-item--${checks[item.id]}` : ''}`}>
                  <div className="checklist-question" style={{ fontSize: 12, marginBottom: 4 }}>{item.label}</div>
                  <div className="checklist-tip" style={{ fontSize: 11, marginBottom: 8 }}>{item.tip}</div>
                  <div className="checklist-btns">
                    <button className={`check-btn check-btn--yes ${checks[item.id] === 'yes' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'yes')}>
                      <CheckCircle size={13} /> Yes
                    </button>
                    <button className={`check-btn check-btn--no ${checks[item.id] === 'no' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'no')}>
                      <XCircle size={13} /> No
                    </button>
                    <button className={`check-btn check-btn--unsure ${checks[item.id] === 'unsure' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'unsure')}>
                      <Circle size={13} /> ?
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <textarea
                className="input textarea"
                rows={3}
                placeholder="Notes, red flags, pitch angles..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
