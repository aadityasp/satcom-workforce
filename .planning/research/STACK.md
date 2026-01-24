# Stack Research

**Researched:** 2026-01-24
**Focus:** Libraries for location tracking, activity monitoring, productivity reporting

## Existing Stack (Keep)

| Component | Version | Purpose |
|-----------|---------|---------|
| NestJS | 10.3 | API framework |
| Next.js | 14.1 | Web app |
| Expo SDK | 52 | Mobile app |
| PostgreSQL | 16 | Database |
| Prisma | 5.8 | ORM |
| Socket.IO | 4.6 | Real-time |
| MinIO | latest | File storage |

## New Libraries Needed

### Mobile Location & Geofencing

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `expo-location` | ^18.0 | GPS capture at check-in | High |
| `expo-task-manager` | ^12.0 | Background location (if needed) | Medium |

**Rationale:** expo-location is the official Expo package for location services. It handles permissions, provides getCurrentPositionAsync for one-time captures, and integrates cleanly with managed workflow. For simple check-in verification (not continuous tracking), this is sufficient.

**What NOT to use:**
- `react-native-background-geolocation` — Overkill for check-in-only verification. Battery-intensive, complex setup, requires bare workflow.
- Continuous GPS tracking — Privacy concern, not needed for this use case.

### Geofence Calculation (Backend)

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `geolib` | ^3.3 | Distance calculations, point-in-radius | High |

**Rationale:** Lightweight library for geospatial calculations. Use `isPointWithinRadius()` to verify check-in location is within office geofence. No heavy GIS dependencies needed.

### PDF Generation

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `@nestjs/puppeteer` or `puppeteer` | ^22.0 | HTML to PDF conversion | High |
| `handlebars` | ^4.7 | HTML templating | High |

**Rationale:** Puppeteer generates high-quality PDFs from HTML templates. Allows flexible report design with CSS styling. More modern than PhantomJS-based alternatives.

**Alternative:** `pdfmake` for simpler reports without HTML templating.

### Excel Generation

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `exceljs` | ^4.4 | Excel workbook generation | High |

**Rationale:** ExcelJS provides rich formatting, multiple sheets, styling support. Better than SheetJS for professional reports with formatting requirements. Handles large datasets efficiently.

### Charts for Reports

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `chart.js` | ^4.4 | Charts in web dashboards | High |
| `recharts` | ^2.12 | React chart components | High |

**Rationale:** Chart.js for rendering charts to images (for PDF embedding). Recharts for interactive web dashboard charts.

## Database Schema Additions

```prisma
// Location verification
model CheckInLocation {
  id           String   @id @default(cuid())
  attendanceId String
  latitude     Float
  longitude    Float
  accuracy     Float?
  capturedAt   DateTime @default(now())
  verified     Boolean  @default(false)
  geofenceId   String?
}

model Geofence {
  id        String  @id @default(cuid())
  name      String
  latitude  Float
  longitude Float
  radiusM   Int     // radius in meters
  isActive  Boolean @default(true)
}

// Activity tracking
model ActivityStatus {
  id        String   @id @default(cuid())
  userId    String
  status    String   // "working", "break", "meeting", etc.
  taskId    String?
  note      String?
  startedAt DateTime @default(now())
  endedAt   DateTime?
}
```

## Summary

| Feature | Primary Library | Backup Option |
|---------|-----------------|---------------|
| Mobile GPS | expo-location | — |
| Geofence calc | geolib | turf.js |
| PDF export | puppeteer + handlebars | pdfmake |
| Excel export | exceljs | sheetjs |
| Charts | recharts (web), chart.js (PDF) | — |

## Sources

- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [Building Location-Based Features Using Expo Location](https://coffey.codes/articles/building-location-based-features-using-expo-location)
- [NestJS PDF Generation with Puppeteer](https://github.com/gboutte/nestjs-pdf)
- [ExcelJS with NestJS](https://medium.com/@ggluopeihai/nestjs-export-excel-file-697e3891ea8f)
- [SheetJS in NestJS](https://docs.sheetjs.com/docs/demos/net/server/nestjs/)
