import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeads } from '../context/LeadsContext';
import { ArrowLeft, ExternalLink, Save, Trash2 } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { INDUSTRIES, STATUSES } from '../data/mockLeads';

function Field({ label, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const { leads, updateLead, deleteLead } = useLeads();
  const navigate = useNavigate();
  const lead = leads.find(l => l.id === Number(id));

  const [form, setForm] = useState(lead || {});
  const [saved, setSaved] = useState(false);

  if (!lead) return <div className="page"><div className="empty-state">Lead not found.</div></div>;

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function save() {
    updateLead(lead.id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDelete() {
    if (confirm('Delete this lead?')) { deleteLead(lead.id); navigate('/leads'); }
  }

  const scoreFields = [
    { key: 'brandingScore', label: 'Branding Score' },
    { key: 'websiteScore', label: 'Website Score' },
    { key: 'seoScore', label: 'SEO Score' },
    { key: 'opportunityScore', label: 'Opportunity Score' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="page-title">{form.companyName || 'Lead Detail'}</h1>
            <StatusBadge status={form.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--danger btn--sm" onClick={handleDelete}><Trash2 size={15} /></button>
          <button className="btn btn--primary" onClick={save}>
            <Save size={15} /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Company Info */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 16 }}>Company Info</h2>
          <div className="fields-grid">
            <Field label="Company Name">
              <input className="input" value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} />
            </Field>
            <Field label="Industry">
              <select className="input" value={form.industry || ''} onChange={e => set('industry', e.target.value)}>
                <option value="">Select...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="City">
              <input className="input" value={form.city || ''} onChange={e => set('city', e.target.value)} />
            </Field>
            <Field label="State">
              <input className="input" value={form.state || ''} onChange={e => set('state', e.target.value)} />
            </Field>
            <Field label="Website">
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={form.website || ''} onChange={e => set('website', e.target.value)} />
                {form.website && (
                  <a href={`https://${form.website}`} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </Field>
            <Field label="Phone">
              <input className="input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className="input" value={form.email || ''} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Google Business Profile">
              <input className="input" value={form.googleBusiness || ''} onChange={e => set('googleBusiness', e.target.value)} placeholder="https://maps.google.com/..." />
            </Field>
          </div>
          <Field label="Status">
            <select className="input" value={form.status || 'New'} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notes">
            <textarea className="input textarea" value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={4} />
          </Field>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Scores */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 16 }}>Scores (1–10)</h2>
            {scoreFields.map(({ key, label }) => (
              <div key={key} className="score-row">
                <label className="score-row-label">{label}</label>
                <input
                  type="range" min={1} max={10} value={form[key] || 5}
                  onChange={e => set(key, Number(e.target.value))}
                  className="score-slider"
                  style={{ '--val': `${((form[key] || 5) - 1) / 9 * 100}%` }}
                />
                <span className="score-num" style={{
                  color: form[key] >= 8 ? '#39ff14' : form[key] >= 5 ? '#ff6b00' : '#ff3333'
                }}>
                  {form[key] || 5}
                </span>
              </div>
            ))}
          </div>

          {/* Outreach */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 16 }}>Outreach Tracker</h2>
            <Field label="First Contact Date">
              <input type="date" className="input" value={form.firstContact || ''} onChange={e => set('firstContact', e.target.value)} />
            </Field>
            <Field label="Follow-Up Date">
              <input type="date" className="input" value={form.followUpDate || ''} onChange={e => set('followUpDate', e.target.value)} />
            </Field>
            <Field label="Message Sent">
              <textarea className="input textarea" value={form.messageSent || ''} onChange={e => set('messageSent', e.target.value)} rows={3} />
            </Field>
            <Field label="Response Received">
              <textarea className="input textarea" value={form.response || ''} onChange={e => set('response', e.target.value)} rows={3} />
            </Field>
            <Field label="Next Action">
              <textarea className="input textarea" value={form.nextAction || ''} onChange={e => set('nextAction', e.target.value)} rows={2} />
            </Field>
          </div>
        </div>
      </div>

      <div className="save-footer">
        <button className="btn btn--primary btn--lg" onClick={save}>
          <Save size={16} /> {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
