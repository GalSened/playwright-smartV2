import React, { useState, useMemo } from 'react';
import { 
  TraceStep, 
  TraceArtifact, 
  ConsoleLog, 
  NetworkLog, 
  STEP_ACTION_ICONS,
  TRACE_STATUS_COLORS,
  LOG_LEVEL_COLORS,
  isConsoleLog,
  isNetworkLog
} from '../../types/trace';
import { useToast } from '../../contexts/ToastContext';
import { formatDuration, formatFileSize, formatTimestamp } from '../../services/traceApi';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Image,
  Video,
  FileText,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Code,
  Globe,
  Terminal
} from 'lucide-react';

interface StepDetailProps {
  step: TraceStep;
  artifacts?: TraceArtifact[];
  logs?: (ConsoleLog | NetworkLog)[];
  onArtifactClick?: (artifact: TraceArtifact) => void;
  onDownloadArtifact?: (artifact: TraceArtifact) => void;
  className?: string;
}

interface ExpandedSections {
  artifacts: boolean;
  logs: boolean;
  metadata: boolean;
  stackTrace: boolean;
}

export const StepDetail: React.FC<StepDetailProps> = ({
  step,
  artifacts = [],
  logs = [],
  onArtifactClick,
  onDownloadArtifact,
  className = ''
}) => {
  const { showToast } = useToast();
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    artifacts: true,
    logs: step.status === 'failed',
    metadata: false,
    stackTrace: step.status === 'failed' && Boolean(step.stackTrace)
  });

  const [selectedLogTab, setSelectedLogTab] = useState<'console' | 'network'>('console');

  // Separate console and network logs
  const { consoleLogs, networkLogs } = useMemo(() => {
    const console: ConsoleLog[] = [];
    const network: NetworkLog[] = [];
    
    logs.forEach(log => {
      if (isConsoleLog(log)) {
        console.push(log);
      } else if (isNetworkLog(log)) {
        network.push(log);
      }
    });
    
    return { 
      consoleLogs: console.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      networkLogs: network.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    };
  }, [logs]);

  // Group artifacts by type
  const artifactsByType = useMemo(() => {
    const groups: { [key: string]: TraceArtifact[] } = {};
    
    artifacts.forEach(artifact => {
      if (!groups[artifact.artifactType]) {
        groups[artifact.artifactType] = [];
      }
      groups[artifact.artifactType].push(artifact);
    });
    
    return groups;
  }, [artifacts]);

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const getStatusIcon = () => {
    switch (step.status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'timeout':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'skipped':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const renderArtifactItem = (artifact: TraceArtifact) => {
    const getArtifactIcon = () => {
      switch (artifact.artifactType) {
        case 'screenshot':
          return <Image className="w-4 h-4 text-blue-500" />;
        case 'video':
          return <Video className="w-4 h-4 text-purple-500" />;
        case 'log':
        case 'report':
          return <FileText className="w-4 h-4 text-green-500" />;
        default:
          return <FileText className="w-4 h-4 text-gray-500" />;
      }
    };

    return (
      <div
        key={artifact.id}
        className="artifact-item flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {getArtifactIcon()}
          <div>
            <div className="font-medium text-sm">{artifact.name}</div>
            <div className="text-xs text-gray-500">
              {artifact.mimeType}
              {artifact.fileSize && ` • ${formatFileSize(artifact.fileSize)}`}
              {artifact.width && artifact.height && ` • ${artifact.width}×${artifact.height}`}
              {artifact.duration && ` • ${formatDuration(artifact.duration)}`}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {(artifact.artifactType === 'screenshot' || artifact.artifactType === 'video') && onArtifactClick && (
            <button
              onClick={() => onArtifactClick(artifact)}
              className="btn-icon-sm"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          
          {onDownloadArtifact && (
            <button
              onClick={() => onDownloadArtifact(artifact)}
              className="btn-icon-sm"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderConsoleLog = (log: ConsoleLog) => {
    return (
      <div key={log.id} className="log-item border-l-4 border-l-blue-200 pl-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-4 h-4" />
          <span className={`text-sm font-medium ${LOG_LEVEL_COLORS[log.level] || 'text-gray-600'}`}>
            {log.level.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">
            {formatTimestamp(log.timestamp)}
          </span>
          {log.url && (
            <button
              onClick={() => copyToClipboard(log.url!)}
              className="text-xs text-blue-600 hover:text-blue-700"
              title="Copy URL"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded mb-2">
          {log.message}
        </div>
        
        {log.stackTrace && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 mb-1">Stack trace</summary>
            <pre className="bg-gray-50 p-2 rounded overflow-x-auto text-gray-700">
              {log.stackTrace}
            </pre>
          </details>
        )}
        
        {log.args && log.args.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 mb-1">Arguments</summary>
            <pre className="bg-gray-50 p-2 rounded overflow-x-auto text-gray-700">
              {JSON.stringify(log.args, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };

  const renderNetworkLog = (log: NetworkLog) => {
    const getStatusColor = () => {
      if (log.failed) return 'text-red-600';
      if (!log.statusCode) return 'text-gray-600';
      if (log.statusCode >= 400) return 'text-red-600';
      if (log.statusCode >= 300) return 'text-yellow-600';
      return 'text-green-600';
    };

    return (
      <div key={log.id} className="log-item border-l-4 border-l-green-200 pl-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium text-gray-900">
            {log.method}
          </span>
          {log.statusCode && (
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {log.statusCode} {log.statusText}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {formatTimestamp(log.timestamp)}
          </span>
          {log.duration && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {formatDuration(log.duration)}
            </span>
          )}
        </div>
        
        <div className="text-sm text-gray-900 mb-2 break-all">
          <button
            onClick={() => copyToClipboard(log.url)}
            className="text-blue-600 hover:text-blue-700"
            title="Copy URL"
          >
            {log.url}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs">
          {log.requestSize && (
            <div>
              <span className="text-gray-600">Request: </span>
              <span>{formatFileSize(log.requestSize)}</span>
            </div>
          )}
          {log.responseSize && (
            <div>
              <span className="text-gray-600">Response: </span>
              <span>{formatFileSize(log.responseSize)}</span>
            </div>
          )}
        </div>
        
        {(log.requestBody || log.responseBody || log.requestHeaders || log.responseHeaders) && (
          <details className="mt-2">
            <summary className="cursor-pointer text-gray-600 mb-1">Request/Response details</summary>
            <div className="space-y-2">
              {log.requestHeaders && (
                <div>
                  <div className="font-medium text-gray-700">Request Headers:</div>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.requestHeaders, null, 2)}
                  </pre>
                </div>
              )}
              {log.requestBody && (
                <div>
                  <div className="font-medium text-gray-700">Request Body:</div>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                    {typeof log.requestBody === 'string' ? log.requestBody : JSON.stringify(log.requestBody, null, 2)}
                  </pre>
                </div>
              )}
              {log.responseHeaders && (
                <div>
                  <div className="font-medium text-gray-700">Response Headers:</div>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.responseHeaders, null, 2)}
                  </pre>
                </div>
              )}
              {log.responseBody && (
                <div>
                  <div className="font-medium text-gray-700">Response Body:</div>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                    {typeof log.responseBody === 'string' ? log.responseBody : JSON.stringify(log.responseBody, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
        
        {log.failureReason && (
          <div className="mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
            <strong>Error:</strong> {log.failureReason}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`step-detail bg-white border rounded-lg ${className}`} data-testid="step-detail">
      {/* Header */}
      <div className="step-header p-4 border-b">
        <div className="flex items-start gap-3">
          {/* Action icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
            {STEP_ACTION_ICONS[step.actionType || 'action'] || '⚡'}
          </div>
          
          {/* Step info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <h3 className="text-lg font-semibold text-gray-900">
                {step.actionName}
              </h3>
              <span className="text-sm text-gray-500">
                Step {step.stepIndex + 1}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Test:</strong> {step.testName}</div>
              {step.selector && (
                <div className="flex items-center gap-2">
                  <strong>Selector:</strong>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {step.selector}
                  </code>
                  <button
                    onClick={() => copyToClipboard(step.selector)}
                    className="btn-icon-xs"
                    title="Copy selector"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
              {step.url && (
                <div className="flex items-center gap-2">
                  <strong>URL:</strong>
                  <span className="break-all">{step.url}</span>
                  <button
                    onClick={() => copyToClipboard(step.url!)}
                    className="btn-icon-xs"
                    title="Copy URL"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Timing info */}
          <div className="text-right text-sm text-gray-600">
            <div className="mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              {step.duration ? formatDuration(step.duration) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">
              {formatTimestamp(step.startedAt)}
            </div>
            {step.retryCount > 0 && (
              <div className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                <RotateCcw className="w-3 h-3" />
                {step.retryCount} retries
              </div>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {step.errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-red-900 mb-1">Error</div>
                <div className="text-red-800 text-sm">{step.errorMessage}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Expected vs Actual values */}
        {(step.expectedValue || step.actualValue) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {step.expectedValue && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-900 mb-1">Expected</div>
                <pre className="text-green-800 text-sm overflow-x-auto">
                  {step.expectedValue}
                </pre>
              </div>
            )}
            {step.actualValue && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-medium text-red-900 mb-1">Actual</div>
                <pre className="text-red-800 text-sm overflow-x-auto">
                  {step.actualValue}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Artifacts section */}
      {artifacts.length > 0 && (
        <div className="artifacts-section border-b">
          <button
            onClick={() => toggleSection('artifacts')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              {expandedSections.artifacts ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">Artifacts ({artifacts.length})</span>
            </div>
          </button>
          
          {expandedSections.artifacts && (
            <div className="px-4 pb-4">
              {Object.entries(artifactsByType).map(([type, typeArtifacts]) => (
                <div key={type} className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2 capitalize">
                    {type}s ({typeArtifacts.length})
                  </div>
                  <div className="space-y-2">
                    {typeArtifacts.map(renderArtifactItem)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs section */}
      {(consoleLogs.length > 0 || networkLogs.length > 0) && (
        <div className="logs-section border-b">
          <button
            onClick={() => toggleSection('logs')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              {expandedSections.logs ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">
                Logs ({consoleLogs.length + networkLogs.length})
              </span>
            </div>
          </button>
          
          {expandedSections.logs && (
            <div className="px-4 pb-4">
              {/* Log tabs */}
              <div className="flex border-b mb-4">
                <button
                  onClick={() => setSelectedLogTab('console')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    selectedLogTab === 'console'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Console ({consoleLogs.length})
                </button>
                <button
                  onClick={() => setSelectedLogTab('network')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    selectedLogTab === 'network'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Network ({networkLogs.length})
                </button>
              </div>
              
              {/* Log content */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {selectedLogTab === 'console' && consoleLogs.map(renderConsoleLog)}
                {selectedLogTab === 'network' && networkLogs.map(renderNetworkLog)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stack trace section */}
      {step.stackTrace && (
        <div className="stacktrace-section border-b">
          <button
            onClick={() => toggleSection('stackTrace')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              {expandedSections.stackTrace ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">Stack Trace</span>
            </div>
          </button>
          
          {expandedSections.stackTrace && (
            <div className="px-4 pb-4">
              <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 overflow-x-auto">
                {step.stackTrace}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Metadata section */}
      <div className="metadata-section">
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            {expandedSections.metadata ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span className="font-medium">Metadata</span>
          </div>
        </button>
        
        {expandedSections.metadata && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Step ID:</div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{step.id}</code>
              </div>
              <div>
                <div className="text-gray-600">Run ID:</div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{step.runId}</code>
              </div>
              {step.testId && (
                <div>
                  <div className="text-gray-600">Test ID:</div>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{step.testId}</code>
                </div>
              )}
              <div>
                <div className="text-gray-600">Created:</div>
                <span className="text-xs">{formatTimestamp(step.createdAt)}</span>
              </div>
              {step.videoTimestamp && (
                <div>
                  <div className="text-gray-600">Video Time:</div>
                  <span className="text-xs">{step.videoTimestamp.toFixed(2)}s</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};