const ProfileService = require('./ProfileService');
const logger = require('../utils/logger');

class MockBrowserService {
    constructor() {
        this.activeSessions = new Map(); // profileId -> { profile, startTime, status }
    }

    /**
     * Start browser with profile (Mock implementation for Replit demo)
     * @param {string} profileId - Profile ID
     * @param {string} autoNavigateUrl - URL to navigate to after starting
     * @param {Object} options - Additional options
     * @param {boolean} [options.headless] - Override headless mode (default: false for visible mode)
     * @returns {Object} Session info
     */
    async startBrowser(profileId, autoNavigateUrl = null, options = {}) {
        // Check if browser is already running for this profile
        if (this.activeSessions.has(profileId)) {
            throw new Error(`Browser is already running for profile ${profileId}`);
        }

        // Get profile
        const profile = await ProfileService.getProfile(profileId);
        if (!profile) {
            throw new Error(`Profile not found: ${profileId}`);
        }

        // Determine headless mode with precedence: options.headless → profile.defaultHeadless → false
        const headless = options.headless ?? profile.defaultHeadless ?? false;

        logger.info(`Starting mock browser for profile: ${profile.name} (${profileId}) - headless: ${headless}`);
        
        // Simulate browser initialization time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Store mock session
        const defaultUrl = 'https://httpbin.org/headers';
        const finalUrl = autoNavigateUrl || defaultUrl;
        
        const session = {
            profile,
            startTime: new Date().toISOString(),
            status: 'running',
            headless,
            mockData: {
                currentUrl: finalUrl,
                title: autoNavigateUrl ? `Mock Page - ${new URL(autoNavigateUrl).hostname}` : 'httpbin.org - Headers Test',
                sessionId: `mock-session-${Date.now()}`,
                autoNavigated: !!autoNavigateUrl
            }
        };
        
        this.activeSessions.set(profileId, session);
        
        logger.info(`Mock browser started successfully for profile: ${profile.name} (${profileId}) - headless: ${headless}`);

        // Build response with visible mode notification for mock mode
        const response = {
            profileId,
            profileName: profile.name,
            status: 'running',
            startTime: session.startTime,
            headless,
            note: 'This is a mock browser session for Replit demo. In production, this would launch a real Puppeteer browser.',
            browserInfo: {
                userAgent: profile.userAgent,
                viewport: profile.viewport,
                timezone: profile.timezone,
                proxy: profile.proxy ? {
                    host: profile.proxy.host,
                    port: profile.proxy.port,
                    type: profile.proxy.type
                } : null,
                spoofFingerprint: profile.spoofFingerprint
            },
            mockFeatures: {
                antiDetection: profile.spoofFingerprint ? 'enabled' : 'disabled',
                proxySupport: profile.proxy ? 'configured' : 'not configured',
                autoNavigated: session.mockData.autoNavigated,
                fingerprintSpoofing: [
                    'webdriver property hidden',
                    'navigator properties spoofed',
                    'canvas fingerprint randomized',
                    'webgl fingerprint modified'
                ]
            }
        };

        // Add notification when visible mode is requested in mock mode
        if (!headless) {
            response.visibleModeNotice = 'Visible browser mode is not available in mock mode. In production mode (Chrome) or Firefox mode, a real browser window will be displayed for direct interaction.';
        }
        
        return response;
    }

    /**
     * Stop browser session
     * @param {string} profileId - Profile ID
     * @returns {boolean} True if stopped, false if not running
     */
    async stopBrowser(profileId) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            return false;
        }

        logger.info(`Stopping mock browser for profile: ${profileId}`);
        
        // Simulate cleanup time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.activeSessions.delete(profileId);
        
        logger.info(`Mock browser stopped for profile: ${profileId}`);
        return true;
    }

    /**
     * Get browser session status
     * @param {string} profileId - Profile ID
     * @returns {Object|null} Session status or null if not running
     */
    getBrowserStatus(profileId) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            return null;
        }

        const response = {
            profileId,
            profileName: session.profile.name,
            status: session.status,
            startTime: session.startTime,
            headless: session.headless,
            uptime: Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000),
            currentUrl: session.mockData.currentUrl,
            title: session.mockData.title,
            sessionId: session.mockData.sessionId,
            note: 'Mock browser session - in production this would show real browser status',
            browserInfo: {
                userAgent: session.profile.userAgent,
                viewport: session.profile.viewport,
                timezone: session.profile.timezone,
                proxy: session.profile.proxy ? {
                    host: session.profile.proxy.host,
                    port: session.profile.port,
                    type: session.profile.proxy.type
                } : null
            }
        };

        // Add notification when visible mode was requested in mock mode
        if (!session.headless) {
            response.visibleModeNotice = 'Visible browser mode is not available in mock mode. In production mode (Chrome) or Firefox mode, a real browser window will be displayed for direct interaction.';
        }

        return response;
    }

    /**
     * Get all active browser sessions
     * @returns {Array} Array of active sessions
     */
    getAllActiveSessions() {
        const sessions = [];
        for (const [profileId, session] of this.activeSessions) {
            sessions.push({
                profileId,
                profileName: session.profile.name,
                status: session.status,
                startTime: session.startTime,
                headless: session.headless,
                uptime: Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000),
                sessionId: session.mockData.sessionId,
                note: 'Mock session'
            });
        }
        return sessions;
    }

    /**
     * Stop all browser sessions
     */
    async stopAllBrowsers() {
        const profileIds = Array.from(this.activeSessions.keys());
        const promises = profileIds.map(profileId => 
            this.stopBrowser(profileId).catch(error => 
                logger.error(`Error stopping mock browser for profile ${profileId}:`, error)
            )
        );
        
        await Promise.all(promises);
        logger.info(`Stopped ${profileIds.length} mock browser sessions`);
    }

    /**
     * Execute script in browser (Mock implementation)
     * @param {string} profileId - Profile ID
     * @param {string} script - JavaScript code to execute
     * @returns {any} Script result
     */
    async executeScript(profileId, script) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            throw new Error(`No active browser session for profile: ${profileId}`);
        }

        logger.info(`Executing script in mock browser for profile: ${profileId}`);
        
        // Simulate script execution
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Return mock results based on common scripts
        if (script.includes('navigator.userAgent')) {
            return session.profile.userAgent;
        } else if (script.includes('window.location.href')) {
            return session.mockData.currentUrl;
        } else if (script.includes('document.title')) {
            return session.mockData.title;
        } else if (script.includes('navigator.webdriver')) {
            return undefined; // Properly spoofed
        } else {
            return {
                result: 'Mock script execution result',
                script: script.substring(0, 100) + (script.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString(),
                note: 'This is a mock result. In production, this would execute real JavaScript in the browser.'
            };
        }
    }

    /**
     * Navigate to URL (Mock implementation)
     * @param {string} profileId - Profile ID
     * @param {string} url - URL to navigate to
     * @returns {Object} Navigation result
     */
    async navigateToUrl(profileId, url) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            throw new Error(`No active browser session for profile: ${profileId}`);
        }

        logger.info(`Mock navigation to ${url} for profile: ${profileId}`);
        
        // Simulate navigation time
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Update mock session data
        session.mockData.currentUrl = url;
        session.mockData.title = `Mock Page - ${new URL(url).hostname}`;
        
        return {
            url: url,
            title: session.mockData.title,
            status: 200,
            statusText: 'OK',
            loadTime: '0.8s',
            note: 'Mock navigation - in production this would actually navigate the browser to the URL'
        };
    }
}

module.exports = new MockBrowserService();