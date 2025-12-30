/**
 * Windows Browser Detector
 * Detects browser executables on Windows with caching support
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

const fs = require('fs');
const path = require('path');

// Cache for detected browser paths
let browserPathCache = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Common Chrome installation paths on Windows
 * Requirements: 2.1
 */
const CHROME_PATHS_WINDOWS = [
    // Standard installation paths
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // User-specific installation
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
    // Canary/Dev/Beta channels
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome SxS', 'Application', 'chrome.exe') : null,
].filter(Boolean);

/**
 * Common Firefox installation paths on Windows
 * Requirements: 2.2
 */
const FIREFOX_PATHS_WINDOWS = [
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
    // User-specific installation
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Mozilla Firefox', 'firefox.exe') : null,
    process.env.APPDATA ? path.join(process.env.APPDATA, 'Mozilla Firefox', 'firefox.exe') : null,
].filter(Boolean);

/**
 * Common Edge installation paths on Windows
 */
const EDGE_PATHS_WINDOWS = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : null,
].filter(Boolean);

/**
 * Linux browser paths (for cross-platform support)
 */
const CHROME_PATHS_LINUX = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
];

const FIREFOX_PATHS_LINUX = [
    '/usr/bin/firefox',
    '/snap/bin/firefox',
];

/**
 * Validate that a path exists and is an executable file
 * Requirements: 2.5
 * 
 * @param {string} executablePath - Path to validate
 * @returns {boolean} True if path exists and is accessible
 */
function validatePath(executablePath) {
    if (!executablePath || typeof executablePath !== 'string') {
        return false;
    }
    
    try {
        const stats = fs.statSync(executablePath);
        // Check if it's a file (not a directory)
        if (!stats.isFile()) {
            return false;
        }
        // On Windows, check if file is readable
        fs.accessSync(executablePath, fs.constants.R_OK);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Find the first valid path from a list of possible paths
 * 
 * @param {string[]} paths - Array of paths to check
 * @returns {string|null} First valid path or null if none found
 */
function findFirstValidPath(paths) {
    for (const browserPath of paths) {
        if (validatePath(browserPath)) {
            return browserPath;
        }
    }
    return null;
}

/**
 * Detect Chrome executable path
 * Requirements: 2.1
 * 
 * @returns {string|null} Path to Chrome executable or null if not found
 */
function detectChrome() {
    const isWindows = process.platform === 'win32';
    const paths = isWindows ? CHROME_PATHS_WINDOWS : CHROME_PATHS_LINUX;
    return findFirstValidPath(paths);
}

/**
 * Detect Firefox executable path
 * Requirements: 2.2
 * 
 * @returns {string|null} Path to Firefox executable or null if not found
 */
function detectFirefox() {
    const isWindows = process.platform === 'win32';
    const paths = isWindows ? FIREFOX_PATHS_WINDOWS : FIREFOX_PATHS_LINUX;
    return findFirstValidPath(paths);
}

/**
 * Detect Microsoft Edge executable path
 * 
 * @returns {string|null} Path to Edge executable or null if not found
 */
function detectEdge() {
    // Edge is primarily a Windows browser
    if (process.platform !== 'win32') {
        return null;
    }
    return findFirstValidPath(EDGE_PATHS_WINDOWS);
}

/**
 * Get Puppeteer's bundled Chromium path
 * Requirements: 2.3
 * 
 * @returns {string|null} Path to bundled Chromium or null if not available
 */
function getPuppeteerChromiumPath() {
    try {
        const puppeteer = require('puppeteer');
        const executablePath = puppeteer.executablePath();
        if (validatePath(executablePath)) {
            return executablePath;
        }
    } catch (error) {
        // Puppeteer not installed or bundled Chromium not available
    }
    return null;
}

/**
 * Check if cache is still valid
 * 
 * @returns {boolean} True if cache is valid
 */
function isCacheValid() {
    if (!browserPathCache || !cacheTimestamp) {
        return false;
    }
    return (Date.now() - cacheTimestamp) < CACHE_TTL_MS;
}

/**
 * Get all detected browser paths with caching
 * Requirements: 2.4
 * 
 * @param {boolean} forceRefresh - Force refresh the cache
 * @returns {Object} Object containing detected browser paths
 */
function getCachedPaths(forceRefresh = false) {
    if (!forceRefresh && isCacheValid()) {
        return browserPathCache;
    }
    
    browserPathCache = {
        chrome: detectChrome(),
        firefox: detectFirefox(),
        edge: detectEdge(),
        puppeteerChrome: getPuppeteerChromiumPath(),
        platform: process.platform,
        detectedAt: new Date().toISOString()
    };
    cacheTimestamp = Date.now();
    
    return browserPathCache;
}

/**
 * Clear the browser path cache
 */
function clearCache() {
    browserPathCache = null;
    cacheTimestamp = null;
}

/**
 * Get the best available browser path for Chrome-based automation
 * Falls back to Puppeteer bundled Chromium if no system browser found
 * Requirements: 2.3
 * 
 * @returns {string|null} Best available Chrome-compatible browser path
 */
function getBestChromePath() {
    const paths = getCachedPaths();
    
    // Prefer system Chrome, then Edge, then Puppeteer bundled
    return paths.chrome || paths.edge || paths.puppeteerChrome || null;
}

/**
 * Get browser availability status
 * 
 * @returns {Object} Object with availability status for each browser
 */
function getBrowserAvailability() {
    const paths = getCachedPaths();
    
    return {
        chrome: {
            available: paths.chrome !== null,
            path: paths.chrome,
            message: paths.chrome 
                ? `Chrome found at: ${paths.chrome}`
                : 'Chrome not found. Install Chrome or use Mock mode.'
        },
        firefox: {
            available: paths.firefox !== null,
            path: paths.firefox,
            message: paths.firefox
                ? `Firefox found at: ${paths.firefox}`
                : 'Firefox not found. Install Firefox to use Firefox mode.'
        },
        edge: {
            available: paths.edge !== null,
            path: paths.edge,
            message: paths.edge
                ? `Edge found at: ${paths.edge}`
                : 'Edge not found.'
        },
        puppeteerChrome: {
            available: paths.puppeteerChrome !== null,
            path: paths.puppeteerChrome,
            message: paths.puppeteerChrome
                ? `Puppeteer Chromium available at: ${paths.puppeteerChrome}`
                : 'Puppeteer bundled Chromium not available.'
        }
    };
}

/**
 * Get detailed browser detection report
 * Useful for diagnostics and troubleshooting
 * 
 * @returns {Object} Detailed detection report
 */
function getDetectionReport() {
    const paths = getCachedPaths(true); // Force refresh for report
    const availability = getBrowserAvailability();
    
    return {
        platform: process.platform,
        arch: process.arch,
        detectedAt: paths.detectedAt,
        browsers: availability,
        searchedPaths: {
            chrome: process.platform === 'win32' ? CHROME_PATHS_WINDOWS : CHROME_PATHS_LINUX,
            firefox: process.platform === 'win32' ? FIREFOX_PATHS_WINDOWS : FIREFOX_PATHS_LINUX,
            edge: EDGE_PATHS_WINDOWS
        },
        recommendation: getRecommendation(availability)
    };
}

/**
 * Get recommendation based on browser availability
 * 
 * @param {Object} availability - Browser availability status
 * @returns {string} Recommendation message
 */
function getRecommendation(availability) {
    if (availability.chrome.available) {
        return 'Chrome is available. Production mode recommended.';
    }
    if (availability.edge.available) {
        return 'Edge is available and can be used as Chrome alternative.';
    }
    if (availability.puppeteerChrome.available) {
        return 'Using Puppeteer bundled Chromium. Consider installing Chrome for better performance.';
    }
    if (availability.firefox.available) {
        return 'Only Firefox is available. Use Firefox mode or install Chrome.';
    }
    return 'No browsers detected. Use Mock mode or install Chrome/Firefox.';
}

module.exports = {
    // Core detection functions
    detectChrome,
    detectFirefox,
    detectEdge,
    validatePath,
    
    // Caching functions
    getCachedPaths,
    clearCache,
    
    // Utility functions
    getBestChromePath,
    getPuppeteerChromiumPath,
    getBrowserAvailability,
    getDetectionReport,
    
    // Export path constants for testing
    CHROME_PATHS_WINDOWS,
    FIREFOX_PATHS_WINDOWS,
    EDGE_PATHS_WINDOWS,
    CHROME_PATHS_LINUX,
    FIREFOX_PATHS_LINUX
};
