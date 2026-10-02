import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth, Role } from './auth';
import { seedSupabaseIfEmpty } from './api/seedSupabase';

import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import MyReportsPage from './pages/MyReportsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

import AdminQueuePage from './pages/AdminQueuePage';
import AdminStatsPage from './pages/AdminStatsPage';

function Header() {
  const { role, setRole } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/map', label: 'Explore Map' },
    { to: '/report', label: 'Report Issue' },
    { to: '/my-reports', label: 'My Reports' },
  ];

  if (role === 'admin') {
    navLinks.push({ to: '/admin', label: 'Admin Queue' });
    navLinks.push({ to: '/admin/stats', label: 'Admin Stats' });
  }

  return (
    <header className="bg-surface border-b border-line flex flex-col md:flex-row md:items-center justify-between z-50">
      <div className="flex items-center justify-between p-4 md:border-r border-line md:w-64 shrink-0 bg-brand text-paper">
        <div>
          <Link to="/" className="font-serif font-bold text-xl block tracking-wide">FixMeraMarg</Link>
          <span className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1 block">Report. Track. Fix.</span>
        </div>
        <button 
          className="md:hidden p-2 border border-paper/30 focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 h-0.5 bg-paper mb-1"></div>
          <div className="w-5 h-0.5 bg-paper mb-1"></div>
          <div className="w-5 h-0.5 bg-paper"></div>
        </button>
      </div>

      <div className={`md:flex flex-1 items-center justify-between bg-surface ${mobileMenuOpen ? 'block border-t border-line' : 'hidden'}`}>
        <nav className="flex flex-col md:flex-row border-b md:border-b-0 border-line">
          {navLinks.map(link => (
            <Link 
              key={link.to}
              to={link.to} 
              onClick={() => setMobileMenuOpen(false)}
              className={`p-4 md:px-6 md:py-4 border-b md:border-b-0 md:border-r border-line font-bold text-sm hover:bg-inset transition-none ${
                location.pathname === link.to || (link.to !== '/' && location.pathname === link.to)
                  ? 'bg-inset text-brand' 
                  : 'text-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 md:p-0 md:px-6 flex items-center bg-surface">
          <label className="text-xs text-ink-muted font-bold mr-3 uppercase tracking-wider hidden lg:block">View As</label>
          <select 
            value={role} 
            onChange={e => {
              setRole(e.target.value as Role);
              setMobileMenuOpen(false);
            }}
            className="w-full md:w-auto bg-paper border border-line px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-brand"
            aria-label="Select user role"
          >
            <option value="citizen1">Citizen 1</option>
            <option value="citizen2">Citizen 2</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>
    </header>
  );
}

function Layout() {
  const { role } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isMapRoute = location.pathname === '/map';

  return (
    <div className={`h-[100dvh] max-h-[100dvh] flex flex-col bg-paper text-ink font-sans overflow-hidden ${isAdminRoute ? 'text-[18px]' : 'text-base'}`}>
      <Header />
      
      <main className={`flex-1 flex flex-col relative min-h-0 ${isMapRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <Outlet context={{ role }} />
        
        {!isMapRoute && (
          <footer className="bg-surface border-t border-line p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-ink-muted text-sm shrink-0 z-10 mt-auto">
            <div className="font-bold">
              &copy; {new Date().getFullYear()} FixMeraMarg Civic Tech
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              <Link to="/terms" className="hover:text-ink font-bold hover:underline">Terms of Use</Link>
              <Link to="/privacy" className="hover:text-ink font-bold hover:underline">Privacy Policy</Link>
              <button 
                onClick={() => { localStorage.removeItem('issues'); window.location.reload(); }} 
                className="hover:text-ink font-bold hover:underline cursor-pointer"
              >
                Reset Demo Data
              </button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    seedSupabaseIfEmpty();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<Layout />}>
          <Route path="map" element={<MapPage />} />
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
