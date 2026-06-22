import { useState, useRef } from 'react';
import { useLeads } from '../context/LeadsContext';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ExternalLink, Trash2, Edit, Upload, CheckCircle, X } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ScoreBadge from '../components/ScoreBadge';
import { INDUSTRIES, STATUSES } from '../data/mockLeads';

// Map common Facebook Lead Ad / generic CSV column names to our lead fields
const FB_FIELD_MAP = {
  // Facebook Lead Ads export columns
  'full_name': 'companyName',
  'company_name': 'companyName',
  'business_name': 'companyName',
  'name': 'companyName',
  'email': 'email',
  'email_address': 'email',
  'phone_number': 'phone',
  'phone': 'phone',
  'city': 'city',
  'state': 'state',
  'website': 'website',
  'industry': 'industry',
  'notes': 'notes',
};

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header row — handle quoted fields
  function parseLine(line) {
    const result = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));

  return lines.slice(1).map(line => {
    const cols = parseLine(line);
    const raw = {};
    headers.forEach((h, i) => { raw[h] = cols[i] || ''; });

    const lead = {
      companyName: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      website: '',
      industry: 'HVAC',
      notes: '',
      status: 'New',
      opportunityScore: 5,
    };

    // Map known fields
    for (const [csvCol, leadField] of Object.entries(FB_FIELD_MAP)) {
      if (raw[csvCol]) lead[leadField] = raw[csvCol];
    }

    // Fallback: if companyName still empty, try first non-empty column
    if (!lead.companyName) {
      lead.companyName = Object.values(raw).find(v => v) || 'Unknown';
    }

    // Normalize industry if it matches our list
    const matchedIndustry = INDUSTRIES.find(ind => ind.toLowerCase() === lead.industry.toLowerCase());
    if (matchedIndustry) lead.industry = matchedIndustry;

    return lead;
  }).filter(l => l.companyName && l.companyName !== 'Unknown');
}

export default function LeadDatabase() {
  const { leads, deleteLead, addLead } = useLeads();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [minScore, setMinScore] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [importResult, setImportResult] = useState(null); // { count, skipped }
  const [importError, setImportError] = useState('');

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setImportError('Please select a .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result);
        if (parsed.length === 0) {
          setImportError('No valid leads found in that file. Make sure it has a header row.');
          return;
        }
        // Skip duplicates by email or company+phone
        const existing = new Set(leads.map(l => l.email?.toLowerCase()).filter(Boolean));
        let added = 0, skipped = 0;
        parsed.forEach(lead => {
          if (lead.email && existing.has(lead.email.toLowerCase())) { skipped++; return; }
          addLead(lead);
          if (lead.email) existing.add(lead.email.toLowerCase());
          added++;
        });
        setImportResult({ count: added, skipped });
        setImportError('');
      } catch {
        setImportError('Could not read that file. Make sure it\'s a valid CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

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
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
          <button className="btn btn--ghost" onClick={() => { setImportResult(null); setImportError(''); fileRef.current.click(); }}>
            <Upload size={15} /> Import CSV
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/add')}>+ Add Lead</button>
        </div>
      </div>

      {importResult && (
        <div className="import-banner import-banner--success">
          <CheckCircle size={16} />
          <span>Imported <strong>{importResult.count}</strong> leads{importResult.skipped > 0 ? ` (${importResult.skipped} duplicates skipped)` : ''}.</span>
          <button className="icon-btn" onClick={() => setImportResult(null)}><X size={14} /></button>
        </div>
      )}
      {importError && (
        <div className="import-banner import-banner--error">
          <span>{importError}</span>
          <button className="icon-btn" onClick={() => setImportError('')}><X size={14} /></button>
        </div>
      )}

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
