# Phase 4: Location & Geofence - Research

**Researched:** 2026-01-24
**Domain:** Geofencing, Location Verification, Interactive Maps
**Confidence:** HIGH

## Summary

Phase 4 builds on existing geofence infrastructure in the codebase. The foundation is solid:
- `GeofenceService` already implements Haversine formula for distance calculation
- `OfficeLocation` and `GeofencePolicy` Prisma models exist
- Attendance already stores latitude/longitude on check-in events
- `VerificationStatus` enum includes geofence pass/fail states

What's needed:
1. **Admin CRUD** for office locations and geofence policy management
2. **Anomaly creation** when geofence verification fails (currently returns status but doesn't create anomaly)
3. **Map visualization** for Super Admin to see check-in/activity locations

**Primary recommendation:** Use React-Leaflet for maps (free, lightweight, sufficient for marker display) and enhance existing `GeofenceService` to create anomalies on failure.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-leaflet | ^4.2.1 | React map components | Lightweight, free, good React integration, 1.4M+ monthly downloads |
| leaflet | ^1.9.4 | Underlying map library | Industry standard, MIT license, no API key needed with OSM tiles |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/leaflet | ^1.9.8 | TypeScript definitions | Always (TypeScript project) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React-Leaflet | react-map-gl (Mapbox) | Better 3D/vector rendering but requires paid API key, 212KB bundle, overkill for marker display |
| React-Leaflet | MapLibre GL | Better performance for large datasets but more setup, this project has <100 users |
| OpenStreetMap tiles | Google Maps | Better satellite imagery but costs money, requires API key |

**Installation:**
```bash
npm install leaflet react-leaflet @types/leaflet
```

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── locations/                    # NEW: Office location management
│   ├── locations.module.ts
│   ├── locations.service.ts      # CRUD for OfficeLocation
│   ├── locations.controller.ts   # Admin-only endpoints
│   └── dto/
│       ├── create-location.dto.ts
│       └── update-location.dto.ts
├── attendance/
│   └── geofence.service.ts       # ENHANCE: Add anomaly creation

apps/web/src/
├── app/
│   └── admin/
│       └── locations/            # NEW: Admin location management
│           └── page.tsx
│       └── map/                  # NEW: Super Admin map view
│           └── page.tsx
├── components/
│   └── map/                      # NEW: Map components
│       ├── LocationMap.tsx       # Map with markers
│       ├── MapMarker.tsx         # Custom marker component
│       └── MapCluster.tsx        # Optional: clustering for many markers
```

### Pattern 1: Dynamic Map Import (Next.js SSR)

**What:** Leaflet requires browser APIs (window) that don't exist during SSR
**When to use:** Always with Next.js + Leaflet
**Example:**
```typescript
// Source: Next.js dynamic import pattern
import dynamic from 'next/dynamic';

const LocationMap = dynamic(
  () => import('@/components/map/LocationMap'),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg" />
  }
);
```

### Pattern 2: Haversine Distance Calculation

**What:** Already implemented in `GeofenceService.calculateDistance()`
**Location:** `apps/api/src/attendance/geofence.service.ts:75-93`
**Formula:**
```typescript
// Earth's radius in meters
const R = 6371e3;
const φ1 = (lat1 * Math.PI) / 180;
const φ2 = (lat2 * Math.PI) / 180;
const Δφ = ((lat2 - lat1) * Math.PI) / 180;
const Δλ = ((lon2 - lon1) * Math.PI) / 180;

const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
return R * c; // Distance in meters
```

### Pattern 3: Conditional Geofence Verification

**What:** Only verify Office work mode, skip Remote/Field/Travel
**Current implementation:** `apps/api/src/attendance/attendance.service.ts:66-72`
```typescript
if (checkInDto.workMode === WorkMode.Office) {
  verificationStatus = await this.geofenceService.validateLocation(
    companyId,
    checkInDto.latitude,
    checkInDto.longitude,
  );
}
```

### Anti-Patterns to Avoid

- **SSR map rendering:** Never import Leaflet directly in server components - always use dynamic import
- **PostGIS for simple point-in-radius:** Overkill when Haversine in JS handles <1000 office locations efficiently
- **Storing coordinates as strings:** Always use Decimal(10,8) for lat and Decimal(11,8) for lon (already correct in schema)
- **Fetching all check-ins for map:** Paginate and filter by date range

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distance calculation | Custom geometry library | Haversine formula (already in codebase) | Well-tested, accurate to 0.5% |
| Map rendering | Canvas-based custom map | React-Leaflet + OSM tiles | Mature, free, handles all edge cases |
| Marker clustering | Manual grouping logic | react-leaflet-cluster (if needed) | Handles viewport optimization |
| Coordinate validation | Regex patterns | class-validator @IsLatitude/@IsLongitude | Handles edge cases properly |

**Key insight:** The geofence core logic already exists. This phase is about: (1) admin UI for configuration, (2) anomaly creation on failure, (3) map visualization.

## Common Pitfalls

### Pitfall 1: Leaflet CSS Not Loaded

**What goes wrong:** Map tiles load but markers/controls are invisible or misplaced
**Why it happens:** Leaflet requires CSS for proper rendering
**How to avoid:** Import Leaflet CSS in the component or global styles
```typescript
import 'leaflet/dist/leaflet.css';
```
**Warning signs:** Markers appearing in wrong position, zoom controls invisible

### Pitfall 2: Marker Icon Path Issues

**What goes wrong:** Markers appear as broken images
**Why it happens:** Leaflet's default icon URLs assume specific file structure
**How to avoid:** Configure custom icon or fix path:
```typescript
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;
```
**Warning signs:** Console errors about missing images, broken image icons on map

### Pitfall 3: React StrictMode Double Render

**What goes wrong:** Map initializes twice, causing errors or duplicate markers
**Why it happens:** React StrictMode mounts/unmounts components twice in dev
**How to avoid:** Use useEffect cleanup and MapContainer key prop
```typescript
<MapContainer key="unique-map-key" ... />
```
**Warning signs:** "Map container is already initialized" error

### Pitfall 4: Not Creating Anomaly on Geofence Failure

**What goes wrong:** Geofence fails silently, no record for HR to review
**Why it happens:** Current code returns status but doesn't create anomaly event
**How to avoid:** Call AnomaliesService.create() when VerificationStatus.GeofenceFailed
**Warning signs:** Check-ins outside geofence have no anomaly records

### Pitfall 5: Querying All Check-in Locations

**What goes wrong:** Slow map load, memory issues
**Why it happens:** No pagination/filtering on location queries
**How to avoid:** Filter by date range (today, last 7 days) and paginate
**Warning signs:** Slow page load, browser memory warnings

## Code Examples

### Office Location CRUD DTO

```typescript
// Source: Based on existing schema pattern
import { IsString, IsNumber, IsBoolean, Min, Max, IsOptional } from 'class-validator';
import { IsLatitude, IsLongitude } from 'class-validator';

export class CreateOfficeLocationDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsNumber()
  @Min(50)    // Minimum 50 meters radius
  @Max(5000)  // Maximum 5km radius
  radiusMeters: number;
}
```

### React-Leaflet Basic Map

```typescript
// Source: React-Leaflet docs pattern
'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  center: [number, number];
  markers: Array<{
    id: string;
    position: [number, number];
    label: string;
    type: 'office' | 'checkin';
  }>;
  officeLocations?: Array<{
    position: [number, number];
    radius: number;
    name: string;
  }>;
}

export function LocationMap({ center, markers, officeLocations = [] }: LocationMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-96 w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Office geofence circles */}
      {officeLocations.map((office, idx) => (
        <Circle
          key={`office-${idx}`}
          center={office.position}
          radius={office.radius}
          pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
        >
          <Popup>{office.name}</Popup>
        </Circle>
      ))}

      {/* Check-in markers */}
      {markers.map((marker) => (
        <Marker key={marker.id} position={marker.position}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

### Geofence Anomaly Creation

```typescript
// Enhancement to GeofenceService
async validateAndCreateAnomaly(
  userId: string,
  companyId: string,
  latitude?: number,
  longitude?: number,
): Promise<VerificationStatus> {
  const status = await this.validateLocation(companyId, latitude, longitude);

  if (status === VerificationStatus.GeofenceFailed) {
    // Find anomaly rule for geofence failure
    const rule = await this.prisma.anomalyRule.findFirst({
      where: {
        companyId,
        type: AnomalyType.GeofenceFailure,
        isEnabled: true,
      },
    });

    if (rule) {
      await this.prisma.anomalyEvent.create({
        data: {
          userId,
          ruleId: rule.id,
          type: AnomalyType.GeofenceFailure,
          severity: rule.severity,
          status: AnomalyStatus.Open,
          title: 'Check-in Outside Geofence',
          description: `User checked in from location outside configured office radius`,
          data: {
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }
  }

  return status;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Maps only | OSM + Leaflet free tier | 2018+ | No API costs for simple maps |
| PostGIS for all geo | Haversine in app for point-in-radius | When < 1000 locations | Simpler deployment, no PostGIS extension needed |
| Server-side map rendering | Client-side with dynamic import | Next.js 13+ | SSR compatibility |

**Deprecated/outdated:**
- Leaflet versions < 1.9: Missing important accessibility and touch fixes
- react-leaflet v2: Not compatible with React 18, use v4+

## Open Questions

1. **Marker clustering threshold**
   - What we know: Under 100 users/locations, clustering unnecessary
   - What's unclear: Future scale expectations
   - Recommendation: Skip clustering for MVP, easy to add later

2. **Map tile provider**
   - What we know: OpenStreetMap free, Google costs money, Mapbox rate-limited
   - What's unclear: Client preference for satellite imagery
   - Recommendation: Use OSM for MVP, easy to swap tile URL later

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/api/src/attendance/geofence.service.ts` - Haversine implementation
- Existing codebase: `apps/api/prisma/schema.prisma` - OfficeLocation, GeofencePolicy models
- [React Leaflet Documentation](https://react-leaflet.js.org/) - API patterns

### Secondary (MEDIUM confidence)
- [Haversine Formula - Movable Type](https://www.movable-type.co.uk/scripts/latlong.html) - Mathematical foundation
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html) - Reference for geo queries
- [LogRocket React Map Comparison](https://blog.logrocket.com/react-map-library-comparison/) - Library selection

### Tertiary (LOW confidence)
- NPM download trends - Library popularity metrics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - React-Leaflet is well-documented, widely used
- Architecture: HIGH - Building on existing codebase patterns
- Pitfalls: HIGH - Based on real code analysis and documented issues

**Research date:** 2026-01-24
**Valid until:** 60 days (stable domain, no fast-moving dependencies)
