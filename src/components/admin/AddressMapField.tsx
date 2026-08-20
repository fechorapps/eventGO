'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Check } from 'lucide-react';

// Inline SVG divIcon instead of Leaflet's default marker images — those
// need a bundler asset-path workaround in Next.js; a divIcon sidesteps it
// entirely and keeps the pin styled like the rest of the wizard's icons.
const pinIcon = L.divIcon({
  html: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#dc2626" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C7.5 0 4 3.5 4 8c0 6 8 16 8 16s8-10 8-16c0-4.5-3.5-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>',
  className: 'wiz-map-pin-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

export default function AddressMapField({
  addressValue,
  mapsUrlValue,
  onMapsUrlChange,
}: {
  addressValue: string;
  mapsUrlValue: string;
  onMapsUrlChange: (url: string) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [foundLabel, setFoundLabel] = useState('');

  const handleSearch = async () => {
    if (!addressValue.trim()) {
      setError('Escribe la dirección completa arriba primero.');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/events/geocode?q=${encodeURIComponent(addressValue.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No fue posible buscar la dirección.');
        return;
      }
      if (!data.found) {
        setError('No se encontró esa dirección. Intenta ser más específico (ej. agrega ciudad y estado).');
        return;
      }
      setPosition([data.lat, data.lon]);
      setFoundLabel(data.displayName);
      const embedUrl = `https://maps.google.com/maps?q=${data.lat},${data.lon}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
      onMapsUrlChange(embedUrl);
    } catch (e) {
      console.error(e);
      setError('Error de conexión al buscar la dirección.');
    } finally {
      setSearching(false);
    }
  };

  // In edit mode there may already be a saved maps URL from a previous
  // search — there's no lat/lon to re-render a pin from without searching
  // again, so just say it's already configured instead of an empty map.
  const alreadyConfigured = !position && !!mapsUrlValue;

  return (
    <div>
      <button
        type="button"
        onClick={handleSearch}
        disabled={searching}
        className="wiz-btn-outline"
        style={{ marginBottom: '0.75rem' }}
      >
        <Search size={14} />
        {searching ? 'Buscando…' : 'Buscar en el mapa'}
      </button>

      {error && <span className="wiz-field-error-text" style={{ display: 'block', marginBottom: '0.5rem' }}>{error}</span>}

      {position ? (
        <>
          <div className="wiz-map-preview">
            <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '220px', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={position} icon={pinIcon} />
            </MapContainer>
          </div>
          <span className="wiz-slug-status" style={{ marginTop: '8px' }}>
            <span className="wiz-slug-available">
              <Check size={11} />
              Ubicación encontrada
            </span>
          </span>
          <p className="wiz-field-hint" style={{ marginTop: '2px' }}>{foundLabel}</p>
        </>
      ) : alreadyConfigured ? (
        <p className="wiz-field-hint">
          <MapPin size={12} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
          Esta ubicación ya tiene un mapa guardado. Busca de nuevo para actualizarlo.
        </p>
      ) : null}
    </div>
  );
}
