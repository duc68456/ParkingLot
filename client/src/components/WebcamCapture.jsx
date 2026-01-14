import React, { useRef, useEffect, useState } from 'react';
import '../styles/components/WebcamCapture.css';

const WebcamCapture = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture License Plate',
  mode = 'entry'
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  const [availableCameras, setAvailableCameras] = useState([]);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  // Get available cameras
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };

    if (isOpen) {
      getDevices();
    }
  }, [isOpen]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen && !isCaptured) {
      startCamera();
    }

    // Cleanup when modal closes
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, isCaptured]);

  const startCamera = async () => {
    setIsLoadingCamera(true);
    setError(null);

    try {
      // Stop existing stream first
      stopCamera();

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: facingMode
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsVideoReady(true);
          setIsLoadingCamera(false);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsLoadingCamera(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
      } else {
        setError('Failed to access camera: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG with compression
    const imageData = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImage(imageData);
    setIsCaptured(true);
    stopCamera(); // Stop camera after capture
  };

  const handleRetake = () => {
    setIsCaptured(false);
    setCapturedImage(null);
    startCamera();
  };

  const handleUseImage = () => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleClose = () => {
    stopCamera();
    setIsCaptured(false);
    setCapturedImage(null);
    setError(null);
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="webcam-capture-overlay" onClick={handleOverlayClick}>
      <div className={`webcam-capture-modal ${mode}`}>
        {/* Header */}
        <div className="webcam-capture-header">
          <h3 className="webcam-capture-title">{title}</h3>
          <button
            className="webcam-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="webcam-capture-content">
          {/* Error Message */}
          {error && (
            <div className="webcam-error">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p>{error}</p>
              <button onClick={startCamera} className="webcam-retry-btn">
                Try Again
              </button>
            </div>
          )}

          {/* Video Preview or Captured Image */}
          {!error && (
            <div className="webcam-preview-container">
              {/* Loading State */}
              {isLoadingCamera && (
                <div className="webcam-loading">
                  <div className="webcam-spinner"></div>
                  <p>Starting camera...</p>
                </div>
              )}

              {/* Live Video Preview */}
              {!isCaptured && (
                <>
                  <video
                    ref={videoRef}
                    className="webcam-video"
                    autoPlay
                    playsInline
                    muted
                    style={{ display: isVideoReady ? 'block' : 'none' }}
                  />

                  {/* Guide Overlay */}
                  {isVideoReady && (
                    <div className="webcam-guide-overlay">
                      <div className="guide-rectangle">
                        <div className="guide-corner guide-corner-tl"></div>
                        <div className="guide-corner guide-corner-tr"></div>
                        <div className="guide-corner guide-corner-bl"></div>
                        <div className="guide-corner guide-corner-br"></div>
                        <span className="guide-text">Align license plate here</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Captured Image Preview */}
              {isCaptured && capturedImage && (
                <div className="webcam-captured-preview">
                  <img src={capturedImage} alt="Captured" />
                </div>
              )}

              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}
          {/* Action Buttons */}
          {!error && (
            <div className="webcam-actions">
              {!isCaptured ? (
                <>
                  <button
                    className="webcam-capture-btn"
                    onClick={handleCapture}
                    disabled={!isVideoReady || isLoadingCamera}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      <path d="M3 9V7C3 5.89543 3.89543 5 5 5H7L9 3H15L17 5H19C20.1046 5 21 5.89543 21 7V9M3 15V17C3 18.1046 3.89543 19 5 19H7M17 19H19C20.1046 19 21 18.1046 21 17V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Capture
                  </button>

                  {availableCameras.length > 1 && (
                    <button
                      className="webcam-switch-btn"
                      onClick={handleSwitchCamera}
                      disabled={!isVideoReady || isLoadingCamera}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M16 3H18C19.1046 3 20 3.89543 20 5V7M8 3H6C4.89543 3 4 3.89543 4 5V7M16 21H18C19.1046 21 20 20.1046 20 19V17M8 21H6C4.89543 21 4 20.1046 4 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M14 12L10 12M10 12L12 10M10 12L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Switch Camera
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="webcam-use-btn"
                    onClick={handleUseImage}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Use This Image
                  </button>

                  <button
                    className="webcam-retake-btn"
                    onClick={handleRetake}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10C21 10 18.995 7.26822 17.3662 5.63824C15.7373 4.00827 13.4864 3 11 3C6.02944 3 2 7.02944 2 12C2 16.9706 6.02944 21 11 21C15.1031 21 18.5649 18.2543 19.6482 14.5M21 10V4M21 10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Retake
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;
