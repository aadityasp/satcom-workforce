/**
 * Attendance Report PDF Generator
 *
 * Generates A4 portrait PDF with attendance data tables.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_CONFIG } from '../pdfConfig';

interface AttendanceRow {
  userName: string;
  checkInTime: string;
  checkOutTime: string;
  workMode: string;
  status: string;
  totalHours: string;
}

interface AttendanceReportData {
  title: string;
  dateRange: string;
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
  };
  rows: AttendanceRow[];
}

export function generateAttendanceReport(data: AttendanceReportData): void {
  const doc = new jsPDF(PDF_CONFIG.orientation, PDF_CONFIG.unit, PDF_CONFIG.format);

  // Header
  doc.setFontSize(18);
  doc.setTextColor(...PDF_CONFIG.colors.text);
  doc.text(data.title, PDF_CONFIG.margins.left, 20);

  doc.setFontSize(10);
  doc.setTextColor(...PDF_CONFIG.colors.textMuted);
  doc.text(data.dateRange, PDF_CONFIG.margins.left, 28);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    PDF_CONFIG.margins.left,
    34
  );

  // Summary section
  doc.setFontSize(12);
  doc.setTextColor(...PDF_CONFIG.colors.text);
  doc.text('Summary', PDF_CONFIG.margins.left, 45);

  autoTable(doc, {
    startY: 50,
    head: [['Total', 'Present', 'Late', 'Absent']],
    body: [[data.summary.total, data.summary.present, data.summary.late, data.summary.absent]],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: PDF_CONFIG.colors.primary, textColor: [255, 255, 255] },
    margin: { left: PDF_CONFIG.margins.left, right: PDF_CONFIG.margins.right },
  });

  // Details table
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text('Details', PDF_CONFIG.margins.left, finalY);

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Employee', 'Check In', 'Check Out', 'Mode', 'Status', 'Hours']],
    body: data.rows.map(row => [
      row.userName,
      row.checkInTime,
      row.checkOutTime,
      row.workMode,
      row.status,
      row.totalHours,
    ]),
    styles: { fontSize: 9, cellPadding: 3, textColor: PDF_CONFIG.colors.text },
    headStyles: { fillColor: PDF_CONFIG.colors.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: PDF_CONFIG.colors.alternateRow },
    margin: { left: PDF_CONFIG.margins.left, right: PDF_CONFIG.margins.right },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...PDF_CONFIG.colors.textMuted);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  // Save
  const filename = `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
