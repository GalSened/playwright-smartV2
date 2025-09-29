import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import {
  Brain,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  MessageSquare,
  Zap,
  Copy,
  Code,
  Settings,
  Play,
  Clock,
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb,
  HelpCircle,
  Network,
  Timer,
  BarChart3,
  BookOpen,
  FileText,
  Tag
} from 'lucide-react';
import { apiUrls } from '@/config/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  code?: string;
  metadata?: any;
  // Enhanced RAG data
  ragData?: {
    confidence?: number;
    sources?: number;
    executionTime?: number;
    recommendations?: string[];
    followUpQuestions?: string[];
    relatedTopics?: string[];
    contextSummary?: string;
  };
}

interface KnowledgeStatus {
  success: boolean;
  stats?: {
    configured: {
      openai: boolean;
      pinecone: boolean;
    };
    vectorCount?: number;
  };
}

interface TestGenerationRequest {
  testType: 'playwright' | 'pytest';
  module: string;
  action: string;
  language: 'en' | 'he' | 'both';
  customParams?: {
    selectors?: string[];
    testData?: any;
    assertions?: string[];
    description?: string;
  };
}

interface TestBankOptions {
  addToBank: boolean;
  selectionMode: 'all' | 'selected' | 'single' | 'none';
  selectedTests: string[];
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

interface ParsedTest {
  id: string;
  name: string;
  description: string;
  type: 'setup' | 'test' | 'helper' | 'cleanup';
  selected: boolean;
}

type TabType = 'mentor' | 'generator';

export function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<TabType>('mentor');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeStatus, setKnowledgeStatus] = useState<KnowledgeStatus | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Test Generator state
  const [testGenLoading, setTestGenLoading] = useState(false);
  const [testGenRequest, setTestGenRequest] = useState<TestGenerationRequest>({
    testType: 'pytest',
    module: 'auth',
    action: '',
    language: 'both'
  });
  const [generatedTest, setGeneratedTest] = useState<any>(null);
  const [availableTemplates, setAvailableTemplates] = useState<any>(null);
  const [parsedTests, setParsedTests] = useState<ParsedTest[]>([]);
  const [testBankOptions, setTestBankOptions] = useState<TestBankOptions>({
    addToBank: true,
    selectionMode: 'all',
    selectedTests: [],
    category: 'generated',
    priority: 'medium',
    tags: []
  });

  useEffect(() => {
    checkKnowledgeBase();
    loadTemplates();
    // Add welcome message
    setConversation([{
      role: 'assistant',
      content: 'Welcome to the WeSign Mentor! I can help you with WeSign test automation questions, provide insights about the platform, and guide you through testing best practices. What would you like to know?',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkKnowledgeBase = async () => {
    try {
      const response = await fetch(apiUrls.aiStatsUrl());
      const data = await response.json();
      setKnowledgeStatus(data);
    } catch (error) {
      console.error('Failed to check knowledge base:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(apiUrls.testGeneratorTemplatesUrl());
      const data = await response.json();
      setAvailableTemplates(data.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(apiUrls.aiChatUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          userId: 'frontend-user',
          sessionId: 'main-chat',
          useRAG: true,
          context: {
            source: 'wesign-mentor',
            sessionId: 'main-chat'
          }
        })
      });

      const data = await response.json();

      // Handle complex response object from Enhanced RAG
      let responseContent = 'Sorry, I encountered an error processing your request.';
      if (data.response) {
        if (typeof data.response === 'string') {
          responseContent = data.response;
        } else if (data.response.answer) {
          responseContent = data.response.answer;
        } else if (data.response.content) {
          responseContent = data.response.content;
        } else {
          // If response is an object but doesn't have expected fields, stringify it safely
          responseContent = JSON.stringify(data.response, null, 2);
        }
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        code: data.code,
        metadata: {
          contextUsed: data.contextUsed,
          tokensUsed: data.usage?.total_tokens
        },
        // Enhanced RAG data capture
        ragData: data.response && typeof data.response === 'object' ? {
          confidence: data.response.confidence,
          sources: data.response.sources,
          executionTime: data.response.executionTime,
          recommendations: data.response.recommendations || [],
          followUpQuestions: data.response.followUpQuestions || [],
          relatedTopics: data.response.relatedTopics || [],
          contextSummary: data.response.context ? data.response.context.substring(0, 200) + '...' : undefined
        } : undefined
      };

      setConversation(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the AI service. Please check that the backend is running and configured properly.',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const generateTest = async () => {
    if (!testGenRequest.action.trim() || testGenLoading) return;

    setTestGenLoading(true);
    setGeneratedTest(null);
    setParsedTests([]);

    try {
      const response = await fetch(apiUrls.testGeneratorGenerateUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testGenRequest)
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedTest(data.result);
        // Parse the generated code to extract individual tests
        const parsed = parseGeneratedCode(data.result.code, data.result.testType);
        setParsedTests(parsed);
        // Update test bank options with module-based defaults
        setTestBankOptions(prev => ({
          ...prev,
          category: testGenRequest.module,
          tags: [testGenRequest.module, testGenRequest.language, data.result.testType]
        }));
      } else {
        setGeneratedTest({ error: data.error || 'Test generation failed' });
      }
    } catch (error) {
      setGeneratedTest({ error: 'Failed to connect to test generator service' });
    }

    setTestGenLoading(false);
  };

  const parseGeneratedCode = (code: string, testType: string): ParsedTest[] => {
    const tests: ParsedTest[] = [];
    
    if (testType === 'pytest') {
      // Parse Python test functions
      const testRegex = /def (test_\w+)\([^)]*\):/g;
      const setupRegex = /def (setup_\w+)\([^)]*\):/g;
      const helperRegex = /def (\w+_helper\w*)\([^)]*\):/g;
      
      let match;
      while ((match = testRegex.exec(code)) !== null) {
        tests.push({
          id: match[1],
          name: match[1].replace(/_/g, ' ').replace('test ', ''),
          description: extractDescription(code, match.index),
          type: 'test',
          selected: true
        });
      }
      
      while ((match = setupRegex.exec(code)) !== null) {
        tests.push({
          id: match[1],
          name: match[1].replace(/_/g, ' '),
          description: extractDescription(code, match.index),
          type: 'setup',
          selected: true
        });
      }
      
      while ((match = helperRegex.exec(code)) !== null) {
        tests.push({
          id: match[1],
          name: match[1].replace(/_/g, ' '),
          description: extractDescription(code, match.index),
          type: 'helper',
          selected: false // helpers default to unselected
        });
      }
    } else {
      // Parse TypeScript/Playwright tests
      const testRegex = /test\(['"](.*?)['"],/g;
      const describeRegex = /describe\(['"](.*?)['"],/g;
      
      let match;
      while ((match = testRegex.exec(code)) !== null) {
        tests.push({
          id: `test_${tests.length + 1}`,
          name: match[1],
          description: match[1],
          type: 'test',
          selected: true
        });
      }
      
      while ((match = describeRegex.exec(code)) !== null) {
        tests.push({
          id: `describe_${tests.length + 1}`,
          name: match[1],
          description: `Test suite: ${match[1]}`,
          type: 'setup',
          selected: true
        });
      }
    }
    
    return tests;
  };

  const extractDescription = (code: string, index: number): string => {
    // Look for comments above the function
    const beforeFunction = code.substring(Math.max(0, index - 200), index);
    const commentMatch = beforeFunction.match(/(?:\/\/\s*(.+)|#\s*(.+))\s*$/m);
    return commentMatch ? (commentMatch[1] || commentMatch[2]) : '';
  };

  const toggleTestSelection = (testId: string) => {
    setParsedTests(prev => prev.map(test => 
      test.id === testId ? { ...test, selected: !test.selected } : test
    ));
  };

  const saveToTestBank = async () => {
    if (!generatedTest || testBankOptions.selectionMode === 'none') return;

    const selectedTestIds = testBankOptions.selectionMode === 'all' 
      ? parsedTests.map(t => t.id)
      : testBankOptions.selectionMode === 'selected'
      ? parsedTests.filter(t => t.selected).map(t => t.id)
      : testBankOptions.selectionMode === 'single'
      ? [parsedTests.find(t => t.type === 'test')?.id].filter(Boolean)
      : [];

    try {
      const response = await fetch(apiUrls.testBankGeneratedUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatedCode: generatedTest.code,
          filename: generatedTest.filename,
          testType: generatedTest.testType,
          module: testGenRequest.module,
          action: testGenRequest.action,
          language: testGenRequest.language,
          selectionMode: testBankOptions.selectionMode,
          selectedTests: selectedTestIds,
          metadata: {
            category: testBankOptions.category,
            priority: testBankOptions.priority,
            tags: testBankOptions.tags,
            description: `Generated test for ${testGenRequest.module} - ${testGenRequest.action}`
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        // Show success message or redirect to test bank
        console.log('Successfully added to test bank:', result);
      } else {
        console.error('Failed to add to test bank:', result.error);
      }
    } catch (error) {
      console.error('Error saving to test bank:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleMessageExpansion = (index: number) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence?: number): string => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const shouldShowRAGFeatures = (msg: Message): boolean => {
    return msg.role === 'assistant' &&
           msg.ragData &&
           (msg.ragData.confidence !== undefined ||
            msg.ragData.sources !== undefined ||
            (msg.ragData.recommendations && msg.ragData.recommendations.length > 0) ||
            (msg.ragData.followUpQuestions && msg.ragData.followUpQuestions.length > 0));
  };

  const hasRAGFeatures = (msg: Message): boolean => {
    return shouldShowRAGFeatures(msg);
  };

  const toggleExpanded = (index: number) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleFollowUpClick = (question: string) => {
    setMessage(question);
  };

  const mentorSuggestedQuestions = [
    "What is WeSign and its main business features?",
    "How does document signing workflow work in WeSign?",
    "What are WeSign's contact management capabilities?",
    "How does WeSign handle bilingual Hebrew/English interfaces?",
    "What document templates and merge fields are available?",
    "How does WeSign's payment processing integration work?"
  ];


  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Brain className="w-8 h-8 text-blue-600" />
          AI Testing Assistant
        </h1>
        <p className="text-gray-600">
          WeSign Mentor and Test Generator - your intelligent companion for WeSign test automation.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('mentor')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'mentor'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            WeSign Mentor
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'generator'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code className="w-4 h-4" />
            Test Generator
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {knowledgeStatus?.stats?.configured?.openai ? 
                    <CheckCircle className="w-4 h-4 text-green-500" /> : 
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  }
                  <span className="text-sm">OpenAI: {knowledgeStatus?.stats?.configured?.openai ? 'Connected' : 'Not configured'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {knowledgeStatus?.stats?.configured?.pinecone ? 
                    <CheckCircle className="w-4 h-4 text-green-500" /> : 
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  }
                  <span className="text-sm">Vector DB: {knowledgeStatus?.stats?.configured?.pinecone ? 'Connected' : 'Not configured'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Knowledge Base: {knowledgeStatus?.stats?.vectorCount || 0} documents</span>
                </div>
              </div>
              <button 
                onClick={checkKnowledgeBase}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'mentor' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  WeSign Mentor Conversation
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {conversation.map((msg, index) => {
                    const isExpanded = expandedMessages.has(index);
                    const hasRagData = hasRAGFeatures(msg);

                    return (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {/* Main Message Content */}
                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {/* Code Block */}
                          {msg.code && (
                            <div className="mt-3 p-3 bg-gray-900 text-green-400 rounded text-sm font-mono overflow-x-auto">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">Generated Code:</span>
                                <button
                                  onClick={() => copyToClipboard(msg.code!)}
                                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>
                              </div>
                              <pre>{msg.code}</pre>
                            </div>
                          )}

                          {/* RAG Intelligence Indicators (for assistant messages) */}
                          {msg.role === 'assistant' && hasRagData && (
                            <div className="mt-3 p-3 bg-white bg-opacity-60 rounded-lg border border-gray-200">
                              {/* Smart Indicators Row */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 text-xs">
                                  {/* Confidence Indicator */}
                                  {msg.ragData?.confidence && (
                                    <div className="flex items-center gap-1">
                                      <Target className={`w-3 h-3 ${getConfidenceColor(msg.ragData.confidence)}`} />
                                      <span className={`font-medium ${getConfidenceColor(msg.ragData.confidence)}`}>
                                        {Math.round(msg.ragData.confidence * 100)}% confident
                                      </span>
                                    </div>
                                  )}

                                  {/* Sources Count */}
                                  {msg.ragData?.sources && msg.ragData.sources > 0 && (
                                    <div className="flex items-center gap-1">
                                      <BookOpen className="w-3 h-3 text-blue-500" />
                                      <span className="text-blue-600 font-medium">{msg.ragData.sources} sources</span>
                                    </div>
                                  )}

                                  {/* Execution Time */}
                                  {msg.ragData?.executionTime && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-gray-500" />
                                      <span className="text-gray-600">{msg.ragData.executionTime}ms</span>
                                    </div>
                                  )}
                                </div>

                                {/* Expand Toggle */}
                                <button
                                  onClick={() => toggleExpanded(index)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-3 h-3" />
                                      Less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3" />
                                      More
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Expandable Advanced Features */}
                              {isExpanded && (
                                <div className="space-y-3 border-t border-gray-200 pt-3">
                                  {/* Context Summary */}
                                  {msg.ragData?.contextSummary && (
                                    <div>
                                      <div className="flex items-center gap-1 mb-1">
                                        <FileText className="w-3 h-3 text-purple-500" />
                                        <span className="text-xs font-medium text-purple-600">Knowledge Used:</span>
                                      </div>
                                      <p className="text-xs text-gray-700 bg-purple-50 p-2 rounded">
                                        {msg.ragData.contextSummary}
                                      </p>
                                    </div>
                                  )}

                                  {/* Recommendations */}
                                  {msg.ragData?.recommendations && msg.ragData.recommendations.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-1 mb-2">
                                        <Lightbulb className="w-3 h-3 text-yellow-500" />
                                        <span className="text-xs font-medium text-yellow-600">Recommendations:</span>
                                      </div>
                                      <ul className="space-y-1">
                                        {msg.ragData.recommendations.map((rec, recIndex) => (
                                          <li key={recIndex} className="text-xs text-gray-700 bg-yellow-50 p-2 rounded flex items-start gap-2">
                                            <span className="text-yellow-500 mt-0.5">•</span>
                                            <span>{rec}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Follow-up Questions */}
                                  {msg.ragData?.followUpQuestions && msg.ragData.followUpQuestions.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-1 mb-2">
                                        <HelpCircle className="w-3 h-3 text-green-500" />
                                        <span className="text-xs font-medium text-green-600">Follow-up Questions:</span>
                                      </div>
                                      <div className="space-y-1">
                                        {msg.ragData.followUpQuestions.map((question, qIndex) => (
                                          <button
                                            key={qIndex}
                                            onClick={() => setMessage(question)}
                                            className="block w-full text-left text-xs text-gray-700 bg-green-50 p-2 rounded hover:bg-green-100 transition-colors"
                                          >
                                            {question}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Related Topics */}
                                  {msg.ragData?.relatedTopics && msg.ragData.relatedTopics.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-1 mb-2">
                                        <Tag className="w-3 h-3 text-indigo-500" />
                                        <span className="text-xs font-medium text-indigo-600">Related Topics:</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {msg.ragData.relatedTopics.map((topic, topicIndex) => (
                                          <span
                                            key={topicIndex}
                                            className="inline-block px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full"
                                          >
                                            {topic}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Metadata */}
                          <div className="text-xs mt-2 opacity-70 flex items-center gap-2">
                            <span>{msg.timestamp.toLocaleTimeString()}</span>
                            {msg.metadata?.tokensUsed && <span>• {msg.metadata.tokensUsed} tokens</span>}
                            {msg.role === 'assistant' && hasRagData && !isExpanded && (
                              <span className="text-blue-600 font-medium">• AI Enhanced</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 p-3 rounded-lg flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        WeSign Mentor is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about WeSign testing..."
                    className="flex-1 p-3 border rounded-lg resize-none"
                    rows={2}
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !message.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* WeSign Mentor Suggestions */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">WeSign Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mentorSuggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setMessage(question)}
                      className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 hover:text-gray-900"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Generator Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Test Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Test Framework</label>
                  <select
                    value={testGenRequest.testType}
                    onChange={(e) => setTestGenRequest(prev => ({ ...prev, testType: e.target.value as 'playwright' | 'pytest' }))}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="playwright">Playwright (TypeScript)</option>
                    <option value="pytest">Pytest (Python)</option>
                  </select>
                </div>

                {/* Module */}
                <div>
                  <label className="block text-sm font-medium mb-2">WeSign Module</label>
                  <select
                    value={testGenRequest.module}
                    onChange={(e) => setTestGenRequest(prev => ({ ...prev, module: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  >
                    {availableTemplates?.modules?.map((module: any) => (
                      <option key={module.id} value={module.id}>
                        {module.name} - {module.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action */}
                <div>
                  <label className="block text-sm font-medium mb-2">Test Action Description</label>
                  <textarea
                    value={testGenRequest.action}
                    onChange={(e) => setTestGenRequest(prev => ({ ...prev, action: e.target.value }))}
                    placeholder="Describe the test scenario in detail, e.g.:
• Login with email and password
• Navigate to documents section  
• Upload a PDF file
• Add signature fields
• Send for signing"
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={4}
                  />
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">Quick presets for {availableTemplates?.modules?.find((m: any) => m.id === testGenRequest.module)?.name}:</p>
                    {availableTemplates?.actions?.[testGenRequest.module]?.map((action: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setTestGenRequest(prev => ({ ...prev, action }))}
                        className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded bg-blue-50 hover:bg-blue-100"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium mb-2">Language Support</label>
                  <select
                    value={testGenRequest.language}
                    onChange={(e) => setTestGenRequest(prev => ({ ...prev, language: e.target.value as 'en' | 'he' | 'both' }))}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="both">Bilingual (Hebrew + English)</option>
                    <option value="en">English only</option>
                    <option value="he">Hebrew only</option>
                  </select>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateTest}
                  disabled={testGenLoading || !testGenRequest.action.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {testGenLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Generate Test Code
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Generated Code Display */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Generated Test Code
                  {testGenLoading && (
                    <div className="flex items-center gap-2 ml-auto text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {testGenLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-center">
                      {/* Enhanced Loading Animation */}
                      <div className="relative mb-6">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                        <Brain className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                      </div>
                      
                      {/* Dynamic Loading Messages */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-800">AI is generating your test...</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <p>Analyzing WeSign {testGenRequest.module} module</p>
                          <p>Generating {testGenRequest.testType} test code</p>
                          <p>Applying bilingual {testGenRequest.language} patterns</p>
                        </div>
                      </div>
                      
                      {/* Progress Steps */}
                      <div className="mt-6 w-full max-w-md mx-auto">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                          <span>Processing</span>
                          <span>Generating</span>
                          <span>Finalizing</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-pulse" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                      
                      {/* Estimated Time */}
                      <div className="mt-4 text-xs text-gray-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Estimated time: 5-15 seconds
                      </div>
                    </div>
                  </div>
                ) : generatedTest ? (
                  generatedTest.error ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-red-600">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-medium">Generation Failed</p>
                        <p className="text-sm">{generatedTest.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      {/* Test Metadata */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{generatedTest.filename}</h3>
                          <button 
                            onClick={() => copyToClipboard(generatedTest.code)}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy All
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">{generatedTest.description}</p>
                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                          <span>Framework: {generatedTest.testType}</span>
                          <span>Dependencies: {generatedTest.dependencies?.length || 0}</span>
                        </div>
                      </div>

                      {/* Generated Code */}
                      <div className="flex-1 overflow-hidden">
                        <pre className="h-full p-4 bg-gray-900 text-green-400 rounded-lg text-sm font-mono overflow-auto">
                          <code>{generatedTest.code}</code>
                        </pre>
                      </div>

                      {/* Setup Instructions */}
                      {generatedTest.setupInstructions && generatedTest.setupInstructions.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-2">Setup Instructions:</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            {generatedTest.setupInstructions.map((instruction: string, index: number) => (
                              <li key={index}>• {instruction}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Test Bank Integration */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border-t-4 border-green-500">
                        <div className="flex items-center gap-2 mb-3">
                          <Database className="w-5 h-5 text-green-600" />
                          <h4 className="font-medium text-gray-800">Add to Test Bank</h4>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Add to Bank Toggle */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="addToBank"
                              checked={testBankOptions.addToBank}
                              onChange={(e) => setTestBankOptions(prev => ({ ...prev, addToBank: e.target.checked }))}
                              className="rounded"
                            />
                            <label htmlFor="addToBank" className="text-sm font-medium text-gray-700">
                              Add generated tests to Test Bank
                            </label>
                          </div>

                          {testBankOptions.addToBank && (
                            <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                              {/* Selection Mode */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Selection Mode</label>
                                <div className="space-y-1">
                                  {[
                                    { value: 'all', label: 'All generated tests', desc: `Add all ${parsedTests.length} tests` },
                                    { value: 'selected', label: 'Selected tests only', desc: 'Choose specific tests to add' },
                                    { value: 'single', label: 'Main test only', desc: 'Add only the primary test function' },
                                    { value: 'none', label: 'Just view code', desc: 'Generate code without adding to bank' }
                                  ].map((option) => (
                                    <label key={option.value} className="flex items-start gap-2 text-xs">
                                      <input
                                        type="radio"
                                        name="selectionMode"
                                        value={option.value}
                                        checked={testBankOptions.selectionMode === option.value}
                                        onChange={(e) => setTestBankOptions(prev => ({ ...prev, selectionMode: e.target.value as any }))}
                                        className="mt-0.5"
                                      />
                                      <div>
                                        <div className="font-medium text-gray-700">{option.label}</div>
                                        <div className="text-gray-500">{option.desc}</div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Test Selection (for 'selected' mode) */}
                              {testBankOptions.selectionMode === 'selected' && parsedTests.length > 0 && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-2">Select Tests to Add</label>
                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                    {parsedTests.map((test) => (
                                      <label key={test.id} className="flex items-start gap-2 text-xs p-2 bg-white rounded border">
                                        <input
                                          type="checkbox"
                                          checked={test.selected}
                                          onChange={() => toggleTestSelection(test.id)}
                                          className="mt-0.5"
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700">{test.name}</span>
                                            <span className={`px-1.5 py-0.5 text-xs rounded ${
                                              test.type === 'test' ? 'bg-green-100 text-green-700' :
                                              test.type === 'setup' ? 'bg-blue-100 text-blue-700' :
                                              test.type === 'helper' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {test.type}
                                            </span>
                                          </div>
                                          {test.description && (
                                            <div className="text-gray-500 mt-0.5">{test.description}</div>
                                          )}
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Metadata */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                                  <select
                                    value={testBankOptions.category}
                                    onChange={(e) => setTestBankOptions(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full p-1 text-xs border rounded"
                                  >
                                    <option value="generated">Generated</option>
                                    <option value="auth">Authentication</option>
                                    <option value="documents">Documents</option>
                                    <option value="contacts">Contacts</option>
                                    <option value="templates">Templates</option>
                                    <option value="dashboard">Dashboard</option>
                                    <option value="admin">Administration</option>
                                    <option value="integrations">Integrations</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                                  <select
                                    value={testBankOptions.priority}
                                    onChange={(e) => setTestBankOptions(prev => ({ ...prev, priority: e.target.value as any }))}
                                    className="w-full p-1 text-xs border rounded"
                                  >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                  </select>
                                </div>
                              </div>

                              {/* Tags */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
                                <input
                                  type="text"
                                  value={testBankOptions.tags.join(', ')}
                                  onChange={(e) => setTestBankOptions(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                                  placeholder="smoke, auth, bilingual"
                                  className="w-full p-1 text-xs border rounded"
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={saveToTestBank}
                                  disabled={testBankOptions.selectionMode === 'none' || 
                                    (testBankOptions.selectionMode === 'selected' && parsedTests.filter(t => t.selected).length === 0)}
                                  className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-1"
                                >
                                  <Database className="w-3 h-3" />
                                  Save to Test Bank
                                </button>
                                <button
                                  onClick={() => copyToClipboard(generatedTest.code)}
                                  className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy Code
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Code className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-medium">Ready to Generate</p>
                      <p className="text-sm">Configure your test parameters and click "Generate Test Code"</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}