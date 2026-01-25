'use client';

/**
 * PdfExportButton
 *
 * Button component that triggers PDF generation with loading state.
 */

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface PdfExportButtonProps {
  onExport: () => void;
  label?: string;
  disabled?: boolean;
}

export function PdfExportButton({ onExport, label = 'Export PDF', disabled = false }: PdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    // Use requestAnimationFrame to prevent UI blocking
    requestAnimationFrame(() => {
      try {
        onExport();
      } finally {
        setIsExporting(false);
      }
    });
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isExporting ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Download size={18} />
      )}
      {isExporting ? 'Generating...' : label}
    </button>
  );
}
