import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, DollarSign, Eye, MousePointer, Users, TrendingUp,
  ChevronDown, RefreshCw, AlertCircle, ExternalLink, Settings,
  X, Play, CheckCircle, Info, Target, Phone, FileText, Video
} from 'lucide-react';

// Facebook Graph API version
const FB_API = 'https://graph.facebook.com/v19.0';

const DATE_PRESETS = [
  { label: 'Last 7 Days', value: 'last_7d' },
  { label: 'Last 14 Days', value: 'last_14d' },
  { label: 'Last 30 Days', value: 'last_30d' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 90 Days', value: 'last_90d' },
];

// Fields to pull from the Insights API
const INSIGHT_FIELDS = [
  'campaign_name', 'campaign_id', 'adset_name', 'adset_id',
  'ad_name', 'ad_id', 'impressions', 'reach', 'frequency',
  'clicks', 'ctr', 'cpc', 'cpm', 'spend',
  'actions', 'cost_per_action_type',
  'video_avg_time_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p100_watched_actions',
  'date_start', 'date_stop',
].join(',');

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
  const match = actions.find(a => a.action_type === type);
  return match ? match.value : null;
}

function getCostPerAction(costArr, type) {
  if (!costArr) return null;
  const match = costArr.find(a => a.action_type === type);
  return match ? match.value : null;
}

function StatCard({ icon: Icon, label, value, sub, color = '#cc1a1a', tooltip }) {
  const [showTip, setShowTip] = useState(false);
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
        <button
          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
        >
          <Info size={13} />
          {showTip && (
            <div style={{
              position: 'absolute', right: 0, top: 20, background: 'var(--card2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 11, color: 'var(--text2)', width: 180,
              textAlign: 'left', zIndex: 10, lineHeight: 1.5,
            }}>
              {tooltip}
            </div>
          )}
        </button>
      )}
    </div>
  );
}

function SetupPanel({ onSave }) {
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [clientName, setClientName] = useState('');
  const [step, setStep] = useState(1);

  function handleSave() {
    if (!token.trim() || !accountId.trim()) return;
    const cleanId = accountId.trim().replace(/^act_/, '');
    onSave({ token: token.trim(), accountId: cleanId, clientName: clientName.trim() });
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card-title" style={{ marginBottom: 4 }}>Connect Facebook Ad Account</h2>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
          You don't need a developer account. Follow these steps to get your access token.
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
          {[1, 2, 3].map(s => (
            <div
              key={s}
              onClick={() => setStep(s)}
              style={{
                flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer',
                borderBottom: `2px solid ${step === s ? '#cc1a1a' : 'var(--border)'}`,
                color: step === s ? '#cc1a1a' : 'var(--text2)', fontSize: 13, fontWeight: step === s ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              Step {s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>1. Open the Facebook Graph API Explorer</div>
              <a
                href="https://developers.facebook.com/tools/explorer"
                target="_blank"
                rel="noreferrer"
                className="btn btn--primary btn--sm"
                style={{ display: 'inline-flex' }}
              >
                <ExternalLink size={13} /> Open Graph API Explorer
              </a>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>2. Log in as the client</div>
              <div style={{ color: 'var(--text2)', fontSize: 13 }}>
                In the top-right of the Explorer, make sure you're logged in as the client's Facebook account (or your account if you manage their ads).
              </div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>3. Generate a User Token with ads_read permission</div>
              <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>
                Click <strong style={{ color: 'var(--text)' }}>"Generate Access Token"</strong>, then in the permissions dialog check:<br />
                <span style={{ color: '#cc1a1a', fontWeight: 600 }}>ads_read</span> — required to read ad performance data.
              </div>
            </div>
            <button className="btn btn--primary" onClick={() => setStep(2)}>Next: Get Your Ad Account ID →</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Find your Ad Account ID</div>
              <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>
                1. Go to <strong style={{ color: 'var(--text)' }}>business.facebook.com</strong> → Ads Manager<br />
                2. Look at the URL — you'll see <span style={{ color: '#cc1a1a' }}>act_XXXXXXXXXX</span><br />
                3. Or go to <strong style={{ color: 'var(--text)' }}>Business Settings → Ad Accounts</strong> — the ID is listed there.<br /><br />
                It looks like: <span style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>1234567890</span> (numbers only, we'll add "act_" automatically)
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn--ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn--primary" onClick={() => setStep(3)}>Next: Enter Credentials →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label className="field-label">Client Name (optional)</label>
              <input className="input" placeholder="e.g. Good Hope HVAC" value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Ad Account ID <span className="req">*</span></label>
              <input
                className="input"
                placeholder="e.g. 1234567890 (numbers only)"
                value={accountId}
                onChange={e => setAccountId(e.target.value.replace(/[^0-9]/g, ''))}
              />
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Don't include "act_" — we add it automatically.</div>
            </div>
            <div className="field">
              <label className="field-label">Access Token <span className="req">*</span></label>
              <textarea
                className="input textarea"
                rows={4}
                placeholder="Paste your access token from the Graph API Explorer..."
                value={token}
                onChange={e => setToken(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 11 }}
              />
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                Token is stored locally in your browser only — never sent anywhere except Facebook's API.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn--ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={!token.trim() || !accountId.trim()}>
                <CheckCircle size={15} /> Connect Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdPerformance() {
  const [creds, setCreds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fb_ad_creds') || 'null'); } catch { return null; }
  });
  const [datePreset, setDatePreset] = useState('last_30d');
  const [level, setLevel] = useState('campaign'); // campaign | adset | ad
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  function saveCreds(c) {
    localStorage.setItem('fb_ad_creds', JSON.stringify(c));
    setCreds(c);
    setShowSettings(false);
  }

  function disconnect() {
    localStorage.removeItem('fb_ad_creds');
    setCreds(null);
    setData(null);
    setError('');
  }

  const fetchData = useCallback(async () => {
    if (!creds) return;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        level,
        date_preset: datePreset,
        fields: INSIGHT_FIELDS,
        limit: 100,
        access_token: creds.token,
      });

      const res = await fetch(`${FB_API}/act_${creds.accountId}/insights?${params}`);
      const json = await res.json();

      if (json.error) {
        throw new Error(json.error.message || 'Facebook API error');
      }

      setData(json.data || []);
      setLastFetched(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load data from Facebook.');
    } finally {
      setLoading(false);
    }
  }, [creds, datePreset, level]);

  useEffect(() => {
    if (creds) fetchData();
  }, [creds, fetchData]);

  // Compute totals from data
  const totals = data ? data.reduce((acc, row) => {
    acc.impressions += parseInt(row.impressions || 0);
    acc.reach += parseInt(row.reach || 0);
    acc.clicks += parseInt(row.clicks || 0);
    acc.spend += parseFloat(row.spend || 0);
    acc.leads += parseInt(getAction(row.actions, 'lead') || getAction(row.actions, 'offsite_conversion.lead') || 0);
    acc.calls += parseInt(getAction(row.actions, 'phone_call') || 0);
    acc.videoViews += parseInt(getAction(row.actions, 'video_view') || 0);
    acc.results += parseInt(
      getAction(row.actions, 'lead') ||
      getAction(row.actions, 'offsite_conversion.lead') ||
      getAction(row.actions, 'link_click') || 0
    );
    return acc;
  }, { impressions: 0, reach: 0, clicks: 0, spend: 0, leads: 0, calls: 0, videoViews: 0, results: 0 }) : null;

  const avgCtr = totals && totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpm = totals && totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const avgCpc = totals && totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const costPerLead = totals && totals.leads > 0 ? totals.spend / totals.leads : 0;

  if (showSettings || !creds) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Ad Performance</h1>
            <p className="page-subtitle">Connect a Facebook Ad Account to track campaign results</p>
          </div>
          {creds && (
            <button className="btn btn--ghost btn--sm" onClick={() => setShowSettings(false)}>
              <X size={14} /> Cancel
            </button>
          )}
        </div>
        <SetupPanel onSave={saveCreds} />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ad Performance</h1>
          <p className="page-subtitle">
            {creds.clientName ? `${creds.clientName} · ` : ''}
            act_{creds.accountId}
            {lastFetched && <span style={{ marginLeft: 8 }}>· Updated {lastFetched.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--ghost btn--sm" onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowSettings(true)}>
            <Settings size={14} /> Settings
          </button>
          <button className="btn btn--danger btn--sm" onClick={disconnect}>
            <X size={14} /> Disconnect
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {DATE_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setDatePreset(p.value)}
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: datePreset === p.value ? '#cc1a1a' : 'transparent',
                color: datePreset === p.value ? '#fff' : 'var(--text2)',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {['campaign', 'adset', 'ad'].map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: level === l ? '#1a3a4e' : 'transparent',
                color: level === l ? 'var(--text)' : 'var(--text2)',
                transition: 'all 0.15s', textTransform: 'capitalize',
              }}
            >
              {l === 'adset' ? 'Ad Set' : l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#ff333322', border: '1px solid #ff333355', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#ff6666', fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Error: </strong>{error}
            {error.includes('token') || error.includes('OAuthException') ? (
              <div style={{ marginTop: 6, color: 'var(--text2)' }}>
                Your token may have expired. <button onClick={() => setShowSettings(true)} style={{ color: '#cc1a1a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Generate a new one →</button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 32, color: 'var(--text2)', fontSize: 13 }}>
          <RefreshCw size={18} className="spin" /> Loading data from Facebook…
        </div>
      )}

      {totals && (
        <>
          {/* KPI Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: 20 }}>
            <StatCard icon={DollarSign} label="Total Spend" value={fmt(totals.spend, 'currency')} color="#cc1a1a"
              tooltip="Total amount spent across all campaigns in the selected period." />
            <StatCard icon={Eye} label="Impressions" value={fmt(totals.impressions, 'large')} color="#5bb8d4"
              tooltip="Total number of times your ads were shown." />
            <StatCard icon={Users} label="Reach" value={fmt(totals.reach, 'large')} color="#bf00ff"
              sub={`Freq: ${data.length ? (totals.impressions / Math.max(totals.reach, 1)).toFixed(1) : '—'}x`}
              tooltip="Unique people who saw your ad at least once. Frequency = how many times on average." />
            <StatCard icon={MousePointer} label="Clicks" value={fmt(totals.clicks, 'large')} color="#ffd700"
              sub={`CTR: ${fmt(avgCtr, 'percent')}`}
              tooltip="Total link clicks. CTR = clicks ÷ impressions." />
            <StatCard icon={TrendingUp} label="CPM" value={fmt(avgCpm, 'currency')}
              color="#ff6b00" tooltip="Cost per 1,000 impressions. Lower is better for awareness campaigns." />
            <StatCard icon={DollarSign} label="CPC" value={fmt(avgCpc, 'currency')}
              color="#39d353" tooltip="Average cost per click. Key efficiency metric for traffic campaigns." />
            <StatCard icon={Target} label="Leads" value={fmt(totals.leads, 'large')}
              sub={costPerLead ? `CPL: ${fmt(costPerLead, 'currency')}` : undefined}
              color="#cc1a1a" tooltip="Total leads generated. CPL = Cost per Lead." />
            <StatCard icon={Phone} label="Calls" value={fmt(totals.calls, 'large')} color="#5bb8d4"
              tooltip="Phone call actions tracked by the Facebook pixel." />
            <StatCard icon={Video} label="Video Views" value={fmt(totals.videoViews, 'large')} color="#bf00ff"
              tooltip="Total video views (3 seconds or more)." />
          </div>

          {/* Campaign/Ad Breakdown Table */}
          <div className="card table-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">
                {level === 'campaign' ? 'Campaign' : level === 'adset' ? 'Ad Set' : 'Ad'} Breakdown
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{data.length} {level === 'adset' ? 'ad sets' : level + 's'}</span>
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
                  {data.length === 0 ? (
                    <tr><td colSpan={12} className="empty-state">No data found for this period.</td></tr>
                  ) : (
                    data
                      .sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0))
                      .map((row, i) => {
                        const name = row.campaign_name || row.adset_name || row.ad_name || `Row ${i + 1}`;
                        const leads = parseInt(getAction(row.actions, 'lead') || getAction(row.actions, 'offsite_conversion.lead') || 0);
                        const calls = parseInt(getAction(row.actions, 'phone_call') || 0);
                        const videoViews = parseInt(getAction(row.actions, 'video_view') || 0);
                        const cpl = getCostPerAction(row.cost_per_action_type, 'lead') || getCostPerAction(row.cost_per_action_type, 'offsite_conversion.lead');
                        const spend = parseFloat(row.spend || 0);
                        const pctOfTotal = totals.spend > 0 ? (spend / totals.spend) * 100 : 0;

                        return (
                          <tr key={row.campaign_id || row.adset_id || row.ad_id || i} className="lead-tr">
                            <td>
                              <div className="lead-name" style={{ maxWidth: 200 }} title={name}>{name}</div>
                              <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, marginTop: 4, maxWidth: 160 }}>
                                <div style={{ height: '100%', background: '#cc1a1a', borderRadius: 2, width: `${pctOfTotal}%` }} />
                              </div>
                            </td>
                            <td style={{ fontWeight: 700, color: '#cc1a1a' }}>{fmt(row.spend, 'currency')}</td>
                            <td>{fmt(row.impressions, 'large')}</td>
                            <td>{fmt(row.reach, 'large')}</td>
                            <td>{fmt(row.clicks, 'large')}</td>
                            <td style={{ color: parseFloat(row.ctr) > 2 ? '#39d353' : parseFloat(row.ctr) > 1 ? '#ffd700' : 'var(--text)' }}>
                              {fmt(row.ctr, 'percent')}
                            </td>
                            <td>{fmt(row.cpm, 'currency')}</td>
                            <td>{fmt(row.cpc, 'currency')}</td>
                            <td style={{ color: leads > 0 ? '#39d353' : 'var(--text2)', fontWeight: leads > 0 ? 700 : 400 }}>
                              {leads > 0 ? leads : '—'}
                            </td>
                            <td>{cpl ? fmt(cpl, 'currency') : '—'}</td>
                            <td style={{ color: calls > 0 ? '#5bb8d4' : 'var(--text2)' }}>{calls > 0 ? calls : '—'}</td>
                            <td>{videoViews > 0 ? fmt(videoViews, 'large') : '—'}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Notes */}
          {data.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="card-title" style={{ marginBottom: 12 }}>Performance Insights</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {avgCtr < 1 && (
                  <div style={{ background: 'var(--bg3)', borderLeft: '3px solid #ff6b00', borderRadius: '0 6px 6px 0', padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                    <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 3 }}>Low CTR ({fmt(avgCtr, 'percent')})</strong>
                    Below 1% CTR suggests the ad creative or copy may need refreshing. Try a stronger headline or call-to-action.
                  </div>
                )}
                {avgCtr >= 2 && (
                  <div style={{ background: 'var(--bg3)', borderLeft: '3px solid #39d353', borderRadius: '0 6px 6px 0', padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                    <strong style={{ color: '#39d353', display: 'block', marginBottom: 3 }}>Strong CTR ({fmt(avgCtr, 'percent')})</strong>
                    Above 2% CTR is excellent — the ad is resonating well with the audience.
                  </div>
                )}
                {totals.leads === 0 && totals.spend > 50 && (
                  <div style={{ background: 'var(--bg3)', borderLeft: '3px solid #ff4444', borderRadius: '0 6px 6px 0', padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                    <strong style={{ color: '#ff4444', display: 'block', marginBottom: 3 }}>No Leads Tracked</strong>
                    Make sure the Facebook Pixel is installed on the website and lead events are firing correctly.
                  </div>
                )}
                {costPerLead > 0 && costPerLead < 20 && (
                  <div style={{ background: 'var(--bg3)', borderLeft: '3px solid #39d353', borderRadius: '0 6px 6px 0', padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                    <strong style={{ color: '#39d353', display: 'block', marginBottom: 3 }}>Great Cost Per Lead ({fmt(costPerLead, 'currency')})</strong>
                    Under $20 CPL for home services is strong performance. Consider scaling the budget.
                  </div>
                )}
                {costPerLead > 60 && (
                  <div style={{ background: 'var(--bg3)', borderLeft: '3px solid #ff6b00', borderRadius: '0 6px 6px 0', padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                    <strong style={{ color: '#ff6b00', display: 'block', marginBottom: 3 }}>High Cost Per Lead ({fmt(costPerLead, 'currency')})</strong>
                    Over $60 CPL — review audience targeting, landing page conversion, and ad creative.
                  </div>
                )}
                {data.length > 0 && data.some(r => (parseFloat(r.frequency) || 0) > 4) && (
                  <div style={{ background: 'var(--bg3)', borderLeft: '3px solid #ffd700', borderRadius: '0 6px 6px 0', padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                    <strong style={{ color: '#ffd700', display: 'block', marginBottom: 3 }}>High Frequency</strong>
                    Some campaigns are showing 4+ times to the same person. Audience may be too narrow — consider expanding or refreshing creative.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
