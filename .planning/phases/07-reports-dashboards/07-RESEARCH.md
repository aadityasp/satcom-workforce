# Phase 7: Reports & Dashboards - Research

**Researched:** 2026-01-24
**Domain:** Role-based dashboards, data visualization, PDF generation
**Confidence:** HIGH

## Summary

This phase implements role-specific dashboards (Manager, HR, SuperAdmin) with attendance and timesheet metrics, plus PDF export functionality. The project already has a foundation with existing dashboard page (`/dashboard/page.tsx`) that handles role-based rendering, and a placeholder reports page (`/admin/reports/page.tsx`).

The standard approach for React dashboards is:
1. **Recharts** for data visualization (bar, line, pie charts) - built for React, SVG-based, 26.6k+ GitHub stars
2. **jsPDF + jspdf-autotable** for PDF generation with tables - A4 portrait, tables-only as per user decision
3. **Role-specific pages** following Next.js App Router patterns with existing auth guards

**Primary recommendation:** Use Recharts 3.x for charts and jsPDF 4.x with jspdf-autotable 5.x for PDF exports. Extend existing dashboard patterns already established in the codebase.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.7.0 | React charting (bar, line, pie) | Built for React, SVG-based, 26.6k stars, declarative API |
| jspdf | ^4.0.0 | Client-side PDF generation | 30k+ stars, no server required, TypeScript support |
| jspdf-autotable | ^5.0.7 | PDF table generation | Official jsPDF plugin, auto-pagination, header repeat |
| date-fns | ^3.2.0 | Date manipulation for reports | Already in project, lightweight |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | ^5.17.0 | Data fetching | Already in project, use for dashboard data |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js/react-chartjs-2 | Canvas-based, less React-native feel |
| Recharts | Victory | More customizable but steeper learning curve |
| jsPDF | @react-pdf/renderer | Better for complex layouts, but heavier |

**Installation:**
```bash
npm install recharts jspdf jspdf-autotable --workspace=@satcom/web
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── app/
│   ├── dashboard/
│   │   ├── manager/page.tsx    # Manager-specific dashboard
│   │   ├── hr/page.tsx         # HR dashboard
│   │   └── page.tsx            # Role router (existing, extend)
│   └── admin/
│       └── reports/
│           ├── page.tsx        # Report selection (existing, extend)
│           ├── attendance/page.tsx
│           ├── timesheets/page.tsx
│           └── anomalies/page.tsx
├── components/
│   └── reports/
│       ├── charts/             # Chart wrapper components
│       │   ├── AttendanceBarChart.tsx
│       │   ├── TimesheetPieChart.tsx
│       │   └── TrendLineChart.tsx
│       ├── widgets/            # Dashboard metric cards
│       │   ├── MetricCard.tsx
│       │   ├── NeedsAttentionSection.tsx
│       │   └── TodayAttendanceWidget.tsx
│       └── pdf/                # PDF generation utilities
│           ├── PdfExportButton.tsx
│           └── generators/
│               ├── attendanceReport.ts
│               └── timesheetReport.ts
├── hooks/
│   ├── useReports.ts           # Report data fetching
│   └── useDashboardMetrics.ts  # Dashboard metric hooks
└── lib/
    └── pdf/
        ├── pdfConfig.ts        # A4 portrait, margins, fonts
        └── tableStyles.ts      # Consistent table formatting
```

### Pattern 1: Role-Specific Dashboard Routing
**What:** Separate dashboard pages per role with shared components
**When to use:** When each role needs fundamentally different layouts and metrics

**Example:**
```typescript
// apps/web/src/app/dashboard/page.tsx (extend existing)
'use client';

import { useAuthStore } from '@/store/auth';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Route to role-specific dashboard
  switch (user?.role) {
    case 'Manager':
      return <ManagerDashboard />;
    case 'HR':
    case 'SuperAdmin':
      return <HRDashboard />;
    default:
      return <EmployeeDashboard />;
  }
}
```

### Pattern 2: Recharts ResponsiveContainer Wrapper
**What:** Always wrap charts in ResponsiveContainer for responsive sizing
**When to use:** Every chart component

**Example:**
```typescript
// Source: https://github.com/recharts/recharts
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

function AttendanceBarChart({ data }: { data: AttendanceData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="checkedIn" fill="#22c55e" name="Checked In" />
        <Bar dataKey="late" fill="#f59e0b" name="Late" />
        <Bar dataKey="absent" fill="#ef4444" name="Absent" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 3: jsPDF AutoTable for Report Export
**What:** Generate PDF with tables using autoTable plugin
**When to use:** All PDF exports (A4 portrait, tables-only per user decision)

**Example:**
```typescript
// Source: https://github.com/simonbengtsson/jsPDF-AutoTable
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

export function generateAttendanceReport(data: AttendanceRow[], title: string) {
  const doc = new jsPDF('p', 'mm', 'a4'); // portrait, mm, A4

  // Header
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  // Table
  autoTable(doc, {
    startY: 35,
    head: [['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status']],
    body: data.map(row => [
      row.employeeName,
      row.date,
      row.checkIn,
      row.checkOut,
      row.totalHours,
      row.status
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175] }, // Blue-700
    alternateRowStyles: { fillColor: [248, 250, 252] }, // Silver-50
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
```

### Pattern 4: Needs Attention Section
**What:** Dedicated section at top of dashboard for issues requiring action
**When to use:** HR and Manager dashboards (per user decision)

**Example:**
```typescript
// User decision: Red badges, dedicated section, inline icons
function NeedsAttentionSection({ anomalyCount, lateCount, pendingApprovals }: Props) {
  if (anomalyCount === 0 && lateCount === 0 && pendingApprovals === 0) {
    return null; // Hide if nothing needs attention
  }

  return (
    <div className="bg-error-light border border-error/20 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="text-error" size={20} />
        <h2 className="font-semibold text-navy-900">Needs Attention</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {anomalyCount > 0 && (
          <AttentionItem
            icon={Shield}
            count={anomalyCount}
            label="Open Anomalies"
            href="/admin/anomalies"
          />
        )}
        {lateCount > 0 && (
          <AttentionItem
            icon={Clock}
            count={lateCount}
            label="Late Today"
          />
        )}
        {pendingApprovals > 0 && (
          <AttentionItem
            icon={Calendar}
            count={pendingApprovals}
            label="Pending Approvals"
            href="/admin/leaves"
          />
        )}
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Never render charts in SSR:** Recharts uses browser APIs; always use 'use client' and wrap in ResponsiveContainer
- **Don't compute aggregations on frontend:** Use API endpoints to aggregate data; frontend just displays
- **Avoid PDF generation in useEffect:** Trigger PDF generation only on user action (button click)
- **Don't use inline styles for charts:** Use consistent theme colors from Tailwind config

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG drawing | Recharts | Handles responsiveness, tooltips, legends, animations |
| PDF table formatting | Manual coordinate positioning | jspdf-autotable | Auto-pagination, header repeat, column widths |
| Date range aggregation | Manual loops in frontend | Backend API endpoints | Performance, consistency, proper SQL aggregation |
| Role-based component visibility | Inline role checks everywhere | Reusable wrapper/HOC | Centralized, testable, consistent |

**Key insight:** The existing codebase already has patterns for API aggregation (see `attendance.service.ts` getSummary, `anomalies.service.ts` getSummary). New dashboard endpoints should follow these patterns.

## Common Pitfalls

### Pitfall 1: Chart Hydration Errors
**What goes wrong:** SSR attempts to render chart, causes hydration mismatch
**Why it happens:** Recharts uses browser APIs (SVG, ResizeObserver)
**How to avoid:** Mark component as 'use client', use dynamic import if needed
**Warning signs:** "Hydration failed" errors in console

### Pitfall 2: Empty Charts on Initial Load
**What goes wrong:** Chart renders with no data before API returns
**Why it happens:** async data fetch, chart renders with empty array
**How to avoid:** Show skeleton/loading state, check data.length before rendering chart
**Warning signs:** Blank chart area that suddenly populates

### Pitfall 3: PDF Export Button Blocks UI
**What goes wrong:** Large reports freeze the page during generation
**Why it happens:** jsPDF runs synchronously on main thread
**How to avoid:** Show loading spinner, use requestAnimationFrame or setTimeout(0) for chunking large tables
**Warning signs:** Button appears stuck, no visual feedback

### Pitfall 4: Inconsistent Dashboard Data
**What goes wrong:** Different widgets show conflicting numbers
**Why it happens:** Multiple API calls at different times, race conditions
**How to avoid:** Single API call for dashboard summary, pass data down to widgets
**Warning signs:** "Checked In: 15" but table shows 18 rows

### Pitfall 5: Manager Sees All Users Instead of Team
**What goes wrong:** Manager dashboard shows entire company
**Why it happens:** API doesn't filter by managerId
**How to avoid:** Backend must check user.role and filter by managerId for Managers
**Warning signs:** Manager sees users not in their team

## Code Examples

Verified patterns from official sources:

### Recharts Bar Chart with Custom Tooltips
```typescript
// Source: https://github.com/recharts/recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-silver-200">
        <p className="font-semibold text-navy-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TeamAttendanceChart({ data }: { data: DailyAttendance[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="onTime" stackId="a" fill="#22c55e" name="On Time" />
        <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
        <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### jsPDF A4 Portrait Report Configuration
```typescript
// Source: https://github.com/parallax/jsPDF
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

// A4 dimensions: 210mm x 297mm
export const PDF_CONFIG = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
  margins: { top: 20, right: 14, bottom: 20, left: 14 },
  headerHeight: 35,
  footerHeight: 15,
};

export function createPdfDocument(title: string): jsPDF {
  const doc = new jsPDF(PDF_CONFIG.orientation, PDF_CONFIG.unit, PDF_CONFIG.format);

  // Title
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Navy-900
  doc.text(title, PDF_CONFIG.margins.left, 20);

  // Subtitle with date
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Silver-500
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })}`, PDF_CONFIG.margins.left, 28);

  return doc;
}

export function addTableToPdf(
  doc: jsPDF,
  headers: string[],
  rows: (string | number)[][],
  startY: number
): number {
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 41, 59], // Navy-900
    },
    headStyles: {
      fillColor: [30, 64, 175], // Blue-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Silver-50
    },
    margin: { left: PDF_CONFIG.margins.left, right: PDF_CONFIG.margins.right },
  });

  // Return final Y position for chaining tables
  return (doc as any).lastAutoTable.finalY;
}
```

### Dashboard Summary API Endpoint Pattern
```typescript
// Extend existing pattern from attendance.service.ts
// apps/api/src/reports/reports.service.ts
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getManagerDashboard(managerId: string, companyId: string) {
    // Get direct reports
    const teamUserIds = await this.prisma.employeeProfile.findMany({
      where: { managerId },
      select: { userId: true },
    });

    const userIds = teamUserIds.map(u => u.userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel queries for performance
    const [todayAttendance, lateArrivals, openAnomalies] = await Promise.all([
      this.prisma.attendanceDay.findMany({
        where: { userId: { in: userIds }, date: today },
        include: { events: true, user: { include: { profile: true } } },
      }),
      this.prisma.attendanceEvent.count({
        where: {
          type: 'CheckIn',
          timestamp: { gte: today },
          attendanceDay: { userId: { in: userIds } },
          // Late = check-in after 9:15 AM (configurable)
          timestamp: { gt: new Date(today.getTime() + 9.25 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.anomalyEvent.count({
        where: { userId: { in: userIds }, status: 'Open' },
      }),
    ]);

    return {
      teamSize: userIds.length,
      checkedInCount: todayAttendance.filter(d => d.events.some(e => e.type === 'CheckIn')).length,
      lateCount: lateArrivals,
      openAnomalies,
      todayAttendance: todayAttendance.map(d => ({
        userId: d.userId,
        userName: d.user.profile ? `${d.user.profile.firstName} ${d.user.profile.lastName}` : d.user.email,
        checkInTime: d.events.find(e => e.type === 'CheckIn')?.timestamp,
        checkOutTime: d.events.find(e => e.type === 'CheckOut')?.timestamp,
        workMode: d.events.find(e => e.type === 'CheckIn')?.workMode,
        isLate: d.events.some(e => e.type === 'CheckIn' && new Date(e.timestamp).getHours() >= 9 && new Date(e.timestamp).getMinutes() > 15),
      })),
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js with wrapper | Recharts built for React | 2020+ | Better React integration, less boilerplate |
| Server-side PDF | Client-side jsPDF | 2018+ | No server load, instant download |
| Multiple API calls per dashboard | Single aggregated endpoint | Best practice | Faster load, consistent data |
| Manual chart responsiveness | ResponsiveContainer | Recharts 2.x | Automatic sizing, no custom CSS |

**Deprecated/outdated:**
- react-chartjs-2 v4 (use v5 for React 18+)
- jspdf-autotable legacy import style (use ES modules)

## Open Questions

Things that couldn't be fully resolved:

1. **Chart color palette customization**
   - What we know: Recharts accepts hex colors via fill/stroke props
   - What's unclear: Should we create a shared chart colors config tied to Tailwind?
   - Recommendation: Create `lib/chart-colors.ts` mapping semantic names to Tailwind values

2. **Large report performance**
   - What we know: jsPDF is synchronous, can block UI for large tables
   - What's unclear: Maximum safe table rows before noticeable lag
   - Recommendation: Test with 1000+ rows, consider chunked generation if slow

## Sources

### Primary (HIGH confidence)
- [Recharts GitHub](https://github.com/recharts/recharts) - Version 3.7.0, API documentation
- [jsPDF GitHub](https://github.com/parallax/jsPDF) - Version 4.0.0, usage examples
- [jspdf-autotable npm](https://www.npmjs.com/package/jspdf-autotable) - Version 5.0.7, table options

### Secondary (MEDIUM confidence)
- [LogRocket React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) - Library comparison
- [Next.js SaaS Dashboard Best Practices](https://www.ksolves.com/blog/next-js/best-practices-for-saas-dashboards) - Architecture patterns

### Tertiary (LOW confidence)
- Medium articles on jsPDF customization - Implementation details

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via npm/GitHub, well-documented libraries
- Architecture: HIGH - Extends existing codebase patterns, follows Next.js conventions
- Pitfalls: MEDIUM - Based on common issues documented in issues/discussions

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable libraries, no major changes expected)
