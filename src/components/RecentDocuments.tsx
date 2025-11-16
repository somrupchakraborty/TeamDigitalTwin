import { useState, useEffect, useCallback } from 'react';
import { FileText, ArrowLeft, User, Calendar } from 'lucide-react';
import { fetchRecentDocuments, type DocumentSummary } from '../lib/api';

interface RecentDocumentsProps {
  onBack: () => void;
}

export function RecentDocuments({ onBack }: RecentDocumentsProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [daysFilter, setDaysFilter] = useState(7);

  const loadRecentDocuments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { documents } = await fetchRecentDocuments(daysFilter);
      setDocuments(documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [daysFilter]);

  useEffect(() => {
    loadRecentDocuments();
  }, [loadRecentDocuments]);

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

  const groupByDate = (docs: DocumentSummary[]) => {
    const groups: Record<string, DocumentSummary[]> = {};

    docs.forEach(doc => {
      const date = new Date(doc.uploaded_at);
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
          {[7, 14, 30].map(days => (
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
        <div className="text-center py-12 text-gray-500">Loading recent documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No documents in the last {daysFilter} days</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Updates</h2>
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
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="p-5 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 flex-1">{doc.filename}</h3>
                        <span className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700">Local</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {doc.summary || 'No summary available yet.'}
                      </p>
                      {doc.highlights && doc.highlights.length > 0 && (
                        <p className="text-sm text-gray-500 bg-gray-50 rounded p-3 mb-3">
                          {doc.highlights[0]}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {doc.uploader_name}
                        </span>
                        <span>•</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span className="uppercase">{doc.file_type}</span>
                      </div>
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
