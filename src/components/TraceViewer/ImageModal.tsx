import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TraceArtifact } from '../../types/trace';
import { formatFileSize, formatTimestamp } from '../../services/traceApi';
import { useToast } from '../../contexts/ToastContext';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Maximize2,
  Info,
  Copy,
  ExternalLink
} from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  images: TraceArtifact[];
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDownload?: (image: TraceArtifact) => void;
  showInfo?: boolean;
}

interface ImageState {
  zoom: number;
  position: { x: number; y: number };
  rotation: number;
  isDragging: boolean;
  dragStart: { x: number; y: number };
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.2;

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
  onDownload,
  showInfo = true
}) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageState, setImageState] = useState<ImageState>({
    zoom: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
    isDragging: false,
    dragStart: { x: 0, y: 0 }
  });

  const [showImageInfo, setShowImageInfo] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentImage = images[currentIndex];

  // Reset image state when switching images
  useEffect(() => {
    setImageState({
      zoom: 1,
      position: { x: 0, y: 0 },
      rotation: 0,
      isDragging: false,
      dragStart: { x: 0, y: 0 }
    });
    setImageLoaded(false);
    setImageError(false);
  }, [currentIndex]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNext();
          break;
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          resetZoom();
          break;
        case 'r':
          event.preventDefault();
          rotate();
          break;
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (onDownload && currentImage) {
              onDownload(currentImage);
            }
          }
          break;
        case 'i':
          event.preventDefault();
          setShowImageInfo(prev => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext, onDownload, currentImage]);

  // Handle mouse wheel for zooming
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (!isOpen || !containerRef.current?.contains(event.target as Node)) return;

      event.preventDefault();
      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      zoom(imageState.zoom + delta, { 
        x: event.clientX, 
        y: event.clientY 
      });
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [isOpen, imageState.zoom]);

  // Handle dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (imageState.zoom <= 1) return;

    event.preventDefault();
    setImageState(prev => ({
      ...prev,
      isDragging: true,
      dragStart: { x: event.clientX, y: event.clientY }
    }));
  }, [imageState.zoom]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!imageState.isDragging) return;

    const deltaX = event.clientX - imageState.dragStart.x;
    const deltaY = event.clientY - imageState.dragStart.y;

    setImageState(prev => ({
      ...prev,
      position: {
        x: prev.position.x + deltaX,
        y: prev.position.y + deltaY
      },
      dragStart: { x: event.clientX, y: event.clientY }
    }));
  }, [imageState.isDragging, imageState.dragStart]);

  const handleMouseUp = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      isDragging: false
    }));
  }, []);

  useEffect(() => {
    if (imageState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [imageState.isDragging, handleMouseMove, handleMouseUp]);

  const zoom = useCallback((newZoom: number, origin?: { x: number; y: number }) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    
    if (origin && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const originX = origin.x - containerRect.left - containerRect.width / 2;
      const originY = origin.y - containerRect.top - containerRect.height / 2;
      
      const zoomRatio = clampedZoom / imageState.zoom;
      const newPosX = originX - (originX - imageState.position.x) * zoomRatio;
      const newPosY = originY - (originY - imageState.position.y) * zoomRatio;
      
      setImageState(prev => ({
        ...prev,
        zoom: clampedZoom,
        position: { x: newPosX, y: newPosY }
      }));
    } else {
      setImageState(prev => ({
        ...prev,
        zoom: clampedZoom
      }));
    }
  }, [imageState.zoom, imageState.position]);

  const zoomIn = useCallback(() => {
    zoom(imageState.zoom + ZOOM_STEP);
  }, [imageState.zoom, zoom]);

  const zoomOut = useCallback(() => {
    zoom(imageState.zoom - ZOOM_STEP);
  }, [imageState.zoom, zoom]);

  const resetZoom = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      zoom: 1,
      position: { x: 0, y: 0 }
    }));
  }, []);

  const fitToScreen = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const image = imageRef.current;
    
    const containerRatio = container.width / container.height;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    
    let newZoom;
    if (imageRatio > containerRatio) {
      // Image is wider
      newZoom = (container.width * 0.9) / image.naturalWidth;
    } else {
      // Image is taller
      newZoom = (container.height * 0.9) / image.naturalHeight;
    }
    
    setImageState(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)),
      position: { x: 0, y: 0 }
    }));
  }, []);

  const rotate = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);

  const copyImageUrl = useCallback(async () => {
    if (!currentImage?.fileUrl) return;
    
    try {
      await navigator.clipboard.writeText(currentImage.fileUrl);
      showToast('Image URL copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      showToast('Failed to copy URL to clipboard', 'error');
    }
  }, [currentImage, showToast]);

  const openInNewTab = useCallback(() => {
    if (currentImage?.fileUrl) {
      window.open(currentImage.fileUrl, '_blank');
    }
  }, [currentImage]);

  if (!isOpen || !currentImage) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onClick={(e) => {
        if (e.target === modalRef.current) {
          onClose();
        }
      }}
      data-testid="image-modal"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black to-transparent">
        <div className="text-white">
          <div className="text-lg font-semibold">{currentImage.name}</div>
          <div className="text-sm opacity-75">
            {currentIndex + 1} of {images.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Info toggle */}
          <button
            onClick={() => setShowImageInfo(prev => !prev)}
            className={`p-2 rounded-lg transition-colors ${
              showImageInfo ? 'bg-blue-600 text-white' : 'bg-black bg-opacity-50 text-white hover:bg-opacity-75'
            }`}
            title="Toggle info (i)"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            title="Previous image (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            title="Next image (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={zoomOut}
            disabled={imageState.zoom <= MIN_ZOOM}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors disabled:opacity-50"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <div className="text-white text-sm bg-black bg-opacity-50 px-3 py-2 rounded-lg">
            {Math.round(imageState.zoom * 100)}%
          </div>

          <button
            onClick={zoomIn}
            disabled={imageState.zoom >= MAX_ZOOM}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors disabled:opacity-50"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          <button
            onClick={resetZoom}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            title="Reset zoom (0)"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            onClick={fitToScreen}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            title="Fit to screen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            onClick={rotate}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            title="Rotate (r)"
          >
            <RotateCw className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-white bg-opacity-30 mx-2" />

          <button
            onClick={copyImageUrl}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            title="Copy URL"
          >
            <Copy className="w-5 h-5" />
          </button>

          <button
            onClick={openInNewTab}
            className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-5 h-5" />
          </button>

          {onDownload && (
            <button
              onClick={() => onDownload(currentImage)}
              className="p-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
              title="Download (Ctrl+D)"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        {/* Loading state */}
        {!imageLoaded && !imageError && (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div>Loading image...</div>
          </div>
        )}

        {/* Error state */}
        {imageError && (
          <div className="text-white text-center">
            <div className="text-red-400 text-6xl mb-4">⚠</div>
            <div>Failed to load image</div>
            <div className="text-sm opacity-75 mt-2">{currentImage.name}</div>
          </div>
        )}

        {/* Image */}
        <img
          ref={imageRef}
          src={currentImage.fileUrl}
          alt={currentImage.name}
          className="max-w-none transition-transform duration-200"
          style={{
            transform: `
              translate(${imageState.position.x}px, ${imageState.position.y}px)
              scale(${imageState.zoom})
              rotate(${imageState.rotation}deg)
            `,
            cursor: imageState.zoom > 1 ? (imageState.isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          draggable={false}
        />
      </div>

      {/* Info panel */}
      {showImageInfo && showInfo && (
        <div className="absolute top-16 right-4 w-80 bg-black bg-opacity-90 text-white rounded-lg p-4 text-sm">
          <div className="space-y-3">
            <div>
              <div className="font-semibold mb-1">Image Details</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-75">Name:</span>
                  <span>{currentImage.name}</span>
                </div>
                {currentImage.width && currentImage.height && (
                  <div className="flex justify-between">
                    <span className="opacity-75">Dimensions:</span>
                    <span>{currentImage.width} × {currentImage.height}</span>
                  </div>
                )}
                {currentImage.fileSize && (
                  <div className="flex justify-between">
                    <span className="opacity-75">Size:</span>
                    <span>{formatFileSize(currentImage.fileSize)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="opacity-75">Format:</span>
                  <span>{currentImage.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-75">Created:</span>
                  <span>{formatTimestamp(currentImage.createdAt)}</span>
                </div>
              </div>
            </div>

            {currentImage.metadata && Object.keys(currentImage.metadata).length > 0 && (
              <div>
                <div className="font-semibold mb-1">Metadata</div>
                <div className="space-y-1 text-xs">
                  {Object.entries(currentImage.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="opacity-75">{key}:</span>
                      <span className="break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="font-semibold mb-1">Keyboard Shortcuts</div>
              <div className="space-y-1 text-xs opacity-75">
                <div>← → Navigate</div>
                <div>+ - Zoom</div>
                <div>0 Reset zoom</div>
                <div>r Rotate</div>
                <div>i Toggle info</div>
                <div>Esc Close</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};