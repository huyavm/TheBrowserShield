/**
 * Cross-Platform Path Utilities
 * Provides path sanitization and resolution functions for Windows compatibility
 * 
 * Requirements: 3.2, 3.3, 3.4
 */

const path = require('path');
const fs = require('fs');

// Characters invalid in Windows file paths
// < > : " / \ | ? * and control characters (0-31)
const WINDOWS_INVALID_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

// Reserved Windows filenames
const WINDOWS_RESERVED_NAMES = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
];

/**
 * Sanitize a profile ID to remove invalid Windows path characters
 * Preserves uniqueness by replacing invalid characters with safe alternatives
 * 
 * @param {string} profileId - The profile ID to sanitize
 * @returns {string} Sanitized profile ID safe for use in file paths
 * 
 * Requirements: 3.4
 */
function sanitizeProfileId(profileId) {
    if (!profileId || typeof profileId !== 'string') {
        throw new Error('Profile ID must be a non-empty string');
    }

    // Replace invalid Windows characters with underscore
    let sanitized = profileId.replace(WINDOWS_INVALID_CHARS, '_');
    
    // Remove leading/trailing spaces and dots (Windows doesn't allow trailing dots/spaces)
    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
    
    // Check for reserved Windows names (case-insensitive)
    const upperSanitized = sanitized.toUpperCase();
    const baseName = upperSanitized.split('.')[0];
    if (WINDOWS_RESERVED_NAMES.includes(baseName)) {
        sanitized = '_' + sanitized;
    }
    
    // Ensure the result is not empty after sanitization
    if (!sanitized) {
        throw new Error('Profile ID becomes empty after sanitization');
    }
    
    // Limit length to avoid path length issues (Windows MAX_PATH is 260)
    // Reserve space for directory path and file extensions
    const MAX_PROFILE_ID_LENGTH = 100;
    if (sanitized.length > MAX_PROFILE_ID_LENGTH) {
        sanitized = sanitized.substring(0, MAX_PROFILE_ID_LENGTH);
    }
    
    return sanitized;
}

/**
 * Ensure a path is valid and properly formatted for the current platform
 * Handles paths with spaces and Unicode characters (including Vietnamese)
 * 
 * @param {string} inputPath - The path to validate and normalize
 * @returns {string} Normalized path safe for the current platform
 * 
 * Requirements: 3.2, 3.3
 */
function ensureValidPath(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new Error('Path must be a non-empty string');
    }

    // Normalize the path using Node.js path module
    // This handles forward/backward slashes and resolves . and ..
    let normalizedPath = path.normalize(inputPath);
    
    // On Windows, ensure we use the correct separator
    if (process.platform === 'win32') {
        // Replace any remaining forward slashes with backslashes
        normalizedPath = normalizedPath.replace(/\//g, path.sep);
    }
    
    // Handle paths with spaces - the path itself is valid, 
    // but callers should quote it when using in shell commands
    // Unicode characters (including Vietnamese) are handled natively by Node.js
    
    return normalizedPath;
}

/**
 * Resolve a data path relative to the application root
 * Provides consistent data directory resolution across platforms
 * 
 * @param {...string} segments - Path segments to join and resolve
 * @returns {string} Absolute path to the data location
 * 
 * Requirements: 3.1, 3.5
 */
function resolveDataPath(...segments) {
    if (segments.length === 0) {
        throw new Error('At least one path segment is required');
    }
    
    // Validate all segments are strings
    for (const segment of segments) {
        if (typeof segment !== 'string') {
            throw new Error('All path segments must be strings');
        }
    }
    
    // Get the application root directory (parent of utils folder)
    const appRoot = path.resolve(__dirname, '..');
    
    // Join all segments using path.join for cross-platform compatibility
    const relativePath = path.join(...segments);
    
    // Resolve to absolute path
    const absolutePath = path.resolve(appRoot, relativePath);
    
    // Ensure the resolved path is still within the app root (security check)
    if (!absolutePath.startsWith(appRoot)) {
        throw new Error('Resolved path is outside application root');
    }
    
    return absolutePath;
}

/**
 * Get the browser profile directory path for a given profile ID
 * Combines sanitization and path resolution
 * 
 * @param {string} profileId - The profile ID
 * @returns {string} Absolute path to the browser profile directory
 */
function getBrowserProfilePath(profileId) {
    const sanitizedId = sanitizeProfileId(profileId);
    return resolveDataPath('data', 'browser-profiles', sanitizedId);
}

/**
 * Check if a path exists and is accessible
 * 
 * @param {string} targetPath - Path to check
 * @returns {boolean} True if path exists and is accessible
 */
function pathExists(targetPath) {
    try {
        fs.accessSync(targetPath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensure a directory exists, creating it if necessary
 * 
 * @param {string} dirPath - Directory path to ensure exists
 * @returns {boolean} True if directory exists or was created
 */
function ensureDirectoryExists(dirPath) {
    try {
        if (!pathExists(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return true;
    } catch (error) {
        throw new Error(`Failed to create directory: ${dirPath} - ${error.message}`);
    }
}

/**
 * Quote a path for use in shell commands (handles spaces)
 * 
 * @param {string} inputPath - Path to quote
 * @returns {string} Quoted path safe for shell commands
 */
function quotePathForShell(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new Error('Path must be a non-empty string');
    }
    
    if (process.platform === 'win32') {
        // On Windows, use double quotes
        // Escape any existing double quotes
        return `"${inputPath.replace(/"/g, '""')}"`;
    } else {
        // On Unix-like systems, use single quotes
        // Escape any existing single quotes
        return `'${inputPath.replace(/'/g, "'\\''")}'`;
    }
}

module.exports = {
    sanitizeProfileId,
    ensureValidPath,
    resolveDataPath,
    getBrowserProfilePath,
    pathExists,
    ensureDirectoryExists,
    quotePathForShell,
    // Export constants for testing
    WINDOWS_INVALID_CHARS,
    WINDOWS_RESERVED_NAMES
};
