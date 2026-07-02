import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart2, DollarSign, Eye, MousePointer, Users, TrendingUp,
  RefreshCw, AlertCircle, ExternalLink, Settings,
  X, CheckCircle, Info, Target, Phone, Video,
  PlusCircle, ChevronDown, Clock, Wifi, WifiOff,
} from 'lucide-react';

const FB_API = 'https://graph.facebook.com/v19.0';
const AUTO_REFRESH_MS = 15 * 60 * 1000; // 15 minutes
const STORAGE_KEY = 'fb_ad_clients_v2';

const DATE_PRESETS = [
  { label: 'Last 7 Days', value: 'last_7d' },
  { label: 'Last 14 Days', value: 'last_14d' },
  { label: 'Last 30 Days', value: 'last_30d' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 90 Days', value: 'last_90d' },
];

const INSIGHT_FIELDS = [
  'campaign_name', 'campaign_id', 'adset_name', 'adset_id',
  'ad_name', 'ad_id', 'impressions', 'reach', 'frequency',
  'clicks', 'ctr', 'cpc', 'cpm', 'spend',
  'actions', 'cost_per_action_type',
  'video_avg_time_watched_actions',
  'video_p50_watched_actions', 'video_p100_watched_actions',
  'date_start', 'date_stop',
].join(',');

// ─── helpers ───────────────────────────────────────────────
function fmt(val, type = 'number') {
  if (val == null || val === '') return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'percent') return `${n.toFixed(2)}%`;
  if (type === 'large') return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
  return n.toLocaleString();
}

function getAction(actions, type) {
  if (!actions) return null;
  const m = actions.find(a => a.action_type === type);
  return m ? m.value : null;
}

function getCPA(costArr, type) {
  if (!costArr) return null;
  const m = costArr.find(a => a.action_type === type);
  return m ? m.value : null;
}

function loadClients() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveClients(clients) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

// ─── Stat Card ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = '#cc1a1a', tooltip }) {
  const [tip, setTip] = useState(false);
  return (
    <div className="card stat-card" style={{ position: 'relative' }}>
      <div className="stat-icon" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        <Icon size={20} color={color} />
      </div>
      <div className="stat-info">
        <div className="stat-value" style={{ color, fontSize: 22 }}>{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>}
      </div>
      {tooltip && (
        <button style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}
          onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
          <Info size={13} />
          {tip && (
            <div style={{ position: 'absolute', right: 0, top: 20, background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: 'var(--text2)', width: 190, textAlign: 'left', zIndex: 10, lineHeight: 1.5 }}>
              {tooltip}
            </div>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Add/Edit Client Modal ──────────────────────────────────
function ClientModal({ existing, onSave, onClose }) {
  const [token, setToken] = useState(existing?.token || '');
  const [accountId, setAccountId] = useState(existing?.accountId || '');
  const [clientName, setClientName] = useState(existing?.clientName || '');
  const [step, setStep] = useState(existing ? 3 : 1);

  function handleSave() {
    if (!token.trim() || !accountId.trim()) return;
    onSave({
      id: existing?.id || Date.now().toString(),
      token: token.trim(),
      accountId: accountId.trim().replace(/^act_/, ''),
      clientName: clientName.trim() || `Client ${accountId.trim().slice(-4)}`,
    });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="card-title" style={{ margin: 0 }}>{existing ? 'Edit Client' : 'Add Facebook Ad Account'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={18} /></button>
        </div>

        {/* Step tabs — only show for new connections */}
        {!existing && (
          <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
            {[1, 2, 3].map(s => (
              <button key={s} onClick={() => setStep(s)} style={{
                flex: 1, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${step === s ? '#cc1a1a' : 'transparent'}`,
                color: step === s ? '#cc1a1a' : 'var(--text2)', fontSize: 13, fontWeight: step === s ? 700 : 400,
                marginBottom: -1, transition: 'all 0.15s',
              }}>
                Step {s}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>1. Open Facebook Graph API Explorer</div>
              <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="btn btn--primary btn--sm" style={{ display: 'inline-flex' }}>
                <ExternalLink size={13} /> Open Graph API Explorer
              </a>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>2. Log in as the client's Facebook account</div>
              <div style={{ color: 'var(--text2)', fontSize: 13 }}>Make sure you're logged in as whoever manages their ads.</div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>3. Generate token with <span style={{ color: '#cc1a1a' }}>ads_read</span> permission</div>
              <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>Click "Generate Access Token" → check <strong style={{ color: 'var(--text)' }}>ads_read</strong> → click Get Token.</div>
            </div>
            <button className="btn btn--primary" onClick={() => setStep(2)}>Next →</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Find the Ad Account ID</div>
              <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>
                Go to <strong style={{ color: 'var(--text)' }}>business.facebook.com → Ads Manager</strong>.<br />
                Look at the URL for <span style={{ color: '#cc1a1a', fontFamily: 'monospace' }}>act_XXXXXXXXXX</span>, or go to<br />
                <strong style={{ color: 'var(--text)' }}>Business Settings → Ad Accounts</strong> to see the number.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn--primary" onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label className="field-label">Client Name</label>
              <input className="input" placeholder="e.g. Good Hope HVAC" value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Ad Account ID <span className="req">*</span></label>
              <input className="input" placeholder="Numbers only, e.g. 1234567890" value={accountId}
                onChange={e => setAccountId(e.target.value.replace(/[^0-9]/g, ''))} />
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Don't include "act_" — added automatically.</div>
            </div>
            <div className="field">
              <label className="field-label">Access Token <span className="req">*</span></label>
              <textarea className="input textarea" rows={4}
                placeholder="Paste access token from Graph API Explorer..."
                value={token} onChange={e => setToken(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 11 }} />
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Stored in your browser only. Never shared anywhere except Facebook's API.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!existing && <button className="btn btn--ghost" onClick={() => setStep(2)}>← Back</button>}
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleSave} disabled={!token.trim() || !accountId.trim()}>
                <CheckCircle size={15} /> {existing ? 'Save Changes' : 'Connect Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function AdPerformance() {
  const [clients, setClients] = useState(loadClients);
  const [activeId, setActiveId] = useState(() => loadClients()[0]?.id || null);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [datePreset, setDatePreset] = useState('last_30d');
  const [level, setLevel] = useState('campaign');
  const [data, setData] = useState({});        // keyed by clientId
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetched, setLastFetched] = useState({});
  const [nextRefresh, setNextRefresh] = useState(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const [countdown, setCountdown] = useState('');

  const activeClient = clients.find(c => c.id === activeId);
  const activeData = activeId ? (data[activeId] || null) : null;

  // Persist clients to localStorage whenever they change
  useEffect(() => { saveClients(clients); }, [clients]);

  const fetchData = useCallback(async (client, silent = false) => {
    if (!client) return;
    if (!silent) setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        level,
        date_preset: datePreset,
        fields: INSIGHT_FIELDS,
        limit: 100,
        access_token: client.token,
      });

      const res = await fetch(`${FB_API}/act_${client.accountId}/insights?${params}`);
      const json = await res.json();

      if (json.error) throw new Error(json.error.message || 'Facebook API error');

      const now = new Date();
      setData(prev => ({ ...prev, [client.id]: json.data || [] }));
      setLastFetched(prev => ({ ...prev, [client.id]: now }));
      setNextRefresh(new Date(now.getTime() + AUTO_REFRESH_MS));
    } catch (err) {
      setError(err.message || 'Failed to load data from Facebook.');
    } finally {
      setLoading(false);
    }
  }, [level, datePreset]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    if (!activeClient) return;
    fetchData(activeClient);

    timerRef.current = setInterval(() => {
      fetchData(activeClient, true);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(timerRef.current);
  }, [activeClient, fetchData]);

  // Countdown ticker
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      if (!nextRefresh) return;
      const ms = nextRefresh - new Date();
      if (ms <= 0) { setCountdown('Refreshing…'); return; }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [nextRefresh]);

  function addClient(c) {
    const updated = editClient
      ? clients.map(x => x.id === c.id ? c : x)
      : [...clients, c];
    setClients(updated);
    setActiveId(c.id);
    setShowModal(false);
    setEditClient(null);
  }

  function removeClient(id) {
    if (!confirm('Remove this client?')) return;
    const updated = clients.filter(c => c.id !== id);
    setClients(updated);
    setActiveId(updated[0]?.id || null);
    setData(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  // Compute totals
  const totals = activeData ? activeData.reduce((acc, row) => {
    acc.impressions += parseInt(row.impressions || 0);
    acc.reach += parseInt(row.reach || 0);
    acc.clicks += parseInt(row.clicks || 0);
    acc.spend += parseFloat(row.spend || 0);
    acc.leads += parseInt(getAction(row.actions, 'lead') || getAction(row.actions, 'offsite_conversion.lead') || 0);
    acc.calls += parseInt(getAction(row.actions, 'phone_call') || 0);
    acc.videoViews += parseInt(getAction(row.actions, 'video_view') || 0);
    return acc;
  }, { impressions: 0, reach: 0, clicks: 0, spend: 0, leads: 0, calls: 0, videoViews: 0 }) : null;

  const avgCtr = totals?.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpm = totals?.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const avgCpc = totals?.clicks > 0 ? totals.spend / totals.clicks : 0;
  const costPerLead = totals?.leads > 0 ? totals.spend / totals.leads : 0;
  const fetchedAt = activeId ? lastFetched[activeId] : null;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ad Performance</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {activeClient ? (
              <>
                <span style={{ color: '#39d353', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Wifi size={12} /> Live
                </span>
                <span>·</span>
                <span>act_{activeClient.accountId}</span>
                {fetchedAt && <><span>·</span><span>Updated {fetchedAt.toLocaleTimeString()}</span></>}
                {countdown && <><span>·</span><span style={{ color: 'var(--text2)' }}><Clock size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Next refresh in {countdown}</span></>}
              </>
            ) : 'Connect a Facebook Ad Account to get started'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {activeClient && (
            <button className="btn btn--ghost btn--sm" onClick={() => fetchData(activeClient)} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Now
            </button>
          )}
          <button className="btn btn--primary btn--sm" onClick={() => { setEditClient(null); setShowModal(true); }}>
            <PlusCircle size={14} /> Add Client
          </button>
        </div>
      </div>

      {/* Client tabs */}
      {clients.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {clients.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <button
                onClick={() => setActiveId(c.id)}
                style={{
                  padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: activeId === c.id ? '#cc1a1a' : 'var(--card)',
                  color: activeId === c.id ? '#fff' : 'var(--text2)',
                  border: `1px solid ${activeId === c.id ? '#cc1a1a' : 'var(--border)'}`,
                  borderRight: 'none', borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                  transition: 'all 0.15s',
                }}
              >
                {c.clientName}
                {data[c.id] && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>●</span>}
              </button>
              <button
                onClick={() => { setEditClient(c); setShowModal(true); }}
                title="Edit"
                style={{
                  padding: '7px 8px', fontSize: 11, cursor: 'pointer',
                  background: activeId === c.id ? '#aa1414' : 'var(--bg3)',
                  color: activeId === c.id ? '#fff' : 'var(--text2)',
                  border: `1px solid ${activeId === c.id ? '#cc1a1a' : 'var(--border)'}`,
                  borderRight: 'none', transition: 'all 0.15s',
                }}
              >
                <Settings size={11} />
              </button>
              <button
                onClick={() => removeClient(c.id)}
                title="Remove client"
                style={{
                  padding: '7px 8px', fontSize: 11, cursor: 'pointer',
                  background: activeId === c.id ? '#aa1414' : 'var(--bg3)',
                  color: activeId === c.id ? '#ffaaaa' : 'var(--text2)',
                  border: `1px solid ${activeId === c.id ? '#cc1a1a' : 'var(--border)'}`,
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  transition: 'all 0.15s',
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No clients yet */}
      {clients.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <BarChart2 size={40} color="var(--border)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No clients connected yet</div>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
            Add a Facebook Ad Account to start tracking live campaign performance.
          </div>
          <button className="btn btn--primary" onClick={() => setShowModal(true)}>
            <PlusCircle size={15} /> Connect First Client
          </button>
        </div>
      )}

      {/* Controls (date range + level) */}
      {activeClient && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {DATE_PRESETS.map(p => (
              <button key={p.value} onClick={() => setDatePreset(p.value)} style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: datePreset === p.value ? '#cc1a1a' : 'transparent',
                color: datePreset === p.value ? '#fff' : 'var(--text2)', transition: 'all 0.15s',
              }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {['campaign', 'adset', 'ad'].map(l => (
              <button key={l} onClick={() => setLevel(l)} style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: level === l ? '#1a3a4e' : 'transparent',
                color: level === l ? 'var(--text)' : 'var(--text2)', transition: 'all 0.15s',
              }}>
                {l === 'adset' ? 'Ad Set' : l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#ff333322', border: '1px solid #ff333355', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#ff6666', fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Error: </strong>{error}
            {(error.toLowerCase().includes('token') || error.includes('OAuthException') || error.includes('190')) && (
              <div style={{ marginTop: 6, color: 'var(--text2)' }}>
                Token expired. <button onClick={() => { setEditClient(activeClient); setShowModal(true); }}
                  style={{ color: '#cc1a1a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Update token →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !activeData && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 32, color: 'var(--text2)', fontSize: 13 }}>
          <RefreshCw size={18} className="spin" /> Loading data from Facebook…
        </div>
      )}

      {/* Dashboard */}
      {totals && (
        <>
          {/* KPI Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', marginBottom: 20 }}>
            <StatCard icon={DollarSign} label="Total Spend" value={fmt(totals.spend, 'currency')} color="#cc1a1a"
              tooltip="Total amount spent across all campaigns in this period." />
            <StatCard icon={Eye} label="Impressions" value={fmt(totals.impressions, 'large')} color="#5bb8d4"
              tooltip="Total number of times your ads were shown." />
            <StatCard icon={Users} label="Reach" value={fmt(totals.reach, 'large')} color="#bf00ff"
              sub={`Freq: ${(totals.impressions / Math.max(totals.reach, 1)).toFixed(1)}x`}
              tooltip="Unique people who saw your ad. Frequency = average times seen." />
            <StatCard icon={MousePointer} label="Clicks" value={fmt(totals.clicks, 'large')} color="#ffd700"
              sub={`CTR: ${fmt(avgCtr, 'percent')}`}
              tooltip="Total link clicks. CTR = clicks ÷ impressions." />
            <StatCard icon={TrendingUp} label="CPM" value={fmt(avgCpm, 'currency')} color="#ff6b00"
              tooltip="Cost per 1,000 impressions. Lower = more efficient reach." />
            <StatCard icon={DollarSign} label="CPC" value={fmt(avgCpc, 'currency')} color="#39d353"
              tooltip="Average cost per click. Key metric for traffic campaigns." />
            <StatCard icon={Target} label="Leads" value={fmt(totals.leads, 'large')} color="#cc1a1a"
              sub={costPerLead ? `CPL: ${fmt(costPerLead, 'currency')}` : undefined}
              tooltip="Total leads generated. CPL = cost per lead." />
            <StatCard icon={Phone} label="Calls" value={fmt(totals.calls, 'large')} color="#5bb8d4"
              tooltip="Phone call actions tracked by the Facebook Pixel." />
            <StatCard icon={Video} label="Video Views" value={fmt(totals.videoViews, 'large')} color="#bf00ff"
              tooltip="Total video views (3+ seconds)." />
          </div>

          {/* Breakdown Table */}
          <div className="card table-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">
                {level === 'campaign' ? 'Campaign' : level === 'adset' ? 'Ad Set' : 'Ad'} Breakdown
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {loading && <RefreshCw size={13} className="spin" color="var(--text2)" />}
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{activeData.length} rows</span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>{level === 'campaign' ? 'Campaign' : level === 'adset' ? 'Ad Set' : 'Ad'}</th>
                    <th>Spend</th>
                    <th>Impressions</th>
                    <th>Reach</th>
                    <th>Clicks</th>
                    <th>CTR</th>
                    <th>CPM</th>
                    <th>CPC</th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>Calls</th>
                    <th>Video Views</th>
                  </tr>
                </thead>
                <tbody>
                  {activeData.length === 0 ? (
                    <tr><td colSpan={12} className="empty-state">No data for this period.</td></tr>
                  ) : (
                    [...activeData]
                      .sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0))
                      .map((row, i) => {
                        const name = row.campaign_name || row.adset_name || row.ad_name || `Row ${i + 1}`;
                        const leads = parseInt(getAction(row.actions, 'lead') || getAction(row.actions, 'offsite_conversion.lead') || 0);
                        const calls = parseInt(getAction(row.actions, 'phone_call') || 0);
                        const vv = parseInt(getAction(row.actions, 'video_view') || 0);
                        const cpl = getCPA(row.cost_per_action_type, 'lead') || getCPA(row.cost_per_action_type, 'offsite_conversion.lead');
                        const spend = parseFloat(row.spend || 0);
                        const pct = totals.spend > 0 ? (spend / totals.spend) * 100 : 0;
                        const ctr = parseFloat(row.ctr || 0);

                        return (
                          <tr key={row.campaign_id || row.adset_id || row.ad_id || i} className="lead-tr">
                            <td>
                              <div className="lead-name" style={{ maxWidth: 200 }} title={name}>{name}</div>
                              <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, marginTop: 4, maxWidth: 160 }}>
                                <div style={{ height: '100%', background: '#cc1a1a', borderRadius: 2, width: `${pct}%` }} />
                              </div>
                            </td>
                            <td style={{ fontWeight: 700, color: '#cc1a1a' }}>{fmt(row.spend, 'currency')}</td>
                            <td>{fmt(row.impressions, 'large')}</td>
                            <td>{fmt(row.reach, 'large')}</td>
                            <td>{fmt(row.clicks, 'large')}</td>
                            <td style={{ color: ctr > 2 ? '#39d353' : ctr > 1 ? '#ffd700' : 'var(--text)', fontWeight: ctr > 2 ? 700 : 400 }}>
                              {fmt(row.ctr, 'percent')}
                            </td>
                            <td>{fmt(row.cpm, 'currency')}</td>
                            <td>{fmt(row.cpc, 'currency')}</td>
                            <td style={{ color: leads > 0 ? '#39d353' : 'var(--text2)', fontWeight: leads > 0 ? 700 : 400 }}>
                              {leads > 0 ? leads : '—'}
                            </td>
                            <td>{cpl ? fmt(cpl, 'currency') : '—'}</td>
                            <td style={{ color: calls > 0 ? '#5bb8d4' : 'var(--text2)' }}>{calls > 0 ? calls : '—'}</td>
                            <td>{vv > 0 ? fmt(vv, 'large') : '—'}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Insights */}
          {activeData.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="card-title" style={{ marginBottom: 12 }}>Performance Insights</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {avgCtr < 1 && <Insight color="#ff6b00" title={`Low CTR (${fmt(avgCtr, 'percent')})`}>Below 1% CTR — try a stronger headline, new creative, or a clearer call-to-action.</Insight>}
                {avgCtr >= 2 && <Insight color="#39d353" title={`Strong CTR (${fmt(avgCtr, 'percent')})`}>Above 2% CTR is excellent — the ad is resonating. Consider scaling the budget.</Insight>}
                {totals.leads === 0 && totals.spend > 50 && <Insight color="#ff4444" title="No Leads Tracked">Make sure the Facebook Pixel is installed and lead events are firing correctly on the website.</Insight>}
                {costPerLead > 0 && costPerLead < 20 && <Insight color="#39d353" title={`Great CPL (${fmt(costPerLead, 'currency')})`}>Under $20 cost per lead for home services is strong. Scale budget on this campaign.</Insight>}
                {costPerLead > 60 && <Insight color="#ff6b00" title={`High CPL (${fmt(costPerLead, 'currency')})`}>Over $60 CPL — review targeting, landing page, and creative. Test new audiences.</Insight>}
                {activeData.some(r => parseFloat(r.frequency || 0) > 4) && <Insight color="#ffd700" title="High Frequency">Some campaigns are showing 4+ times to the same people. Expand the audience or refresh the creative.</Insight>}
                {avgCpm > 30 && <Insight color="#ff6b00" title={`High CPM (${fmt(avgCpm, 'currency')})`}>Over $30 CPM means the audience may be too competitive or narrow. Try broader targeting.</Insight>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <ClientModal
          existing={editClient}
          onSave={addClient}
          onClose={() => { setShowModal(false); setEditClient(null); }}
        />
      )}
    </div>
  );
}

function Insight({ color, title, children }) {
  return (
    <div style={{ background: 'var(--bg3)', borderLeft: `3px solid ${color}`, borderRadius: '0 6px 6px 0', padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
      <strong style={{ color, display: 'block', marginBottom: 3 }}>{title}</strong>
      {children}
    </div>
  );
}
