import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/mockAdapter';
import { ResolutionStats } from '../api/types';
import { Role } from '../auth';

function MetricCard({ title, value, subtitle }: { title: string, value: string | number, subtitle?: string }) {
  return (
    <div className="bg-surface border border-line p-6 flex flex-col justify-between">
      <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-4">{title}</p>
      <div>
        <p className="font-serif text-5xl font-bold mb-1">{value}</p>
        {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function AdminStatsPage() {
  const { role } = useOutletContext<{ role: Role }>();
  const [stats, setStats] = useState<ResolutionStats | null>(null);

  useEffect(() => {
    api.getResolutionStats().then(setStats);
  }, []);

  if (role !== 'admin') {
    return <div className="p-8 font-bold text-center mt-20 text-xl">Unauthorized Access</div>;
  }

  if (!stats) {
    return (
      <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-line border-t-brand rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-ink-muted">Compiling statistics...</p>
        </div>
      </div>
    );
  }

  const maxTime = Math.max(...stats.perCategory.map(c => c.avgTimeDays), 1);
  const totalReports = stats.open + stats.resolved;
  const resolutionRate = totalReports > 0 ? Math.round((stats.resolved / totalReports) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-paper p-4 md:p-8 md:px-12">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-bold tracking-tight mb-2">Platform Statistics</h1>
          <p className="text-ink-muted">Overview of civic infrastructure reporting and resolution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <MetricCard title="Total Reports" value={totalReports} subtitle="All time" />
          <MetricCard title="Open Reports" value={stats.open} subtitle="Requires attention" />
          <MetricCard title="Resolved" value={stats.resolved} subtitle="Issues fixed" />
          <MetricCard title="Resolution Rate" value={`${resolutionRate}%`} subtitle="Of total reports" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          <div>
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-6">Average Resolution Time</h2>
            <div className="bg-surface border border-line p-6">
              <div className="space-y-6">
                {stats.perCategory.map(cat => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-bold text-sm capitalize">{cat.category}</span>
                      <span className="text-xs text-ink-muted font-mono">{cat.avgTimeDays.toFixed(1)} Days</span>
                    </div>
                    <div className="h-4 bg-paper border border-line overflow-hidden">
                      <div 
                        className="h-full bg-brand transition-all duration-500" 
                        style={{ width: `${(cat.avgTimeDays / maxTime) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-6">Operations Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="bg-surface border border-line p-6 flex flex-col justify-center">
                <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-4">Avg. Global Resolution</p>
                <p className="font-serif text-5xl font-bold mb-1">{stats.avgResolutionTimeDays.toFixed(1)} <span className="text-xl">Days</span></p>
                <p className="text-xs text-ink-muted mt-2">Across all categories</p>
              </div>
              <div className="bg-surface border border-line p-6 flex flex-col justify-center">
                <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-4">AI Duplicates Flagged</p>
                <p className="font-serif text-5xl font-bold text-status-reported mb-1">{stats.flaggedDuplicates}</p>
                <p className="text-xs text-ink-muted mt-2">Saved municipal effort</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
