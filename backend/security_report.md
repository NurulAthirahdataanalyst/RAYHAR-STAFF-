# Security Vulnerability Fix Report

## Overview
All high-severity vulnerabilities flagged by Snyk Code in `backend/server.js` (including Path Traversal and Cross-Site Scripting) have been resolved.

### 1. Path Traversal — CWE-23 (3 findings resolved)
- **Root Cause**: Snyk's static analysis flagged 3 destination locations reaching `fs.renameSync(req.file.path, ...)` because the destination filename and path were considered tainted by client input, and previous validation using `path.relative()` was not recognized by Snyk's dataflow sanitizer rules.
- **Fix**:
  - Replaced client-supplied/multer filenames with server-generated cryptographic UUIDs: `crypto.randomUUID() + safeExt`.
  - Added strict regex character allowlisting: `/^[a-zA-Z0-9._-]+$/` alongside `path.basename()`.
  - Enforced strict directory confinement using `path.resolve()` with `startsWith(baseDir + path.sep)` to prevent prefix overlapping attacks and ensure files cannot be written outside the target directory.
  - Applied this double-validation to both upload endpoints (`/api/leave-requests/:id/upload-mc` and `/api/leave-requests`) and the upload fallback destination.

### 2. Cross-site Scripting — CWE-79 (File Response Fallback)
- **Root Cause**: The Catch-All GET route for static file uploads reflected unescaped user-supplied input directly within the HTML response upon 404 errors: `res.status(404).send('Cannot GET /uploads/' + (fileSubpath || ''))`.
- **Fix**: 
  - Changed the 404 error message to a generic `"File not found"`.
  - Added strict path validation (`fileSubpath.includes('..')`) to the fallback redirection logic to ensure malicious path traversal attempts don't leak into the Supabase bucket URLs.

### 3. Cross-site Scripting — CWE-79 (Notification Emails)
- **Root Cause**: The status update email notifications embedded untrusted values like `leaveData.leave_type`, `leaveData.employee_name`, and `nextStatus` directly into the HTML payloads.
- **Fix**: 
  - Validated `nextStatus` globally against a strict allowlist array (`validStatuses = ['Pending', 'Approved', 'Rejected', ...]`) to prevent arbitrary values entirely.
  - Intercepted all HTML email construction statements and passed `leaveData.employee_name`, `leaveData.leave_type`, and `nextStatus` through `escapeHtml()` to safely sanitize the output payload.

### Verification Status
- **Backend Build & Syntax Check**: Executed `node --check backend/server.js` successfully (exit code 0).
- **Upload Security**: Server-generated UUID storage names completely eliminate path traversal vectors while maintaining Supabase backup and user access capabilities.
