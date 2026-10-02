

export default function PrivacyPage() {
  const resetData = () => {
    localStorage.removeItem('issues');
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:p-8">
      <h1 className="font-serif text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-sm text-ink-muted mb-8">Last updated: October 2, 2026</p>
      
      <div className="space-y-6 text-ink">
        <h2 className="font-bold text-lg">1. Data Collected</h2>
        <p>When you submit a report, we collect the issue category, description, photo, geographic coordinates, and your user identifier.</p>
        
        <h2 className="font-bold text-lg">2. Local Storage</h2>
        <p>This demo platform stores data in your browser only (via localStorage). There is no backend server receiving or storing your report data.</p>
        
        <h2 className="font-bold text-lg">3. Third-Party Services</h2>
        <p>Map tiles are provided by OpenStreetMap. When you view the map, OpenStreetMap receives the viewed area coordinates and your IP address in order to serve the tiles.</p>
        
        <h2 className="font-bold text-lg">4. Privacy Warnings</h2>
        <p>Please do not photograph faces, vehicle number plates, or any sensitive personal information when submitting photos of infrastructure issues.</p>
        
        <h2 className="font-bold text-lg">5. Data Sharing</h2>
        <p>We do not use analytics, we do not show ads, and we do not sell data.</p>
        
        <h2 className="font-bold text-lg">6. Data Deletion</h2>
        <p>You can delete all demo data stored in your browser at any time.</p>
        <button 
          onClick={resetData}
          className="bg-paper border border-line px-4 py-2 hover:bg-inset font-bold text-sm mt-2"
        >
          Reset demo data
        </button>
      </div>
    </div>
  );
}
