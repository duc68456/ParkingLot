/**
 * License Plate Recognition API Client
 * Handles communication with backend LP recognition endpoints
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;

/**
 * Create axios instance with default config
 */
const createApiClient = (token, timeout = DEFAULT_TIMEOUT) => {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  });
};

/**
 * Retry wrapper for API calls
 */
const withRetry = async (fn, retries = MAX_RETRIES) => {
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) or auth errors
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (i === retries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log(`Retrying API call (attempt ${i + 2}/${retries + 1})...`);
    }
  }

  throw lastError;
};

/**
 * Handle API errors and return standardized error object
 */
const handleApiError = (error, context = 'API call') => {
  console.error(`${context} failed:`, error);

  let errorMessage = 'An unexpected error occurred';
  let errorCode = 'UNKNOWN_ERROR';

  if (error.code === 'ECONNABORTED') {
    errorMessage = 'Request timeout. The recognition service is taking too long to respond.';
    errorCode = 'TIMEOUT';
  } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    errorMessage = 'Network error. Please check your connection.';
    errorCode = 'NETWORK_ERROR';
  } else if (error.response) {
    // Server responded with error
    const { data, status } = error.response;
    errorMessage = data?.error?.message || data?.message || `Server error (${status})`;
    errorCode = data?.error?.code || `HTTP_${status}`;
  } else if (error.request) {
    // Request made but no response
    errorMessage = 'No response from server. Please check if the service is running.';
    errorCode = 'NO_RESPONSE';
  } else {
    errorMessage = error.message || errorMessage;
  }

  return {
    success: false,
    error: errorMessage,
    code: errorCode,
    originalError: error
  };
};

/**
 * Recognize license plate and create entry session
 * 
 * @param {Object} data - Entry data
 * @param {string} data.cardId - Card ID (required)
 * @param {string} data.vehicleTypeId - Vehicle type ID (optional)
 * @param {string} data.processedBy - Employee ID (optional, auto-filled from token)
 * @param {string} data.imageBase64 - Base64 image with data URL prefix (required)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Recognition result
 */
export const recognizeEntryPlate = async (data, token) => {
  try {
    const client = createApiClient(token);

    const response = await withRetry(async () => {
      return await client.post('/api/entry-sessions/gate/entry-with-plate', {
        CardID: data.cardId,
        VehicleTypeID: data.vehicleTypeId || '',
        ProcessedEntryBy: data.processedBy || '',
        image: data.imageBase64
      });
    });

    const result = response.data;

    if (!result.success) {
      throw new Error(result.error?.message || 'Recognition failed');
    }

    return {
      success: true,
      session: result.data.session,
      recognition: {
        licensePlate: result.data.recognition.licensePlate,
        confidence: result.data.recognition.confidence,
        croppedImage: result.data.recognition.croppedImage,
        timestamp: result.data.recognition.timestamp
      }
    };
  } catch (error) {
    return handleApiError(error, 'Entry plate recognition');
  }
};

/**
 * Recognize license plate and process exit
 * 
 * @param {Object} data - Exit data
 * @param {string} data.sessionId - Session ID (optional, can use cardId instead)
 * @param {string} data.cardId - Card ID (optional, can use sessionId instead)
 * @param {string} data.processedBy - Employee ID (optional, auto-filled from token)
 * @param {string} data.imageBase64 - Base64 image with data URL prefix (required)
 * @param {number} data.manualFee - Manual fee override (optional)
 * @param {string} data.discountReason - Discount reason (optional)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Recognition and exit result
 */
export const recognizeExitPlate = async (data, token) => {
  try {
    const client = createApiClient(token);

    const response = await withRetry(async () => {
      return await client.post('/api/entry-sessions/gate/exit-with-plate', {
        sessionId: data.sessionId || '',
        CardID: data.cardId || '',
        ProcessedExitBy: data.processedBy || '',
        image: data.imageBase64,
        ManualFee: data.manualFee,
        DiscountReason: data.discountReason || ''
      });
    });

    const result = response.data;

    if (!result.success) {
      throw new Error(result.error?.message || 'Recognition failed');
    }

    return {
      success: true,
      session: result.data.session,
      recognition: {
        licensePlate: result.data.recognition.licensePlate,
        confidence: result.data.recognition.confidence,
        croppedImage: result.data.recognition.croppedImage,
        timestamp: result.data.recognition.timestamp
      },
      validation: result.data.validation ? {
        match: result.data.validation.match,
        entryPlate: result.data.validation.entryPlate,
        exitPlate: result.data.validation.exitPlate
      } : null
    };
  } catch (error) {
    // For exit validation errors, try to extract validation data from error response
    if (error.response?.data?.data?.validation) {
      return {
        ...handleApiError(error, 'Exit plate recognition'),
        validation: error.response.data.data.validation
      };
    }
    return handleApiError(error, 'Exit plate recognition');
  }
};

/**
 * Recognize license plate ONLY (no session creation)
 * Calls Python LP service directly via backend proxy
 * 
 * @param {Object} data - Recognition data
 * @param {string} data.imageBase64 - Base64 image with data URL prefix (required)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Recognition result only (no session)
 */
export const recognizePlateOnly = async (data, token) => {
  try {
    const client = createApiClient(token);

    const response = await withRetry(async () => {
      return await client.post('/api/entry-sessions/gate/recognize-only', {
        image: data.imageBase64
      });
    });

    const result = response.data;

    if (!result.success) {
      throw new Error(result.error?.message || 'Recognition failed');
    }

    return {
      success: true,
      recognition: {
        licensePlate: result.data.licensePlate,
        confidence: result.data.confidence,
        croppedImage: result.data.croppedImage,
        timestamp: result.data.timestamp
      }
    };
  } catch (error) {
    return handleApiError(error, 'Plate recognition');
  }
};

/**
 * Get entry and exit images for a session
 * 
 * @param {string} sessionId - Session ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Session images
 */
export const getSessionImages = async (sessionId, token) => {
  try {
    const client = createApiClient(token, 10000); // Shorter timeout for image retrieval

    const response = await withRetry(async () => {
      return await client.get(`/api/entry-sessions/${sessionId}/images`);
    });

    const result = response.data;

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to retrieve images');
    }

    return {
      success: true,
      entryImage: result.data.entryImage,
      exitImage: result.data.exitImage
    };
  } catch (error) {
    return handleApiError(error, 'Get session images');
  }
};

/**
 * Check if LP recognition service is available
 * This is a lightweight health check via the backend
 * 
 * @param {string} token - Auth token
 * @returns {Promise<boolean>} Service availability
 */
export const checkLPServiceHealth = async (token) => {
  try {
    const client = createApiClient(token, 5000); // Quick timeout

    // Try to get any session images as a health check proxy
    // In production, you might want a dedicated health endpoint
    const response = await client.get('/api/entry-sessions?limit=1');

    return response.status === 200;
  } catch (error) {
    console.warn('LP service health check failed:', error.message);
    return false;
  }
};

/**
 * Compress base64 image to reduce payload size
 * 
 * @param {string} base64Image - Base64 image with data URL prefix
 * @param {number} maxWidth - Maximum width (default: 1280)
 * @param {number} quality - JPEG quality 0-1 (default: 0.85)
 * @returns {Promise<string>} Compressed base64 image
 */
export const compressImage = (base64Image, maxWidth = 1280, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (error) {
        reject(new Error('Failed to compress image: ' + error.message));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = base64Image;
  });
};

/**
 * Validate base64 image data
 * 
 * @param {string} base64Image - Base64 image to validate
 * @returns {Object} Validation result
 */
export const validateImage = (base64Image) => {
  if (!base64Image) {
    return { valid: false, error: 'Image data is required' };
  }

  if (typeof base64Image !== 'string') {
    return { valid: false, error: 'Image data must be a string' };
  }

  // Check for data URL prefix
  if (!base64Image.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid image format. Must be a data URL.' };
  }

  // Check size (rough estimate: 4/3 of base64 length)
  const sizeInBytes = (base64Image.length * 3) / 4;
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (sizeInBytes > maxSize) {
    return {
      valid: false,
      error: `Image is too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`
    };
  }

  return { valid: true };
};

/**
 * Format confidence score for display
 * 
 * @param {number} confidence - Confidence value (0-1)
 * @returns {string} Formatted percentage
 */
export const formatConfidence = (confidence) => {
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    return 'N/A';
  }
  return `${(confidence * 100).toFixed(0)}%`;
};

/**
 * Get confidence level label
 * 
 * @param {number} confidence - Confidence value (0-1)
 * @returns {string} Label: 'high', 'medium', 'low'
 */
export const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.65) return 'medium';
  return 'low';
};

/**
 * Get confidence color for UI
 * 
 * @param {number} confidence - Confidence value (0-1)
 * @returns {string} CSS color
 */
export const getConfidenceColor = (confidence) => {
  if (confidence >= 0.85) return '#22c55e'; // Green
  if (confidence >= 0.65) return '#f59e0b'; // Orange
  return '#ef4444'; // Red
};

export default {
  recognizePlateOnly,
  recognizeEntryPlate,
  recognizeExitPlate,
  getSessionImages,
  checkLPServiceHealth,
  compressImage,
  validateImage,
  formatConfidence,
  getConfidenceLevel,
  getConfidenceColor
};
