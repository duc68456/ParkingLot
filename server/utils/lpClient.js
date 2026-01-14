/**
 * License Plate Recognition Client
 * Node.js client for calling Python LP Recognition Service
 */

const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

class LPClient {
  /**
   * Initialize LP Recognition Client
   * @param {string} baseUrl - Base URL of Python service (default: http://localhost:5001)
   */
  constructor(baseUrl = 'http://localhost:5001') {
    this.baseUrl = baseUrl
    this.timeout = 30000 // 30 seconds
  }

  /**
   * Check if LP service is healthy
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      })
      return response.data.ready === true
    } catch (error) {
      console.error('LP Service health check failed:', error.message)
      return false
    }
  }

  /**
   * Recognize license plate from file path
   * @param {string} filePath - Path to image file
   * @returns {Promise<Object>} Recognition result
   */
  async recognizeFromFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found'
        }
      }

      const formData = new FormData()
      formData.append('file', fs.createReadStream(filePath))

      const response = await axios.post(
        `${this.baseUrl}/api/recognize`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: this.timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      )

      return this._normalizeResponse(response.data)
    } catch (error) {
      return this._handleError(error)
    }
  }

  /**
   * Recognize license plate from base64 string
   * @param {string} base64Data - Base64 encoded image (with or without data URL prefix)
   * @returns {Promise<Object>} Recognition result
   */
  async recognizeFromBase64(base64Data) {
    try {
      // Ensure data URL format
      let imageData = base64Data
      if (!imageData.startsWith('data:')) {
        imageData = `data:image/jpeg;base64,${imageData}`
      }

      const response = await axios.post(
        `${this.baseUrl}/api/recognize`,
        { image: imageData },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: this.timeout
        }
      )

      return this._normalizeResponse(response.data)
    } catch (error) {
      return this._handleError(error)
    }
  }

  /**
   * Recognize license plate from buffer
   * @param {Buffer} buffer - Image buffer
   * @returns {Promise<Object>} Recognition result
   */
  async recognizeFromBuffer(buffer) {
    try {
      const base64 = buffer.toString('base64')
      return await this.recognizeFromBase64(base64)
    } catch (error) {
      return this._handleError(error)
    }
  }

  /**
   * Normalize response from Python service
   * @private
   */
  _normalizeResponse(data) {
    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Recognition failed'
      }
    }

    return {
      success: true,
      licensePlate: data.data.licensePlate || null,
      confidence: data.data.confidence || 0,
      croppedImage: data.data.croppedImage || null, // base64 with data URL prefix
      originalImage: data.data.originalImage || null,
      timestamp: data.data.timestamp || new Date().toISOString()
    }
  }

  /**
   * Handle errors from Python service
   * @private
   */
  _handleError(error) {
    console.error('LP Recognition Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    })

    let errorMessage = 'Recognition service error'

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'LP service is not running. Please start Python service on port 5001'
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'LP service timeout. Recognition took too long'
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
      code: error.code || 'LP_SERVICE_ERROR'
    }
  }
}

// Singleton instance
let lpClientInstance = null

/**
 * Get singleton LP Client instance
 * @param {string} baseUrl - Optional base URL
 * @returns {LPClient}
 */
function getLPClient(baseUrl) {
  if (!lpClientInstance) {
    lpClientInstance = new LPClient(baseUrl)
  }
  return lpClientInstance
}

module.exports = {
  LPClient,
  getLPClient
}
