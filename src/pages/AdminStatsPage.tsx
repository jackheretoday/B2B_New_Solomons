import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/mockAdapter';
import { ResolutionStats } from '../api/types';
import { Role } from '../auth';

export default function AdminStatsPage() {
  const { role } = useOutletContext<{ role: Role }>();
  const [stats, setStats] = useState<ResolutionStats | null>(null);

  useEffect(() => {
    api.getResolutionStats().then(setStats);
  }, []);

  if (role !== 'admin') return <div className="p-8 font-bold">Unauthorized</div>;
  if (!stats) return <div className="p-8 animate-pulse text-ink-muted">Loading...</div>;

  const maxTime = Math.max(...stats.perCategory.map(c => c.avgTimeDays), 1);

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <h1 className="font-serif text-3xl font-bold mb-8">Platform Statistics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-surface border border-line p-4">
          <p className="text-sm text-ink-muted mb-2">Open Issues</p>
          <p className="font-serif text-4xl">{stats.open}</p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-sm text-ink-muted mb-2">Resolved</p>
          <p className="font-serif text-4xl">{stats.resolved}</p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-sm text-ink-muted mb-2">Avg. Resolution (Days)</p>
          <p className="font-serif text-4xl">{stats.avgResolutionTimeDays.toFixed(1)}</p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-sm text-ink-muted mb-2">Flagged Duplicates</p>
          <p className="font-serif text-4xl">{stats.flaggedDuplicates}</p>
        </div>
      </div>

      <h2 className="font-serif text-2xl font-bold mb-6">Average Time to Resolve by Category</h2>
      <table className="w-full text-left text-sm border-collapse max-w-4xl">
        <thead className="bg-surface">
          <tr>
            <th className="p-3 font-bold border border-line w-48">Category</th>
            <th className="p-3 font-bold border border-line w-24 tabular-nums">Days</th>
            <th className="p-3 font-bold border border-line">Comparison</th>
          </tr>
        </thead>
        <tbody>
          {stats.perCategory.map(cat => (
            <tr key={cat.category} className="border border-line hover:bg-inset">
              <td className="p-3">{cat.category}</td>
              <td className="p-3 tabular-nums">{cat.avgTimeDays.toFixed(1)}</td>
              <td className="p-3">
                <div 
                  className="h-4 bg-ink" 
                  style={{ width: `${(cat.avgTimeDays / maxTime) * 100}%` }}
                ></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
