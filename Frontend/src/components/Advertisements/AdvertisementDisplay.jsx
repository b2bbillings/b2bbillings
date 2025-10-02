import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import './AdvertisementDisplay.css';

const AdvertisementDisplay = ({
  ads = [],
  section = 'banner',
  autoScrollInterval = 10000, // 10 seconds
  className = '',
  style = {},
  showControls = true,
  muted = true,
  onAdClick,
  onAdImpression,
}) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(muted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const videoRef = useRef(null);

  // Auto-scroll functionality
  useEffect(() => {
    if (ads.length <= 1 || !isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, autoScrollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [ads.length, isPlaying, autoScrollInterval]);

  // Track ad impressions
  useEffect(() => {
    if (ads[currentAdIndex] && onAdImpression) {
      onAdImpression(ads[currentAdIndex]);
    }
  }, [currentAdIndex, ads, onAdImpression]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Handle mute/unmute
  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  // Handle manual navigation
  const goToAd = useCallback((index) => {
    setCurrentAdIndex(index);
  }, []);

  // Handle ad click
  const handleAdClick = useCallback(() => {
    const currentAd = ads[currentAdIndex];
    if (currentAd && onAdClick) {
      onAdClick(currentAd);
    }
  }, [ads, currentAdIndex, onAdClick]);

  // Reset to first ad when ads change
  useEffect(() => {
    setCurrentAdIndex(0);
    setError(null);
  }, [ads]);

  if (!ads || ads.length === 0) {
    return null;
  }

  if (error) {
    return (
      <Alert variant="warning" className="m-2">
        Failed to load advertisements
      </Alert>
    );
  }

  const currentAd = ads[currentAdIndex];
  const isVideo = currentAd?.mediaType === 'video';
  const isImage = currentAd?.mediaType === 'image';
  const isText = currentAd?.mediaType === 'text';

  return (
    <div
      className={`advertisement-display ${section}-section ${className}`}
      style={style}
    >
      <Card className="ad-card h-100">
        <div className="ad-content" onClick={handleAdClick}>
          {loading && (
            <div className="ad-loading">
              <Spinner animation="border" size="sm" />
            </div>
          )}

          {/* Video Ad */}
          {isVideo && currentAd.mediaUrl && (
            <div className="ad-video-container">
              <video
                ref={videoRef}
                className="ad-video"
                src={currentAd.mediaUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onLoadStart={() => setLoading(true)}
                onLoadedData={() => setLoading(false)}
                onError={() => setError('Failed to load video')}
              />
              {currentAd.title && (
                <div className="ad-video-overlay">
                  <h6 className="ad-title">{currentAd.title}</h6>
                  {currentAd.description && (
                    <p className="ad-description">{currentAd.description}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Image Ad */}
          {isImage && currentAd.mediaUrl && (
            <div className="ad-image-container">
              <img
                src={currentAd.mediaUrl}
                alt={currentAd.title || 'Advertisement'}
                className="ad-image"
                onLoad={() => setLoading(false)}
                onLoadStart={() => setLoading(true)}
                onError={() => setError('Failed to load image')}
              />
              {(currentAd.title || currentAd.description) && (
                <div className="ad-image-overlay">
                  {currentAd.title && <h6 className="ad-title">{currentAd.title}</h6>}
                  {currentAd.description && (
                    <p className="ad-description">{currentAd.description}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Text Ad */}
          {isText && (
            <div className="ad-text-container">
              <Card.Body>
                {currentAd.title && (
                  <Card.Title className="ad-title">{currentAd.title}</Card.Title>
                )}
                {currentAd.description && (
                  <Card.Text className="ad-description">
                    {currentAd.description}
                  </Card.Text>
                )}
                {currentAd.ctaText && (
                  <div className="ad-cta">
                    <span className="cta-text">{currentAd.ctaText}</span>
                  </div>
                )}
              </Card.Body>
            </div>
          )}
        </div>

        {/* Controls */}
        {showControls && ads.length > 1 && (
          <div className="ad-controls">
            <div className="ad-navigation">
              {ads.map((_, index) => (
                <button
                  key={index}
                  className={`nav-dot ${index === currentAdIndex ? 'active' : ''}`}
                  onClick={() => goToAd(index)}
                  aria-label={`Go to ad ${index + 1}`}
                />
              ))}
            </div>

            <div className="ad-control-buttons">
              <button
                className="control-btn"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
              </button>

              {isVideo && (
                <button
                  className="control-btn"
                  onClick={handleMuteToggle}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Ad Counter */}
        {ads.length > 1 && (
          <div className="ad-counter">
            {currentAdIndex + 1} of {ads.length}
          </div>
        )}
      </Card>
    </div>
  );
};

AdvertisementDisplay.propTypes = {
  ads: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      title: PropTypes.string,
      description: PropTypes.string,
      mediaType: PropTypes.oneOf(['image', 'video', 'text']).isRequired,
      mediaUrl: PropTypes.string,
      ctaText: PropTypes.string,
      ctaUrl: PropTypes.string,
      section: PropTypes.string.isRequired,
      isActive: PropTypes.bool,
      priority: PropTypes.number,
    })
  ),
  section: PropTypes.oneOf(['banner', 'sidebar', 'whatsapp']).isRequired,
  autoScrollInterval: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
  showControls: PropTypes.bool,
  muted: PropTypes.bool,
  onAdClick: PropTypes.func,
  onAdImpression: PropTypes.func,
};

export default AdvertisementDisplay;