import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { api } from '../api/mockAdapter';
import { resizeImage } from '../utils/image';
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

function LocationPicker({ position, setPosition }: { position: L.LatLng | null, setPosition: (p: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      width: 30px; height: 30px; 
      border-radius: 9999px; 
      background-color: var(--color-surface, #F5F2EB);
      border: 3px solid var(--color-ink, #1F2328);
      position: relative;
    ">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background-color: var(--color-ink, #1F2328); border-radius: 9999px;"></div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return position === null ? null : (
    <Marker position={position} icon={icon} draggable={true} eventHandlers={{
      dragend: (e) => setPosition(e.target.getLatLng())
    }} />
  );
}

function Section({ num, title, children }: { num: string, title: string, children: React.ReactNode }) {
  return (
    <div className="border border-line bg-surface p-6 md:p-8 mb-6 relative">
      <div className="absolute top-0 left-0 bg-brand text-paper text-xs font-bold px-2 py-1 tracking-widest">{num}</div>
      <h2 className="font-serif text-2xl font-bold mb-6 mt-2 tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

export default function ReportPage() {
  const navigate = useNavigate();
  const { role } = useOutletContext<{ role: Role }>();
  
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState('');
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<{ id: string, dist: number } | null>(null);
  
  // AI Simulation State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<{ detected: string, confidence: number, severity: string } | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const resized = await resizeImage(e.target.files[0], 1280);
      setPhoto(resized);
      
      // Simulate AI analysis
      setIsAnalyzing(true);
      setDetectionResult(null);
      setTimeout(() => {
        setIsAnalyzing(false);
        if (category) {
          setDetectionResult({ detected: category, confidence: 92, severity: 'High' });
        } else {
          setDetectionResult({ detected: 'Pothole', confidence: 88, severity: 'Medium' });
          setCategory('pothole');
        }
      }, 1500);
    }
  };

  const handleUseLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition(new L.LatLng(pos.coords.latitude, pos.coords.longitude)),
      (_err) => alert('Could not get location. Please select on map.')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !position) return;

    const issue = await api.createIssue({
      user_id: role,
      category,
      description,
      lat: position.lat,
      lng: position.lng,
      photo_url: photo,
    });

    if (issue.duplicate_status === 'pending' && issue.duplicate_of && issue.duplicate_distance_m !== undefined) {
      setDuplicateNotice({ id: issue.duplicate_of, dist: issue.duplicate_distance_m });
      setCategory('');
      setDescription('');
      setPhoto('');
      setPosition(null);
      setDetectionResult(null);
      window.scrollTo(0, 0);
    } else {
      navigate('/my-reports');
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-8">
      {duplicateNotice && (
        <div className="bg-inset border-2 border-brand p-6 mb-8 flex flex-col items-center text-center">
          <p className="font-bold text-ink mb-2">Possible duplicate detected</p>
          <p className="text-sm text-ink-muted mb-4">Your report appears to be a duplicate of #{duplicateNotice.id} ({duplicateNotice.dist}m away). It has been saved and sent to an administrator for review.</p>
          <Link to="/my-reports" className="font-bold underline text-brand">View My Reports</Link>
        </div>
      )}

      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight mb-3">Report an Issue</h1>
        <p className="text-ink-muted">Help us improve the city by reporting infrastructure problems.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        <Section num="01" title="What is the issue?">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.keys(glyphs).map(cat => (
              <label 
                key={cat} 
                className={`
                  border p-4 cursor-pointer flex flex-col items-center gap-3 transition-none
                  ${category === cat ? 'border-brand bg-paper font-bold' : 'border-line hover:bg-inset'}
                `}
              >
                <input 
                  type="radio" 
                  name="category" 
                  value={cat} 
                  checked={category === cat}
                  onChange={(e) => setCategory(e.target.value)}
                  className="hidden"
                />
                <img src={glyphs[cat]} className="w-8 h-8" alt="" style={{ opacity: category === cat ? 1 : 0.6 }} />
                <span className="text-sm capitalize">{cat}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section num="02" title="Where is it located?">
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-start md:items-center justify-between border border-line bg-paper p-4">
            <div>
              <p className="font-bold text-sm">Pinpoint the location on the map.</p>
              <p className="text-xs text-ink-muted">Tap on the map to place a pin, or use your current GPS location.</p>
            </div>
            <button 
              type="button" 
              onClick={handleUseLocation} 
              className="text-xs font-bold border border-ink px-3 py-2 hover:bg-ink hover:text-paper uppercase tracking-wider shrink-0"
            >
              Use My Location
            </button>
          </div>
          
          <div className="h-80 border border-line relative z-0">
            <MapContainer center={[19.0760, 72.8777]} zoom={13} className="w-full h-full" zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <LocationPicker position={position} setPosition={setPosition} />
            </MapContainer>
          </div>
          {position && (
            <div className="mt-3 text-sm font-mono text-ink-muted bg-paper border border-line p-2 inline-block">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </div>
          )}
        </Section>

        <Section num="03" title="Provide evidence">
          <p className="text-sm text-ink-muted mb-4">A clear photo helps the administration verify and prioritize the issue.</p>
          
          <label className={`
            block w-full border-2 border-dashed p-8 text-center cursor-pointer mb-6
            ${photo ? 'border-brand bg-paper' : 'border-line hover:bg-inset'}
          `}>
            <input 
              type="file" 
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {photo ? (
              <span className="font-bold text-brand">Change Photo</span>
            ) : (
              <span className="font-bold">Click or tap to upload photo</span>
            )}
          </label>

          {photo && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2 shrink-0 border border-line p-1 bg-paper">
                <img src={photo} alt="Preview" className="w-full h-48 object-cover border border-line" />
              </div>
              
              <div className="w-full md:w-1/2 flex flex-col justify-center border border-line p-4 bg-paper">
                <p className="text-xs font-bold text-ink-muted tracking-wider uppercase mb-4 border-b border-line pb-2">AI Analysis Placeholder</p>
                {isAnalyzing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-line border-t-brand rounded-full animate-spin"></div>
                    <span className="text-sm font-bold text-brand">Analyzing image...</span>
                  </div>
                ) : detectionResult ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-ink-muted mb-1">Detected Issue</p>
                      <p className="font-bold capitalize">{detectionResult.detected}</p>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-ink-muted mb-1">Confidence</p>
                        <p className="font-mono">{detectionResult.confidence}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-muted mb-1">Est. Severity</p>
                        <p className="font-bold text-status-reported">{detectionResult.severity}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </Section>

        <Section num="04" title="Additional details">
          <label className="block text-sm font-bold mb-2">Description <span className="text-ink-muted font-normal">(Optional)</span></label>
          <textarea 
            className="w-full bg-paper border border-line p-4 focus:outline-none focus:border-brand min-h-[120px]"
            placeholder="Provide any additional details that might help locate or understand the problem..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Section>

        <Section num="05" title="Review & Submit">
          <div className="bg-paper border border-line p-6 mb-8 text-sm">
            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-line">
              <div>
                <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Category</p>
                <p className="font-bold capitalize">{category || 'Not selected'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Location</p>
                <p className="font-bold">{position ? 'Pinned on map' : 'Not selected'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Evidence</p>
              <p className="font-bold">{photo ? 'Photo attached' : 'None provided'}</p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!category || !position}
            className="w-full bg-brand text-paper font-bold text-lg p-4 disabled:opacity-50 hover:bg-ink disabled:hover:bg-brand transition-none"
          >
            Submit Report
          </button>

          <p className="text-xs text-ink-muted text-center mt-4">
            By submitting, you agree to the FixMeraMarg Terms of Use and Privacy Policy.<br />
            Your report and location will be publicly visible.
          </p>
        </Section>
      </form>
    </div>
  );
}
