import { createContext, useContext, useState } from 'react';
import { mockLeads } from '../data/mockLeads';

const LeadsContext = createContext(null);

export function LeadsProvider({ children }) {
  const [leads, setLeads] = useState(mockLeads);

  function addLead(lead) {
    setLeads(prev => [...prev, { ...lead, id: Date.now(), createdAt: new Date().toISOString().split('T')[0] }]);
  }

  function updateLead(id, updates) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }

  function deleteLead(id) {
    setLeads(prev => prev.filter(l => l.id !== id));
  }

  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  const stats = {
    total: leads.length,
    newThisWeek: leads.filter(l => new Date(l.createdAt) >= thisWeekStart).length,
    highPriority: leads.filter(l => l.opportunityScore >= 8).length,
    contacted: leads.filter(l => ['Contacted', 'Followed Up'].includes(l.status)).length,
    booked: leads.filter(l => l.status === 'Booked').length,
    won: leads.filter(l => l.status === 'Won').length,
  };

  return (
    <LeadsContext.Provider value={{ leads, addLead, updateLead, deleteLead, stats }}>
      {children}
    </LeadsContext.Provider>
  );
}

export const useLeads = () => useContext(LeadsContext);
