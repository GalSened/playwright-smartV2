import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TimelineItem, STEP_ACTION_ICONS, TRACE_STATUS_COLORS } from '../../types/trace';
import { formatDuration } from '../../services/traceApi';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Activity,
  Network,
  FileText,
  Image,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface TimelineViewProps {
  timeline: TimelineItem[];
  selectedStepId?: string;
  onStepSelect: (stepId: string) => void;
  onTimeSelect: (timestamp: string) => void;
  videoCurrentTime?: number;
  className?: string;
  showFilters?: boolean;
  autoFollow?: boolean;
}

interface TimelineFilters {
  types: string[];
  statuses: string[];
  search: string;
  showOnlyErrors: boolean;
  groupByTest: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline,
  selectedStepId,
  onStepSelect,
  onTimeSelect,
  videoCurrentTime,
  className = '',
  showFilters = true,
  autoFollow = false
}) => {
  const [filters, setFilters] = useState<TimelineFilters>({
    types: ['step', 'log', 'network'],
    statuses: [],
    search: '',
    showOnlyErrors: false,
    groupByTest: false
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (timeline.length === 0) return { start: 0, end: 0, duration: 0 };

    const timestamps = timeline.map(item => new Date(item.timestamp).getTime());
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    
    return {
      start,
      end,
      duration: end - start
    };
  }, [timeline]);

  // Filter timeline items
  const filteredTimeline = useMemo(() => {
    return timeline.filter(item => {
      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(item.type)) {
        return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(item.status || 'info')) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchable = `${item.title} ${item.description || ''}`.toLowerCase();
        if (!searchable.includes(searchLower)) {
          return false;
        }
      }

      // Error filter
      if (filters.showOnlyErrors && item.status !== 'failed') {
        return false;
      }

      return true;
    });
  }, [timeline, filters]);

  // Group timeline items by test if requested
  const groupedTimeline = useMemo(() => {
    if (!filters.groupByTest) {
      return { ungrouped: filteredTimeline };
    }

    const groups: { [key: string]: TimelineItem[] } = {};
    
    filteredTimeline.forEach(item => {
      // Extract test name from step metadata or use a default group
      const testName = item.metadata?.testName || 
                     item.title.split(' - ')[0] || 
                     'Unknown Test';
      
      if (!groups[testName]) {
        groups[testName] = [];
      }
      groups[testName].push(item);
    });

    return groups;
  }, [filteredTimeline, filters.groupByTest]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedItemRef.current && autoFollow) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedStepId, autoFollow]);

  // Auto-playback functionality
  useEffect(() => {
    if (!isPlaying || filteredTimeline.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTimelineIndex(prev => {
        const next = prev + 1;
        if (next >= filteredTimeline.length) {
          setIsPlaying(false);
          return prev;
        }
        
        const nextItem = filteredTimeline[next];
        onTimeSelect(nextItem.timestamp);
        if (nextItem.stepId) {
          onStepSelect(nextItem.stepId);
        }
        
        return next;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, filteredTimeline, onTimeSelect, onStepSelect]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleStepForward = useCallback(() => {
    const nextIndex = Math.min(currentTimelineIndex + 1, filteredTimeline.length - 1);
    setCurrentTimelineIndex(nextIndex);
    const item = filteredTimeline[nextIndex];
    onTimeSelect(item.timestamp);
    if (item.stepId) {
      onStepSelect(item.stepId);
    }
  }, [currentTimelineIndex, filteredTimeline, onTimeSelect, onStepSelect]);

  const handleStepBack = useCallback(() => {
    const prevIndex = Math.max(currentTimelineIndex - 1, 0);
    setCurrentTimelineIndex(prevIndex);
    const item = filteredTimeline[prevIndex];
    onTimeSelect(item.timestamp);
    if (item.stepId) {
      onStepSelect(item.stepId);
    }
  }, [currentTimelineIndex, filteredTimeline, onTimeSelect, onStepSelect]);

  const handleItemClick = useCallback((item: TimelineItem, index: number) => {
    setCurrentTimelineIndex(index);
    onTimeSelect(item.timestamp);
    if (item.stepId) {
      onStepSelect(item.stepId);
    }
  }, [onTimeSelect, onStepSelect]);

  const toggleGroupExpansion = useCallback((groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  const getItemIcon = (item: TimelineItem) => {
    switch (item.type) {
      case 'step':
        return STEP_ACTION_ICONS[item.metadata?.actionType || 'action'] || '⚡';
      case 'log':
        return '📝';
      case 'network':
        return '🌐';
      case 'performance':
        return '📊';
      default:
        return '❓';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderTimelineItem = (item: TimelineItem, index: number, isSelected: boolean) => {
    return (
      <div
        key={item.id}
        ref={isSelected ? selectedItemRef : undefined}
        className={`timeline-item border-l-4 pl-4 py-3 cursor-pointer transition-all hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50 border-l-blue-500' : 'border-l-gray-200'
        } ${item.status ? TRACE_STATUS_COLORS[item.status] || '' : ''}`}
        onClick={() => handleItemClick(item, index)}
        data-testid="timeline-item"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
            {getItemIcon(item)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(item.status)}
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {item.title}
              </h4>
              <span className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              {item.duration && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {formatDuration(item.duration)}
                </span>
              )}
            </div>
            
            {item.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Artifacts preview */}
            {item.artifacts && item.artifacts.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {item.artifacts.map(artifact => (
                  <div
                    key={artifact.id}
                    className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                  >
                    {artifact.artifactType === 'screenshot' && <Image className="w-3 h-3" />}
                    {artifact.artifactType === 'video' && <Play className="w-3 h-3" />}
                    {artifact.artifactType === 'log' && <FileText className="w-3 h-3" />}
                    <span>{artifact.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Metadata */}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                {item.metadata.selector && (
                  <div>Selector: <code className="bg-gray-100 px-1 rounded">{item.metadata.selector}</code></div>
                )}
                {item.metadata.url && (
                  <div>URL: <span className="break-all">{item.metadata.url}</span></div>
                )}
                {item.metadata.retryCount > 0 && (
                  <div>Retries: {item.metadata.retryCount}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedTimeline = () => {
    return Object.entries(groupedTimeline).map(([groupName, items]) => {
      if (groupName === 'ungrouped') {
        return items.map((item, index) => {
          const isSelected = selectedStepId === item.stepId;
          return renderTimelineItem(item, index, isSelected);
        });
      }

      const isExpanded = expandedGroups.has(groupName);
      const hasErrors = items.some(item => item.status === 'failed');

      return (
        <div key={groupName} className="mb-4">
          {/* Group header */}
          <div
            className={`group-header flex items-center gap-2 p-3 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100 ${
              hasErrors ? 'border-red-200 bg-red-50' : 'border-gray-200'
            }`}
            onClick={() => toggleGroupExpansion(groupName)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span className="font-medium text-gray-900">{groupName}</span>
            <span className="text-sm text-gray-500">({items.length} items)</span>
            {hasErrors && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>

          {/* Group items */}
          {isExpanded && (
            <div className="ml-4 mt-2 border-l-2 border-gray-100">
              {items.map((item, index) => {
                const isSelected = selectedStepId === item.stepId;
                return renderTimelineItem(item, index, isSelected);
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`timeline-view flex flex-col h-full ${className}`} data-testid="timeline-view">
      {/* Header with controls */}
      <div className="timeline-header border-b bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Timeline</h3>
          
          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStepBack}
              className="btn-icon"
              disabled={currentTimelineIndex === 0}
              title="Previous step"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="btn-icon"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleStepForward}
              className="btn-icon"
              disabled={currentTimelineIndex >= filteredTimeline.length - 1}
              title="Next step"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
              title="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="timeline-filters space-y-3">
            {/* Search and quick filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Search timeline..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="text-sm border rounded px-3 py-1 w-64"
              />
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.showOnlyErrors}
                  onChange={(e) => setFilters(prev => ({ ...prev, showOnlyErrors: e.target.checked }))}
                />
                Errors only
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.groupByTest}
                  onChange={(e) => setFilters(prev => ({ ...prev, groupByTest: e.target.checked }))}
                />
                Group by test
              </label>
            </div>

            {/* Type filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Show:</span>
              {[
                { type: 'step', label: 'Steps', icon: Activity },
                { type: 'log', label: 'Logs', icon: FileText },
                { type: 'network', label: 'Network', icon: Network },
                { type: 'performance', label: 'Performance', icon: Activity }
              ].map(({ type, label, icon: Icon }) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={(e) => {
                      setFilters(prev => ({
                        ...prev,
                        types: e.target.checked
                          ? [...prev.types, type]
                          : prev.types.filter(t => t !== type)
                      }));
                    }}
                  />
                  <Icon className="w-4 h-4" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Timeline stats */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredTimeline.length} of {timeline.length} events
          {timelineBounds.duration > 0 && (
            <span> • Duration: {formatDuration(timelineBounds.duration)}</span>
          )}
        </div>
      </div>

      {/* Timeline content */}
      <div
        ref={timelineRef}
        className="timeline-content flex-1 overflow-y-auto p-4"
        data-testid="timeline-content"
      >
        {filteredTimeline.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No timeline events match your filters</p>
            <button
              onClick={() => setFilters({
                types: ['step', 'log', 'network'],
                statuses: [],
                search: '',
                showOnlyErrors: false,
                groupByTest: false
              })}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="timeline-items space-y-2">
            {renderGroupedTimeline()}
          </div>
        )}
      </div>
    </div>
  );
};