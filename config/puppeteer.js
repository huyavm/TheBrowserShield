const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AntiDetectionSuite = require('./AntiDetectionSuite');
const browserDetector = require('../utils/browser-detector');

// Configure stealth plugin with specific evasions
const stealth = StealthPlugin();
// Disable some stealth evasions that might conflict with our custom implementation
stealth.enabledEvasions.delete('chrome.runtime');
stealth.enabledEvasions.delete('navigator.webdriver');
stealth.enabledEvasions.delete('navigator.plugins');

puppeteer.use(stealth);

/**
 * Get available browser executable path with cross-platform support
 * Requirements: 2.3, 2.5
 * 
 * Uses browser-detector for Windows path detection with fallback to
 * Puppeteer bundled Chromium if no system browser is found.
 * 
 * @returns {string|null} Path to browser executable or null for bundled Chromium
 */
function getBrowserExecutablePath() {
    // Use browser-detector to get the best available Chrome path
    // This handles Windows, Linux, and fallback to Puppeteer bundled Chromium
    const browserPath = browserDetector.getBestChromePath();
    
    if (browserPath) {
        // Validate the path exists before returning
        if (browserDetector.validatePath(browserPath)) {
            return browserPath;
        }
    }
    
    // Return null to let Puppeteer use its bundled Chromium
    // This is the fallback per Requirement 2.3
    return null;
}

const PUPPETEER_CONFIG = {
    // Default to visible mode (non-headless) for user interaction
    headless: false,
    executablePath: getBrowserExecutablePath(),
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-features=AudioServiceOutOfProcess',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-domain-reliability',
        '--memory-pressure-off',
        '--max_old_space_size=4096',
        '--disable-crash-reporter',
        '--disable-in-process-stack-traces',
        '--disable-logging',
        '--disable-system-font-check',
        '--log-level=3',
        '--start-maximized',
        // CRITICAL: These flags hide automation detection
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars'
    ],
    // CRITICAL: Exclude enable-automation switch to hide webdriver
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: null,
    timeout: 60000,
    protocolTimeout: 60000
};

/**
 * Create browser instance with profile settings
 * @param {Object} profile - Profile configuration
 * @param {Object} options - Launch options including headless mode
 * @param {boolean} [options.headless] - Override headless mode
 * @returns {Promise<Object>} Browser instance and page
 */
async function createBrowserWithProfile(profile, options = {}) {
    const config = { ...PUPPETEER_CONFIG };
    
    // Determine headless mode with precedence: options.headless → profile.defaultHeadless → false
    const headless = options.headless ?? profile.defaultHeadless ?? false;
    config.headless = headless;
    
    // Add separate user data directory for each profile
    const userDataDir = `./data/browser-profiles/${profile.id}`;
    config.userDataDir = userDataDir;
    
    // Clone args array to avoid modifying the original
    config.args = [...PUPPETEER_CONFIG.args];
    
    // Add proxy configuration if provided
    if (profile.proxy && profile.proxy.host && profile.proxy.port) {
        const proxyUrl = `${profile.proxy.type || 'http'}://${profile.proxy.host}:${profile.proxy.port}`;
        config.args.push(`--proxy-server=${proxyUrl}`);
    }
    
    // Launch browser
    const browser = await puppeteer.launch(config);
    const page = await browser.newPage();
    
    // CRITICAL: Apply anti-detection BEFORE any navigation
    // evaluateOnNewDocument must be called before page loads
    await applyProfileSettings(page, profile);
    
    return { browser, page };
}

/**
 * Apply profile settings to page
 * @param {Object} page - Puppeteer page instance
 * @param {Object} profile - Profile configuration
 */
async function applyProfileSettings(page, profile) {
    // Set user agent
    if (profile.userAgent) {
        await page.setUserAgent(profile.userAgent);
    }
    
    // Set viewport
    const viewport = profile.viewport || { width: 1366, height: 768 };
    await page.setViewport(viewport);
    
    // Set timezone
    if (profile.timezone) {
        await page.emulateTimezone(profile.timezone);
    }
    
    // Set proxy authentication if provided
    if (profile.proxy && profile.proxy.username && profile.proxy.password) {
        await page.authenticate({
            username: profile.proxy.username,
            password: profile.proxy.password
        });
    }
    
    // Apply enhanced anti-detection suite
    await AntiDetectionSuite.apply(page, profile);
    
    // Legacy spoofing for backward compatibility
    if (profile.spoofFingerprint) {
        await applySpoofingTechniques(page);
    }
}

/**
 * Apply additional spoofing techniques (legacy - kept for backward compatibility)
 * Note: Most of these are now handled by AntiDetectionSuite
 * @param {Object} page - Puppeteer page instance
 */
async function applySpoofingTechniques(page) {
    // Set additional headers for more realistic browser behavior
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    });
    
    // Additional cleanup of automation traces
    await page.evaluateOnNewDocument(() => {
        // Remove Chrome DevTools Protocol traces
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        
        // Clean up any $cdc_ variables that might be injected
        Object.keys(window).forEach(key => {
            if (key.match(/^\$cdc_/) || key.match(/^cdc_/)) {
                try {
                    delete window[key];
                } catch (e) {}
            }
        });
    });
}

module.exports = {
    createBrowserWithProfile,
    applyProfileSettings,
    PUPPETEER_CONFIG
};
