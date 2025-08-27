import React, { useState, useMemo, useCallback } from 'react';
import { TraceArtifact } from '../../types/trace';
import { formatFileSize, formatTimestamp } from '../../services/traceApi';
import { 
  Image, 
  Video, 
  FileText, 
  Download, 
  Eye,
  Play,
  Grid3X3,
  List,
  Filter,
  Search,
  X
} from 'lucide-react';

interface MediaGalleryProps {
  artifacts: TraceArtifact[];
  selectedArtifactId?: string;
  onArtifactSelect?: (artifact: TraceArtifact) => void;
  onDownload?: (artifact: TraceArtifact) => void;
  onPreview?: (artifact: TraceArtifact) => void;
  className?: string;
  viewMode?: 'grid' | 'list';
}

interface GalleryFilters {
  type: string;
  search: string;
  sortBy: 'name' | 'created' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
}

type ArtifactWithPreview = TraceArtifact & {
  previewUrl?: string;
};

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  artifacts,
  selectedArtifactId,
  onArtifactSelect,
  onDownload,
  onPreview,
  className = '',
  viewMode: initialViewMode = 'grid'
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [filters, setFilters] = useState<GalleryFilters>({
    type: 'all',
    search: '',
    sortBy: 'created',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Process artifacts to add preview URLs
  const processedArtifacts = useMemo<ArtifactWithPreview[]>(() => {
    return artifacts.map(artifact => ({
      ...artifact,
      previewUrl: artifact.thumbnailUrl || artifact.fileUrl
    }));
  }, [artifacts]);

  // Filter and sort artifacts
  const filteredArtifacts = useMemo(() => {
    let filtered = processedArtifacts;

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(artifact => artifact.artifactType === filters.type);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(artifact =>
        artifact.name.toLowerCase().includes(searchLower) ||
        artifact.artifactType.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'size':
          aValue = a.fileSize || 0;
          bValue = b.fileSize || 0;
          break;
        case 'type':
          aValue = a.artifactType;
          bValue = b.artifactType;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [processedArtifacts, filters]);

  // Group artifacts by type for stats
  const artifactStats = useMemo(() => {
    const stats = {
      total: artifacts.length,
      screenshot: 0,
      video: 0,
      log: 0,
      report: 0,
      trace: 0,
      network: 0,
      console: 0
    };

    artifacts.forEach(artifact => {
      if (stats.hasOwnProperty(artifact.artifactType)) {
        (stats as any)[artifact.artifactType]++;
      }
    });

    return stats;
  }, [artifacts]);

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
        return <Image className="w-4 h-4 text-blue-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'log':
      case 'report':
      case 'trace':
      case 'network':
      case 'console':
        return <FileText className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleArtifactClick = useCallback((artifact: TraceArtifact, action: 'select' | 'preview' = 'select') => {
    if (action === 'preview' && onPreview) {
      onPreview(artifact);
    } else if (onArtifactSelect) {
      onArtifactSelect(artifact);
    }
  }, [onArtifactSelect, onPreview]);

  const renderGridItem = (artifact: ArtifactWithPreview) => {
    const isSelected = selectedArtifactId === artifact.id;
    const isImage = artifact.artifactType === 'screenshot';
    const isVideo = artifact.artifactType === 'video';

    return (
      <div
        key={artifact.id}
        className={`gallery-item relative group rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handleArtifactClick(artifact)}
        data-testid={`gallery-item-${artifact.id}`}
      >
        {/* Preview area */}
        <div className="aspect-video bg-gray-100 relative overflow-hidden">
          {(isImage || isVideo) && artifact.previewUrl ? (
            <>
              <img
                src={artifact.previewUrl}
                alt={artifact.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Fallback to icon if preview fails
                  (e.target as HTMLImageElement).style.display = 'none';
                  e.currentTarget.parentElement!.querySelector('.fallback-icon')!.classList.remove('hidden');
                }}
              />
              <div className="fallback-icon hidden absolute inset-0 flex items-center justify-center text-gray-400">
                {getArtifactIcon(artifact.artifactType)}
              </div>
              
              {/* Video indicator */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <Play className="w-8 h-8 text-white" />
                </div>
              )}

              {/* Duration overlay for videos */}
              {isVideo && artifact.duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {Math.round(artifact.duration / 1000)}s
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {getArtifactIcon(artifact.artifactType)}
            </div>
          )}

          {/* Overlay actions */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              {(isImage || isVideo) && onPreview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArtifactClick(artifact, 'preview');
                  }}
                  className="p-2 bg-white bg-opacity-90 text-gray-800 rounded-full hover:bg-opacity-100 transition-colors"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              
              {onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(artifact);
                  }}
                  className="p-2 bg-white bg-opacity-90 text-gray-800 rounded-full hover:bg-opacity-100 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info area */}
        <div className="p-3">
          <div className="flex items-start gap-2 mb-2">
            {getArtifactIcon(artifact.artifactType)}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate" title={artifact.name}>
                {artifact.name}
              </div>
              <div className="text-xs text-gray-500">
                {artifact.artifactType}
                {artifact.fileSize && ` • ${formatFileSize(artifact.fileSize)}`}
              </div>
            </div>
          </div>

          {/* Dimensions for images */}
          {artifact.width && artifact.height && (
            <div className="text-xs text-gray-500 mb-1">
              {artifact.width} × {artifact.height}
            </div>
          )}

          <div className="text-xs text-gray-400">
            {formatTimestamp(artifact.createdAt)}
          </div>
        </div>
      </div>
    );
  };

  const renderListItem = (artifact: ArtifactWithPreview) => {
    const isSelected = selectedArtifactId === artifact.id;

    return (
      <div
        key={artifact.id}
        className={`gallery-list-item flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
        }`}
        onClick={() => handleArtifactClick(artifact)}
        data-testid={`gallery-list-item-${artifact.id}`}
      >
        {/* Thumbnail */}
        <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
          {artifact.previewUrl && (artifact.artifactType === 'screenshot' || artifact.artifactType === 'video') ? (
            <img
              src={artifact.previewUrl}
              alt={artifact.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {getArtifactIcon(artifact.artifactType)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getArtifactIcon(artifact.artifactType)}
            <div className="font-medium text-gray-900 truncate">{artifact.name}</div>
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-4">
              <span>Type: {artifact.artifactType}</span>
              {artifact.fileSize && <span>Size: {formatFileSize(artifact.fileSize)}</span>}
              {artifact.width && artifact.height && (
                <span>Dimensions: {artifact.width} × {artifact.height}</span>
              )}
              {artifact.duration && (
                <span>Duration: {Math.round(artifact.duration / 1000)}s</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Created: {formatTimestamp(artifact.createdAt)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(artifact.artifactType === 'screenshot' || artifact.artifactType === 'video') && onPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleArtifactClick(artifact, 'preview');
              }}
              className="btn-icon-sm"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          
          {onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(artifact);
              }}
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

  if (artifacts.length === 0) {
    return (
      <div className={`media-gallery-empty text-center py-8 ${className}`}>
        <div className="text-gray-400 mb-4">
          <Image className="w-16 h-16 mx-auto mb-2" />
        </div>
        <div className="text-gray-600 mb-2">No media artifacts found</div>
        <div className="text-sm text-gray-500">Screenshots, videos, and other artifacts will appear here</div>
      </div>
    );
  }

  return (
    <div className={`media-gallery ${className}`} data-testid="media-gallery">
      {/* Header */}
      <div className="gallery-header border-b bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Media Gallery</h3>
            <div className="text-sm text-gray-600">
              {filteredArtifacts.length} of {artifacts.length} artifacts
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-icon ${showFilters ? 'text-blue-600' : 'text-gray-600'}`}
              title="Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="gallery-filters border rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search artifacts..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Type filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">All Types ({artifactStats.total})</option>
                  {artifactStats.screenshot > 0 && (
                    <option value="screenshot">Screenshots ({artifactStats.screenshot})</option>
                  )}
                  {artifactStats.video > 0 && (
                    <option value="video">Videos ({artifactStats.video})</option>
                  )}
                  {artifactStats.log > 0 && (
                    <option value="log">Logs ({artifactStats.log})</option>
                  )}
                  {artifactStats.report > 0 && (
                    <option value="report">Reports ({artifactStats.report})</option>
                  )}
                  {artifactStats.trace > 0 && (
                    <option value="trace">Traces ({artifactStats.trace})</option>
                  )}
                </select>
              </div>

              {/* Sort by */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="created">Created Date</option>
                  <option value="name">Name</option>
                  <option value="size">File Size</option>
                  <option value="type">Type</option>
                </select>
              </div>

              {/* Sort order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gallery content */}
      <div className="gallery-content p-4">
        {filteredArtifacts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto mb-2" />
            </div>
            <div className="text-gray-600 mb-2">No artifacts match your filters</div>
            <button
              onClick={() => setFilters({
                type: 'all',
                search: '',
                sortBy: 'created',
                sortOrder: 'desc'
              })}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className={`gallery-grid ${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
              : 'space-y-2'
          }`}>
            {filteredArtifacts.map(artifact =>
              viewMode === 'grid' ? renderGridItem(artifact) : renderListItem(artifact)
            )}
          </div>
        )}
      </div>
    </div>
  );
};