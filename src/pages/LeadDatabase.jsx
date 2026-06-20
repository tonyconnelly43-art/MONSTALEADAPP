import { useState } from 'react';
import { useLeads } from '../context/LeadsContext';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ExternalLink, Trash2, Edit } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ScoreBadge from '../components/ScoreBadge';
import { INDUSTRIES, STATUSES } from '../data/mockLeads';

export default function LeadDatabase() {
  const { leads, deleteLead } = useLeads();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [minScore, setMinScore] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    if (q && !l.companyName.toLowerCase().includes(q) && !l.city.toLowerCase().includes(q) && !l.industry.toLowerCase().includes(q)) return false;
    if (filterIndustry && l.industry !== filterIndustry) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterCity && !l.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (minScore && l.opportunityScore < Number(minScore)) return false;
    return true;
  });

  function handleDelete(e, id) {
    e.stopPropagation();
    if (confirm('Delete this lead?')) deleteLead(id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lead Database</h1>
          <p className="page-subtitle">{filtered.length} of {leads.length} leads</p>
        </div>
        <button className="btn btn--primary" onClick={() => navigate('/add')}>+ Add Lead</button>
      </div>

      {/* Search bar */}
      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search company, city, industry..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className={`btn btn--ghost ${showFilters ? 'btn--active' : ''}`} onClick={() => setShowFilters(f => !f)}>
          <Filter size={16} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <select className="filter-select" value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
            <option value="">All Industries</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            className="filter-select"
            placeholder="City..."
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
          />
          <select className="filter-select" value={minScore} onChange={e => setMinScore(e.target.value)}>
            <option value="">Min Opportunity Score</option>
            {[5,6,7,8,9,10].map(n => <option key={n} value={n}>≥ {n}</option>)}
          </select>
          <button className="btn btn--ghost btn--sm" onClick={() => {
            setFilterIndustry(''); setFilterStatus(''); setFilterCity(''); setMinScore('');
          }}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="card table-card">
        <div className="table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Brand</th>
                <th>Web</th>
                <th>SEO</th>
                <th>Opp.</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id} className="lead-tr" onClick={() => navigate(`/leads/${lead.id}`)}>
                  <td>
                    <div className="lead-name">{lead.companyName}</div>
                    {lead.phone && <div className="lead-meta">{lead.phone}</div>}
                  </td>
                  <td><span className="tag">{lead.industry}</span></td>
                  <td className="lead-meta">{lead.city}, {lead.state}</td>
                  <td><ScoreBadge score={lead.brandingScore} /></td>
                  <td><ScoreBadge score={lead.websiteScore} /></td>
                  <td><ScoreBadge score={lead.seoScore} /></td>
                  <td><ScoreBadge score={lead.opportunityScore} /></td>
                  <td><StatusBadge status={lead.status} /></td>
                  <td>
                    <div className="action-btns" onClick={e => e.stopPropagation()}>
                      {lead.website && (
                        <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="icon-btn" title="Visit site">
                          <ExternalLink size={15} />
                        </a>
                      )}
                      <button className="icon-btn" title="Edit" onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.id}`); }}>
                        <Edit size={15} />
                      </button>
                      <button className="icon-btn icon-btn--danger" title="Delete" onClick={e => handleDelete(e, lead.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="empty-state">No leads match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
