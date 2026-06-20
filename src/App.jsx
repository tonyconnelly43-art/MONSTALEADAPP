import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LeadsProvider } from './context/LeadsContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LeadDatabase from './pages/LeadDatabase';
import LeadDetail from './pages/LeadDetail';
import AddLead from './pages/AddLead';
import BrandAudit from './pages/BrandAudit';
import Outreach from './pages/Outreach';
import './index.css';

export default function App() {
  return (
    <LeadsProvider>
      <BrowserRouter basename="/MONSTALEADAPP">
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadDatabase />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/add" element={<AddLead />} />
            <Route path="/audit" element={<BrandAudit />} />
            <Route path="/outreach" element={<Outreach />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LeadsProvider>
  );
}
