// API Configuration and Service
class ApiService {
  constructor(baseUrl = "http://localhost:8080/api") {
    this.baseUrl = baseUrl;
  }

  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/upload`);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(xhr.responseText || 'Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  }

  async startScan(fileId) {
    const response = await fetch(`${this.baseUrl}/scan/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Scan failed to start');
    }

    return response.json();
  }

  async getScanStatus(scanId) {
    const response = await fetch(`${this.baseUrl}/status/${scanId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to get scan status');
    }

    return response.json();
  }

  async getScanResult(scanId) {
    const response = await fetch(`${this.baseUrl}/result/${scanId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to get scan result');
    }

    const rawResult = await response.json();
    
    // Normalize the response format
    return this.normalizeScanResult(rawResult);
  }

  // Normalize scan result to consistent format
  normalizeScanResult(result) {
    // If result already has the expected format
    if (result.status && result.meta && (result.signature !== undefined)) {
      return result;
    }
    
    // If result has nested details
    if (result.details) {
      return {
        status: result.details.status || result.status,
        meta: result.details.meta || result.meta || {},
        signature: result.details.signature || result.signature || null,
        message: result.message,
        scannedAt: result.details.scannedAt || result.scannedAt
      };
    }
    
    // Return as-is if format is unknown
    return result;
  }

  async getHealthStatus() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  async getStats() {
    const response = await fetch(`${this.baseUrl}/health/stats`);
    return response.json();
  }
}

// File validation utilities
class FileValidator {
  static MAX_BYTES = 10 * 1024 * 1024; // 10MB
  static ALLOWED_EXT = ["pdf", "doc", "docx", "txt", "zip"];
  static ALLOWED_MIME = [
    "application/pdf", 
    "text/plain", 
    "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  static validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > this.MAX_BYTES) {
      errors.push(`File size exceeds ${this.MAX_BYTES / (1024 * 1024)}MB limit`);
    }

    // Check extension
    const name = (file.name || "").toLowerCase();
    const ext = name.split(".").pop();
    if (!this.ALLOWED_EXT.includes(ext)) {
      errors.push(`File extension not allowed. Allowed: ${this.ALLOWED_EXT.join(', ')}`);
    }

    // Check MIME type
    if (!this.ALLOWED_MIME.includes(file.type)) {
      errors.push(`File type not allowed. Detected: ${file.type}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isAllowed(file) {
    return this.validateFile(file).isValid;
  }
}

// Utility functions
const Utils = {
  escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"'`=\/]/g, s => (
      { "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","/":"&#47;","`":"&#96;","=":"&#61;" }[s]
    ));
  },

  formatBytes(n) {
    if (!n && n !== 0) return "—";
    const k = 1024, sizes = ["B","KB","MB","GB"];
    const i = Math.min(Math.floor(Math.log(n)/Math.log(k)), sizes.length-1);
    return (n/Math.pow(k,i)).toFixed(2) + " " + sizes[i];
  },

  formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString || '—';
    }
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiService, FileValidator, Utils };
} else {
  window.ApiService = ApiService;
  window.FileValidator = FileValidator;
  window.Utils = Utils;
}
