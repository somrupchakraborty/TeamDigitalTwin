import { useState } from 'react';
import { FileSearch, Upload as UploadIcon, MessageSquare } from 'lucide-react';
import { UploadArea } from './components/UploadArea';
import { SearchInterface } from './components/SearchInterface';
import { RecentDocuments } from './components/RecentDocuments';
import { AgentChat } from './components/AgentChat';

type View = 'upload' | 'search' | 'recent' | 'chat';

function App() {
  const [view, setView] = useState<View>('chat');
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSearch className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Digital Twin</h1>
                <p className="text-xs text-gray-500">Team Document Intelligence</p>
              </div>
            </div>
            <nav className="flex gap-2">
              <button
                onClick={() => setView('chat')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  view === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setView('search')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Search
              </button>
              <button
                onClick={() => setView('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  view === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <UploadIcon className="w-4 h-4" />
                Upload
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'chat' && <AgentChat />}
        {view === 'upload' && (
          <UploadArea
            onUploadComplete={() => {
              setView('chat');
            }}
          />
        )}
        {view === 'search' && (
          <SearchInterface onViewRecent={() => setView('recent')} />
        )}
        {view === 'recent' && (
          <RecentDocuments onBack={() => setView('search')} />
        )}
      </main>

      <footer className="mt-16 py-6 text-center text-sm text-gray-500">
        <p>Upload documents, search intelligently, stay informed</p>
      </footer>
    </div>
  );
}

export default App;
