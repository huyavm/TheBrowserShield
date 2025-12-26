const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AntiDetectionSuite = require('./AntiDetectionSuite');
const browserDetector = require('../utils/browser-detector');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

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
        '--disable-extensions',
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
        '--start-maximized'
    ],
    // Reduce memory usage and improve stability
    ignoreDefaultArgs: ['--disable-extensions'],
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
    
    // Add proxy configuration if provided
    if (profile.proxy && profile.proxy.host && profile.proxy.port) {
        const proxyUrl = `${profile.proxy.type || 'http'}://${profile.proxy.host}:${profile.proxy.port}`;
        config.args.push(`--proxy-server=${proxyUrl}`);
    }
    
    // Launch browser
    const browser = await puppeteer.launch(config);
    const page = await browser.newPage();
    
    // Apply profile settings
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
 * Apply additional spoofing techniques
 * @param {Object} page - Puppeteer page instance
 */
async function applySpoofingTechniques(page) {
    // Override navigator properties
    await page.evaluateOnNewDocument(() => {
        // Spoof webdriver property
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
        
        // Spoof languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        
        // Spoof plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        
        // Spoof permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
        
        // Remove webdriver traces
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });
    
    // Set additional headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    });
}

module.exports = {
    createBrowserWithProfile,
    applyProfileSettings,
    PUPPETEER_CONFIG
};
