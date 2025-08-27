import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { TimelineItem, MediaPlayerState } from '../../types/trace';
import { formatDuration } from '../../services/traceApi';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipForward, 
  SkipBack, 
  Maximize, 
  Minimize,
  Settings,
  MousePointer,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  timeline?: TimelineItem[];
  currentStepId?: string;
  onStepClick?: (stepId: string, timestamp: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
  autoplay?: boolean;
  className?: string;
  poster?: string;
}

interface TimelineMarker {
  id: string;
  time: number;
  title: string;
  type: 'step' | 'log' | 'network';
  status?: 'passed' | 'failed' | 'warning' | 'info';
  stepId?: string;
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  timeline = [],
  currentStepId,
  onStepClick,
  onTimeUpdate,
  autoplay = false,
  className = '',
  poster
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playerState, setPlayerState] = useState<MediaPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    playbackRate: 1,
    fullscreen: false,
    seeking: false
  });

  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [controlsTimeoutId, setControlsTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Convert timeline items to video markers
  const timelineMarkers = useMemo<TimelineMarker[]>(() => {
    if (!timeline || timeline.length === 0) return [];

    return timeline
      .filter(item => item.metadata?.videoTimestamp !== undefined)
      .map(item => ({
        id: item.id,
        time: item.metadata!.videoTimestamp as number,
        title: item.title,
        type: item.type as 'step' | 'log' | 'network',
        status: item.status,
        stepId: item.stepId
      }))
      .sort((a, b) => a.time - b.time);
  }, [timeline]);

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutId) {
        clearTimeout(controlsTimeoutId);
      }
      
      if (playerState.isPlaying && !showSettings) {
        const timeoutId = setTimeout(() => {
          setShowControls(false);
        }, 3000);
        setControlsTimeoutId(timeoutId);
      }
    };

    resetControlsTimeout();

    return () => {
      if (controlsTimeoutId) {
        clearTimeout(controlsTimeoutId);
      }
    };
  }, [playerState.isPlaying, showSettings, controlsTimeoutId]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setPlayerState(prev => ({
        ...prev,
        duration: video.duration
      }));
    };

    const handleTimeUpdate = () => {
      if (!playerState.seeking) {
        const currentTime = video.currentTime;
        setPlayerState(prev => ({
          ...prev,
          currentTime
        }));
        
        onTimeUpdate?.(currentTime);
      }
    };

    const handlePlay = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleVolumeChange = () => {
      setPlayerState(prev => ({
        ...prev,
        volume: video.volume,
        muted: video.muted
      }));
    };

    const handleRateChange = () => {
      setPlayerState(prev => ({
        ...prev,
        playbackRate: video.playbackRate
      }));
    };

    const handleSeeked = () => {
      setPlayerState(prev => ({ ...prev, seeking: false }));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [playerState.seeking, onTimeUpdate]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setPlayerState(prev => ({ ...prev, fullscreen: isFullscreen }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          event.preventDefault();
          seekRelative(5);
          break;
        case 'ArrowUp':
          event.preventDefault();
          changeVolume(0.1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          changeVolume(-0.1);
          break;
        case 'KeyM':
          event.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          event.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playerState.isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [playerState.isPlaying]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    setPlayerState(prev => ({ ...prev, seeking: true }));
    video.currentTime = Math.max(0, Math.min(time, video.duration));
  }, []);

  const seekRelative = useCallback((seconds: number) => {
    seekTo(playerState.currentTime + seconds);
  }, [playerState.currentTime, seekTo]);

  const changeVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = Math.max(0, Math.min(1, playerState.volume + delta));
    video.volume = newVolume;
    if (newVolume > 0 && playerState.muted) {
      video.muted = false;
    }
  }, [playerState.volume, playerState.muted]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !playerState.muted;
  }, [playerState.muted]);

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (playerState.fullscreen) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, [playerState.fullscreen]);

  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressRef.current;
    if (!progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickRatio = clickX / rect.width;
    const newTime = clickRatio * playerState.duration;
    
    seekTo(newTime);
  }, [playerState.duration, seekTo]);

  const handleMarkerClick = useCallback((marker: TimelineMarker) => {
    seekTo(marker.time);
    if (marker.stepId && onStepClick) {
      onStepClick(marker.stepId, marker.time);
    }
  }, [seekTo, onStepClick]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
  }, []);

  const getMarkerColor = (marker: TimelineMarker) => {
    switch (marker.status) {
      case 'failed':
        return 'bg-red-500';
      case 'passed':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`video-player relative bg-black rounded-lg overflow-hidden ${className} ${
        playerState.fullscreen ? 'fixed inset-0 z-50' : ''
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(true)}
      tabIndex={0}
      data-testid="video-player"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={poster}
        className="w-full h-full object-contain"
        autoPlay={autoplay}
        playsInline
        preload="metadata"
      />

      {/* Loading overlay */}
      {!playerState.duration && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white">
          <div className="text-lg font-semibold">
            Video Playback
          </div>
          
          <div className="flex items-center gap-2">
            {/* Settings menu */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {showSettings && (
                <div className="absolute top-full right-0 mt-2 bg-black bg-opacity-90 rounded-lg p-3 min-w-48">
                  <div className="text-sm mb-2">Playback Speed</div>
                  <div className="grid grid-cols-2 gap-1">
                    {PLAYBACK_RATES.map(rate => (
                      <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        className={`px-2 py-1 rounded text-xs ${
                          playerState.playbackRate === rate
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors"
              title={playerState.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {playerState.fullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Timeline markers */}
        {timelineMarkers.length > 0 && (
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {timelineMarkers.map(marker => (
                <button
                  key={marker.id}
                  onClick={() => handleMarkerClick(marker)}
                  className={`block px-3 py-2 rounded-lg text-left text-white bg-black bg-opacity-75 hover:bg-opacity-90 transition-colors max-w-xs ${
                    marker.stepId === currentStepId ? 'ring-2 ring-blue-400' : ''
                  }`}
                  title={`${marker.title} at ${formatTime(marker.time)}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getMarkerColor(marker)}`} />
                    <div className="text-xs opacity-75">{formatTime(marker.time)}</div>
                  </div>
                  <div className="text-sm truncate mt-1">{marker.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-2 bg-white bg-opacity-30 rounded-full mb-4 cursor-pointer group"
            onClick={handleProgressClick}
          >
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all"
              style={{
                width: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%`
              }}
            />
            
            {/* Timeline markers on progress bar */}
            {timelineMarkers.map(marker => (
              <div
                key={`progress-${marker.id}`}
                className={`absolute top-0 w-1 h-full ${getMarkerColor(marker)} opacity-75 hover:opacity-100 cursor-pointer`}
                style={{
                  left: `${playerState.duration > 0 ? (marker.time / playerState.duration) * 100 : 0}%`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkerClick(marker);
                }}
                title={`${marker.title} at ${formatTime(marker.time)}`}
              />
            ))}

            {/* Scrub handle */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%`,
                marginLeft: '-8px'
              }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => seekRelative(-10)}
                className="p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors"
                title="Rewind 10s"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlayPause}
                className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                title={playerState.isPlaying ? 'Pause' : 'Play'}
              >
                {playerState.isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={() => seekRelative(10)}
                className="p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors"
                title="Forward 10s"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Time display */}
            <div className="text-sm">
              {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
            </div>

            <div className="flex items-center gap-3">
              {/* Volume control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors"
                  title={playerState.muted ? 'Unmute' : 'Mute'}
                >
                  {playerState.muted || playerState.volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={playerState.muted ? 0 : playerState.volume}
                  onChange={(e) => {
                    const video = videoRef.current;
                    if (!video) return;
                    
                    const newVolume = parseFloat(e.target.value);
                    video.volume = newVolume;
                    if (newVolume > 0) {
                      video.muted = false;
                    }
                  }}
                  className="w-20 accent-blue-600"
                />
              </div>

              {/* Playback rate indicator */}
              {playerState.playbackRate !== 1 && (
                <div className="text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  {playerState.playbackRate}x
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click to play/pause overlay */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={togglePlayPause}
        style={{ zIndex: showControls ? -1 : 1 }}
      />
    </div>
  );
};