import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/mockAdapter';
import { Issue, IssueStatus } from '../api/types';
import { Role } from '../auth';

const statusColors: Record<IssueStatus, string> = {
  Reported: '#A63A2B',
  Assigned: '#9A6A12',
  'In Progress': '#2A5C8F',
  Resolved: '#2F6B45',
};

export default function MyReportsPage() {
  const { role } = useOutletContext<{ role: Role }>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getMyIssues(role).then(data => {
      setIssues(data);
      setLoading(false);
    });
  }, [role]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-32 bg-inset animate-pulse border border-line"></div>
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 text-center">
        <p className="text-ink-muted">You have not reported any issues yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-4 md:p-8">
      <h1 className="font-serif text-2xl font-bold mb-6">My Reports</h1>
      <div className="space-y-6">
        {issues.map(issue => (
          <div key={issue.id} className="bg-surface border border-line p-4 md:p-6 flex flex-col md:flex-row gap-6">
            {issue.photo_url && (
              <img src={issue.photo_url} alt="Issue" className="w-full md:w-48 h-32 object-cover border border-line shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl font-bold">{issue.category}</h2>
                  {issue.duplicate_status === 'confirmed' && (
                    <span className="text-sm font-bold bg-inset px-2 py-1 text-ink-muted">Merged into #{issue.duplicate_of}</span>
                  )}
                </div>
                <div className="px-2 py-1 border border-line flex items-center gap-2 bg-paper">
                  <div className="w-[10px] h-[10px]" style={{ backgroundColor: statusColors[issue.status] }}></div>
                  <span className="text-sm">{issue.status}</span>
                </div>
              </div>
              <p className="text-sm text-ink-muted mb-4">{new Date(issue.created_at).toLocaleDateString()} &middot; {issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}</p>
              <p className="text-ink mb-6">{issue.description}</p>
              
              <div className="border-t border-line pt-4">
                <h3 className="font-bold text-sm mb-2">Timeline</h3>
                <ul className="space-y-2">
                  {issue.history.map((h, i) => (
                    <li key={i} className="flex gap-4 items-start text-sm">
                      <div className="w-[10px] h-[10px] mt-1 shrink-0" style={{ backgroundColor: statusColors[h.status] }}></div>
                      <div>
                        <p className="font-bold">{h.status}</p>
                        <p className="text-ink-muted">{new Date(h.changed_at).toLocaleString()} by {h.changed_by}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
