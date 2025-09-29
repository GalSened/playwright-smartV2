import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Search } from 'lucide-react';

interface UploadResult {
  success: boolean;
  originalName: string;
  fileName?: string;
  chunks: number;
  category: string;
  fileSize: number;
  types?: string[];
  error?: string;
}

interface KnowledgeStats {
  summary: {
    total_chunks: number;
    total_sources: number;
    total_types: number;
    avg_chunk_size: number;
  };
  bySourceAndType: Array<{
    source: string;
    type: string;
    count: number;
    avg_content_length: number;
  }>;
  recentTypes: Array<{
    type: string;
    count: number;
  }>;
}

export function KnowledgeUpload() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [category, setCategory] = useState('wesign-docs');
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<{
    totalFiles: number;
    successCount: number;
    totalChunks: number;
    category: string;
  } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setResults([]);
    setUploadSummary(null);

    const formData = new FormData();

    // Add all selected files
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
      console.log('Adding file:', files[i].name, files[i].size);
    }

    formData.append('category', category);
    console.log('Uploading files with category:', category);

    try {
      const response = await fetch('http://localhost:8082/api/knowledge/upload', {
        method: 'POST',
        body: formData
        // Let browser set Content-Type with boundary
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      console.log('Upload response:', data);
      
      if (data.success) {
        setResults(data.results);
        setUploadSummary(data.summary);
        await loadStats(); // Refresh stats after upload
      } else {
        setError(data.error || 'Upload failed for unknown reason');
      }
      
      // Clear the file input
      event.target.value = '';
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed due to network error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    
    // Create a synthetic event for the file handler
    const syntheticEvent = { target: { files, value: '' } } as React.ChangeEvent<HTMLInputElement>;
    await handleFileUpload(syntheticEvent);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:8082/api/knowledge/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const searchKnowledge = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await fetch('http://localhost:8082/api/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10
        })
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const clearCategory = async (categoryName: string) => {
    try {
      const response = await fetch(`http://localhost:8082/api/knowledge/category/${categoryName}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        await loadStats(); // Refresh stats
        alert(`Cleared ${data.deletedCount} chunks from category: ${categoryName}`);
      }
    } catch (error) {
      console.error('Clear category error:', error);
    }
  };

  // Load stats on component mount
  React.useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Universal Knowledge Base</h1>
      
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="wesign-docs">WeSign Documentation</option>
            <option value="wesign-config">WeSign Configuration</option>
            <option value="wesign-api">WeSign API Documentation</option>
            <option value="wesign-screenshots">WeSign Screenshots</option>
            <option value="test-data">Test Data</option>
            <option value="documentation">Documentation</option>
            <option value="api-specs">API Specifications</option>
            <option value="requirements">Requirements</option>
            <option value="general">General</option>
          </select>
        </div>
        
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="mb-4 text-lg text-gray-600">Drop files here or click to browse</p>
          <p className="text-sm text-gray-500 mb-4">
            Supports: JSON, Markdown, PDF, YAML, Code files, Text, CSV, DOCX, PNG, JPG
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Maximum file size: 50MB per file
          </p>
          
          {/* File input with proper attributes */}
          <input
            type="file"
            multiple
            accept=".json,.md,.pdf,.yaml,.yml,.txt,.csv,.docx,.png,.jpg,.jpeg,.py,.ts,.js,.tsx,.jsx,.html,.css,.xml"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload-input"
            disabled={uploading}
          />
          
          <button
            onClick={() => document.getElementById('file-upload-input')?.click()}
            disabled={uploading}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              uploading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
            }`}
          >
            {uploading ? 'Processing...' : 'Select Files from Computer'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800">Upload Failed</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Summary */}
      {uploadSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
            <h3 className="font-medium text-blue-800">Upload Complete</h3>
          </div>
          <div className="text-blue-700 text-sm">
            Successfully processed {uploadSummary.successCount} of {uploadSummary.totalFiles} files, 
            creating {uploadSummary.totalChunks} knowledge chunks in category "{uploadSummary.category}"
          </div>
        </div>
      )}

      {/* Upload Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Results</h2>
          <div className="space-y-3">
            {results.map((result, i) => (
              <div key={i} className={`flex items-center p-3 rounded-lg ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                )}
                <div className="flex-grow">
                  <div className="font-medium">{result.originalName}</div>
                  {result.success ? (
                    <div className="text-sm text-gray-600">
                      {result.chunks} chunks • {result.types?.join(', ')} • {(result.fileSize / 1024).toFixed(1)} KB
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">{result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Search Knowledge Base</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="flex-grow p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && searchKnowledge()}
          />
          <button
            onClick={searchKnowledge}
            disabled={searching || !searchQuery.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-3">
            {searchResults.map((result: any, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-blue-600">{result.type}</div>
                  <div className="text-xs text-gray-500">{result.source}</div>
                </div>
                <div className="text-sm text-gray-700 mb-2">{result.preview}</div>
                <div className="text-xs text-gray-500">Score: {result.relevance_score}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics Section */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Knowledge Base Statistics</h2>
            <button
              onClick={loadStats}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.summary.total_chunks}</div>
              <div className="text-sm text-gray-600">Total Chunks</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.summary.total_sources}</div>
              <div className="text-sm text-gray-600">Sources</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.summary.total_types}</div>
              <div className="text-sm text-gray-600">Content Types</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(stats.summary.avg_chunk_size)}
              </div>
              <div className="text-sm text-gray-600">Avg Size (chars)</div>
            </div>
          </div>

          {/* Recent Types */}
          {stats.recentTypes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Recent Uploads (24h)</h3>
              <div className="flex flex-wrap gap-2">
                {stats.recentTypes.map((type, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {type.type} ({type.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* By Source and Type */}
          <div>
            <h3 className="text-lg font-medium mb-3">Sources & Types</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Source</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Count</th>
                    <th className="text-right py-2">Avg Length</th>
                    <th className="text-center py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bySourceAndType.map((item, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{item.source}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{item.type}</span>
                      </td>
                      <td className="py-2 text-right">{item.count}</td>
                      <td className="py-2 text-right">{Math.round(item.avg_content_length)}</td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => {
                            const category = stats.bySourceAndType.find(s => s.source === item.source)?.source;
                            if (category && confirm(`Clear all data from source: ${category}?`)) {
                              clearCategory(category);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Clear this source"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}