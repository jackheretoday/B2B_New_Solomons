import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
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

const createCustomIcon = (category: string, status: IssueStatus, isSelected: boolean) => {
  const color = statusColors[status];
  const glyph = glyphs[category] || glyphs.other;
  const size = isSelected ? 40 : 32;
  const zIndex = isSelected ? 1000 : 1;
  const outline = isSelected ? `box-shadow: 0 0 0 4px var(--color-paper, #ECE8DF), 0 0 0 6px ${color};` : '';

  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      width: ${size}px; height: ${size}px; 
      border-radius: 9999px; 
      background-color: var(--color-surface, #F5F2EB);
      border: 3px solid ${color};
      display: flex; align-items: center; justify-content: center;
      color: var(--color-ink, #1F2328);
      transition: all 0.2s ease-out;
      ${outline}
      z-index: ${zIndex};
    ">
      <img src="${glyph}" style="width: ${isSelected ? 20 : 16}px; height: ${isSelected ? 20 : 16}px; display: block;" />
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function Stepper({ currentStatus }: { currentStatus: IssueStatus }) {
  const steps: IssueStatus[] = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <div className="flex justify-between items-center relative my-8">
      <div className="absolute top-2.5 left-0 right-0 h-[2px] bg-line -z-10"></div>
      {steps.map((step, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = idx < currentIndex;

        return (
          <div key={step} className="flex flex-col items-center bg-surface px-1">
            <div
              className={`w-5 h-5 border-[3px] rounded-full mb-2 bg-surface`}
              style={(isCurrent || isPast) ? { borderColor: statusColors[step] } : { borderColor: 'var(--color-line)' }}
            >
              {(isCurrent || isPast) && (
                <div className="w-full h-full rounded-full border-2 border-surface" style={{ backgroundColor: statusColors[step] }}></div>
              )}
            </div>
            <span className={`text-xs font-bold ${isCurrent ? 'text-ink' : 'text-ink-muted'}`}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}

function IssueMarkers({ issues, selectedIssue, setSelectedIssue, showHeatmap }: { issues: Issue[], selectedIssue: Issue | null, setSelectedIssue: (i: Issue) => void, showHeatmap: boolean }) {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const markersMap = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = (L as any).markerClusterGroup({
        maxClusterRadius: 40,
        iconCreateFunction: (cluster: any) => {
          return L.divIcon({
            html: `<div style="background: var(--color-surface, #F5F2EB); border: 2px solid var(--color-ink, #1F2328); color: var(--color-ink, #1F2328); width: 36px; height: 36px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: 'Public Sans', sans-serif;">${cluster.getChildCount()}</div>`,
            className: 'custom-cluster',
            iconSize: L.point(36, 36),
          });
        }
      });
      map.addLayer(clusterGroupRef.current);
    }

    const cg = clusterGroupRef.current;
    cg.clearLayers();
    markersMap.current = {};

    if (showHeatmap) {
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
      const points = issues.map(i => [i.lat, i.lng, 1]);
      heatLayerRef.current = (L as any).heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.4: 'rgba(166,58,43,0.2)', 0.6: 'rgba(166,58,43,0.5)', 0.8: 'rgba(166,58,43,0.8)', 1: '#A63A2B' }
      }).addTo(map);
      map.removeLayer(cg);
    } else {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      if (!map.hasLayer(cg)) map.addLayer(cg);

      const markers = issues.map(issue => {
        const isSelected = selectedIssue?.id === issue.id;
        const marker = L.marker([issue.lat, issue.lng], {
          icon: createCustomIcon(issue.category, issue.status, isSelected),
          zIndexOffset: isSelected ? 1000 : 0
        });
        marker.on('click', () => {
          setSelectedIssue(issue);
          map.setView([issue.lat, issue.lng], map.getZoom(), { animate: true });
        });
        markersMap.current[issue.id] = marker;
        return marker;
      });
      cg.addLayers(markers);
    }

    return () => { };
  }, [issues, map, showHeatmap, selectedIssue, setSelectedIssue]);

  return null;
}

export default function MapPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mobile sidebar toggle
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.getIssues({
      category: filterCategory || undefined,
      status: (filterStatus as IssueStatus) || undefined
    }).then(data => {
      // Filter by search query if present
      let filtered = data;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = data.filter(i =>
          i.id.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
        );
      }
      setIssues(filtered);
      setIsLoading(false);
    });
  }, [filterCategory, filterStatus, searchQuery]);

  return (
    <div className="flex-1 flex flex-col md:flex-row relative bg-paper h-full overflow-hidden">

      {/* Mobile Filter Toggle & Search Bar Overlay */}
      <div className="absolute top-4 left-4 right-4 md:left-[280px] lg:left-[340px] flex items-center gap-2 z-[400] pointer-events-none">
        <button
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          className="md:hidden bg-brand text-paper p-3 border border-brand font-bold pointer-events-auto shadow-sm"
        >
          Filters
        </button>
        <div className="flex-1 max-w-md bg-surface border border-line flex items-center pointer-events-auto shadow-sm">
          <input
            type="text"
            placeholder="Search location, ID, or issue..."
            className="w-full bg-transparent p-3 text-sm focus:outline-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Sidebar - Filters */}
      <div className={`
        ${showFiltersMobile ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-200 ease-in-out
        absolute md:relative top-0 left-0 bottom-0 z-[500] md:z-10 
        w-3/4 md:w-64 lg:w-[320px] bg-surface border-r border-line p-6 flex flex-col gap-6 shrink-0 h-full overflow-y-auto
      `}>
        <div className="flex justify-between items-center md:hidden">
          <h1 className="font-serif text-xl font-bold">Filters</h1>
          <button onClick={() => setShowFiltersMobile(false)} className="text-xl font-bold">&times;</button>
        </div>

        <h1 className="font-serif text-xl font-bold hidden md:block tracking-wide">Explore Issues</h1>

        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-xs font-bold text-ink-muted mb-2 uppercase tracking-wider">Category</label>
            <div className="space-y-1">
              <button
                onClick={() => setFilterCategory('')}
                className={`w-full text-left p-2 border flex items-center justify-between text-sm ${filterCategory === '' ? 'border-brand bg-paper font-bold' : 'border-transparent hover:bg-inset text-ink-muted'}`}
              >
                All Categories
              </button>
              {Object.keys(glyphs).map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`w-full text-left p-2 border flex items-center gap-3 text-sm capitalize ${filterCategory === c ? 'border-brand bg-paper font-bold' : 'border-transparent hover:bg-inset text-ink-muted'}`}
                >
                  <img src={glyphs[c]} className="w-4 h-4 opacity-70" alt="" />
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-line"></div>

          <div>
            <label className="block text-xs font-bold text-ink-muted mb-2 uppercase tracking-wider">Status</label>
            <div className="space-y-1">
              <button
                onClick={() => setFilterStatus('')}
                className={`w-full text-left p-2 border flex items-center justify-between text-sm ${filterStatus === '' ? 'border-brand bg-paper font-bold' : 'border-transparent hover:bg-inset text-ink-muted'}`}
              >
                All Statuses
              </button>
              {Object.keys(statusColors).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`w-full text-left p-2 border flex items-center gap-3 text-sm ${filterStatus === s ? 'border-brand bg-paper font-bold' : 'border-transparent hover:bg-inset text-ink-muted'}`}
                >
                  <div className="w-3 h-3 border-[2px]" style={{ borderRadius: '9999px', borderColor: statusColors[s as IssueStatus], backgroundColor: 'var(--color-surface)' }}></div>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-line"></div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 border flex items-center justify-center ${showHeatmap ? 'bg-brand border-brand' : 'bg-paper border-line group-hover:border-ink'}`}>
              {showHeatmap && <div className="w-2.5 h-2.5 bg-paper"></div>}
            </div>
            <input type="checkbox" className="hidden" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
            <span className="text-sm font-bold text-ink">Enable Heatmap View</span>
          </label>
        </div>

        <div className="pt-4 border-t border-line">
          <Link to="/report" className="block w-full text-center bg-brand text-paper font-bold py-3 hover:bg-ink transition-none">
            + Report New Issue
          </Link>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showFiltersMobile && (
        <div
          className="absolute inset-0 bg-ink/20 z-[450] md:hidden"
          onClick={() => setShowFiltersMobile(false)}
        />
      )}

      {/* Map Area */}
      <div className="flex-1 relative bg-[#e5e3df] overflow-hidden flex flex-col justify-center items-center z-0">
        {isLoading && (
          <div className="absolute inset-0 z-[400] bg-paper/50 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-4 border-line border-t-brand rounded-full animate-spin"></div>
            <p className="mt-4 font-bold text-brand">Loading map data...</p>
          </div>
        )}

        <MapContainer center={[19.0760, 72.8777]} zoom={13} className="w-full h-full z-10" style={{ backgroundColor: 'transparent' }} zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <IssueMarkers issues={issues} selectedIssue={selectedIssue} setSelectedIssue={setSelectedIssue} showHeatmap={showHeatmap} />
        </MapContainer>
      </div>

      {/* Issue Detail Panel */}
      {selectedIssue && (
        <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[400px] bg-surface md:border-l border-t md:border-t-0 border-line z-[600] flex flex-col h-[60vh] md:h-full shadow-2xl transition-transform duration-300 transform translate-y-0">
          <div className="p-4 border-b border-line flex justify-between items-center bg-paper sticky top-0">
            <span className="text-xs font-bold text-ink-muted tracking-widest uppercase">Issue Details</span>
            <button
              className="w-8 h-8 flex items-center justify-center border border-line hover:bg-inset font-bold"
              onClick={() => setSelectedIssue(null)}
              aria-label="Close panel"
            >
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src={glyphs[selectedIssue.category] || glyphs.other} className="w-6 h-6" alt="" />
                <h2 className="font-serif text-3xl font-bold capitalize leading-none tracking-tight">{selectedIssue.category}</h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className="px-2 py-1 border border-line flex items-center gap-2 bg-paper">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColors[selectedIssue.status] }}></div>
                  <span className="text-sm font-bold">{selectedIssue.status}</span>
                </div>
                {selectedIssue.priority && (
                  <div className="px-2 py-1 border border-line bg-paper text-sm font-bold flex items-center gap-1">
                    <span className="text-ink-muted">Priority:</span>
                    <span className={selectedIssue.priority === 'Critical' ? 'text-status-reported' : ''}>{selectedIssue.priority}</span>
                  </div>
                )}
                <div className="px-2 py-1 border border-line bg-paper text-sm font-bold text-ink-muted">
                  ID: {selectedIssue.id.split('-').pop()}
                </div>
              </div>

              <p className="text-sm text-ink-muted font-bold tracking-wide">REPORTED ON {new Date(selectedIssue.created_at).toLocaleDateString().toUpperCase()}</p>
            </div>

            {selectedIssue.photo_url ? (
              <div className="border border-line bg-inset p-1">
                <img src={selectedIssue.photo_url} alt="Evidence" className="w-full h-48 object-cover border border-line" />
              </div>
            ) : (
              <div className="w-full h-32 border border-line bg-paper flex items-center justify-center text-ink-muted text-sm font-bold italic">
                No visual evidence provided
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Description</h3>
              <p className="text-ink leading-relaxed text-sm bg-paper p-4 border border-line">{selectedIssue.description}</p>
            </div>

            <div>
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-4">Status Timeline</h3>
              <div className="bg-paper border border-line p-4">
                <Stepper currentStatus={selectedIssue.status} />
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-4">Location Details</h3>
              <div className="text-sm grid grid-cols-2 gap-4">
                <div>
                  <p className="text-ink-muted mb-1">Latitude</p>
                  <p className="font-bold font-mono">{selectedIssue.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-ink-muted mb-1">Longitude</p>
                  <p className="font-bold font-mono">{selectedIssue.lng.toFixed(6)}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 pb-8">
              <Link to={`/report?duplicate=${selectedIssue.id}`} className="block w-full text-center border-2 border-brand text-brand font-bold py-3 hover:bg-brand hover:text-paper transition-none">
                Report Similar Issue Here
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
