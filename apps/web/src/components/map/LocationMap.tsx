/**
 * LocationMap Component
 *
 * Interactive map displaying check-in locations and office geofence circles.
 * Uses React-Leaflet with OpenStreetMap tiles.
 */

'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue in Next.js
// The default marker icons don't load properly due to webpack path issues
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored markers based on verification status
const createColoredIcon = (color: string) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path fill="${color}" stroke="#333" stroke-width="1" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z"/>
      <circle fill="white" cx="12" cy="12" r="6"/>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
};

const passedIcon = createColoredIcon('#22c55e'); // green-500
const failedIcon = createColoredIcon('#ef4444'); // red-500
const pendingIcon = createColoredIcon('#3b82f6'); // blue-500

export interface CheckInLocation {
  id: string;
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  workMode: string;
  verificationStatus: string;
}

export interface OfficeLocationMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface LocationMapProps {
  checkIns: CheckInLocation[];
  offices: OfficeLocationMarker[];
  center?: [number, number];
  zoom?: number;
}

export function LocationMap({
  checkIns,
  offices,
  center,
  zoom = 12,
}: LocationMapProps) {
  // Calculate center from first office, first check-in, or default to Bangalore
  const mapCenter: [number, number] =
    center ||
    (offices[0]
      ? [offices[0].latitude, offices[0].longitude]
      : checkIns[0]
        ? [checkIns[0].latitude, checkIns[0].longitude]
        : [12.9716, 77.5946]); // Default: Bangalore, India

  // Get marker icon based on verification status
  const getMarkerIcon = (status: string) => {
    switch (status) {
      case 'GeofencePassed':
        return passedIcon;
      case 'GeofenceFailed':
        return failedIcon;
      default:
        return pendingIcon;
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'GeofencePassed':
        return 'bg-green-100 text-green-700';
      case 'GeofenceFailed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      className="h-full w-full rounded-lg"
      style={{ minHeight: '500px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Office geofence circles */}
      {offices.map((office) => (
        <Circle
          key={office.id}
          center={[office.latitude, office.longitude]}
          radius={office.radiusMeters}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong className="text-navy-900">{office.name}</strong>
              <br />
              <span className="text-silver-600">
                Radius: {office.radiusMeters}m
              </span>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Check-in markers */}
      {checkIns.map((checkIn) => (
        <Marker
          key={checkIn.id}
          position={[checkIn.latitude, checkIn.longitude]}
          icon={getMarkerIcon(checkIn.verificationStatus)}
        >
          <Popup>
            <div className="text-sm min-w-[180px]">
              <div className="font-semibold text-navy-900 mb-1">
                {checkIn.userName}
              </div>
              <div className="text-silver-600 text-xs mb-2">
                {formatTime(checkIn.timestamp)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-silver-500">Mode:</span>
                <span className="text-xs font-medium">{checkIn.workMode}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-silver-500">Status:</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${getStatusBadgeClass(checkIn.verificationStatus)}`}
                >
                  {checkIn.verificationStatus === 'GeofencePassed'
                    ? 'Verified'
                    : checkIn.verificationStatus === 'GeofenceFailed'
                      ? 'Outside Zone'
                      : checkIn.verificationStatus}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default LocationMap;
