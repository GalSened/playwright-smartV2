// Centralized API configuration for consistent endpoint management
// This ensures all frontend components use the correct backend port

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081',
  ENDPOINTS: {
    // Core API endpoints
    ANALYTICS: '/api/analytics',
    TESTS: '/api/tests',
    SUITES: '/api/tests/suites',
    EXECUTE: '/api/execute',
    
    // AI and Intelligence endpoints
    AI_STATS: '/api/ai/stats',
    AI_CHAT: '/api/ai/chat',
    AI_TEST: '/api/ai/test',
    AI_INGEST: '/api/ai/ingest',
    AI_SEARCH: '/api/ai/search',
    
    // JIRA Integration endpoints  
    JIRA_CONFIG: '/api/jira/config',
    JIRA_HEALTH: '/api/jira/health',
    JIRA_MAPPINGS: '/api/jira/mappings',
    JIRA_TEST_CONNECTION: '/api/jira/test-connection',
    JIRA_ISSUES: '/api/jira/issues',
    
    // Self-healing endpoints
    HEALING_STATS: '/api/healing/stats',
    HEALING_QUEUE: '/api/healing/queue',
    
    // Knowledge management endpoints
    KNOWLEDGE_LIST: '/api/knowledge/list',
    KNOWLEDGE_STATS: '/api/knowledge/stats',
    KNOWLEDGE_UPLOAD: '/api/knowledge/upload',
    KNOWLEDGE_EXTRACT: '/api/knowledge/extract',
    KNOWLEDGE_SEARCH: '/api/knowledge/search',
    
    // Sub-agents endpoints
    SUB_AGENTS_STATUS: '/api/sub-agents/status',
    SUB_AGENTS_WORKFLOW_TEMPLATES: '/api/sub-agents/workflow-templates',
    SUB_AGENTS_TEST_DATA: '/api/sub-agents/test-data',
    SUB_AGENTS_ANALYTICS: '/api/sub-agents/test-data/analytics',
    SUB_AGENTS_METRICS: '/api/sub-agents/metrics',
    SUB_AGENTS_SCAN: '/api/sub-agents/test-data/scan',
    SUB_AGENTS_EXECUTE_TEMPLATE: '/api/sub-agents/execute-template',
    
    // Test generator endpoints
    TEST_GENERATOR_TEMPLATES: '/api/test-generator/templates',
    TEST_GENERATOR_GENERATE: '/api/test-generator/generate',
    TEST_BANK_GENERATED: '/api/test-bank/generated',
    
    // Test execution endpoints
    TESTS_RUN: '/api/tests/run',
    TESTS_CATEGORIES: '/api/tests/categories/list',
    TESTS_TAGS: '/api/tests/tags/list',
    
    // Healing test scenario endpoint
    HEALING_TEST_SCENARIO: '/api/healing/test-scenario'
  }
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

// Export individual endpoint builders for convenience
export const apiUrls = {
  // Analytics
  analyticsSmartUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.ANALYTICS + '/smart'),
  
  // Tests
  testsAllUrl: (params?: Record<string, string>) => buildApiUrl(API_CONFIG.ENDPOINTS.TESTS + '/all', params),
  testsCategoriesListUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.TESTS_CATEGORIES),
  testsTagsListUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.TESTS_TAGS),
  testsRunUrl: (testId: string) => buildApiUrl(`${API_CONFIG.ENDPOINTS.TESTS_RUN}/${testId}`),
  
  // Suites
  suitesListUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.SUITES + '/list'),
  suitesQuickUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.SUITES + '/quick'),
  
  // AI
  aiStatsUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.AI_STATS),
  aiChatUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.AI_CHAT),
  aiTestUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.AI_TEST),
  aiIngestUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.AI_INGEST),
  aiSearchUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.AI_SEARCH),
  
  // Test Generator
  testGeneratorTemplatesUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.TEST_GENERATOR_TEMPLATES),
  testGeneratorGenerateUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.TEST_GENERATOR_GENERATE),
  testBankGeneratedUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.TEST_BANK_GENERATED),
  
  // JIRA
  jiraConfigUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.JIRA_CONFIG),
  jiraHealthUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.JIRA_HEALTH),
  jiraMappingsUrl: (params?: Record<string, string>) => buildApiUrl(API_CONFIG.ENDPOINTS.JIRA_MAPPINGS, params),
  jiraTestConnectionUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.JIRA_TEST_CONNECTION),
  jiraIssuesUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.JIRA_ISSUES),
  
  // Self-healing
  healingStatsUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.HEALING_STATS),
  healingQueueUrl: (params?: Record<string, string>) => buildApiUrl(API_CONFIG.ENDPOINTS.HEALING_QUEUE, params),
  healingTestScenarioUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.HEALING_TEST_SCENARIO),
  
  // Knowledge
  knowledgeListUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.KNOWLEDGE_LIST),
  knowledgeStatsUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.KNOWLEDGE_STATS),
  knowledgeUploadUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.KNOWLEDGE_UPLOAD),
  knowledgeExtractUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.KNOWLEDGE_EXTRACT),
  knowledgeSearchUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.KNOWLEDGE_SEARCH),
  knowledgeDeleteUrl: (source: string) => buildApiUrl(`${API_CONFIG.ENDPOINTS.KNOWLEDGE_LIST}/${encodeURIComponent(source)}`),
  knowledgeCategoryUrl: (categoryName: string) => buildApiUrl(`/api/knowledge/category/${categoryName}`),
  
  // Sub-agents
  subAgentsStatusUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.SUB_AGENTS_STATUS),
  subAgentsWorkflowTemplatesUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.SUB_AGENTS_WORKFLOW_TEMPLATES),
  subAgentsTestDataUrl: (params?: Record<string, string>) => buildApiUrl(API_CONFIG.ENDPOINTS.SUB_AGENTS_TEST_DATA, params),
  subAgentsAnalyticsUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.SUB_AGENTS_ANALYTICS),
  subAgentsMetricsUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.SUB_AGENTS_METRICS),
  subAgentsScanUrl: () => buildApiUrl(API_CONFIG.ENDPOINTS.SUB_AGENTS_SCAN),
  subAgentsExecuteTemplateUrl: (templateId: string) => buildApiUrl(`${API_CONFIG.ENDPOINTS.SUB_AGENTS_EXECUTE_TEMPLATE}/${templateId}`)
};

export default API_CONFIG;