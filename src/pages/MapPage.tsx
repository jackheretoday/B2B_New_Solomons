import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api/mockAdapter';
import { Issue, IssueStatus } from '../api/types';
import potholeGlyph from '../assets/glyphs/pothole.svg';
import streetlightGlyph from '../assets/glyphs/streetlight.svg';
import waterLeakGlyph from '../assets/glyphs/water-leak.svg';
import garbageGlyph from '../assets/glyphs/garbage.svg';
import drainageGlyph from '../assets/glyphs/drainage.svg';
import otherGlyph from '../assets/glyphs/other.svg';

import 'leaflet.markercluster';
import 'leaflet.heat';

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

const createCustomIcon = (category: string, status: IssueStatus) => {
  const color = statusColors[status];
  const glyph = glyphs[category] || glyphs.other;
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      width: 30px; height: 30px; 
      border-radius: 9999px; 
      background-color: var(--color-surface, #F5F2EB);
      border: 3px solid ${color};
      display: flex; align-items: center; justify-content: center;
      color: var(--color-ink, #1F2328);
    ">
      <img src="${glyph}" style="width: 16px; height: 16px; display: block;" />
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

function Stepper({ currentStatus }: { currentStatus: IssueStatus, history: any[] }) {
  const steps: IssueStatus[] = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
  const currentIndex = steps.indexOf(currentStatus);
  
  return (
    <div className="flex justify-between items-center relative my-6">
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
  );
}

function IssueMarkers({ issues, setSelectedIssue, showHeatmap }: { issues: Issue[], setSelectedIssue: (i: Issue) => void, showHeatmap: boolean }) {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = (L as any).markerClusterGroup({
        iconCreateFunction: (cluster: any) => {
          return L.divIcon({
            html: `<div style="background: var(--color-surface, #F5F2EB); border: 2px solid var(--color-ink, #1F2328); color: var(--color-ink, #1F2328); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${cluster.getChildCount()}</div>`,
            className: 'custom-cluster',
            iconSize: L.point(30, 30),
          });
        }
      });
      map.addLayer(clusterGroupRef.current);
    }
    
    const cg = clusterGroupRef.current;
    cg.clearLayers();

    if (showHeatmap) {
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
      const points = issues.map(i => [i.lat, i.lng, 1]);
      heatLayerRef.current = (L as any).heatLayer(points, {
        radius: 25,
        gradient: {0.2: 'rgba(166,58,43,0.15)', 0.6: 'rgba(166,58,43,0.45)', 1: 'rgba(166,58,43,0.8)'}
      }).addTo(map);
      map.removeLayer(cg);
    } else {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      if (!map.hasLayer(cg)) map.addLayer(cg);

      const markers = issues.map(issue => {
        const marker = L.marker([issue.lat, issue.lng], {
          icon: createCustomIcon(issue.category, issue.status)
        });
        marker.on('click', () => setSelectedIssue(issue));
        return marker;
      });
      cg.addLayers(markers);
    }

    return () => {
      // cleanup if needed
    };
  }, [issues, map, showHeatmap, setSelectedIssue]);

  return null;
}

export default function MapPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    api.getIssues({ 
      category: filterCategory || undefined, 
      status: (filterStatus as IssueStatus) || undefined 
    }).then(setIssues);
  }, [filterCategory, filterStatus]);

  return (
    <div className="flex-1 flex flex-col md:flex-row relative">
      <div className="bg-surface border-b md:border-b-0 md:border-r border-line p-4 flex flex-col gap-4 md:w-64 shrink-0 z-10">
        <h1 className="font-serif text-lg font-bold">Filters</h1>
        <div>
          <label className="block text-sm text-ink-muted mb-1">Category</label>
          <select 
            className="w-full bg-paper border border-line p-2 focus:outline-none"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All</option>
            {Object.keys(glyphs).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-ink-muted mb-1">Status</label>
          <select 
            className="w-full bg-paper border border-line p-2 focus:outline-none"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
            <span className="text-sm font-bold">Heatmap View</span>
          </label>
        </div>
      </div>

      <div className="flex-1 relative bg-paper overflow-hidden flex flex-col justify-center items-center">
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-50">
          <p className="text-ink-muted">Map tiles could not be loaded. Pins will still appear.</p>
        </div>
        <MapContainer center={[19.0760, 72.8777]} zoom={12} className="w-full h-[50vh] md:h-full z-10" style={{ backgroundColor: 'transparent' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <IssueMarkers issues={issues} setSelectedIssue={setSelectedIssue} showHeatmap={showHeatmap} />
        </MapContainer>

        <div className="absolute top-4 right-4 bg-surface border border-line p-4 z-20 pointer-events-auto">
          <h3 className="font-bold text-sm mb-2">Legend</h3>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-ink-muted mb-1">Status (Ring)</p>
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 border-[2px]" style={{ borderRadius: '9999px', borderColor: color, backgroundColor: 'var(--color-surface)' }}></div>
                <span>{status}</span>
              </div>
            ))}
            <p className="text-xs font-bold text-ink-muted mb-1 mt-2">Category (Glyph)</p>
            {Object.entries(glyphs).map(([cat, src]) => (
              <div key={cat} className="flex items-center gap-2 text-xs">
                <img src={src} className="w-4 h-4" />
                <span>{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedIssue && (
        <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-96 bg-surface border-t md:border-t-0 md:border-l border-line p-6 z-20 overflow-y-auto">
          <button 
            className="text-sm font-bold text-ink underline mb-4 hover:bg-inset p-1 -ml-1 inline-block"
            onClick={() => setSelectedIssue(null)}
          >
            Close
          </button>
          <h2 className="font-serif text-xl mb-2 flex items-center gap-2">
            {selectedIssue.category}
            {selectedIssue.report_count > 1 && (
              <span className="text-sm font-bold bg-inset px-2 py-1">{selectedIssue.report_count} reports</span>
            )}
          </h2>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="px-2 py-1 border border-line flex items-center gap-2">
              <div className="w-[10px] h-[10px]" style={{ backgroundColor: statusColors[selectedIssue.status] }}></div>
              <span className="text-sm">{selectedIssue.status}</span>
            </div>
            <span className="text-sm text-ink-muted">{new Date(selectedIssue.created_at).toLocaleDateString()}</span>
          </div>

          <Stepper currentStatus={selectedIssue.status} history={selectedIssue.history} />

          {selectedIssue.photo_url && (
            <img src={selectedIssue.photo_url} alt="Issue" className="w-full h-48 object-cover border border-line mb-4" />
          )}
          
          <p className="text-ink mb-6">{selectedIssue.description}</p>
          
          <div className="border-t border-line pt-4">
            <h3 className="font-bold mb-2">History</h3>
            <ul className="text-sm space-y-2">
              {selectedIssue.history.map((h, i) => (
                <li key={i} className="flex justify-between border-b border-line pb-2 last:border-0">
                  <span>{h.status} by {h.changed_by}</span>
                  <span className="text-ink-muted">{new Date(h.changed_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
