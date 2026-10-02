
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-8">
      
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight mb-3">Terms of Use</h1>
        <p className="text-ink-muted">Last updated: October 2, 2026</p>
      </div>
      
      <div className="bg-surface border border-line p-8 space-y-8 text-ink leading-relaxed">
        <p className="font-bold text-lg border-b border-line pb-4">
          Welcome to FixMeraMarg. This is a prototype built for demonstration.
        </p>
        
        <div>
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">1. Appropriate Use</h2>
          <p>You agree to report accurate information regarding public infrastructure issues. You must not submit abusive, harassing, or inappropriate content.</p>
        </div>
        
        <div>
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">2. Not for Emergencies</h2>
          <p>This platform is not for emergencies. If you are experiencing a life-threatening emergency or require immediate assistance, please contact local emergency services immediately (dial 112 in India).</p>
        </div>
        
        <div>
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">3. Content Moderation</h2>
          <p>Reports may be edited or removed by authorities or platform administrators at any time without prior notice.</p>
        </div>
      </div>
      
    </div>
  );
}
