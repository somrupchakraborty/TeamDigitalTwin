import { useState, useEffect } from 'react';
import { FileText, ArrowLeft, User, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];

interface RecentDocumentsProps {
  onBack: () => void;
}

export function RecentDocuments({ onBack }: RecentDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [daysFilter, setDaysFilter] = useState(10);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRecentDocuments();
  }, [daysFilter]);

  const loadRecentDocuments = async () => {
    setLoading(true);
    setError('');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysFilter);

      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .gte('upload_date', cutoffDate.toISOString())
        .order('upload_date', { ascending: false });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const processDocument = async (documentId: string) => {
    setProcessing(prev => ({ ...prev, [documentId]: true }));
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      await loadRecentDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const groupByDate = (docs: Document[]) => {
    const groups: Record<string, Document[]> = {};

    docs.forEach(doc => {
      const date = new Date(doc.upload_date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });

    return groups;
  };

  const groupedDocs = groupByDate(documents);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Search
        </button>
        <div className="flex gap-2">
          {[7, 10, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setDaysFilter(days)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                daysFilter === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Loading recent documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No documents in the last {daysFilter} days</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Updates
            </h2>
            <p className="text-sm text-gray-500">
              {documents.length} document{documents.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {Object.entries(groupedDocs).map(([dateGroup, docs]) => (
            <div key={dateGroup} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500 sticky top-0 bg-gray-100 py-2 px-3 rounded-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {dateGroup}
              </h3>
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 flex-1">
                          {doc.filename}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              doc.processing_status === 'completed'
                                ? 'bg-green-50 text-green-700'
                                : doc.processing_status === 'processing'
                                ? 'bg-blue-50 text-blue-700'
                                : doc.processing_status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {doc.processing_status}
                          </span>
                          {(doc.processing_status === 'pending' || doc.processing_status === 'failed') && (
                            <button
                              onClick={() => processDocument(doc.id)}
                              disabled={processing[doc.id]}
                              className="p-1.5 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                              title="Process document"
                            >
                              <RefreshCw className={`w-4 h-4 text-blue-600 ${processing[doc.id] ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      {doc.summary && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {doc.summary}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {doc.uploader_name}
                        </span>
                        <span>•</span>
                        <span>{formatDate(doc.upload_date)}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span className="uppercase">{doc.file_type}</span>
                      </div>

                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {doc.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
