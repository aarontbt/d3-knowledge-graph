# Security Documentation

## Overview

The ETL framework implements multiple layers of security to protect against common web vulnerabilities and ensure safe data import operations.

## Security Features

### 1. XSS Protection

**Threat**: Cross-Site Scripting attacks through user-provided content

**Mitigations:**
- HTML escaping for all dynamic content inserted into DOM
- `escapeHtml()` and `sanitizeText()` utilities
- Error messages sanitized before display
- Content Security Policy recommended for deployment

**Affected Components:**
- `js/etl-ui.js` - Error message display
- All user-facing outputs

**Example:**
```javascript
import { escapeHtml } from './etl/utils/security.js';

// Safe: XSS prevented
const safeMessage = escapeHtml(error.message);
resultsDiv.innerHTML = `<p>${safeMessage}</p>`;

// Dangerous: DO NOT USE
resultsDiv.innerHTML = `<p>${error.message}</p>`;
```

### 2. SSRF Protection

**Threat**: Server-Side Request Forgery through malicious URLs

**Mitigations:**
- URL validation before all fetch operations
- Block localhost and private IP ranges
- Protocol whitelist (HTTP/HTTPS only)
- Prevent access to internal networks

**Protected IP Ranges:**
- `127.0.0.0/8` (localhost)
- `10.0.0.0/8` (private)
- `172.16.0.0/12` (private)
- `192.168.0.0/16` (private)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (invalid)

**Affected Components:**
- `js/etl/extractors/api-extractor.js` - API URL validation
- `js/etl/extractors/json-extractor.js` - JSON URL validation

**Example:**
```javascript
import { validateUrl } from './etl/utils/security.js';

const validation = validateUrl(userProvidedUrl);
if (!validation.valid) {
    throw new Error(validation.error);
}

// Safe to use validated URL
fetch(validation.url);
```

**Blocked URLs:**
- `http://localhost/admin` ❌
- `http://127.0.0.1/config` ❌
- `http://192.168.1.1/internal` ❌
- `http://10.0.0.1/private` ❌
- `file:///etc/passwd` ❌
- `https://api.example.com/data` ✅

### 3. File Upload Validation

**Threat**: Malicious file uploads, oversized files, wrong file types

**Mitigations:**
- File size limits enforced
- MIME type validation
- File extension whitelist
- Filename sanitization

**Limits:**
- CSV files: 50MB maximum
- Markdown files: 10MB maximum
- JSON files: No specific limit (validated by JSON parser)

**Allowed File Types:**

**CSV:**
- MIME: `text/csv`, `text/plain`, `application/vnd.ms-excel`
- Extensions: `.csv`, `.txt`

**Markdown:**
- MIME: `text/markdown`, `text/plain`
- Extensions: `.md`, `.markdown`, `.txt`

**Affected Components:**
- `js/etl/extractors/csv-extractor.js`
- `js/etl/extractors/markdown-extractor.js`

**Example:**
```javascript
import { validateFile } from './etl/utils/security.js';

const validation = validateFile(file, {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['text/csv'],
    allowedExtensions: ['csv']
});

if (!validation.valid) {
    alert(validation.error);
    return;
}
```

### 4. JSON Injection Protection

**Threat**: Prototype pollution through malicious JSON

**Mitigations:**
- Detection of `__proto__`, `constructor`, `prototype` properties
- JSON parsing with validation
- Recursive object inspection

**Blocked Payloads:**
```json
{
    "__proto__": { "isAdmin": true }
}

{
    "constructor": { "prototype": { "isAdmin": true } }
}
```

**Affected Components:**
- `js/etl/extractors/json-extractor.js`

**Example:**
```javascript
import { validateJSON } from './etl/utils/security.js';

const validation = validateJSON(jsonString);
if (!validation.valid) {
    throw new Error(validation.error);
}

const safeData = validation.data;
```

### 5. Rate Limiting

**Threat**: Abuse through excessive API requests

**Mitigations:**
- Request rate limiting (30 requests per minute default)
- Per-session tracking
- Configurable limits

**Affected Components:**
- `js/etl/extractors/api-extractor.js`

**Example:**
```javascript
import { RateLimiter } from './etl/utils/security.js';

const limiter = new RateLimiter(10, 60000); // 10 requests per minute

if (!limiter.canMakeRequest()) {
    throw new Error('Rate limit exceeded');
}
```

### 6. Input Sanitization

**Threat**: Malicious input in various forms

**Mitigations:**
- Filename sanitization (remove path traversal, special chars)
- HTML escaping for display
- Type validation
- Length limits

**Affected Components:**
- All extractors
- All transformers

## Security Utilities Reference

### `escapeHtml(text)`

Escapes HTML special characters to prevent XSS.

```javascript
escapeHtml("<script>alert('XSS')</script>");
// Returns: "&lt;script&gt;alert('XSS')&lt;/script&gt;"
```

### `sanitizeText(text)`

Sanitizes text for safe display by replacing special characters.

```javascript
sanitizeText("Hello <b>World</b>");
// Returns: "Hello &lt;b&gt;World&lt;/b&gt;"
```

### `validateUrl(url)`

Validates URL and prevents SSRF attacks.

**Returns:**
```javascript
{
    valid: boolean,
    url?: string,
    error?: string
}
```

### `validateFile(file, options)`

Validates file uploads.

**Options:**
```javascript
{
    maxSize: number,          // bytes
    allowedTypes: string[],   // MIME types
    allowedExtensions: string[] // file extensions
}
```

**Returns:**
```javascript
{
    valid: boolean,
    error?: string
}
```

### `sanitizeFilename(filename)`

Removes dangerous characters from filenames.

```javascript
sanitizeFilename("../../etc/passwd");
// Returns: "etcpasswd"
```

### `validateJSON(jsonString)`

Validates and parses JSON with security checks.

**Returns:**
```javascript
{
    valid: boolean,
    data?: object,
    error?: string
}
```

### `RateLimiter`

Rate limiting for API requests.

**Methods:**
- `canMakeRequest()` - Check if request is allowed
- `getRemainingRequests()` - Get remaining request count
- `reset()` - Reset the limiter

## Security Best Practices

### For Developers

1. **Always Validate Input**
   - Use validation utilities for all user input
   - Never trust data from external sources
   - Validate on both client and server (if applicable)

2. **Escape Output**
   - Use `escapeHtml()` for any dynamic content in HTML
   - Use `textContent` instead of `innerHTML` when possible
   - Sanitize error messages before display

3. **Validate URLs**
   - Always use `validateUrl()` before fetch operations
   - Never allow user-controlled URLs without validation
   - Consider additional business logic validation

4. **Limit File Sizes**
   - Enforce reasonable size limits
   - Validate file types and extensions
   - Sanitize filenames

5. **Handle Errors Safely**
   - Don't expose stack traces to users
   - Log detailed errors server-side
   - Show generic error messages to users

### For Users

1. **Use Trusted Data Sources**
   - Only import from trusted sources
   - Verify API endpoints before use
   - Review data in dry-run mode first

2. **Be Cautious with APIs**
   - Don't enter credentials for untrusted APIs
   - Use read-only API tokens when possible
   - Review API responses before importing

3. **File Safety**
   - Only upload files you trust
   - Scan files with antivirus before upload
   - Review file contents before import

4. **Monitor Imports**
   - Review dry-run results
   - Check for unexpected data
   - Validate import results

## Known Limitations

1. **Client-Side Only**
   - All security runs in browser
   - Cannot prevent determined attackers
   - Consider server-side validation for production

2. **CORS Restrictions**
   - External API access may be blocked by CORS
   - Requires CORS-enabled endpoints
   - Consider proxy server for production

3. **Local Storage Security**
   - Data stored unencrypted in browser
   - Accessible to browser extensions
   - Not suitable for sensitive data

4. **Rate Limiting**
   - Client-side only (easily bypassed)
   - Per-session, not global
   - Consider server-side rate limiting

## Incident Response

If you discover a security vulnerability:

1. **Do Not** publicly disclose the vulnerability
2. Contact the maintainers privately
3. Provide details:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Checklist

Before deploying:

- [ ] All user inputs are validated
- [ ] All outputs are escaped/sanitized
- [ ] URLs are validated before fetch
- [ ] File uploads are restricted and validated
- [ ] Rate limiting is configured appropriately
- [ ] Error messages don't expose sensitive info
- [ ] HTTPS is used for all external requests
- [ ] Content Security Policy is configured
- [ ] Dependencies are up to date
- [ ] Security documentation is reviewed

## Updates and Patches

**Current Version**: 1.0.0

**Security Updates:**
- 2025-12-24: Initial security implementation
  - XSS protection
  - SSRF protection
  - File validation
  - JSON injection protection
  - Rate limiting

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## License

This security documentation is part of the D3 Knowledge Graph project and is licensed under the MIT License.
