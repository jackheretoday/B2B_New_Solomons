import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../api/mockAdapter';
import { resizeImage } from '../utils/image';
import { Role } from '../auth';

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
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return position === null ? null : (
    <Marker position={position} icon={icon} draggable={true} eventHandlers={{
      dragend: (e) => setPosition(e.target.getLatLng())
    }} />
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const resized = await resizeImage(e.target.files[0], 1280);
      setPhoto(resized);
    }
  };

  const handleUseLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition(new L.LatLng(pos.coords.latitude, pos.coords.longitude)),
      (_err) => alert('Could not get location')
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
      // Keep on page to show toast, maybe clear form?
      setCategory('');
      setDescription('');
      setPhoto('');
      setPosition(null);
    } else {
      navigate('/my-reports');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 w-full">
      {duplicateNotice && (
        <div className="bg-inset border border-line p-4 mb-6">
          <p className="font-bold text-ink">Possible duplicate of #{duplicateNotice.id}, {duplicateNotice.dist} m away. Your report was saved and sent for review.</p>
        </div>
      )}
      <h1 className="font-serif text-2xl font-bold mb-6">Report an Issue</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-ink font-bold mb-2">Category</label>
          <select 
            className="w-full bg-paper border border-line p-3 focus:outline-none"
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
          >
            <option value="" disabled>Select category</option>
            <option value="pothole">pothole</option>
            <option value="streetlight">streetlight</option>
            <option value="water leak">water leak</option>
            <option value="garbage">garbage</option>
            <option value="drainage">drainage</option>
            <option value="other">other</option>
          </select>
        </div>

        <div>
          <label className="block text-ink font-bold mb-2">Description</label>
          <textarea 
            className="w-full bg-paper border border-line p-3 focus:outline-none min-h-[100px]"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-ink font-bold mb-2">Photo</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={handlePhotoUpload}
            className="block w-full border border-line p-2"
          />
          {photo && <img src={photo} alt="Preview" className="mt-4 border border-line h-48 object-cover" />}
        </div>

        <div>
          <label className="block text-ink font-bold mb-2">Location</label>
          <div className="flex gap-4 mb-2 items-center">
            <button type="button" onClick={handleUseLocation} className="text-sm font-bold text-ink underline hover:bg-inset p-1">Use my location</button>
            {position && <span className="text-sm text-ink-muted">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</span>}
          </div>
          <div className="h-64 border border-line relative z-0">
            <MapContainer center={[19.0760, 72.8777]} zoom={17} className="w-full h-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker position={position} setPosition={setPosition} />
            </MapContainer>
          </div>
          <p className="text-sm text-ink-muted mt-2">Tap the map to drop a pin.</p>
        </div>

        <button 
          type="submit" 
          disabled={!category || !position}
          className="w-full bg-brand text-paper font-bold p-3 disabled:opacity-50 hover:bg-ink disabled:hover:bg-brand"
        >
          Submit Report
        </button>

        <p className="text-xs text-ink-muted text-center max-w-lg mx-auto">
          By submitting you agree to the Terms of Use and Privacy Policy. Your photo and location are visible to the public and to the responsible department.
        </p>
      </form>
    </div>
  );
}
