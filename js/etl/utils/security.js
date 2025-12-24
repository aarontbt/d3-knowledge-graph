/**
 * Security utilities for input sanitization and validation
 */

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(text) {
    if (typeof text !== 'string') {
        return text;
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitize text content for safe display
 */
export function sanitizeText(text) {
    if (typeof text !== 'string') {
        return String(text || '');
    }

    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize URL to prevent SSRF attacks
 */
export function validateUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL is required' };
    }

    try {
        const urlObj = new URL(url);

        // Only allow HTTP and HTTPS protocols
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return {
                valid: false,
                error: 'Only HTTP and HTTPS protocols are allowed'
            };
        }

        // Prevent access to local/private networks (SSRF protection)
        const hostname = urlObj.hostname.toLowerCase();

        // Block localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
            return {
                valid: false,
                error: 'Access to localhost is not allowed'
            };
        }

        // Block private IP ranges
        if (isPrivateIP(hostname)) {
            return {
                valid: false,
                error: 'Access to private networks is not allowed'
            };
        }

        // Block link-local addresses
        if (hostname.startsWith('169.254.')) {
            return {
                valid: false,
                error: 'Access to link-local addresses is not allowed'
            };
        }

        return { valid: true, url: urlObj.toString() };

    } catch (error) {
        return {
            valid: false,
            error: 'Invalid URL format'
        };
    }
}

/**
 * Check if hostname is a private IP address
 */
function isPrivateIP(hostname) {
    // IPv4 private ranges
    const privateRanges = [
        /^10\./,                    // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
        /^192\.168\./,              // 192.168.0.0/16
        /^127\./,                   // 127.0.0.0/8 (loopback)
        /^0\./,                     // 0.0.0.0/8
    ];

    return privateRanges.some(range => range.test(hostname));
}

/**
 * Validate file upload
 */
export function validateFile(file, options = {}) {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = [],
        allowedExtensions = []
    } = options;

    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size exceeds maximum of ${formatBytes(maxSize)}`
        };
    }

    // Check MIME type if specified
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
        };
    }

    // Check file extension if specified
    if (allowedExtensions.length > 0) {
        const extension = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            return {
                valid: false,
                error: `File extension .${extension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
            };
        }
    }

    return { valid: true };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename) {
    if (typeof filename !== 'string') {
        return 'file';
    }

    // Remove path separators and dangerous characters
    return filename
        .replace(/[/\\]/g, '')
        .replace(/[<>:"|?*\x00-\x1f]/g, '')
        .replace(/^\.+/, '')
        .substring(0, 255); // Limit length
}

/**
 * Validate and sanitize JSON input
 */
export function validateJSON(jsonString) {
    if (typeof jsonString !== 'string') {
        return { valid: false, error: 'Input must be a string' };
    }

    // Check for potential prototype pollution attempts
    if (jsonString.includes('__proto__') || jsonString.includes('constructor')) {
        return {
            valid: false,
            error: 'JSON contains potentially dangerous properties'
        };
    }

    try {
        const parsed = JSON.parse(jsonString);

        // Additional check after parsing
        if (hasProtoProps(parsed)) {
            return {
                valid: false,
                error: 'JSON object contains prototype pollution attempt'
            };
        }

        return { valid: true, data: parsed };

    } catch (error) {
        return {
            valid: false,
            error: 'Invalid JSON format: ' + error.message
        };
    }
}

/**
 * Check for prototype pollution properties
 */
function hasProtoProps(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    if ('__proto__' in obj || 'constructor' in obj || 'prototype' in obj) {
        return true;
    }

    for (const key in obj) {
        if (hasProtoProps(obj[key])) {
            return true;
        }
    }

    return false;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    canMakeRequest() {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Remove old requests
        this.requests = this.requests.filter(time => time > windowStart);

        if (this.requests.length >= this.maxRequests) {
            return false;
        }

        this.requests.push(now);
        return true;
    }

    getRemainingRequests() {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        this.requests = this.requests.filter(time => time > windowStart);
        return this.maxRequests - this.requests.length;
    }

    reset() {
        this.requests = [];
    }
}
