import { useState } from 'react';
import { Zap, CheckCircle, XCircle, Circle, ExternalLink, ClipboardList, Loader, Monitor, Gauge, Smartphone } from 'lucide-react';

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
  if (score >= 50) return '#ff6b00';
  return '#ff4444';
}

function ScoreGauge({ label, score, icon: Icon }) {
  const color = scoreColor(score);
  return (
    <div className="gauge-card">
      <div className="gauge-icon"><Icon size={18} color={color} /></div>
      <div className="gauge-value" style={{ color }}>{score}</div>
      <div className="gauge-bar-wrap">
        <div className="gauge-bar" style={{ width: `${score}%`, background: color }} />
      </div>
      <div className="gauge-label">{label}</div>
    </div>
  );
}

async function fetchPageSpeedData(rawUrl) {
  const clean = rawUrl.replace(/^https?:\/\//i, '');
  const target = encodeURIComponent(`https://${clean}`);
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${target}&strategy=mobile&category=performance&category=seo&category=accessibility`;

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error('PageSpeed API error');
  const data = await res.json();

  const lhr = data.lighthouseResult;
  const cats = lhr.categories;

  const screenshot = lhr.audits['final-screenshot']?.details?.data || null;
  const thumbnail = lhr.audits['screenshot-thumbnails']?.details?.items?.slice(-1)[0]?.data || screenshot;

  const title = lhr.audits['document-title']?.displayValue || '';
  const description = lhr.audits['meta-description']?.details?.items?.[0]?.node?.snippet || '';

  const perfScore = Math.round((cats.performance?.score || 0) * 100);
  const seoScore = Math.round((cats.seo?.score || 0) * 100);
  const a11yScore = Math.round((cats.accessibility?.score || 0) * 100);

  const fcp = lhr.audits['first-contentful-paint']?.displayValue || '';
  const lcp = lhr.audits['largest-contentful-paint']?.displayValue || '';
  const tbt = lhr.audits['total-blocking-time']?.displayValue || '';
  const cls = lhr.audits['cumulative-layout-shift']?.displayValue || '';

  const mobileViewport = lhr.audits['viewport']?.score === 1;
  const tapTargets = lhr.audits['tap-targets']?.score;

  const opportunities = Object.values(lhr.audits)
    .filter(a => a.details?.type === 'opportunity' && a.score !== null && a.score < 1)
    .map(a => ({ title: a.title, description: a.description }))
    .slice(0, 4);

  return { screenshot: thumbnail || screenshot, title, description, perfScore, seoScore, a11yScore, fcp, lcp, tbt, cls, mobileViewport, opportunities };
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
      const data = await fetchPageSpeedData(url.trim());
      setSiteData(data);
      // Auto-fill checklist based on data
      const autoChecks = {};
      if (data.perfScore >= 70) autoChecks.speed = 'yes';
      else if (data.perfScore < 40) autoChecks.speed = 'no';
      if (data.mobileViewport) autoChecks.mobile = 'yes';
      if (data.seoScore >= 80) autoChecks.socialmedia = 'yes';
      setChecks(autoChecks);
    } catch (e) {
      setLoadError('Could not load site data. You can still complete the audit manually.');
    } finally {
      setLoading(false);
    }
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
    score >= 8 ? { text: 'Strong Brand', color: '#39d353' } :
    score >= 5 ? { text: 'Needs Work', color: '#ff6b00' } :
    { text: 'Major Opportunity', color: '#ff4444' };

  function copyReport() {
    const lines = [
      `BRAND AUDIT REPORT — ${companyName || url}`,
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      siteData ? [
        `Page Title: ${siteData.title}`,
        `Performance Score: ${siteData.perfScore}/100`,
        `SEO Score: ${siteData.seoScore}/100`,
        `Accessibility Score: ${siteData.a11yScore}/100`,
        `First Contentful Paint: ${siteData.fcp}`,
        `Largest Contentful Paint: ${siteData.lcp}`,
        '',
      ].join('\n') : '',
      '--- CHECKLIST ---',
      ...CHECKLIST.map(c => `[${checks[c.id] === 'yes' ? '✓' : checks[c.id] === 'no' ? '✗' : '-'}] ${c.label}`),
      '',
      `Brand Score: ${score}/10 — ${scoreLabel.text}`,
      '',
      notes ? `Notes:\n${notes}` : '',
    ].join('\n');
    navigator.clipboard.writeText(lines);
    alert('Report copied to clipboard!');
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand Audit</h1>
          <p className="page-subtitle">Enter a URL to pull live site data + run your checklist</p>
        </div>
      </div>

      {/* URL Input */}
      <div className="card" style={{ marginBottom: 16 }}>
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
              placeholder="Website URL — e.g. peakprohvac.com"
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
          <button className="btn btn--primary" onClick={startAudit} disabled={!url.trim() || loading}>
            {loading ? <><Loader size={15} className="spin" /> Scanning...</> : <><Zap size={15} /> Scan Site</>}
          </button>
        </div>
      </div>

      {/* Live Site Data Panel */}
      {started && (
        <>
          {loading && (
            <div className="card scan-loading">
              <Loader size={28} className="spin" color="#cc1a1a" />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Scanning {url}...</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>Running Google PageSpeed analysis — takes about 10–20 seconds</div>
              </div>
            </div>
          )}

          {loadError && (
            <div className="error-msg" style={{ marginBottom: 16 }}>{loadError}</div>
          )}

          {siteData && (
            <div className="site-data-panel">
              {/* Screenshot */}
              <div className="card screenshot-card">
                <div className="card-header">
                  <h3 className="card-title"><Monitor size={16} style={{ marginRight: 6 }} />Live Screenshot</h3>
                  <a href={`https://${url.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                    <ExternalLink size={13} /> Visit Site
                  </a>
                </div>
                {siteData.screenshot ? (
                  <div className="screenshot-wrap">
                    <div className="browser-bar">
                      <div className="browser-dots">
                        <span /><span /><span />
                      </div>
                      <div className="browser-url">{url.replace(/^https?:\/\//, '')}</div>
                    </div>
                    <img
                      src={siteData.screenshot}
                      alt="Website screenshot"
                      className="site-screenshot"
                    />
                  </div>
                ) : (
                  <div className="empty-state">No screenshot available</div>
                )}
                {siteData.title && (
                  <div className="site-meta-row">
                    <div className="site-meta-label">Page Title</div>
                    <div className="site-meta-value">{siteData.title}</div>
                  </div>
                )}
              </div>

              {/* Scores & Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: 14 }}>Performance Scores</h3>
                  <div className="gauges-grid">
                    <ScoreGauge label="Performance" score={siteData.perfScore} icon={Gauge} />
                    <ScoreGauge label="SEO" score={siteData.seoScore} icon={Zap} />
                    <ScoreGauge label="Accessibility" score={siteData.a11yScore} icon={CheckCircle} />
                    <ScoreGauge label="Mobile Ready" score={siteData.mobileViewport ? 100 : 20} icon={Smartphone} />
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: 12 }}>Speed Metrics</h3>
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <div className="metric-label">First Paint</div>
                      <div className="metric-value">{siteData.fcp || '—'}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Largest Paint</div>
                      <div className="metric-value">{siteData.lcp || '—'}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Blocking Time</div>
                      <div className="metric-value">{siteData.tbt || '—'}</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Layout Shift</div>
                      <div className="metric-value">{siteData.cls || '—'}</div>
                    </div>
                  </div>
                </div>

                {siteData.opportunities?.length > 0 && (
                  <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 12 }}>⚡ Top Opportunities</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {siteData.opportunities.map((op, i) => (
                        <div key={i} className="opportunity-item">
                          <div className="opportunity-title">{op.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit progress bar */}
          {!loading && (
            <div className="audit-header-bar" style={{ marginTop: 16 }}>
              <div className="audit-meta">
                Auditing: <strong style={{ color: '#cc1a1a' }}>{companyName || url}</strong>
                <span className="audit-progress">({answered}/{total} answered)</span>
              </div>
              {answered > 0 && (
                <div className="audit-score-bar">
                  <span style={{ color: scoreLabel.color, fontWeight: 700, fontSize: 20 }}>{score}/10</span>
                  <span className="score-label-text" style={{ color: scoreLabel.color }}>{scoreLabel.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Checklist */}
          {!loading && (
            <div className="checklist-grid" style={{ marginTop: 12 }}>
              {CHECKLIST.map(item => (
                <div key={item.id} className={`checklist-item ${checks[item.id] ? `checklist-item--${checks[item.id]}` : ''}`}>
                  <div className="checklist-question"><span>{item.label}</span></div>
                  <p className="checklist-tip">{item.tip}</p>
                  <div className="checklist-btns">
                    <button className={`check-btn check-btn--yes ${checks[item.id] === 'yes' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'yes')}>
                      <CheckCircle size={16} /> Yes
                    </button>
                    <button className={`check-btn check-btn--no ${checks[item.id] === 'no' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'no')}>
                      <XCircle size={16} /> No
                    </button>
                    <button className={`check-btn check-btn--unsure ${checks[item.id] === 'unsure' ? 'active' : ''}`} onClick={() => setCheck(item.id, 'unsure')}>
                      <Circle size={16} /> Unsure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (
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
          )}

          {!loading && answered >= 5 && (
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
                <p style={{ color: '#aaa', marginBottom: 12 }}>
                  {noCount > 0
                    ? `${noCount} area${noCount > 1 ? 's' : ''} where Monsta Media can deliver serious value.`
                    : 'This brand looks solid. Look for subtle SEO or vehicle wrap opportunities.'}
                </p>
                <button className="btn btn--primary" onClick={copyReport}>
                  <ClipboardList size={15} /> Copy Full Report
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
