import { useLeads } from '../context/LeadsContext';
import { useNavigate } from 'react-router-dom';
import { Users, Zap, Phone, Star, Trophy, TrendingUp } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ScoreBadge from '../components/ScoreBadge';

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div className={`stat-card ${onClick ? 'stat-card--clickable' : ''}`} onClick={onClick} style={{ '--accent': color }}>
      <div className="stat-icon" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        <Icon size={22} color={color} />
      </div>
      <div className="stat-info">
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { stats, leads } = useLeads();
  const navigate = useNavigate();

  const recent = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const hotLeads = leads.filter(l => l.opportunityScore >= 8).slice(0, 4);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your lead pipeline at a glance</p>
        </div>
        <button className="btn btn--primary" onClick={() => navigate('/add')}>+ Add Lead</button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon={Users} label="Total Leads" value={stats.total} color="#39ff14" onClick={() => navigate('/leads')} />
        <StatCard icon={TrendingUp} label="New This Week" value={stats.newThisWeek} color="#00b4ff" />
        <StatCard icon={Zap} label="High Priority" value={stats.highPriority} color="#ff6b00" onClick={() => navigate('/leads')} />
        <StatCard icon={Phone} label="Contacted" value={stats.contacted} color="#ffd700" />
        <StatCard icon={Star} label="Calls Booked" value={stats.booked} color="#bf00ff" />
        <StatCard icon={Trophy} label="Won" value={stats.won} color="#39ff14" />
      </div>

      <div className="dash-grid">
        {/* Recent Leads */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Leads</h2>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/leads')}>View all</button>
          </div>
          <div className="lead-list">
            {recent.map(lead => (
              <div key={lead.id} className="lead-row" onClick={() => navigate(`/leads/${lead.id}`)}>
                <div className="lead-row-main">
                  <div className="lead-name">{lead.companyName}</div>
                  <div className="lead-meta">{lead.industry} · {lead.city}, {lead.state}</div>
                </div>
                <div className="lead-row-right">
                  <StatusBadge status={lead.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Leads */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🔥 Hot Leads</h2>
            <span className="tag tag--orange">Opportunity ≥ 8</span>
          </div>
          <div className="lead-list">
            {hotLeads.map(lead => (
              <div key={lead.id} className="lead-row" onClick={() => navigate(`/leads/${lead.id}`)}>
                <div className="lead-row-main">
                  <div className="lead-name">{lead.companyName}</div>
                  <div className="lead-meta">{lead.city}, {lead.state}</div>
                </div>
                <ScoreBadge score={lead.opportunityScore} />
              </div>
            ))}
            {hotLeads.length === 0 && (
              <div className="empty-state">No high-priority leads yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Bar */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Pipeline Overview</h2>
        </div>
        <div className="pipeline">
          {['New', 'Reviewed', 'Contacted', 'Followed Up', 'Booked', 'Won'].map(status => {
            const count = leads.filter(l => l.status === status).length;
            return (
              <div key={status} className="pipeline-stage">
                <div className="pipeline-count">{count}</div>
                <div className="pipeline-bar-wrap">
                  <div
                    className="pipeline-bar"
                    style={{ height: `${Math.max(4, (count / leads.length) * 100)}%` }}
                  />
                </div>
                <div className="pipeline-label">{status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
