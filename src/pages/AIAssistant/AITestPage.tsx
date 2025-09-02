import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { Brain, Database, MessageCircle, Search, Zap, AlertCircle, CheckCircle } from 'lucide-react';

interface TestStatus {
  loading: boolean;
  data: any;
  error?: string;
}

export const AITestPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<TestStatus>({ loading: false, data: null });
  const [ingestionStatus, setIngestionStatus] = useState<TestStatus>({ loading: false, data: null });
  const [searchStatus, setSearchStatus] = useState<TestStatus>({ loading: false, data: null });
  const [chatStatus, setChatStatus] = useState<TestStatus>({ loading: false, data: null });
  
  const [testDocument, setTestDocument] = useState(`WeSign Login Feature Requirements:

1. User Authentication
- Users must be able to log in with email and password
- System should support forgot password functionality
- Login attempts should be rate limited for security
- Multi-factor authentication should be supported

2. Session Management
- User sessions should expire after 30 minutes of inactivity
- Remember me functionality for 30 days
- Secure session tokens using JWT

3. Error Handling
- Clear error messages for invalid credentials
- Account lockout after 5 failed attempts
- Email verification for new accounts`);

  const [searchQuery, setSearchQuery] = useState('How do I implement login authentication?');
  const [chatMessage, setChatMessage] = useState('Help me write a test for the login feature');

  const testConnection = async () => {
    setConnectionStatus({ loading: true, data: null });
    try {
      const response = await fetch('http://localhost:8081/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setConnectionStatus({ loading: false, data });
    } catch (error) {
      setConnectionStatus({ 
        loading: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      });
    }
  };

  const testIngestion = async () => {
    setIngestionStatus({ loading: true, data: null });
    try {
      const response = await fetch('http://localhost:8081/api/ai/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: testDocument,
          metadata: { 
            source: 'ai-test-page', 
            type: 'requirement',
            title: 'WeSign Login Feature Requirements'
          }
        })
      });
      const data = await response.json();
      setIngestionStatus({ loading: false, data });
    } catch (error) {
      setIngestionStatus({ 
        loading: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Ingestion failed' 
      });
    }
  };

  const testSearch = async () => {
    setSearchStatus({ loading: true, data: null });
    try {
      const response = await fetch('http://localhost:8081/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          topK: 3
        })
      });
      const data = await response.json();
      setSearchStatus({ loading: false, data });
    } catch (error) {
      setSearchStatus({ 
        loading: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Search failed' 
      });
    }
  };

  const testChat = async () => {
    setChatStatus({ loading: true, data: null });
    try {
      const response = await fetch('http://localhost:8081/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatMessage,
          useRAG: true
        })
      });
      const data = await response.json();
      setChatStatus({ loading: false, data });
    } catch (error) {
      setChatStatus({ 
        loading: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Chat failed' 
      });
    }
  };

  const StatusIndicator = ({ status }: { status: TestStatus }) => {
    if (status.loading) return <Loading size="sm" />;
    if (status.error) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (status.data?.success) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <div className="w-4 h-4" />;
  };

  const ResultCard = ({ title, status, children }: { title: string; status: TestStatus; children?: React.ReactNode }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIndicator status={status} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
        {status.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">{status.error}</span>
          </div>
        )}
        {status.data && (
          <div className="mt-4">
            <details className="bg-gray-50 p-3 rounded">
              <summary className="cursor-pointer font-medium">Response Data</summary>
              <pre className="mt-2 text-xs overflow-x-auto">
                {JSON.stringify(status.data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-4">
          <Brain className="w-8 h-8" />
          AI Testing Assistant - System Test
        </h1>
        <p className="text-gray-600">
          Test the AI services integration including OpenAI, Pinecone vector database, and RAG functionality.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Test */}
        <ResultCard title="AI Connections" status={connectionStatus}>
          <p className="text-sm text-gray-600 mb-4">
            Test connections to OpenAI API and Pinecone vector database.
          </p>
          <button 
            onClick={testConnection} 
            disabled={connectionStatus.loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Test Connections
          </button>
        </ResultCard>

        {/* Document Ingestion Test */}
        <ResultCard title="Document Ingestion" status={ingestionStatus}>
          <p className="text-sm text-gray-600 mb-4">
            Test document chunking, embedding generation, and vector storage.
          </p>
          <textarea
            value={testDocument}
            onChange={(e) => setTestDocument(e.target.value)}
            placeholder="Enter test document content..."
            className="mb-4 h-32 w-full border border-gray-300 rounded p-2"
          />
          <button 
            onClick={testIngestion} 
            disabled={ingestionStatus.loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Ingest Document
          </button>
        </ResultCard>

        {/* Search Test */}
        <ResultCard title="Knowledge Search" status={searchStatus}>
          <p className="text-sm text-gray-600 mb-4">
            Test vector similarity search in the knowledge base.
          </p>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter search query..."
            className="mb-4 w-full border border-gray-300 rounded p-2"
          />
          <button 
            onClick={testSearch} 
            disabled={searchStatus.loading}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search Knowledge Base
          </button>
          {searchStatus.data?.results && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Search Results:</h4>
              {searchStatus.data.results.map((result: any, i: number) => (
                <div key={i} className="bg-blue-50 p-3 rounded text-sm">
                  <div className="font-medium">Score: {result.score?.toFixed(3)}</div>
                  <div className="text-gray-600">{result.text?.substring(0, 200)}...</div>
                </div>
              ))}
            </div>
          )}
        </ResultCard>

        {/* Chat Test */}
        <ResultCard title="AI Chat (with RAG)" status={chatStatus}>
          <p className="text-sm text-gray-600 mb-4">
            Test AI chat with Retrieval Augmented Generation using the knowledge base.
          </p>
          <input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Enter chat message..."
            className="mb-4 w-full border border-gray-300 rounded p-2"
          />
          <button 
            onClick={testChat} 
            disabled={chatStatus.loading}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Send Chat Message
          </button>
          {chatStatus.data?.response && (
            <div className="mt-4 p-4 bg-green-50 rounded">
              <h4 className="font-medium mb-2">AI Response:</h4>
              <div className="text-sm">{chatStatus.data.response}</div>
              <div className="text-xs text-gray-500 mt-2">
                Context used: {chatStatus.data.contextUsed ? 'Yes' : 'No'} | 
                Tokens: {chatStatus.data.usage?.total_tokens || 'N/A'}
              </div>
            </div>
          )}
        </ResultCard>
      </div>

      {/* Quick Setup Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>1. OpenAI API Key:</strong> Add your OpenAI API key to backend/.env (OPENAI_API_KEY)</div>
            <div><strong>2. Pinecone Setup:</strong> Sign up for Pinecone free tier and add API key to backend/.env</div>
            <div><strong>3. Create Index:</strong> Create a Pinecone index named 'wesign-knowledge' with 1536 dimensions</div>
            <div><strong>4. Restart Backend:</strong> Restart the backend server after adding environment variables</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};