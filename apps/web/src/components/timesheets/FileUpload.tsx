'use client';

/**
 * FileUpload Component
 *
 * File upload with presigned URL support for timesheet attachments.
 */

import { useCallback, useState } from 'react';
import { Upload, X, File, Loader2 } from 'lucide-react';

export interface UploadedFile {
  file: File;
  objectKey?: string;
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  getUploadUrl: (fileName: string, contentType: string) => Promise<{ uploadUrl: string; objectKey: string } | null>;
}

export function FileUpload({ files, onFilesChange, getUploadUrl }: FileUploadProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    for (const file of selectedFiles) {
      setUploading(file.name);
      const urlData = await getUploadUrl(file.name, file.type);
      if (urlData) {
        // Upload to MinIO
        try {
          await fetch(urlData.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          onFilesChange([...files, { file, objectKey: urlData.objectKey }]);
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }
      setUploading(null);
    }
    e.target.value = '';
  }, [files, getUploadUrl, onFilesChange]);

  const removeFile = useCallback((index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  }, [files, onFilesChange]);

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-silver-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
        {uploading ? (
          <>
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-sm text-silver-600">Uploading {uploading}...</span>
          </>
        ) : (
          <>
            <Upload size={20} className="text-silver-400" />
            <span className="text-sm text-silver-600">Click to upload files</span>
          </>
        )}
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          disabled={!!uploading}
        />
      </label>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-silver-50 rounded-lg">
              <File size={16} className="text-silver-500" />
              <span className="text-sm text-navy-900 flex-1 truncate">{f.file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-1 hover:bg-silver-200 rounded"
              >
                <X size={14} className="text-silver-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
