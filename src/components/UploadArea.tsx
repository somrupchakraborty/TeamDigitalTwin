import { useState, useCallback } from 'react';
import { Upload, X, FileText, File, FileSpreadsheet } from 'lucide-react';
import { uploadDocuments, type UploadPayload } from '../lib/api';

interface UploadAreaProps {
  onUploadComplete?: () => void;
}

const SUPPORTED_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function UploadArea({ onUploadComplete }: UploadAreaProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploaderName, setUploaderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return `${file.name}: Unsupported file type`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large (max 50MB)`;
    }
    return null;
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    if (selectedFiles.length + fileArray.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
    } else {
      setError('');
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, [selectedFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploaderName.trim()) {
      setError('Please select files and enter your name');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const payloads: UploadPayload[] = [];

      for (const file of selectedFiles) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));
        const buffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        payloads.push({
          name: file.name,
          type: file.type,
          size: file.size,
          content: base64,
        });
        setUploadProgress(prev => ({ ...prev, [file.name]: 60 }));
      }

      await uploadDocuments(uploaderName.trim(), payloads);

      payloads.forEach(({ name }) => {
        setUploadProgress(prev => ({ ...prev, [name]: 100 }));
      });

      setSelectedFiles([]);
      setUploaderName('');
      setUploadProgress({});
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (type.includes('presentation')) return <File className="w-6 h-6 text-orange-500" />;
    if (type.includes('spreadsheet') || type.includes('csv')) return <FileSpreadsheet className="w-6 h-6 text-green-500" />;
    return <File className="w-6 h-6 text-blue-500" />;
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".pdf,.ppt,.pptx,.xls,.xlsx,.csv,.docx"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Support: PPT, PDF, Excel, CSV, DOCX (Max 5 files, 50MB each)
          </p>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-white border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
                {uploading && uploadProgress[file.name] !== undefined && (
                  <div className="w-24">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              disabled={uploading}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !uploaderName.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
