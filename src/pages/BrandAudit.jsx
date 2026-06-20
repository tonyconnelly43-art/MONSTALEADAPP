import { useState, Component } from 'react';
import { Zap, CheckCircle, XCircle, Circle, ExternalLink, ClipboardList, Loader, Monitor, Gauge, Smartphone, AlertTriangle } from 'lucide-react';

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

function scoreColor(score) {
  if (score >= 80) return '#39d353';
  if (score >= 50) return '#ff9500';
  return '#ff4444';
}

// Error boundary so a crash doesn't take down the whole page
class AuditErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ borderColor: '#ff444455', padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#ff4444', marginBottom: 8 }}>
            <AlertTriangle size={18} /> <strong>Something went wrong displaying the scan results.</strong>
          </div>
          <div style={{ color: 'var(--text2)', fontSize: 12 }}>You can still complete the checklist manually below.</div>
          <button className="btn btn--ghost btn--sm" style={{ marginTop: 10 }} onClick={() => this.setState({ error: null })}>
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScoreGauge({ label, score, icon: Icon }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const color = scoreColor(s);
  return (
    <div className="gauge-card">
      <div className="gauge-icon"><Icon size={18} color={color} /></div>
      <div className="gauge-value" style={{ color }}>{s}</div>
      <div className="gauge-bar-wrap">
        <div className="gauge-bar" style={{ width: `${s}%`, background: color }} />
      </div>
      <div className="gauge-label">{label}</div>
    </div>
  );
}

function safe(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

function cleanUrl(raw) {
  const s = raw.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `https://${s}`;
}

async function fetchSiteData(rawUrl) {
  const fullUrl = cleanUrl(rawUrl);

  // Run Microlink (screenshot + meta) and PageSpeed (scores) in parallel
  const [mlRes, psRes] = await Promise.allSettled([
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(fullUrl)}&screenshot=true&meta=true&timeout=15000`),
    fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(fullUrl)}&strategy=mobile&category=performance&category=seo&category=accessibility`),
  ]);

  // --- Microlink data ---
  let screenshot = null;
  let title = '';
  let description = '';

  if (mlRes.status === 'fulfilled' && mlRes.value.ok) {
    const ml = await mlRes.value.json().catch(() => ({}));
    screenshot = safe(() => ml.data?.screenshot?.url) || safe(() => ml.data?.image?.url) || null;
    title = safe(() => ml.data?.title) || '';
    description = safe(() => ml.data?.description) || '';
  }

  // --- PageSpeed data ---
  let perfScore = null, seoScore = null, a11yScore = null, mobileScore = null;
  let fcp = '—', lcp = '—', tbt = '—', cls = '—';
  let opportunities = [];

  if (psRes.status === 'fulfilled' && psRes.value.ok) {
    const ps = await psRes.value.json().catch(() => ({}));
    const lhr = ps?.lighthouseResult;
    if (lhr) {
      const audits = lhr.audits || {};
      const cats = lhr.categories || {};
      perfScore = safe(() => Math.round((cats.performance?.score ?? 0) * 100));
      seoScore  = safe(() => Math.round((cats.seo?.score ?? 0) * 100));
      a11yScore = safe(() => Math.round((cats.accessibility?.score ?? 0) * 100));
      mobileScore = safe(() => audits['viewport']?.score === 1 ? 100 : 20);
      fcp = safe(() => audits['first-contentful-paint']?.displayValue, '—');
      lcp = safe(() => audits['largest-contentful-paint']?.displayValue, '—');
      tbt = safe(() => audits['total-blocking-time']?.displayValue, '—');
      cls = safe(() => audits['cumulative-layout-shift']?.displayValue, '—');
      opportunities = safe(() =>
        Object.values(audits)
          .filter(a => a?.details?.type === 'opportunity' && typeof a.score === 'number' && a.score < 0.9)
          .slice(0, 4).map(a => a.title).filter(Boolean), []
      );
      // Fallback screenshot from PageSpeed if Microlink didn't get one
      if (!screenshot) {
        screenshot = safe(() => audits['final-screenshot']?.details?.data) || null;
      }
    }
  }

  // If both failed completely, throw
  if (!screenshot && perfScore === null && !title) {
    throw new Error('Both scan services returned no data. The site may be blocking automated access.');
  }

  return { screenshot, title, description, perfScore, seoScore, a11yScore, mobileScore, fcp, lcp, tbt, cls, opportunities };
}

export default function BrandAudit() {
  const [url, setUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [started, setStarted] = useState(false);
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState('');
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  async function startAudit() {
    if (!url.trim()) return;
    setStarted(true);
    setChecks({});
    setNotes('');
    setSiteData(null);
    setLoadError('');
    setLoading(true);

    try {
      const data = await fetchSiteData(url.trim());
      setSiteData(data);
      // Auto-hint a few checklist items from data
      const hints = {};
      if (data.perfScore >= 70) hints.speed = 'yes';
      else if (data.perfScore < 40) hints.speed = 'no';
      if (data.mobileScore >= 90) hints.mobile = 'yes';
      else if (data.mobileScore < 30) hints.mobile = 'no';
      setChecks(hints);
    } catch (e) {
      setLoadError(`Scan failed: ${e.message}. You can still complete the checklist manually — open the site in a new tab using the button above.`);
    } finally {
      setLoading(false);
    }
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
      `BRAND AUDIT — ${companyName || url}`,
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      siteData ? [
        `Performance: ${siteData.perfScore}/100`,
        `SEO: ${siteData.seoScore}/100`,
        `Accessibility: ${siteData.a11yScore}/100`,
        `First Paint: ${siteData.fcp}  |  Largest Paint: ${siteData.lcp}`,
        '',
      ].join('\n') : '',
      '--- BRAND CHECKLIST ---',
      ...CHECKLIST.map(c => `[${checks[c.id] === 'yes' ? '✓' : checks[c.id] === 'no' ? '✗' : '-'}] ${c.label}`),
      '',
      `Brand Score: ${score}/10 — ${scoreLabel.text}`,
      '',
      notes ? `Notes:\n${notes}` : '',
    ].join('\n');
    navigator.clipboard.writeText(report);
    alert('Report copied!');
  }

  const siteUrl = url ? `https://${url.replace(/^https?:\/\//i, '')}` : '';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand Audit</h1>
          <p className="page-subtitle">Scan any website and run your checklist</p>
        </div>
      </div>

      {/* Input */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card-title" style={{ marginBottom: 16 }}>Start an Audit</h2>
        <div className="audit-inputs">
          <input className="input" placeholder="Company name (optional)" value={companyName} onChange={e => setCompanyName(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, flex: 2 }}>
            <input
              className="input"
              placeholder="Website URL — e.g. peakprohvac.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startAudit()}
            />
            {url && (
              <a href={siteUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                <ExternalLink size={15} /> Open
              </a>
            )}
          </div>
          <button className="btn btn--primary" onClick={startAudit} disabled={!url.trim() || loading}>
            {loading ? <><Loader size={15} className="spin" /> Scanning...</> : <><Zap size={15} /> Scan Site</>}
          </button>
        </div>
      </div>

      {started && (
        <>
          {/* Loading state */}
          {loading && (
            <div className="card scan-loading">
              <Loader size={28} className="spin" color="#cc1a1a" />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Scanning {url}...</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>Running Google PageSpeed analysis — takes 10–25 seconds</div>
              </div>
            </div>
          )}

          {/* Error state */}
          {loadError && !loading && (
            <div className="card" style={{ borderColor: '#ff9500aa', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={18} color="#ff9500" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#ff9500', marginBottom: 4 }}>Scan couldn't complete</div>
                  <div style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.6 }}>{loadError}</div>
                </div>
              </div>
            </div>
          )}

          {/* Site data results */}
          <AuditErrorBoundary>
            {siteData && !loading && (
              <div className="site-data-panel">
                {/* Screenshot panel */}
                <div className="card screenshot-card">
                  <div className="card-header">
                    <h3 className="card-title"><Monitor size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Live Screenshot</h3>
                    <a href={siteUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                      <ExternalLink size={13} /> Visit
                    </a>
                  </div>
                  {siteData.screenshot ? (
                    <div className="screenshot-wrap">
                      <div className="browser-bar">
                        <div className="browser-dots"><span /><span /><span /></div>
                        <div className="browser-url">{url.replace(/^https?:\/\//i, '')}</div>
                      </div>
                      <img src={siteData.screenshot} alt="Site screenshot" className="site-screenshot" />
                    </div>
                  ) : (
                    <div className="no-screenshot">
                      <Monitor size={32} color="var(--border)" />
                      <div>No screenshot available</div>
                      <a href={siteUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }}>
                        <ExternalLink size={13} /> Open site manually
                      </a>
                    </div>
                  )}
                  {siteData.title && (
                    <div className="site-meta-row">
                      <div className="site-meta-label">Page Title</div>
                      <div className="site-meta-value">{siteData.title}</div>
                    </div>
                  )}
                  {siteData.description && (
                    <div className="site-meta-row" style={{ marginTop: 8 }}>
                      <div className="site-meta-label">Meta Description</div>
                      <div className="site-meta-value" style={{ color: 'var(--text2)', fontSize: 12 }}>{siteData.description}</div>
                    </div>
                  )}
                </div>

                {/* Scores + metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 14 }}>Performance Scores</h3>
                    <div className="gauges-grid">
                      <ScoreGauge label="Performance" score={siteData.perfScore} icon={Gauge} />
                      <ScoreGauge label="SEO" score={siteData.seoScore} icon={Zap} />
                      <ScoreGauge label="Accessibility" score={siteData.a11yScore} icon={CheckCircle} />
                      <ScoreGauge label="Mobile" score={siteData.mobileScore} icon={Smartphone} />
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 12 }}>Speed Metrics</h3>
                    <div className="metrics-grid">
                      {[
                        { label: 'First Paint', value: siteData.fcp },
                        { label: 'Largest Paint', value: siteData.lcp },
                        { label: 'Blocking Time', value: siteData.tbt },
                        { label: 'Layout Shift', value: siteData.cls },
                      ].map(({ label, value }) => (
                        <div key={label} className="metric-item">
                          <div className="metric-label">{label}</div>
                          <div className="metric-value">{value || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {siteData.opportunities?.length > 0 && (
                    <div className="card">
                      <h3 className="card-title" style={{ marginBottom: 12 }}>⚡ Top Issues Found</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {siteData.opportunities.map((title, i) => (
                          <div key={i} className="opportunity-item">{title}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </AuditErrorBoundary>

          {/* Checklist */}
          {!loading && (
            <>
              <div className="audit-header-bar" style={{ marginTop: 16 }}>
                <div className="audit-meta">
                  Auditing: <strong style={{ color: '#cc1a1a' }}>{companyName || url}</strong>
                  <span className="audit-progress">({answered}/{CHECKLIST.length} answered)</span>
                </div>
                {answered > 0 && (
                  <div className="audit-score-bar">
                    <span style={{ color: scoreLabel.color, fontWeight: 700, fontSize: 20 }}>{score}/10</span>
                    <span className="score-label-text" style={{ color: scoreLabel.color }}>{scoreLabel.text}</span>
                  </div>
                )}
              </div>

              <div className="checklist-grid" style={{ marginTop: 12 }}>
                {CHECKLIST.map(item => (
                  <div key={item.id} className={`checklist-item ${checks[item.id] ? `checklist-item--${checks[item.id]}` : ''}`}>
                    <div className="checklist-question">{item.label}</div>
                    <p className="checklist-tip">{item.tip}</p>
                    <div className="checklist-btns">
                      <button className={`check-btn check-btn--yes ${checks[item.id] === 'yes' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'yes')}>
                        <CheckCircle size={14} /> Yes
                      </button>
                      <button className={`check-btn check-btn--no ${checks[item.id] === 'no' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'no')}>
                        <XCircle size={14} /> No
                      </button>
                      <button className={`check-btn check-btn--unsure ${checks[item.id] === 'unsure' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'unsure')}>
                        <Circle size={14} /> Unsure
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <h3 className="card-title" style={{ marginBottom: 12 }}>Audit Notes</h3>
                <textarea className="input textarea" rows={4} placeholder="Observations, pitch angles, red flags..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {answered >= 5 && (
                <div className="audit-summary card" style={{ marginTop: 16 }}>
                  <div className="audit-summary-left">
                    <div className="summary-big" style={{ color: scoreLabel.color }}>{score}<span>/10</span></div>
                    <div className="summary-verdict" style={{ color: scoreLabel.color }}>{scoreLabel.text}</div>
                    <div className="summary-counts">
                      <span className="count-yes">✓ {yesCount} passing</span>
                      <span className="count-no">✗ {noCount} failing</span>
                    </div>
                  </div>
                  <div className="audit-summary-right">
                    <p style={{ color: 'var(--text2)', marginBottom: 12, fontSize: 13 }}>
                      {noCount > 0
                        ? `${noCount} area${noCount > 1 ? 's' : ''} where Monsta Media can deliver serious value.`
                        : 'Brand looks solid. Look for SEO gaps or vehicle wrap opportunities.'}
                    </p>
                    <button className="btn btn--primary" onClick={copyReport}>
                      <ClipboardList size={15} /> Copy Full Report
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
