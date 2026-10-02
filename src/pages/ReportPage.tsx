import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { api } from '../api/mockAdapter';
import { resizeImage } from '../utils/image';
import { Role } from '../auth';
import { detectPothole, checkModelHealth, DetectionResult } from '../utils/aiDetection';

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

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function LocationPicker({ position, setPosition }: { position: L.LatLng | null; setPosition: (p: L.LatLng) => void }) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      width: 30px; height: 30px; 
      border-radius: 9999px; 
      background-color: var(--color-surface, #F5F2EB);
      border: 3px solid var(--color-ink, #1F2328);
      position: relative;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background-color: var(--color-brand, #A63A2B); border-radius: 9999px;"></div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return position === null ? null : (
    <Marker
      position={position}
      icon={icon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => setPosition(e.target.getLatLng()),
      }}
    />
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
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
  const [annotatedPhoto, setAnnotatedPhoto] = useState('');
  const [showAnnotated, setShowAnnotated] = useState(true);
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<{ id: string; dist: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // AI YOLO Detection State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkModelHealth()
      .then((healthy) => setIsServerOnline(healthy))
      .catch(() => setIsServerOnline(false));
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const resized = await resizeImage(e.target.files[0], 1280);
      setPhoto(resized);
      setAnnotatedPhoto('');
      setDetectionResult(null);
      setAnalysisError(null);

      // Trigger real YOLO detection via backend
      setIsAnalyzing(true);
      try {
        const result = await detectPothole(resized);
        setDetectionResult(result);
        if (result.annotated_image) {
          setAnnotatedPhoto(result.annotated_image);
        }

        if (result.is_real_report) {
          setCategory('pothole');
        }
      } catch (err: any) {
        setAnalysisError(
          err.message || 'Detection service unavailable. Ensure the YOLO model server is running on port 8000.'
        );
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setPosition(new L.LatLng(19.0760, 72.8777));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition(new L.LatLng(pos.coords.latitude, pos.coords.longitude)),
      (_err) => {
        setPosition(new L.LatLng(19.0760, 72.8777));
        alert('Could not detect GPS. Placed pin at Mumbai center. Drag to reposition if needed.');
      }
    );
  };

  const handleUseMumbaiCenter = () => {
    setPosition(new L.LatLng(19.0760, 72.8777));
  };

  // Validation rules:
  // If reporting category is 'pothole', requires AI verification (or valid detection).
  const isPotholeCategory = category === 'pothole';
  const isPotholeVerified = detectionResult?.is_real_report === true;
  const isPotholeFailed = isPotholeCategory && photo && detectionResult && !detectionResult.is_real_report;

  const canSubmit =
    Boolean(category) &&
    Boolean(position) &&
    !isAnalyzing &&
    !isSubmitting &&
    (!isPotholeCategory || !photo || isPotholeVerified || Boolean(analysisError));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!category) {
      alert('Please select an issue category in Step 01.');
      return;
    }

    if (!position) {
      alert('Please select or pin a location on the map in Step 02.');
      return;
    }

    if (isPotholeCategory && photo && detectionResult && !detectionResult.is_real_report) {
      alert('Cannot register report: The AI model detected no pothole in this photo. Please upload valid evidence.');
      return;
    }

    setIsSubmitting(true);
    try {
      const issue = await api.createIssue({
        user_id: role,
        category,
        description,
        lat: position.lat,
        lng: position.lng,
        photo_url: (showAnnotated && annotatedPhoto) ? annotatedPhoto : photo,
        ai_verified: detectionResult ? detectionResult.is_real_report : undefined,
        ai_confidence: detectionResult ? detectionResult.confidence : undefined,
        ai_detection_count: detectionResult ? detectionResult.pothole_count : undefined,
        ai_annotated_url: annotatedPhoto || undefined,
      });

      if (issue.duplicate_status === 'pending' && issue.duplicate_of && issue.duplicate_distance_m !== undefined) {
        setDuplicateNotice({ id: issue.duplicate_of, dist: issue.duplicate_distance_m });
        setCategory('');
        setDescription('');
        setPhoto('');
        setAnnotatedPhoto('');
        setPosition(null);
        setDetectionResult(null);
        window.scrollTo(0, 0);
      } else {
        navigate('/my-reports');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setSubmitError(err?.message || 'Failed to submit issue. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-8">
      {duplicateNotice && (
        <div className="bg-inset border-2 border-brand p-6 mb-8 flex flex-col items-center text-center">
          <p className="font-bold text-ink mb-2">Possible duplicate detected</p>
          <p className="text-sm text-ink-muted mb-4">
            Your report appears to be a duplicate of #{duplicateNotice.id} ({duplicateNotice.dist}m away). It has been saved and sent to an administrator for review.
          </p>
          <Link to="/my-reports" className="font-bold underline text-brand">
            View My Reports
          </Link>
        </div>
      )}

      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold tracking-tight mb-3">Report an Issue</h1>
        <p className="text-ink-muted">
          Help us improve the city by reporting infrastructure problems. Photos are verified by our YOLO AI model before registration.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-surface border border-line text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isServerOnline ? 'var(--color-status-resolved, #2F6B45)' : 'var(--color-status-assigned, #9A6A12)' }}
          ></span>
          <span className="font-bold text-ink-muted">
            {isServerOnline ? 'YOLOv11 Detection Model Active' : 'YOLO Model Service Ready (Port 8000)'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Section num="01" title="What is the issue?">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.keys(glyphs).map((cat) => (
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
          <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center justify-between border border-line bg-paper p-4">
            <div>
              <p className="font-bold text-sm">Pinpoint the location on the map.</p>
              <p className="text-xs text-ink-muted">Tap on the map to place a pin, or choose an option below.</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={handleUseLocation}
                className="text-xs font-bold border border-ink px-3 py-2 hover:bg-ink hover:text-paper uppercase tracking-wider cursor-pointer"
              >
                Use My GPS
              </button>
              <button
                type="button"
                onClick={handleUseMumbaiCenter}
                className="text-xs font-bold border border-brand bg-paper text-brand px-3 py-2 hover:bg-brand hover:text-paper uppercase tracking-wider cursor-pointer"
              >
                📍 Mumbai Center
              </button>
            </div>
          </div>

          <div className="h-80 border border-line relative z-0">
            <MapContainer center={[19.076, 72.8777]} zoom={13} className="w-full h-full" zoomControl={true}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <MapResizer />
              <LocationPicker position={position} setPosition={setPosition} />
            </MapContainer>
          </div>
          {position ? (
            <div className="mt-3 text-sm font-mono text-ink-muted bg-paper border border-line p-2 inline-block">
              📍 Pinned: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </div>
          ) : (
            <div className="mt-3 text-xs text-status-reported font-bold">
              * Tap anywhere on the map or click "Mumbai Center" to set location.
            </div>
          )}
        </Section>

        <Section num="03" title="Provide evidence & AI verification">
          <p className="text-sm text-ink-muted mb-4">
            Upload a photo of the issue. The trained YOLOv11 model will automatically run detection, classify whether a pothole is present, and verify real reports.
          </p>

          <label
            className={`
            block w-full border-2 border-dashed p-8 text-center cursor-pointer mb-6
            ${photo ? 'border-brand bg-paper' : 'border-line hover:bg-inset'}
          `}
          >
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            {photo ? (
              <span className="font-bold text-brand">Change Photo</span>
            ) : (
              <span className="font-bold">Click or tap to upload photo</span>
            )}
          </label>

          {photo && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/2 shrink-0 border border-line p-1 bg-paper flex flex-col">
                  <div className="flex justify-between items-center px-2 py-1 border-b border-line mb-1 text-xs">
                    <span className="font-bold text-ink-muted">
                      {showAnnotated && annotatedPhoto ? 'YOLO Model Detection' : 'Original Photo'}
                    </span>
                    {annotatedPhoto && (
                      <button
                        type="button"
                        onClick={() => setShowAnnotated(!showAnnotated)}
                        className="font-bold text-brand hover:underline"
                      >
                        {showAnnotated ? 'View Original' : 'View AI Bounding Boxes'}
                      </button>
                    )}
                  </div>
                  <img
                    src={showAnnotated && annotatedPhoto ? annotatedPhoto : photo}
                    alt="Preview"
                    className="w-full h-56 object-contain border border-line bg-inset"
                  />
                </div>

                <div className="w-full md:w-1/2 flex flex-col justify-between border border-line p-5 bg-paper">
                  <div>
                    <div className="flex items-center justify-between border-b border-line pb-2 mb-4">
                      <p className="text-xs font-bold text-ink-muted tracking-wider uppercase">
                        YOLOv11 AI Verification
                      </p>
                      {detectionResult && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 border ${
                            detectionResult.is_real_report
                              ? 'border-status-resolved text-status-resolved bg-surface'
                              : 'border-status-reported text-status-reported bg-surface'
                          }`}
                        >
                          {detectionResult.is_real_report ? 'REAL REPORT VERIFIED' : 'UNVERIFIED / NO DAMAGE'}
                        </span>
                      )}
                    </div>

                    {isAnalyzing ? (
                      <div className="py-6 flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-line border-t-brand rounded-full animate-spin"></div>
                        <span className="text-sm font-bold text-brand">Running YOLOv11 detection on photo...</span>
                        <span className="text-xs text-ink-muted">Analyzing road surface and damage patterns</span>
                      </div>
                    ) : detectionResult ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-ink-muted mb-1">Detection Status</p>
                          <p className="font-bold text-base">
                            {detectionResult.is_pothole_detected
                              ? `Pothole Detected (${detectionResult.pothole_count} instance${detectionResult.pothole_count > 1 ? 's' : ''})`
                              : 'No Pothole Detected'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-line">
                          <div>
                            <p className="text-xs text-ink-muted mb-1">Confidence</p>
                            <p className="font-mono font-bold text-lg">{detectionResult.confidence}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-ink-muted mb-1">Est. Severity</p>
                            <p className="font-bold text-base text-status-reported">{detectionResult.severity}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-inset text-xs border border-line">
                          <p className="text-ink">{detectionResult.message}</p>
                        </div>
                      </div>
                    ) : analysisError ? (
                      <div className="p-3 bg-inset text-xs border border-line text-ink">
                        <p className="font-bold text-status-assigned mb-1">AI Service Offline</p>
                        <p>{analysisError}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {isPotholeFailed && (
                <div className="border border-status-reported bg-surface p-4 text-xs">
                  <p className="font-bold text-status-reported mb-1">Verification Required</p>
                  <p className="text-ink-muted">
                    The model did not find a pothole in this photo. Only verified road damage reports can be registered under the Pothole category. Please upload a clear photo showing the road damage.
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>

        <Section num="04" title="Additional details">
          <label className="block text-sm font-bold mb-2">
            Description <span className="text-ink-muted font-normal">(Optional)</span>
          </label>
          <textarea
            className="w-full bg-paper border border-line p-4 focus:outline-none focus:border-brand min-h-[120px]"
            placeholder="Provide any additional details that might help locate or understand the problem..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">Evidence</p>
                <p className="font-bold">{photo ? 'Photo attached' : 'None provided'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">AI Status</p>
                <p className="font-bold">
                  {detectionResult
                    ? detectionResult.is_real_report
                      ? `Verified (${detectionResult.confidence}%)`
                      : 'Unverified / No pothole'
                    : photo
                    ? 'Processing'
                    : 'Awaiting photo'}
                </p>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="mb-6 p-4 bg-paper border-2 border-status-reported text-status-reported text-sm font-bold">
              ⚠️ {submitError}
            </div>
          )}

          {!category && (
            <p className="text-xs text-status-reported font-bold mb-3">
              * Step 01: Please select an issue category above.
            </p>
          )}
          {!position && (
            <p className="text-xs text-status-reported font-bold mb-3">
              * Step 02: Please select or pin a location on the map.
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-brand text-paper font-bold text-lg p-4 disabled:opacity-50 hover:bg-ink disabled:hover:bg-brand transition-none cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-paper border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting Report to Supabase...</span>
              </>
            ) : isAnalyzing ? (
              'Analyzing Photo with YOLO AI...'
            ) : isPotholeFailed ? (
              'Upload Valid Pothole Photo to Submit'
            ) : !category ? (
              'Select Issue Category to Submit'
            ) : !position ? (
              'Pin Location on Map to Submit'
            ) : (
              'Submit Report'
            )}
          </button>

          <p className="text-xs text-ink-muted text-center mt-4">
            By submitting, you agree to the FixMeraMarg Terms of Use and Privacy Policy.
            <br />
            Your report and location will be publicly visible.
          </p>
        </Section>
      </form>
    </div>
  );
}
