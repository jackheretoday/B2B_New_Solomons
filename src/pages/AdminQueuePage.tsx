import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api/mockAdapter';
import { Issue, IssueStatus, IssuePriority } from '../api/types';
import { Role } from '../auth';

import potholeGlyph from '../assets/glyphs/pothole.svg';
import streetlightGlyph from '../assets/glyphs/streetlight.svg';
import waterLeakGlyph from '../assets/glyphs/water-leak.svg';
import garbageGlyph from '../assets/glyphs/garbage.svg';
import drainageGlyph from '../assets/glyphs/drainage.svg';
import otherGlyph from '../assets/glyphs/other.svg';

const glyphs: Record<string, string> = {
  pothole: potholeGlyph,
  streetlight: streetlightGlyph,
  'water leak': waterLeakGlyph,
  garbage: garbageGlyph,
  drainage: drainageGlyph,
  other: otherGlyph,
};

const statusColors: Record<IssueStatus, string> = {
  Reported: '#A63A2B',
  Assigned: '#9A6A12',
  'In Progress': '#2A5C8F',
  Resolved: '#2F6B45',
};

const priorityValue: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const getDeptForCategory = (cat: string) => {
  switch(cat) {
    case 'pothole': return 'Roads';
    case 'water leak': return 'Water';
    case 'streetlight': return 'Electricity';
    case 'garbage': return 'Sanitation';
    case 'drainage': return 'Drainage';
    default: return '';
  }
};

function PriorityIndicator({ priority }: { priority: IssuePriority }) {
  const val = priority ? priorityValue[priority] : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px]">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`w-2 h-3 border border-ink ${i <= val ? (priority === 'Critical' ? 'bg-status-reported border-status-reported' : 'bg-ink') : 'bg-transparent'}`} />
        ))}
      </div>
      <span className={`text-xs font-bold ${priority === 'Critical' ? 'text-status-reported' : ''}`}>{priority || 'Unset'}</span>
    </div>
  );
}

function StatusChip({ status }: { status: IssueStatus }) {
  return (
    <div className="px-2 py-1 border border-line inline-flex items-center gap-2 bg-paper text-xs font-bold whitespace-nowrap">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[status] }}></div>
      <span>{status}</span>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string, value: number, color?: string }) {
  return (
    <div className="bg-surface border border-line p-4 md:p-6 flex flex-col justify-between">
      <p className="text-xs text-ink-muted uppercase tracking-widest font-bold mb-2">{title}</p>
      <p className="font-serif text-4xl font-bold" style={{ color: color || 'var(--color-ink)' }}>{value}</p>
    </div>
  );
}

function AdminIssuePanel({ issue, onClose, onUpdate, issues }: { issue: Issue, onClose: () => void, onUpdate: () => void, issues: Issue[] }) {
  const { role } = useOutletContext<{ role: Role }>();
  const [department, setDepartment] = useState(issue.department_id || getDeptForCategory(issue.category));
  const [priority, setPriority] = useState<IssuePriority>(issue.priority || issue.suggested_priority || 'Low');
  const [saving, setSaving] = useState(false);
  const [resolvedPhoto, setResolvedPhoto] = useState<string>('');

  const steps: IssueStatus[] = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
  const currentIndex = steps.indexOf(issue.status);

  const handleResolvedPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResolvedPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleNextStatus = async () => {
    if (currentIndex >= steps.length - 1) return;
    const nextStatus = steps[currentIndex + 1];
    
    const updates: Partial<Issue> = {
      status: nextStatus,
      department_id: department,
      priority: priority,
    };

    // Include resolved photo when marking as Resolved
    if (nextStatus === 'Resolved' && resolvedPhoto) {
      updates.resolved_photo_url = resolvedPhoto;
    }

    setSaving(true);
    await api.updateIssue(issue.id, updates, role);
    setSaving(false);
    onUpdate();
  };

  const handleSaveFields = async () => {
    setSaving(true);
    await api.updateIssue(issue.id, { department_id: department, priority }, role);
    setSaving(false);
    onUpdate();
  };

  const duplicateParent = issue.duplicate_of ? issues.find(i => i.id === issue.duplicate_of) : null;

  const handleMerge = async (action: 'confirm' | 'dismiss') => {
    if (!issue.duplicate_of) return;
    setSaving(true);
    await api.resolveDuplicate(issue.id, issue.duplicate_of, action, role);
    setSaving(false);
    onUpdate();
  };

  const canAdvance = () => {
    if (issue.status === 'Reported' && !department) {
      return { valid: false, reason: 'Department required' };
    }
    return { valid: true };
  };

  const customPin = L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      width: 24px; height: 24px; 
      border-radius: 9999px; 
      background-color: var(--color-surface, #F5F2EB);
      border: 3px solid ${statusColors[issue.status]};
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[600px] bg-surface border-l border-line p-0 z-50 overflow-y-auto flex flex-col shadow-2xl transition-transform transform translate-x-0">
      
      <div className="sticky top-0 bg-surface border-b border-line p-4 md:p-6 flex justify-between items-center z-10">
        <div>
          <h2 className="font-serif text-2xl font-bold">{issue.id}</h2>
          <p className="text-sm text-ink-muted">{new Date(issue.created_at).toLocaleString()}</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 border border-line flex items-center justify-center hover:bg-inset font-bold text-xl">&times;</button>
      </div>

      <div className="p-4 md:p-6 space-y-8 flex-1">
        
        {issue.duplicate_status === 'pending' && duplicateParent && (
          <div className="border border-brand bg-paper p-6 relative">
            <div className="absolute top-0 left-0 bg-brand text-paper text-xs font-bold px-2 py-1 uppercase tracking-widest">Duplicate Review</div>
            
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">This Report</p>
                {issue.photo_url ? <img src={issue.photo_url} className="h-32 w-full object-cover border border-line mb-2" /> : <div className="h-32 bg-surface border border-line mb-2 flex items-center justify-center text-xs text-ink-muted">No Photo</div>}
              </div>
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Existing Report</p>
                {duplicateParent.photo_url ? <img src={duplicateParent.photo_url} className="h-32 w-full object-cover border border-line mb-2" /> : <div className="h-32 bg-surface border border-line mb-2 flex items-center justify-center text-xs text-ink-muted">No Photo</div>}
              </div>
            </div>
            
            <p className="text-sm my-4 bg-surface p-3 border border-line font-mono text-center">Distance: {issue.duplicate_distance_m} meters</p>
            
            <div className="flex gap-4">
              <button onClick={() => handleMerge('confirm')} disabled={saving} className="flex-1 bg-brand text-paper py-3 font-bold hover:bg-ink">Merge into Existing</button>
              <button onClick={() => handleMerge('dismiss')} disabled={saving} className="flex-1 border border-ink py-3 font-bold hover:bg-inset">Keep Separate</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Category</h3>
            <div className="flex items-center gap-2 bg-paper border border-line p-3">
              <img src={glyphs[issue.category] || glyphs.other} className="w-5 h-5" alt="" />
              <span className="font-bold capitalize">{issue.category}</span>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Status</h3>
            <div className="bg-paper border border-line p-3">
              <StatusChip status={issue.status} />
            </div>
          </div>
        </div>

        {issue.ai_verified !== undefined && (
          <div className="border border-line bg-paper p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-widest">AI Model Verification</span>
              <span className={`text-xs font-bold px-2 py-0.5 border ${
                issue.ai_verified 
                  ? 'border-status-resolved text-status-resolved' 
                  : 'border-status-reported text-status-reported'
              }`}>
                {issue.ai_verified ? 'VERIFIED REAL ISSUE' : 'UNVERIFIED'}
              </span>
            </div>
            <div className="text-xs text-ink-muted mt-2 flex gap-4">
              {issue.ai_confidence && <span>Confidence: <strong>{issue.ai_confidence}%</strong></span>}
              {issue.ai_detection_count !== undefined && <span>Detections: <strong>{issue.ai_detection_count}</strong></span>}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Evidence & Description</h3>
          <div className="bg-paper border border-line">
            {issue.photo_url && (
              <div className="p-1 border-b border-line">
                <img src={issue.photo_url} alt="Issue" className="w-full h-48 object-cover border border-line" />
              </div>
            )}
            <p className="p-4 text-sm">{issue.description || <span className="text-ink-muted italic">No description</span>}</p>
          </div>
        </div>

        
        <div>
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Location</h3>
          <div className="h-48 border border-line z-0 relative">
            <MapContainer center={[issue.lat, issue.lng]} zoom={16} className="w-full h-full" zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <Marker position={[issue.lat, issue.lng]} icon={customPin} />
              {duplicateParent && issue.duplicate_status === 'pending' && (
                 <Marker position={[duplicateParent.lat, duplicateParent.lng]} icon={L.divIcon({
                  className: 'custom-pin',
                  html: `<div style="width: 20px; height: 20px; border-radius: 9999px; background-color: #ECE8DF; border: 2px dashed #1F2328;"></div>`,
                  iconSize: [20, 20], iconAnchor: [10, 10],
                 })} />
              )}
            </MapContainer>
          </div>
        </div>

        <div className="bg-paper border border-line p-6">
          <h3 className="font-serif text-lg font-bold mb-4">Operations</h3>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Priority</label>
              <select 
                value={priority || ''} 
                onChange={e => setPriority(e.target.value as IssuePriority)}
                className="w-full bg-surface border border-line p-2 text-sm font-bold focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              {issue.suggested_priority && (
                <p className="text-xs text-ink-muted mt-2">AI Suggests: {issue.suggested_priority}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Department</label>
              <select 
                value={department || ''} 
                onChange={e => setDepartment(e.target.value)}
                className="w-full bg-surface border border-line p-2 text-sm font-bold focus:outline-none"
              >
                <option value="" disabled>Select Dept</option>
                <option value="Roads">Roads</option>
                <option value="Water">Water</option>
                <option value="Electricity">Electricity</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Drainage">Drainage</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mb-6">
            <button onClick={handleSaveFields} disabled={saving} className="text-sm font-bold border border-ink px-4 py-2 hover:bg-ink hover:text-paper">Save Fields</button>
          </div>

          <div className="border-t border-line pt-6">
            <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">Advance Status</label>
            {currentIndex < steps.length - 1 ? (
              <div>
                {/* Show resolved photo upload when about to mark as Resolved */}
                {steps[currentIndex + 1] === 'Resolved' && (
                  <div className="mb-4 border border-line bg-surface p-4">
                    <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">
                      Upload Resolved Photo (Proof of Repair)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleResolvedPhotoUpload}
                      className="w-full text-sm font-bold text-ink file:mr-4 file:py-2 file:px-4 file:border file:border-line file:text-sm file:font-bold file:bg-paper file:text-ink hover:file:bg-inset"
                    />
                    {resolvedPhoto && (
                      <div className="mt-3">
                        <img src={resolvedPhoto} alt="Resolved preview" className="w-full h-32 object-cover border border-line" />
                        <p className="text-xs text-status-resolved font-bold mt-1">Photo ready to attach</p>
                      </div>
                    )}
                  </div>
                )}
                <button 
                  onClick={handleNextStatus} 
                  disabled={saving || !canAdvance().valid}
                  className="w-full bg-brand text-paper py-3 font-bold hover:bg-ink disabled:opacity-50 disabled:hover:bg-brand"
                >
                  {saving ? 'Saving...' : `Mark as ${steps[currentIndex + 1]}`}
                </button>
                {!canAdvance().valid && (
                  <p className="text-xs text-status-reported mt-2 font-bold text-center">{canAdvance().reason}</p>
                )}
              </div>
            ) : (
              <div className="bg-surface border border-line p-3 text-center text-sm font-bold text-status-resolved">
                Issue is Fully Resolved
                {issue.resolved_photo_url && (
                  <div className="mt-3">
                    <img src={issue.resolved_photo_url} alt="Resolved" className="w-full h-32 object-cover border border-line" />
                    <p className="text-xs text-ink-muted mt-1">Repair evidence uploaded</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Audit Log</h3>
          <div className="bg-paper border border-line">
            <ul className="text-sm">
              {issue.history.map((h, i) => (
                <li key={i} className="flex justify-between p-3 border-b border-line last:border-0">
                  <span><span className="font-bold">{h.status}</span> by {h.changed_by}</span>
                  <span className="text-ink-muted text-xs">{new Date(h.changed_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminQueuePage() {
  const { role } = useOutletContext<{ role: Role }>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const loadIssues = () => {
    api.getIssues().then(data => {
      // Sort: priority, then report_count, then age
      data.sort((a, b) => {
        const pa = a.priority ? priorityValue[a.priority] : 0;
        const pb = b.priority ? priorityValue[b.priority] : 0;
        if (pa !== pb) return pb - pa;
        if (a.report_count !== b.report_count) return b.report_count - a.report_count;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setIssues(data);
    });
  };

  useEffect(() => {
    loadIssues();
  }, []);

  if (role !== 'admin') {
    return <div className="p-8 font-bold text-center mt-20 text-xl">Unauthorized Access</div>;
  }

  let filtered = issues;
  if (filterCategory) filtered = filtered.filter(i => i.category === filterCategory);
  if (filterStatus) filtered = filtered.filter(i => i.status === filterStatus);
  if (filterPriority) filtered = filtered.filter(i => (i.priority || '') === filterPriority);

  const openCount = issues.filter(i => i.status === 'Reported').length;
  const progressCount = issues.filter(i => i.status === 'Assigned' || i.status === 'In Progress').length;
  const criticalCount = issues.filter(i => i.priority === 'Critical' && i.status !== 'Resolved').length;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-paper">
      
      {/* Top Metrics Area */}
      <div className="p-4 md:p-8 shrink-0 bg-surface border-b border-line">
        <h1 className="font-serif text-3xl font-bold mb-6">Operations Queue</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Total Reports" value={issues.length} />
          <MetricCard title="New / Open" value={openCount} color={statusColors['Reported']} />
          <MetricCard title="In Progress" value={progressCount} color={statusColors['In Progress']} />
          <MetricCard title="Critical Active" value={criticalCount} color={statusColors['Reported']} />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-line bg-surface flex flex-wrap gap-4 shrink-0 z-10">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-paper border border-line p-2 text-sm focus:outline-none">
          <option value="">All Categories</option>
          {Object.keys(glyphs).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-paper border border-line p-2 text-sm focus:outline-none">
          <option value="">All Statuses</option>
          {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-paper border border-line p-2 text-sm focus:outline-none">
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Queue Table */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="border border-line bg-surface">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-paper">
              <tr>
                <th className="p-4 font-bold border-b border-line whitespace-nowrap text-xs uppercase tracking-widest text-ink-muted">ID</th>
                <th className="p-4 font-bold border-b border-line whitespace-nowrap text-xs uppercase tracking-widest text-ink-muted">Issue</th>
                <th className="p-4 font-bold border-b border-line min-w-[300px] text-xs uppercase tracking-widest text-ink-muted hidden md:table-cell">Description</th>
                <th className="p-4 font-bold border-b border-line whitespace-nowrap text-xs uppercase tracking-widest text-ink-muted">Priority</th>
                <th className="p-4 font-bold border-b border-line whitespace-nowrap text-xs uppercase tracking-widest text-ink-muted">Status</th>
                <th className="p-4 font-bold border-b border-line whitespace-nowrap text-xs uppercase tracking-widest text-ink-muted">Flags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-muted font-bold">No issues match the current filters.</td>
                </tr>
              ) : (
                filtered.map(issue => (
                  <tr 
                    key={issue.id} 
                    className="border-b border-line hover:bg-inset cursor-pointer transition-colors"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <td className="p-4 whitespace-nowrap font-mono text-xs">{issue.id.split('-').pop()}</td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img src={glyphs[issue.category] || glyphs.other} alt="" className="w-5 h-5 opacity-80" />
                        <span className="font-bold capitalize">{issue.category}</span>
                      </div>
                    </td>
                    <td className="p-4 truncate max-w-[300px] hidden md:table-cell text-ink-muted">{issue.description || 'No description'}</td>
                    <td className="p-4 whitespace-nowrap"><PriorityIndicator priority={issue.priority} /></td>
                    <td className="p-4 whitespace-nowrap"><StatusChip status={issue.status} /></td>
                    <td className="p-4 whitespace-nowrap">
                      {issue.duplicate_status === 'pending' && <span className="text-xs bg-status-reported text-paper px-2 py-1 font-bold">Duplicate?</span>}
                      {issue.report_count > 1 && <span className="text-xs border border-line px-2 py-1 ml-1">{issue.report_count} Reports</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlay when panel is open */}
      {selectedIssue && (
        <div 
          className="absolute inset-0 bg-ink/20 z-40"
          onClick={() => setSelectedIssue(null)}
        />
      )}

      {selectedIssue && (
        <AdminIssuePanel 
          issue={issues.find(i => i.id === selectedIssue.id) || selectedIssue} 
          issues={issues}
          onClose={() => setSelectedIssue(null)}
          onUpdate={loadIssues}
        />
      )}
    </div>
  );
}
