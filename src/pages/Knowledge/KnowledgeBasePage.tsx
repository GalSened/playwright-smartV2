import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Database, RefreshCw } from 'lucide-react';

interface Document {
  source: string;
  type: string;
  chunks: number;
  uploaded: string;
}

interface Stats {
  totalChunks: number;
  prdChunks: number;
  apiChunks: number;
  testChunks: number;
}

export function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats>({ totalChunks: 0, prdChunks: 0, apiChunks: 0, testChunks: 0 });
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8082/api/knowledge/list');
      const data = await response.json();
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:8082/api/knowledge/stats');
      const data = await response.json();
      
      if (data.success !== false) {
        // Calculate stats from the data structure
        const totalChunks = data.summary?.total_chunks || 0;
        const byType = data.bySourceAndType || [];
        
        setStats({
          totalChunks,
          prdChunks: byType.find((item: any) => item.type === 'requirements')?.count || 0,
          apiChunks: byType.find((item: any) => item.type === 'technical')?.count || 0,
          testChunks: byType.find((item: any) => item.type === 'test_cases')?.count || 0
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const deleteDocument = async (source: string) => {
    if (!confirm('Delete this document and all its chunks?')) return;

    try {
      await fetch(`http://localhost:8082/api/knowledge/${encodeURIComponent(source)}`, {
        method: 'DELETE'
      });

      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch('http://localhost:8082/api/knowledge/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        alert(`Successfully uploaded ${files.length} files`);
      } else {
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed due to network error');
    } finally {
      setUploading(false);
      loadDocuments();
      loadStats();
      // Clear the file input
      event.target.value = '';
    }
  };

  const extractFromWeSign = async () => {
    setExtracting(true);
    try {
      const response = await fetch('http://localhost:8082/api/knowledge/extract', {
        method: 'POST'
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Successfully extracted WeSign documentation');
      } else {
        alert('Extraction feature requires full backend setup');
      }
    } catch (error) {
      console.error('Extract error:', error);
      alert('Extraction feature requires full backend setup');
    } finally {
      setExtracting(false);
      loadDocuments();
      loadStats();
    }
  };

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <h1 className='text-2xl font-bold mb-6 text-gray-800'>Knowledge Base Management</h1>

      {/* Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <Card className='p-4'>
          <div className='text-sm text-gray-500'>Total Documents</div>
          <div className='text-2xl font-bold text-blue-600'>{documents.length}</div>
        </Card>
        <Card className='p-4'>
          <div className='text-sm text-gray-500'>Total Chunks</div>
          <div className='text-2xl font-bold text-green-600'>{stats.totalChunks}</div>
        </Card>
        <Card className='p-4'>
          <div className='text-sm text-gray-500'>PRD Chunks</div>
          <div className='text-2xl font-bold text-purple-600'>{stats.prdChunks}</div>
        </Card>
        <Card className='p-4'>
          <div className='text-sm text-gray-500'>API Chunks</div>
          <div className='text-2xl font-bold text-orange-600'>{stats.apiChunks}</div>
        </Card>
      </div>

      {/* Actions */}
      <Card className='p-6 mb-6'>
        <h2 className='text-lg font-semibold mb-4'>Document Management</h2>
        <div className='flex flex-wrap gap-4'>
          <Button 
            onClick={() => document.getElementById('file-input')?.click()}
            disabled={uploading}
            className='flex items-center gap-2'
          >
            <Upload className='w-4 h-4' />
            {uploading ? 'Uploading...' : 'Upload Documents'}
          </Button>
          
          <Button 
            onClick={extractFromWeSign} 
            variant='outline'
            disabled={extracting}
            className='flex items-center gap-2'
          >
            <Database className='w-4 h-4' />
            {extracting ? 'Extracting...' : 'Extract from Live WeSign'}
          </Button>
          
          <Button 
            onClick={() => { loadDocuments(); loadStats(); }}
            variant='outline'
            className='flex items-center gap-2'
          >
            <RefreshCw className='w-4 h-4' />
            Refresh
          </Button>
          
          <input
            id='file-input'
            type='file'
            multiple
            accept='.pdf,.md,.txt,.docx,.json,.yaml,.yml'
            onChange={handleFileUpload}
            className='hidden'
          />
        </div>
        
        <div className='mt-4 text-sm text-gray-600'>
          <p>Supported formats: PDF, Markdown, Text, Word documents, JSON, YAML</p>
          <p>Upload documents to build the AI knowledge base for better responses.</p>
        </div>
      </Card>

      {/* Documents List */}
      <Card className='p-6'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-xl font-semibold'>Uploaded Documents</h2>
          <span className='text-sm text-gray-500'>{documents.length} documents</span>
        </div>
        
        {documents.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            <Database className='w-12 h-12 mx-auto mb-4 text-gray-300' />
            <p>No documents uploaded yet</p>
            <p className='text-sm'>Upload documents to start building the knowledge base</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200'>
                  <th className='text-left py-3 px-2 font-medium text-gray-700'>Source</th>
                  <th className='text-left py-3 px-2 font-medium text-gray-700'>Type</th>
                  <th className='text-center py-3 px-2 font-medium text-gray-700'>Chunks</th>
                  <th className='text-left py-3 px-2 font-medium text-gray-700'>Uploaded</th>
                  <th className='text-center py-3 px-2 font-medium text-gray-700'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => (
                  <tr key={i} className='border-b border-gray-100 hover:bg-gray-50'>
                    <td className='py-3 px-2 font-medium text-gray-900'>{doc.source}</td>
                    <td className='py-3 px-2'>
                      <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs'>
                        {doc.type}
                      </span>
                    </td>
                    <td className='text-center py-3 px-2 text-gray-600'>{doc.chunks}</td>
                    <td className='py-3 px-2 text-gray-600'>
                      {new Date(doc.uploaded).toLocaleDateString()}
                    </td>
                    <td className='text-center py-3 px-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => deleteDocument(doc.source)}
                        className='text-red-600 hover:text-red-800 hover:bg-red-50'
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}