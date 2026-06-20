import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '../context/LeadsContext';
import { PlusCircle } from 'lucide-react';
import { INDUSTRIES } from '../data/mockLeads';

const blank = {
  companyName: '', industry: '', city: '', state: '', website: '',
  phone: '', email: '', googleBusiness: '', notes: '',
  brandingScore: 5, websiteScore: 5, seoScore: 5, opportunityScore: 5,
  status: 'New', firstContact: '', followUpDate: '', messageSent: '', response: '', nextAction: '',
};

function Field({ label, required, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}{required && <span className="req">*</span>}</label>
      {children}
    </div>
  );
}

export default function AddLead() {
  const { addLead } = useLeads();
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!form.companyName.trim()) { setError('Company name is required.'); return; }
    addLead(form);
    navigate('/leads');
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
        <div>
          <h1 className="page-title">Add New Lead</h1>
          <p className="page-subtitle">Manually enter a company you want to target</p>
        </div>
      </div>

      <form onSubmit={submit}>
        {error && <div className="error-msg">{error}</div>}
        <div className="detail-grid">
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 16 }}>Company Info</h2>
            <div className="fields-grid">
              <Field label="Company Name" required>
                <input className="input" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Peak Pro HVAC" />
              </Field>
              <Field label="Industry">
                <select className="input" value={form.industry} onChange={e => set('industry', e.target.value)}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="City">
                <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Austin" />
              </Field>
              <Field label="State">
                <input className="input" value={form.state} onChange={e => set('state', e.target.value)} placeholder="TX" />
              </Field>
              <Field label="Website">
                <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="example.com" />
              </Field>
              <Field label="Phone">
                <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(512) 555-0000" />
              </Field>
              <Field label="Email">
                <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.com" />
              </Field>
              <Field label="Google Business Profile URL">
                <input className="input" value={form.googleBusiness} onChange={e => set('googleBusiness', e.target.value)} placeholder="https://maps.google.com/..." />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="input textarea" value={form.notes} onChange={e => set('notes', e.target.value)} rows={4} placeholder="What did you observe? Branding issues, opportunities..." />
            </Field>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: 16 }}>Scores (1–10)</h2>
              {scoreFields.map(({ key, label }) => (
                <div key={key} className="score-row">
                  <label className="score-row-label">{label}</label>
                  <input
                    type="range" min={1} max={10} value={form[key]}
                    onChange={e => set(key, Number(e.target.value))}
                    className="score-slider"
                    style={{ '--val': `${(form[key] - 1) / 9 * 100}%` }}
                  />
                  <span className="score-num" style={{
                    color: form[key] >= 8 ? '#39ff14' : form[key] >= 5 ? '#ff6b00' : '#ff3333'
                  }}>
                    {form[key]}
                  </span>
                </div>
              ))}
            </div>

            <div className="card">
              <h2 className="card-title" style={{ marginBottom: 16 }}>Initial Outreach</h2>
              <Field label="First Contact Date">
                <input type="date" className="input" value={form.firstContact} onChange={e => set('firstContact', e.target.value)} />
              </Field>
              <Field label="Follow-Up Date">
                <input type="date" className="input" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} />
              </Field>
              <Field label="Message Sent">
                <textarea className="input textarea" value={form.messageSent} onChange={e => set('messageSent', e.target.value)} rows={3} />
              </Field>
              <Field label="Next Action">
                <textarea className="input textarea" value={form.nextAction} onChange={e => set('nextAction', e.target.value)} rows={2} />
              </Field>
            </div>
          </div>
        </div>

        <div className="save-footer">
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/leads')}>Cancel</button>
          <button type="submit" className="btn btn--primary btn--lg">
            <PlusCircle size={16} /> Add Lead
          </button>
        </div>
      </form>
    </div>
  );
}
