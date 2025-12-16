import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Contract Reviewer
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered franchise contract and manual review
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Welcome to Contract Reviewer
          </h2>
          <p className="text-gray-600">
            This application helps franchise consultants review contracts and manuals
            using AI-powered analysis through LLM CLI tools.
          </p>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Status:</strong> Phase 1 - Basic setup complete!
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Next: Phase 2 - Claude CLI integration
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
