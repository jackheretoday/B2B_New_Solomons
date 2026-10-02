

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:p-8">
      <h1 className="font-serif text-3xl font-bold mb-4">Terms of Use</h1>
      <p className="text-sm text-ink-muted mb-8">Last updated: October 2, 2026</p>
      
      <div className="space-y-6 text-ink">
        <p>Welcome to the Public Infrastructure Issue Mapping Platform. This is a prototype built for a hackathon.</p>
        
        <h2 className="font-bold text-lg">1. Appropriate Use</h2>
        <p>You agree to report accurate information regarding public infrastructure issues. You must not submit abusive, harassing, or inappropriate content.</p>
        
        <h2 className="font-bold text-lg">2. Not for Emergencies</h2>
        <p>This platform is not for emergencies. If you are experiencing a life-threatening emergency or require immediate assistance, please contact local emergency services immediately (dial 112 in India).</p>
        
        <h2 className="font-bold text-lg">3. Content Moderation</h2>
        <p>Reports may be edited or removed by authorities or platform administrators at any time without prior notice.</p>
      </div>
    </div>
  );
}
