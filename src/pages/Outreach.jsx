import { useState } from 'react';
import { useLeads } from '../context/LeadsContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, ChevronRight, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function Outreach() {
  const { leads, updateLead } = useLeads();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState({});

  const today = new Date().toISOString().split('T')[0];

  const outreachLeads = leads
    .filter(l => !['Won', 'Lost'].includes(l.status))
    .sort((a, b) => {
      // Sort by follow-up date, overdue first
      if (a.followUpDate && b.followUpDate) return a.followUpDate.localeCompare(b.followUpDate);
      if (a.followUpDate) return -1;
      if (b.followUpDate) return 1;
      return 0;
    });

  const overdue = outreachLeads.filter(l => l.followUpDate && l.followUpDate < today);
  const dueToday = outreachLeads.filter(l => l.followUpDate === today);
  const upcoming = outreachLeads.filter(l => l.followUpDate > today || !l.followUpDate);

  function openEdit(lead) {
    setActiveId(lead.id);
    setForm({
      firstContact: lead.firstContact || '',
      followUpDate: lead.followUpDate || '',
      messageSent: lead.messageSent || '',
      response: lead.response || '',
      nextAction: lead.nextAction || '',
      status: lead.status || 'New',
    });
  }

  function save() {
    updateLead(activeId, form);
    setActiveId(null);
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const activeLead = leads.find(l => l.id === activeId);

  function LeadOutreachCard({ lead }) {
    const isOverdue = lead.followUpDate && lead.followUpDate < today;
    const isDueToday = lead.followUpDate === today;
    return (
      <div className={`outreach-card ${isOverdue ? 'outreach-card--overdue' : isDueToday ? 'outreach-card--today' : ''}`}>
        <div className="outreach-card-top">
          <div>
            <div className="lead-name">{lead.companyName}</div>
            <div className="lead-meta">{lead.industry} · {lead.city}, {lead.state}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={lead.status} />
            {isOverdue && <span className="overdue-tag"><AlertCircle size={13} /> Overdue</span>}
          </div>
        </div>
        <div className="outreach-card-body">
          {lead.firstContact && (
            <div className="outreach-detail"><Calendar size={13} /> First contact: {lead.firstContact}</div>
          )}
          {lead.followUpDate && (
            <div className="outreach-detail"><Calendar size={13} /> Follow-up: <strong>{lead.followUpDate}</strong></div>
          )}
          {lead.messageSent && (
            <div className="outreach-detail"><MessageSquare size={13} /> {lead.messageSent.slice(0, 80)}{lead.messageSent.length > 80 ? '...' : ''}</div>
          )}
          {lead.nextAction && (
            <div className="outreach-detail" style={{ color: '#ff6b00' }}>
              <ChevronRight size={13} /> Next: {lead.nextAction}
            </div>
          )}
          {!lead.firstContact && !lead.messageSent && (
            <div className="outreach-detail" style={{ color: '#666' }}>No outreach logged yet.</div>
          )}
        </div>
        <div className="outreach-card-footer">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/leads/${lead.id}`)}>View Lead</button>
          <button className="btn btn--primary btn--sm" onClick={() => openEdit(lead)}>Log Outreach</button>
        </div>
      </div>
    );
  }

  function Section({ title, color, leads }) {
    if (!leads.length) return null;
    return (
      <div style={{ marginBottom: 32 }}>
        <div className="section-label" style={{ borderColor: color, color }}>{title} ({leads.length})</div>
        <div className="outreach-grid">
          {leads.map(l => <LeadOutreachCard key={l.id} lead={l} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Outreach Tracker</h1>
          <p className="page-subtitle">Track every touchpoint in your pipeline</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="stat-mini"><span style={{ color: '#ff3333' }}>{overdue.length}</span> Overdue</div>
          <div className="stat-mini"><span style={{ color: '#ffd700' }}>{dueToday.length}</span> Due Today</div>
          <div className="stat-mini"><span style={{ color: '#39ff14' }}>{upcoming.length}</span> Upcoming</div>
        </div>
      </div>

      <Section title="⚠ Overdue" color="#ff3333" leads={overdue} />
      <Section title="📅 Due Today" color="#ffd700" leads={dueToday} />
      <Section title="Upcoming / No Date" color="#39ff14" leads={upcoming} />

      {outreachLeads.length === 0 && (
        <div className="card empty-state">No active leads in outreach yet. Add some leads to get started.</div>
      )}

      {/* Edit Modal */}
      {activeId && activeLead && (
        <div className="modal-overlay" onClick={() => setActiveId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Log Outreach — {activeLead.companyName}</h2>
            <div className="field">
              <label className="field-label">Status</label>
              <select className="input" value={form.status} onChange={e => setF('status', e.target.value)}>
                {['New','Reviewed','Contacted','Followed Up','Booked','Won','Lost'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">First Contact Date</label>
              <input type="date" className="input" value={form.firstContact} onChange={e => setF('firstContact', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Follow-Up Date</label>
              <input type="date" className="input" value={form.followUpDate} onChange={e => setF('followUpDate', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Message Sent</label>
              <textarea className="input textarea" rows={3} value={form.messageSent} onChange={e => setF('messageSent', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Response Received</label>
              <textarea className="input textarea" rows={3} value={form.response} onChange={e => setF('response', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Next Action</label>
              <textarea className="input textarea" rows={2} value={form.nextAction} onChange={e => setF('nextAction', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn--ghost" onClick={() => setActiveId(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
