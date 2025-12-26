const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin
puppeteerExtra.use(StealthPlugin());

// Get Chrome executable path based on environment
function getChromeExecutablePath() {
    const os = require('os');
    const platform = os.platform();
    
    // Common Chrome paths for different systems
    const chromePaths = {
        linux: [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium'
        ],
        darwin: [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ],
        win32: [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ]
    };
    
    const fs = require('fs');
    const paths = chromePaths[platform] || chromePaths.linux;
    
    for (const path of paths) {
        if (fs.existsSync(path)) {
            return path;
        }
    }
    
    return null; // Let Puppeteer use its bundled Chromium
}

/**
 * Create Firefox-style browser instance with Chrome engine
 * Compatible with Replit environment
 * @param {Object} profile - Profile configuration
 * @param {Object} options - Launch options
 * @param {boolean} [options.headless] - Override headless mode (default: false for visible mode)
 */
async function createFirefoxBrowserWithProfile(profile, options = {}) {
    try {
        // Determine headless mode with precedence: options.headless → profile.defaultHeadless → false
        const headless = options.headless ?? profile.defaultHeadless ?? false;
        
        const launchOptions = {
            headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--single-process',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ],
            defaultViewport: null  // Use full window size for visible mode
        };

        // Add maximize window arg for visible mode
        if (!headless) {
            launchOptions.args.push('--start-maximized');
        }

        // Try to find Chrome executable or use bundled Chromium
        const executablePath = getChromeExecutablePath();
        if (executablePath) {
            launchOptions.executablePath = executablePath;
        }

        // Add proxy if configured
        if (profile.proxy && profile.proxy.host && profile.proxy.port) {
            launchOptions.args.push(`--proxy-server=${profile.proxy.host}:${profile.proxy.port}`);
        }

        const browser = await puppeteerExtra.launch(launchOptions);
        const page = await browser.newPage();

        // Apply Firefox-like settings
        await applyFirefoxProfileSettings(page, profile);
        await applyFirefoxSpoofingTechniques(page);

        return { browser, page };
    } catch (error) {
        console.error('Error creating Firefox browser:', error);
        throw new Error('Failed to create Firefox browser: ' + error.message);
    }
}

/**
 * Apply Firefox-style profile settings
 */
async function applyFirefoxProfileSettings(page, profile) {
    // Set Firefox user agent
    const firefoxUA = profile.userAgent || 
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0';
    
    await page.setUserAgent(firefoxUA);

    // Set viewport
    if (profile.viewport) {
        await page.setViewport({
            width: profile.viewport.width || 1920,
            height: profile.viewport.height || 1080
        });
    }

    // Set timezone if specified
    if (profile.timezone) {
        await page.emulateTimezone(profile.timezone);
    }
}

/**
 * Apply Firefox-specific spoofing techniques
 */
async function applyFirefoxSpoofingTechniques(page) {
    // Override navigator properties to simulate Firefox
    await page.evaluateOnNewDocument(() => {
        // Firefox-specific navigator properties
        Object.defineProperty(navigator, 'userAgent', {
            get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
        });
        
        Object.defineProperty(navigator, 'appName', {
            get: () => 'Netscape'
        });
        
        Object.defineProperty(navigator, 'appVersion', {
            get: () => '5.0 (Windows)'
        });
        
        Object.defineProperty(navigator, 'product', {
            get: () => 'Gecko'
        });
        
        Object.defineProperty(navigator, 'vendor', {
            get: () => ''
        });
        
        // Simulate Firefox WebGL renderer
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) {
                return 'Mozilla';
            }
            if (parameter === 37446) {
                return 'Mozilla Firefox';
            }
            return getParameter.apply(this, arguments);
        };
    });
}

module.exports = {
    createFirefoxBrowserWithProfile,
    applyFirefoxProfileSettings,
    applyFirefoxSpoofingTechniques
};