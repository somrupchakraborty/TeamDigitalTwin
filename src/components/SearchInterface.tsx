import { useState } from 'react';
import { Search, Clock, FileText } from 'lucide-react';
import { semanticSearch, type DocumentSummary } from '../lib/api';

interface SearchInterfaceProps {
  onViewRecent: () => void;
}

export function SearchInterface({ onViewRecent }: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocumentSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [recencyDays, setRecencyDays] = useState<number | null>(7);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError('');

    try {
      const data = await semanticSearch(query.trim(), recencyDays);
      setResults(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents by name, content, or tags..."
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
        <div className="flex gap-2">
          {[7, 14, 30, null].map((days) => (
            <button
              key={`recency-${days ?? 'all'}`}
              type="button"
              onClick={() => setRecencyDays(days)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                recencyDays === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {days ? `Last ${days}d` : 'All'}
            </button>
          ))}
          <button
            onClick={onViewRecent}
            type="button"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Clock className="w-5 h-5" />
            Recent
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {searching && (
        <div className="text-center py-12 text-gray-500">
          Searching documents...
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Found {results.length} document{results.length !== 1 ? 's' : ''}
          </p>
          {results.map((doc) => (
            <div
              key={doc.id}
              className="p-5 bg-white border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1 truncate">
                      {doc.filename}
                    </h3>
                    {doc.summary && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {doc.summary}
                      </p>
                    )}
                    {doc.highlights && doc.highlights.length > 0 && (
                      <p className="text-sm text-gray-500 bg-gray-50 rounded p-3">
                        {doc.highlights[0]}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{doc.uploader_name}</span>
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
            </div>
          ))}
        </div>
      )}

      {!searching && results.length === 0 && query && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No documents found</p>
          <p className="text-sm text-gray-400 mt-1">Try different keywords or check recent updates</p>
        </div>
      )}
    </div>
  );
}
