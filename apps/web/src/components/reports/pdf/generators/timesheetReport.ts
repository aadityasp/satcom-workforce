/**
 * Timesheet Report PDF Generator
 *
 * Generates A4 portrait PDF with timesheet data tables.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_CONFIG } from '../pdfConfig';

interface TimesheetRow {
  projectName: string;
  totalHours: string;
  entryCount: number;
  percentage: string;
}

interface TimesheetReportData {
  title: string;
  dateRange: string;
  totalHours: string;
  rows: TimesheetRow[];
}

export function generateTimesheetReport(data: TimesheetReportData): void {
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

  // Total hours
  doc.setFontSize(12);
  doc.setTextColor(...PDF_CONFIG.colors.text);
  doc.text(`Total Hours: ${data.totalHours}`, PDF_CONFIG.margins.left, 45);

  // Table
  autoTable(doc, {
    startY: 52,
    head: [['Project', 'Hours', 'Entries', '% of Total']],
    body: data.rows.map(row => [
      row.projectName,
      row.totalHours,
      row.entryCount,
      row.percentage,
    ]),
    styles: { fontSize: 10, cellPadding: 3, textColor: PDF_CONFIG.colors.text },
    headStyles: { fillColor: PDF_CONFIG.colors.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: PDF_CONFIG.colors.alternateRow },
    margin: { left: PDF_CONFIG.margins.left, right: PDF_CONFIG.margins.right },
    didDrawPage: (data) => {
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

  const filename = `timesheet-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
