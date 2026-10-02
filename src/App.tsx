import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth';

import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import MyReportsPage from './pages/MyReportsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

import AdminQueuePage from './pages/AdminQueuePage';
import AdminStatsPage from './pages/AdminStatsPage';

function Layout() {
  const { role, setRole } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className={`min-h-screen flex flex-col bg-paper text-ink font-sans ${isAdminRoute ? 'text-[18px]' : 'text-base'}`}>
      <header className="bg-surface border-b border-line px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-serif font-bold text-lg text-ink">Public Infra</Link>
          <nav className="flex gap-4">
            <Link to="/" className="text-ink hover:bg-inset px-2 py-1">Map</Link>
            <Link to="/report" className="text-ink hover:bg-inset px-2 py-1">Report</Link>
            <Link to="/my-reports" className="text-ink hover:bg-inset px-2 py-1">My reports</Link>
            {role === 'admin' && (
              <>
                <Link to="/admin" className="text-ink hover:bg-inset px-2 py-1">Admin Queue</Link>
                <Link to="/admin/stats" className="text-ink hover:bg-inset px-2 py-1">Stats</Link>
              </>
            )}
          </nav>
        </div>
        <div>
          <select 
            value={role} 
            onChange={e => setRole(e.target.value as any)}
            className="bg-paper border border-line px-2 py-1 text-ink focus:outline-none"
          >
            <option value="citizen1">citizen1</option>
            <option value="citizen2">citizen2</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        <Outlet context={{ role }} />
      </main>

      <footer className="bg-surface border-t border-line p-4 flex gap-4 text-ink-muted text-sm justify-center">
        <Link to="/terms" className="hover:bg-inset px-2 py-1">Terms of Use</Link>
        <Link to="/privacy" className="hover:bg-inset px-2 py-1">Privacy Policy</Link>
        <button onClick={() => { localStorage.removeItem('issues'); window.location.reload(); }} className="hover:bg-inset px-2 py-1 underline">Reset demo data</button>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MapPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="my-reports" element={<MyReportsPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="admin" element={<AdminQueuePage />} />
          <Route path="admin/stats" element={<AdminStatsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
