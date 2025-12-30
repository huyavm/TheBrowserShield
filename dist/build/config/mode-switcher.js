/**
 * BrowserShield Mode Switcher
 * Manages different operation modes: Mock, Production (Chrome), Firefox
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

const fs = require('fs');
const path = require('path');
const browserDetector = require('../utils/browser-detector');

class ModeSwitcher {
    constructor() {
        this.configFile = path.join(__dirname, '../data/mode-config.json');
        this.currentMode = this.loadCurrentMode();
        this.platform = process.platform;
        this.isWindows = this.platform === 'win32';
        
        // Cache for browser availability status with detailed messages
        this._chromeStatus = null;
        this._firefoxStatus = null;
    }

    /**
     * Load current mode from config file
     */
    loadCurrentMode() {
        try {
            if (fs.existsSync(this.configFile)) {
                const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
                return config.mode || 'mock';
            }
        } catch (error) {
            console.warn('Failed to load mode config, using default:', error.message);
        }
        return 'mock';
    }

    /**
     * Save current mode to config file
     */
    saveCurrentMode(mode) {
        try {
            const config = {
                mode: mode,
                lastChanged: new Date().toISOString(),
                capabilities: this.getModeCapabilities(mode)
            };
            
            // Ensure data directory exists
            const dataDir = path.dirname(this.configFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
            this.currentMode = mode;
            return true;
        } catch (error) {
            console.error('Failed to save mode config:', error.message);
            return false;
        }
    }

    /**
     * Get available modes with their status
     * Requirements: 8.4, 8.5
     */
    getAvailableModes() {
        const chromeStatus = this.getChromeStatus();
        const firefoxStatus = this.getFirefoxStatus();
        
        return {
            mock: {
                name: 'Mock Mode',
                description: 'Demo mode with simulated browser automation',
                available: true,
                requirements: 'None',
                features: ['Profile management', 'Session simulation', 'API testing'],
                performance: 'Fastest',
                reliability: 'Highest',
                unavailabilityReason: null
            },
            production: {
                name: 'Production Mode (Chrome)',
                description: 'Real browser automation with Chrome/Chromium',
                available: chromeStatus.available,
                requirements: 'Chrome/Chromium installed',
                features: ['Real browser automation', 'Website interaction', 'Screenshot capture'],
                performance: 'Medium',
                reliability: 'High',
                browserPath: chromeStatus.path,
                unavailabilityReason: chromeStatus.available ? null : chromeStatus.reason,
                howToEnable: chromeStatus.available ? null : chromeStatus.howToEnable
            },
            firefox: {
                name: 'Firefox Mode',
                description: 'Real browser automation with Firefox',
                available: firefoxStatus.available,
                requirements: 'Firefox installed',
                features: ['Firefox automation', 'Alternative fingerprinting', 'Website interaction'],
                performance: 'Medium',
                reliability: 'High',
                browserPath: firefoxStatus.path,
                unavailabilityReason: firefoxStatus.available ? null : firefoxStatus.reason,
                howToEnable: firefoxStatus.available ? null : firefoxStatus.howToEnable
            }
        };
    }

    /**
     * Get Chrome availability status with detailed information
     * Requirements: 8.2, 8.4, 8.5
     * 
     * @returns {Object} Chrome status with available, path, reason, and howToEnable
     */
    getChromeStatus() {
        if (this._chromeStatus) {
            return this._chromeStatus;
        }
        
        // Use browser-detector for cross-platform detection
        const chromePath = browserDetector.detectChrome();
        const edgePath = browserDetector.detectEdge();
        const puppeteerPath = browserDetector.getPuppeteerChromiumPath();
        
        if (chromePath) {
            this._chromeStatus = {
                available: true,
                path: chromePath,
                reason: null,
                howToEnable: null,
                detectionMethod: 'system-chrome'
            };
        } else if (edgePath) {
            // Edge can be used as Chrome alternative on Windows
            this._chromeStatus = {
                available: true,
                path: edgePath,
                reason: null,
                howToEnable: null,
                detectionMethod: 'edge-fallback'
            };
        } else if (puppeteerPath) {
            // Fallback to Puppeteer bundled Chromium
            this._chromeStatus = {
                available: true,
                path: puppeteerPath,
                reason: null,
                howToEnable: null,
                detectionMethod: 'puppeteer-bundled'
            };
        } else {
            // Chrome not available - provide detailed reason
            this._chromeStatus = {
                available: false,
                path: null,
                reason: this._getChromeUnavailabilityReason(),
                howToEnable: this._getChromeEnableInstructions(),
                detectionMethod: 'not-found'
            };
        }
        
        return this._chromeStatus;
    }

    /**
     * Get detailed reason why Chrome is unavailable
     * Requirements: 8.5
     * 
     * @returns {string} Detailed unavailability reason
     */
    _getChromeUnavailabilityReason() {
        if (this.isWindows) {
            return 'Chrome không được tìm thấy trong các đường dẫn cài đặt thông thường trên Windows. ' +
                   'Đã kiểm tra: Program Files, Program Files (x86), và thư mục LocalAppData.';
        }
        return 'Chrome/Chromium không được tìm thấy trong các đường dẫn hệ thống. ' +
               'Đã kiểm tra: /usr/bin/google-chrome, /usr/bin/chromium, và các đường dẫn phổ biến khác.';
    }

    /**
     * Get instructions on how to enable Chrome mode
     * Requirements: 8.5
     * 
     * @returns {string} Instructions to enable Chrome
     */
    _getChromeEnableInstructions() {
        if (this.isWindows) {
            return 'Để sử dụng Production Mode:\n' +
                   '1. Tải Chrome từ https://www.google.com/chrome/\n' +
                   '2. Cài đặt Chrome vào đường dẫn mặc định\n' +
                   '3. Khởi động lại BrowserShield\n' +
                   'Hoặc sử dụng Mock Mode để test mà không cần browser thật.';
        }
        return 'Để sử dụng Production Mode:\n' +
               '1. Cài đặt Chrome: sudo apt install google-chrome-stable\n' +
               '   Hoặc Chromium: sudo apt install chromium-browser\n' +
               '2. Khởi động lại BrowserShield\n' +
               'Hoặc sử dụng Mock Mode để test mà không cần browser thật.';
    }

    /**
     * Get Firefox availability status with detailed information
     * Requirements: 8.3, 8.4, 8.5
     * 
     * @returns {Object} Firefox status with available, path, reason, and howToEnable
     */
    getFirefoxStatus() {
        if (this._firefoxStatus) {
            return this._firefoxStatus;
        }
        
        // Use browser-detector for cross-platform detection
        const firefoxPath = browserDetector.detectFirefox();
        
        if (firefoxPath) {
            this._firefoxStatus = {
                available: true,
                path: firefoxPath,
                reason: null,
                howToEnable: null,
                detectionMethod: 'system-firefox'
            };
        } else {
            // Firefox not available - provide detailed reason
            this._firefoxStatus = {
                available: false,
                path: null,
                reason: this._getFirefoxUnavailabilityReason(),
                howToEnable: this._getFirefoxEnableInstructions(),
                detectionMethod: 'not-found'
            };
        }
        
        return this._firefoxStatus;
    }

    /**
     * Get detailed reason why Firefox is unavailable
     * Requirements: 8.5
     * 
     * @returns {string} Detailed unavailability reason
     */
    _getFirefoxUnavailabilityReason() {
        if (this.isWindows) {
            return 'Firefox không được tìm thấy trong các đường dẫn cài đặt thông thường trên Windows. ' +
                   'Đã kiểm tra: Program Files, Program Files (x86), và thư mục AppData.';
        }
        return 'Firefox không được tìm thấy trong các đường dẫn hệ thống. ' +
               'Đã kiểm tra: /usr/bin/firefox, /snap/bin/firefox.';
    }

    /**
     * Get instructions on how to enable Firefox mode
     * Requirements: 8.5
     * 
     * @returns {string} Instructions to enable Firefox
     */
    _getFirefoxEnableInstructions() {
        if (this.isWindows) {
            return 'Để sử dụng Firefox Mode:\n' +
                   '1. Tải Firefox từ https://www.mozilla.org/firefox/\n' +
                   '2. Cài đặt Firefox vào đường dẫn mặc định\n' +
                   '3. Khởi động lại BrowserShield\n' +
                   'Hoặc sử dụng Production Mode (Chrome) hoặc Mock Mode.';
        }
        return 'Để sử dụng Firefox Mode:\n' +
               '1. Cài đặt Firefox: sudo apt install firefox\n' +
               '2. Khởi động lại BrowserShield\n' +
               'Hoặc sử dụng Production Mode (Chrome) hoặc Mock Mode.';
    }

    /**
     * Check if Chrome/Chromium is available
     * Requirements: 8.1, 8.2
     * 
     * Uses browser-detector for Windows-compatible detection
     * instead of 'which' command
     */
    checkChromeAvailability() {
        return this.getChromeStatus().available;
    }

    /**
     * Check if Firefox is available
     * Requirements: 8.1, 8.3
     * 
     * Uses browser-detector for Windows-compatible detection
     * instead of 'which' command
     */
    checkFirefoxAvailability() {
        return this.getFirefoxStatus().available;
    }

    /**
     * Clear cached browser status (useful for re-detection after install)
     */
    clearBrowserCache() {
        this._chromeStatus = null;
        this._firefoxStatus = null;
        browserDetector.clearCache();
    }

    /**
     * Get detailed browser detection report
     * Useful for diagnostics
     * 
     * @returns {Object} Detailed detection report
     */
    getBrowserDetectionReport() {
        return {
            platform: this.platform,
            isWindows: this.isWindows,
            chrome: this.getChromeStatus(),
            firefox: this.getFirefoxStatus(),
            detectorReport: browserDetector.getDetectionReport()
        };
    }

    /**
     * Get capabilities for a specific mode
     */
    getModeCapabilities(mode) {
        const modes = this.getAvailableModes();
        return modes[mode] ? modes[mode].features : [];
    }

    /**
     * Switch to a different mode
     */
    switchMode(newMode) {
        const availableModes = this.getAvailableModes();
        
        if (!availableModes[newMode]) {
            return {
                success: false,
                error: `Invalid mode: ${newMode}. Available modes: ${Object.keys(availableModes).join(', ')}`
            };
        }

        if (!availableModes[newMode].available) {
            return {
                success: false,
                error: `Mode ${newMode} is not available. Requirements: ${availableModes[newMode].requirements}`
            };
        }

        const previousMode = this.currentMode;
        
        if (this.saveCurrentMode(newMode)) {
            return {
                success: true,
                previousMode: previousMode,
                currentMode: newMode,
                message: `Successfully switched from ${previousMode} to ${newMode}`,
                requiresRestart: true
            };
        } else {
            return {
                success: false,
                error: 'Failed to save mode configuration'
            };
        }
    }

    /**
     * Get current mode info
     */
    getCurrentModeInfo() {
        const modes = this.getAvailableModes();
        return {
            currentMode: this.currentMode,
            info: modes[this.currentMode],
            allModes: modes
        };
    }

    /**
     * Get the appropriate browser service class for current mode
     */
    getBrowserServiceClass() {
        switch (this.currentMode) {
            case 'production':
                return require('../services/BrowserService');
            case 'firefox':
                return require('../services/FirefoxBrowserService');
            case 'mock':
            default:
                return require('../services/MockBrowserService');
        }
    }

    /**
     * Get mode-specific configuration
     */
    getModeConfig() {
        switch (this.currentMode) {
            case 'production':
                return {
                    puppeteerOptions: {
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--no-first-run',
                            '--no-zygote',
                            '--single-process',
                            '--disable-gpu'
                        ]
                    }
                };
            case 'firefox':
                return {
                    puppeteerOptions: {
                        product: 'firefox',
                        headless: true
                    }
                };
            case 'mock':
            default:
                return {
                    mockFeatures: {
                        simulateDelay: true,
                        generateScreenshots: false,
                        mockNavigation: true
                    }
                };
        }
    }
}

module.exports = ModeSwitcher;