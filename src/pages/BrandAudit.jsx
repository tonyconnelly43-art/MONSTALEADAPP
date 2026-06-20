import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, XCircle, Circle, ExternalLink, ClipboardList, AlertTriangle, Globe, Mail, Phone, Search, Copy, PlusCircle } from 'lucide-react';
import { useLeads } from '../context/LeadsContext';

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

// Pages most likely to have contact info
const CONTACT_PATHS = ['', '/contact', '/contact-us', '/about', '/about-us', '/get-in-touch'];

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?1[\s.\-]?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g;
const TEL_RE = /href=["']tel:([+\d\s.\-()\-]{7,})/gi;
const SOCIAL_RE = {
  facebook: /https?:\/\/(www\.)?facebook\.com\/[^\s"'<>]+/gi,
  instagram: /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>]+/gi,
  twitter: /https?:\/\/(www\.)?(twitter|x)\.com\/[^\s"'<>]+/gi,
};

const PROXY = 'https://api.allorigins.win/get?url=';

async function scrapeUrl(url) {
  try {
    const res = await fetch(`${PROXY}${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.contents || null;
  } catch {
    return null;
  }
}

function parseContactInfo(html) {
  if (!html) return { emails: [], phones: [], social: {} };

  // Strip scripts/styles to avoid false positives
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

  const emails = [...new Set((clean.match(EMAIL_RE) || [])
    .filter(e => !e.includes('.png') && !e.includes('.jpg') && !e.includes('.gif') && !e.includes('example') && !e.includes('sentry') && !e.includes('schema'))
  )].slice(0, 5);

  // Extract tel: href links first (most reliable — always in static HTML)
  const telLinks = [];
  let telMatch;
  const telReCopy = new RegExp(TEL_RE.source, 'gi');
  while ((telMatch = telReCopy.exec(html)) !== null) {
    const num = telMatch[1].trim();
    if (num.replace(/\D/g, '').length >= 10) telLinks.push(num);
  }

  const rawPhones = clean.match(PHONE_RE) || [];
  const phones = [...new Set([
    ...telLinks,
    ...rawPhones.map(p => p.trim()).filter(p => p.replace(/\D/g, '').length >= 10),
  ])].slice(0, 3);

  const social = {};
  for (const [platform, re] of Object.entries(SOCIAL_RE)) {
    const matches = [...new Set(clean.match(re) || [])].filter(u => {
      const path = u.replace(/https?:\/\/(www\.)?(facebook|instagram|twitter|x)\.com\//i, '').split('/')[0];
      return path && path.length > 1 && !['sharer', 'share', 'login', 'plugins', 'hashtag', 'intent'].includes(path);
    });
    if (matches.length) social[platform] = matches[0];
  }

  return { emails, phones, social };
}

async function findContactInfo(baseUrl) {
  const domain = baseUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const results = { emails: [], phones: [], social: {}, pagesChecked: [] };

  for (const path of CONTACT_PATHS) {
    const url = `https://${domain}${path}`;
    const html = await scrapeUrl(url);
    if (!html) continue;

    results.pagesChecked.push(path || '/');
    const { emails, phones, social } = parseContactInfo(html);

    // Merge unique results
    results.emails = [...new Set([...results.emails, ...emails])].slice(0, 5);
    results.phones = [...new Set([...results.phones, ...phones])].slice(0, 3);
    Object.assign(results.social, social);

    // Stop early if we have what we need
    if (results.emails.length >= 2 && results.phones.length >= 1) break;
  }

  return results;
}

function cleanUrl(raw) {
  const s = raw.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `https://${s}`;
}

export default function BrandAudit() {
  const { addLead } = useLeads();
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState('');
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [addedToLeads, setAddedToLeads] = useState(false);

  function startAudit() {
    if (!urlInput.trim()) return;
    const full = cleanUrl(urlInput);
    setActiveUrl(full);
    setChecks({});
    setNotes('');
    setIframeBlocked(false);
    setIframeLoaded(false);
    setContactInfo(null);
    setAddedToLeads(false);
  }

  async function runContactScan() {
    if (!activeUrl) return;
    setContactLoading(true);
    setContactInfo(null);
    try {
      const info = await findContactInfo(activeUrl);
      setContactInfo(info);
    } catch {
      setContactInfo({ emails: [], phones: [], social: {}, pagesChecked: [] });
    } finally {
      setContactLoading(false);
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
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

  function addToLeads() {
    const auditNotes = [
      `Brand Score: ${score}/10 — ${scoreLabel.text}`,
      answered > 0 ? `Passing: ${yesCount} | Failing: ${noCount}` : '',
      ...CHECKLIST.filter(c => checks[c.id] === 'no').map(c => `✗ ${c.label}`),
      notes ? `Notes: ${notes}` : '',
    ].filter(Boolean).join('\n');

    addLead({
      companyName: companyName || domain,
      website: domain,
      email: contactInfo?.emails?.[0] || '',
      phone: contactInfo?.phones?.[0] || '',
      industry: 'HVAC',
      city: '',
      state: '',
      opportunityScore: score,
      status: 'Reviewed',
      notes: auditNotes,
    });
    setAddedToLeads(true);
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

            {/* Contact Info Finder */}
            <div className="card" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 className="card-title"><Mail size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />Contact Finder</h3>
                <button className="btn btn--primary btn--sm" onClick={runContactScan} disabled={contactLoading || !activeUrl}>
                  {contactLoading ? <><Search size={13} className="spin" /> Scanning...</> : <><Search size={13} /> Find Contacts</>}
                </button>
              </div>

              {!contactInfo && !contactLoading && (
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>
                  Click "Find Contacts" to scan the site for emails, phone numbers, and social media links.
                </div>
              )}

              {contactLoading && (
                <div style={{ color: 'var(--text2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Search size={14} className="spin" /> Checking contact pages...
                </div>
              )}

              {contactInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Emails */}
                  <div>
                    <div className="contact-section-label"><Mail size={12} /> Emails Found</div>
                    {contactInfo.emails.length > 0 ? contactInfo.emails.map(email => (
                      <div key={email} className="contact-item">
                        <span>{email}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="icon-btn" title="Copy" onClick={() => copyText(email)}>
                            {copied === email ? <CheckCircle size={13} color="#39d353" /> : <Copy size={13} />}
                          </button>
                          <a href={`mailto:${email}`} className="icon-btn" title="Send email">
                            <Mail size={13} />
                          </a>
                        </div>
                      </div>
                    )) : (
                      <div className="contact-none">No emails found — try opening the site manually</div>
                    )}
                  </div>

                  {/* Phones */}
                  <div>
                    <div className="contact-section-label"><Phone size={12} /> Phone Numbers</div>
                    {contactInfo.phones.length > 0 ? contactInfo.phones.map(phone => (
                      <div key={phone} className="contact-item">
                        <span>{phone}</span>
                        <button className="icon-btn" title="Copy" onClick={() => copyText(phone)}>
                          {copied === phone ? <CheckCircle size={13} color="#39d353" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )) : (
                      <div className="contact-none">No phone numbers found</div>
                    )}
                  </div>

                  {/* Social */}
                  {Object.keys(contactInfo.social).length > 0 && (
                    <div>
                      <div className="contact-section-label"><Globe size={12} /> Social Media</div>
                      {contactInfo.social.facebook && (
                        <div className="contact-item">
                          <span style={{ color: '#1877f2', fontSize: 12 }}>Facebook</span>
                          <a href={contactInfo.social.facebook} target="_blank" rel="noreferrer" className="icon-btn">
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      )}
                      {contactInfo.social.instagram && (
                        <div className="contact-item">
                          <span style={{ color: '#e1306c', fontSize: 12 }}>Instagram</span>
                          <a href={contactInfo.social.instagram} target="_blank" rel="noreferrer" className="icon-btn">
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      )}
                      {contactInfo.social.twitter && (
                        <div className="contact-item">
                          <span style={{ color: '#1da1f2', fontSize: 12 }}>Twitter / X</span>
                          <a href={contactInfo.social.twitter} target="_blank" rel="noreferrer" className="icon-btn">
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {contactInfo.pagesChecked.length > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text2)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      Scanned: {contactInfo.pagesChecked.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add to Lead List */}
            {activeUrl && (
              <div className="card" style={{ marginTop: 12 }}>
                {addedToLeads ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#39d353', fontWeight: 700 }}><CheckCircle size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Added to Lead Database!</div>
                    <button className="btn btn--ghost btn--sm" onClick={() => navigate('/leads')}>View Leads</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>Save as Lead</div>
                      <div style={{ color: 'var(--text2)', fontSize: 12 }}>Add this company to your Lead Database with contact info and audit score.</div>
                    </div>
                    <button className="btn btn--primary" onClick={addToLeads}>
                      <PlusCircle size={15} /> Add to Leads
                    </button>
                  </div>
                )}
              </div>
            )}

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
