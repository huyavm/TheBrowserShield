/**
 * SSL/TLS Configuration for HTTPS support
 * Handles certificate loading and HTTPS server options
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const SSL_DIR = path.join(__dirname, '../ssl');
const DEFAULT_KEY_PATH = path.join(SSL_DIR, 'server.key');
const DEFAULT_CERT_PATH = path.join(SSL_DIR, 'server.crt');

/**
 * Get SSL options for HTTPS server
 * @returns {Object|null} SSL options or null if not configured
 */
function getSSLOptions() {
    const keyPath = process.env.SSL_KEY_PATH || DEFAULT_KEY_PATH;
    const certPath = process.env.SSL_CERT_PATH || DEFAULT_CERT_PATH;

    try {
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            const options = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };

            // Optional: Add CA certificate if provided
            const caPath = process.env.SSL_CA_PATH;
            if (caPath && fs.existsSync(caPath)) {
                options.ca = fs.readFileSync(caPath);
            }

            logger.info('SSL certificates loaded successfully');
            return options;
        }

        logger.info('SSL certificates not found, HTTPS disabled');
        return null;
    } catch (error) {
        logger.error('Failed to load SSL certificates:', error.message);
        return null;
    }
}

/**
 * Check if HTTPS is enabled
 * @returns {boolean} True if HTTPS should be enabled
 */
function isHTTPSEnabled() {
    // Check environment variable
    if (process.env.ENABLE_HTTPS === 'true') {
        return getSSLOptions() !== null;
    }

    // Auto-enable if certificates exist
    if (process.env.ENABLE_HTTPS !== 'false') {
        const keyPath = process.env.SSL_KEY_PATH || DEFAULT_KEY_PATH;
        const certPath = process.env.SSL_CERT_PATH || DEFAULT_CERT_PATH;
        return fs.existsSync(keyPath) && fs.existsSync(certPath);
    }

    return false;
}

/**
 * Get HTTPS port
 * @returns {number} HTTPS port
 */
function getHTTPSPort() {
    return parseInt(process.env.HTTPS_PORT) || 5443;
}

/**
 * Create SSL directory if it doesn't exist
 */
function ensureSSLDirectory() {
    if (!fs.existsSync(SSL_DIR)) {
        fs.mkdirSync(SSL_DIR, { recursive: true });
        logger.info(`Created SSL directory: ${SSL_DIR}`);
    }
}

module.exports = {
    getSSLOptions,
    isHTTPSEnabled,
    getHTTPSPort,
    ensureSSLDirectory,
    SSL_DIR,
    DEFAULT_KEY_PATH,
    DEFAULT_CERT_PATH
};
