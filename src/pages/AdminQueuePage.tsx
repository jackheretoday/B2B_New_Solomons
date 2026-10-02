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

function PriorityBar({ priority }: { priority: IssuePriority }) {
  const val = priority ? priorityValue[priority] : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px]">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`w-3 h-3 border border-ink ${i <= val ? 'bg-ink' : 'bg-transparent'}`} />
        ))}
      </div>
      <span className="text-sm">{priority || 'Unset'}</span>
    </div>
  );
}

function StatusChip({ status }: { status: IssueStatus }) {
  return (
    <div className="px-2 py-1 border border-line inline-flex items-center gap-2 bg-paper">
      <div className="w-[10px] h-[10px]" style={{ backgroundColor: statusColors[status] }}></div>
      <span className="text-sm">{status}</span>
    </div>
  );
}

function AdminIssuePanel({ issue, onClose, onUpdate, issues }: { issue: Issue, onClose: () => void, onUpdate: () => void, issues: Issue[] }) {
  const { role } = useOutletContext<{ role: Role }>();
  const [department, setDepartment] = useState(issue.department_id || getDeptForCategory(issue.category));
  const [priority, setPriority] = useState<IssuePriority>(issue.priority || issue.suggested_priority || 'Low');

  const [saving, setSaving] = useState(false);

  const steps: IssueStatus[] = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
  const currentIndex = steps.indexOf(issue.status);

  const handleNextStatus = async () => {
    if (currentIndex >= steps.length - 1) return;
    const nextStatus = steps[currentIndex + 1];
    
    setSaving(true);
    await api.updateIssue(issue.id, { 
      status: nextStatus,
      department_id: department,
      priority: priority
    }, role);
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
      return { valid: false, reason: 'Department is required before assigning.' };
    }
    return { valid: true };
  };

  const advanceCheck = canAdvance();

  const customPin = L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      width: 20px; height: 20px; 
      border-radius: 9999px; 
      background-color: var(--color-surface, #F5F2EB);
      border: 2px solid ${statusColors[issue.status]};
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[600px] bg-surface border-l border-line p-6 z-20 overflow-y-auto flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-2xl font-bold">{issue.id}</h2>
        <button onClick={onClose} className="text-sm font-bold underline hover:bg-inset p-1">Close</button>
      </div>

      {issue.duplicate_status === 'pending' && duplicateParent && (
        <div className="border border-line bg-inset p-4">
          <h3 className="font-bold mb-4">Duplicate Review</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-ink-muted mb-1">Current Report (Child)</p>
              {issue.photo_url ? <img src={issue.photo_url} className="h-24 w-full object-cover border border-line mb-2" /> : <div className="h-24 bg-paper border border-line mb-2"></div>}
              <p className="text-sm">{issue.description}</p>
            </div>
            <div>
              <p className="text-sm text-ink-muted mb-1">Parent Report #{duplicateParent.id}</p>
              {duplicateParent.photo_url ? <img src={duplicateParent.photo_url} className="h-24 w-full object-cover border border-line mb-2" /> : <div className="h-24 bg-paper border border-line mb-2"></div>}
              <p className="text-sm">{duplicateParent.description}</p>
            </div>
          </div>
          <p className="text-sm font-bold mb-4">Distance: {issue.duplicate_distance_m}m</p>
          <div className="flex gap-4">
            <button onClick={() => handleMerge('confirm')} disabled={saving} className="bg-brand text-paper px-4 py-2 font-bold hover:bg-ink">Confirm merge</button>
            <button onClick={() => handleMerge('dismiss')} disabled={saving} className="border border-ink px-4 py-2 font-bold hover:bg-paper">Dismiss</button>
          </div>
        </div>
      )}

      {issue.photo_url && (
        <img src={issue.photo_url} alt="Issue" className="w-full h-48 object-cover border border-line" />
      )}

      <p className="text-ink">{issue.description}</p>
      
      <div className="h-48 border border-line">
        <MapContainer center={[issue.lat, issue.lng]} zoom={16} className="w-full h-full z-0">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold mb-2">Priority</label>
          <select 
            value={priority || ''} 
            onChange={e => setPriority(e.target.value as IssuePriority)}
            className="w-full bg-paper border border-line p-2 mb-1"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          {issue.suggested_priority && (
            <p className="text-xs text-ink-muted">Suggested: {issue.suggested_priority} ({issue.suggested_reason})</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">Department</label>
          <select 
            value={department || ''} 
            onChange={e => setDepartment(e.target.value)}
            className="w-full bg-paper border border-line p-2"
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
      
      <div>
        <button onClick={handleSaveFields} disabled={saving} className="text-sm font-bold underline hover:bg-inset p-1 -ml-1">Save fields</button>
      </div>

      <div className="border-t border-line pt-6">
        <h3 className="font-bold mb-4">Workflow</h3>
        
        <div className="flex justify-between items-center relative mb-6">
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-line -z-10 transform -translate-y-1/2"></div>
          {steps.map((step, idx) => {
            const isCurrent = idx === currentIndex;
            const isPast = idx < currentIndex;
            return (
              <div key={step} className="flex flex-col items-center bg-surface px-2">
                <div 
                  className={`w-3 h-3 border mb-2 ${isCurrent ? '' : (isPast ? 'bg-line border-line' : 'bg-surface border-line')}`}
                  style={isCurrent ? { backgroundColor: statusColors[step], borderColor: statusColors[step] } : {}}
                ></div>
                <span className="text-xs text-ink-muted">{step}</span>
              </div>
            );
          })}
        </div>

        {currentIndex < steps.length - 1 && (
          <div>
            <button 
              onClick={handleNextStatus} 
              disabled={saving || !advanceCheck.valid}
              className="bg-brand text-paper px-4 py-2 font-bold hover:bg-ink disabled:opacity-50 disabled:hover:bg-brand"
            >
              Move to {steps[currentIndex + 1]}
            </button>
            {!advanceCheck.valid && (
              <p className="text-sm text-status-reported mt-2 font-bold">{advanceCheck.reason}</p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-line pt-6">
        <h3 className="font-bold mb-4">History</h3>
        <ul className="text-sm space-y-2">
          {issue.history.map((h, i) => (
            <li key={i} className="flex justify-between border-b border-line pb-2 last:border-0">
              <span>{h.status} by {h.changed_by}</span>
              <span className="text-ink-muted">{new Date(h.changed_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
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
    return <div className="p-8 font-bold">Unauthorized</div>;
  }

  let filtered = issues;
  if (filterCategory) filtered = filtered.filter(i => i.category === filterCategory);
  if (filterStatus) filtered = filtered.filter(i => i.status === filterStatus);
  if (filterPriority) filtered = filtered.filter(i => (i.priority || '') === filterPriority);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div className="p-4 border-b border-line bg-surface flex gap-4 shrink-0 overflow-x-auto">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-paper border border-line p-2">
          <option value="">All Categories</option>
          {Object.keys(glyphs).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-paper border border-line p-2">
          <option value="">All Statuses</option>
          {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-paper border border-line p-2">
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface sticky top-0 border-b border-line z-10">
            <tr>
              <th className="p-3 font-bold border-b border-line whitespace-nowrap">ID</th>
              <th className="p-3 font-bold border-b border-line whitespace-nowrap">Category</th>
              <th className="p-3 font-bold border-b border-line min-w-[200px]">Description</th>
              <th className="p-3 font-bold border-b border-line whitespace-nowrap">Location</th>
              <th className="p-3 font-bold border-b border-line whitespace-nowrap">Priority</th>
              <th className="p-3 font-bold border-b border-line whitespace-nowrap">Department</th>
              <th className="p-3 font-bold border-b border-line whitespace-nowrap">Status</th>
              <th className="p-3 font-bold border-b border-line whitespace-nowrap">Reports</th>
              <th className="p-3 font-bold border-b border-line whitespace-nowrap">Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(issue => (
              <tr 
                key={issue.id} 
                className="border-b border-line hover:bg-inset cursor-pointer"
                onClick={() => setSelectedIssue(issue)}
              >
                <td className="p-3 whitespace-nowrap font-serif">{issue.id}</td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <img src={glyphs[issue.category] || glyphs.other} alt="" className="w-4 h-4" />
                    <span>{issue.category}</span>
                  </div>
                </td>
                <td className="p-3 truncate max-w-[200px]">{issue.description}</td>
                <td className="p-3 whitespace-nowrap tabular-nums">{issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}</td>
                <td className="p-3 whitespace-nowrap"><PriorityBar priority={issue.priority} /></td>
                <td className="p-3 whitespace-nowrap">{issue.department_id || '-'}</td>
                <td className="p-3 whitespace-nowrap"><StatusChip status={issue.status} /></td>
                <td className="p-3 whitespace-nowrap tabular-nums">{issue.report_count}</td>
                <td className="p-3 whitespace-nowrap">
                  {issue.duplicate_status === 'pending' && <span className="text-status-reported font-bold">Possible duplicate</span>}
                  {issue.duplicate_status === 'confirmed' && <span className="text-ink-muted">Merged</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
