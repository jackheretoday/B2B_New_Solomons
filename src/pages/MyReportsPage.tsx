import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { api } from '../api/mockAdapter';
import { Issue, IssueStatus } from '../api/types';
import { Role } from '../auth';

const statusColors: Record<IssueStatus, string> = {
  Reported: '#A63A2B',
  Assigned: '#9A6A12',
  'In Progress': '#2A5C8F',
  Resolved: '#2F6B45',
};

function StatusTimeline({ history, currentStatus }: { history: any[], currentStatus: IssueStatus }) {
  const steps: IssueStatus[] = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <div className="relative pl-6 space-y-6 py-2">
      <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-line -z-10"></div>
      {steps.map((step, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = idx < currentIndex;
        const historyItem = history.find(h => h.status === step);
        const isActive = isCurrent || isPast;

        return (
          <div key={step} className="relative flex items-start">
            <div className={`absolute -left-6 w-6 h-6 rounded-full border-[3px] bg-surface flex items-center justify-center`}
                 style={{ borderColor: isActive ? statusColors[step] : 'var(--color-line)' }}>
              {isActive && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[step] }}></div>}
            </div>
            <div>
              <p className={`text-sm font-bold ${isActive ? 'text-ink' : 'text-ink-muted'}`}>{step}</p>
              {historyItem ? (
                <p className="text-xs text-ink-muted mt-1">
                  {new Date(historyItem.changed_at).toLocaleDateString()} &middot; {new Date(historyItem.changed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              ) : (
                <p className="text-xs text-ink-muted mt-1 opacity-50">Pending</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MyReportsPage() {
  const { role } = useOutletContext<{ role: Role }>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getMyIssues(role).then(data => {
      // Sort by newest first
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setIssues(data);
      setLoading(false);
    });
  }, [role]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full p-4 md:p-8">
        <h1 className="font-serif text-3xl font-bold mb-8">My Reports</h1>
        <div className="space-y-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 bg-inset animate-pulse border border-line"></div>
          ))}
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="max-w-3xl mx-auto w-full p-4 md:p-8 flex flex-col items-center text-center mt-12 border border-line bg-surface p-12">
        <div className="w-16 h-16 border-2 border-line rounded-full flex items-center justify-center mb-6">
          <span className="text-2xl opacity-30">📋</span>
        </div>
        <h2 className="font-serif text-2xl font-bold mb-2">No Reports Yet</h2>
        <p className="text-ink-muted mb-8 max-w-md">You haven't reported any infrastructure issues yet. When you do, you'll be able to track their progress here.</p>
        <Link to="/report" className="bg-brand text-paper font-bold px-6 py-3 hover:bg-ink">Report an Issue</Link>
      </div>
    );
  }

  const openIssues = issues.filter(i => i.status !== 'Resolved').length;
  const resolvedIssues = issues.filter(i => i.status === 'Resolved').length;

  return (
    <div className="max-w-5xl mx-auto w-full p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight mb-2">My Reports</h1>
          <p className="text-ink-muted">Track the status of infrastructure issues you've reported.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-surface border border-line px-4 py-2 text-center min-w-[100px]">
            <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-1">Open</p>
            <p className="text-2xl font-serif font-bold text-brand">{openIssues}</p>
          </div>
          <div className="bg-surface border border-line px-4 py-2 text-center min-w-[100px]">
            <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-1">Resolved</p>
            <p className="text-2xl font-serif font-bold">{resolvedIssues}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {issues.map(issue => (
          <div key={issue.id} className="bg-surface border border-line flex flex-col md:flex-row overflow-hidden hover:border-ink transition-colors">
            {/* Left side: Image and details */}
            <div className="flex-1 p-6 md:p-8 md:border-r border-line flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-serif text-2xl font-bold capitalize">{issue.category}</h2>
                    {issue.priority && (
                      <span className="text-xs font-bold border border-line px-2 py-0.5 bg-paper text-ink-muted">
                        {issue.priority} Priority
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-ink-muted mb-1">ID: {issue.id}</p>
                  <p className="text-sm text-ink-muted">{new Date(issue.created_at).toLocaleDateString()} &middot; {issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}</p>
                </div>
                
                {issue.duplicate_status === 'confirmed' && (
                  <div className="bg-inset border border-line px-3 py-1 text-xs font-bold">
                    Merged into #{issue.duplicate_of}
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-6 flex-1">
                {issue.photo_url ? (
                  <div className="w-full md:w-48 shrink-0 bg-paper border border-line p-1 h-32 md:h-auto">
                    <img src={issue.photo_url} alt="Issue evidence" className="w-full h-full object-cover border border-line" />
                  </div>
                ) : (
                  <div className="w-full md:w-48 shrink-0 bg-paper border border-line flex items-center justify-center h-32 text-xs font-bold text-ink-muted italic">
                    No photo
                  </div>
                )}
                
                <div className="flex-1 bg-paper border border-line p-4 text-sm leading-relaxed">
                  {issue.description || <span className="italic text-ink-muted">No description provided.</span>}
                </div>
              </div>
            </div>

            {/* Right side: Timeline */}
            <div className="w-full md:w-72 shrink-0 p-6 md:p-8 bg-paper">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-6">Status Tracker</h3>
              <StatusTimeline history={issue.history} currentStatus={issue.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
