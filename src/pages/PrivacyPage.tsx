
export default function PrivacyPage() {
  const resetData = () => {
    localStorage.removeItem('issues');
    window.location.reload();
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-8">
      
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-ink-muted">Last updated: October 2, 2026</p>
      </div>
      
      <div className="bg-surface border border-line p-8 space-y-8 text-ink leading-relaxed">
        
        <div>
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">1. Data Collected</h2>
          <p>When you submit a report, we collect the issue category, description, photo, geographic coordinates, and your user identifier.</p>
        </div>
        
        <div>
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">2. Local Storage</h2>
          <p>This demo platform stores data in your browser only (via localStorage). There is no backend server receiving or storing your report data.</p>
        </div>
        
        <div>
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">3. Third-Party Services</h2>
          <p>Map tiles are provided by OpenStreetMap or Carto. When you view the map, the provider receives the viewed area coordinates and your IP address in order to serve the tiles.</p>
        </div>
        
        <div>
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">4. Privacy Warnings</h2>
          <p>Please do not photograph faces, vehicle number plates, or any sensitive personal information when submitting photos of infrastructure issues.</p>
        </div>
        
        <div>
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">5. Data Sharing</h2>
          <p>We do not use analytics, we do not show ads, and we do not sell data.</p>
        </div>
        
        <div className="pt-4 border-t border-line">
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">6. Data Management</h2>
          <p className="mb-4">You can delete all demo data stored in your browser at any time.</p>
          <button 
            onClick={resetData}
            className="border border-status-reported text-status-reported px-4 py-2 hover:bg-status-reported hover:text-paper font-bold transition-none"
          >
            Reset All Demo Data
          </button>
        </div>

      </div>
    </div>
  );
}
