import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import AppShell from './components/layout/AppShell';
import ExecutiveSummary from './pages/ExecutiveSummary';
import PatientRiskPanel from './pages/PatientRiskPanel';
import PatientDetail from './pages/PatientDetail';
import SegmentExplorer from './pages/SegmentExplorer';
import SurvivalAnalysis from './pages/SurvivalAnalysis';
import CostEffectiveness from './pages/CostEffectiveness';
import BudgetSimulator from './pages/BudgetSimulator';
import Settings from './pages/Settings';

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/"             element={<ExecutiveSummary />} />
            <Route path="/patients"     element={<PatientRiskPanel />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/segments"     element={<SegmentExplorer />} />
            <Route path="/survival"     element={<SurvivalAnalysis />} />
            <Route path="/cost"         element={<CostEffectiveness />} />
            <Route path="/budget"       element={<BudgetSimulator />} />
            <Route path="/settings"     element={<Settings />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </RoleProvider>
  );
}
