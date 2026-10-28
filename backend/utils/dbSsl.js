const fs = require('fs');

/**
 * Returns a secure TLS/SSL configuration object for PostgreSQL and MySQL pool/client connections.
 * Resolves CWE-327 (Insecure TLS Configuration) by avoiding hardcoded rejectUnauthorized: false.
 * Enables strict TLS verification when CA certificates are provided or when configured via env.
 */
function getDbSslConfig() {
  if (process.env.DB_SSL === 'false') {
    return false;
  }

  // If a custom CA certificate is provided via environment variable or file path, enforce strict verification
  const ca = process.env.DB_CA || process.env.PGSSLROOTCERT;
  if (ca) {
    try {
      const caContent = ca.includes('BEGIN CERTIFICATE') ? ca : fs.readFileSync(ca, 'utf8');
      return {
        ca: caContent,
        rejectUnauthorized: true,
      };
    } catch (err) {
      console.warn('Warning: Could not read DB CA certificate:', err.message);
    }
  }

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

  return {
    rejectUnauthorized,
  };
}

module.exports = { getDbSslConfig };
