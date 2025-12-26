const { createBrowserWithProfile } = require('../config/puppeteer');
const ProfileService = require('./ProfileService');
const logger = require('../utils/logger');

class BrowserService {
    constructor() {
        this.activeSessions = new Map(); // profileId -> { browser, page, startTime }
        this.startingProfiles = new Set(); // Track profiles currently starting
        this.stoppingProfiles = new Set(); // Track profiles currently stopping
    }

    /**
     * Start browser with profile
     * @param {string} profileId - Profile ID
     * @param {string} autoNavigateUrl - URL to navigate to after starting
     * @param {Object} options - Additional options
     * @param {boolean} [options.headless] - Override headless mode (default: false for visible mode)
     * @returns {Object} Session info
     */
    async startBrowser(profileId, autoNavigateUrl = null, options = {}) {
        // Check if profile is currently being started
        if (this.startingProfiles.has(profileId)) {
            throw new Error(`Browser is currently starting for profile ${profileId}`);
        }

        // Check if browser is already running for this profile (Requirement 6.3)
        if (this.activeSessions.has(profileId)) {
            const error = new Error('Browser session already running for this profile');
            error.code = 'SESSION_ACTIVE';
            error.profileId = profileId;
            throw error;
        }

        // Mark profile as starting to prevent race conditions
        this.startingProfiles.add(profileId);

        try {
            // Get profile (Requirement 6.1)
            const profile = await ProfileService.getProfile(profileId);
            if (!profile) {
                const error = new Error(`Profile not found: ${profileId}`);
                error.code = 'PROFILE_NOT_FOUND';
                error.profileId = profileId;
                throw error;
            }

            // Determine headless mode with precedence: options.headless → profile.defaultHeadless → false
            const headless = options.headless ?? profile.defaultHeadless ?? false;

            // Log headless mode when starting browser (Requirement 6.4)
            logger.info(`Starting browser for profile: ${profile.name} (${profileId}) - headless: ${headless}`);
            
            // Create browser instance with profile settings and headless option
            let browser, page;
            try {
                const result = await createBrowserWithProfile(profile, { headless });
                browser = result.browser;
                page = result.page;
            } catch (launchError) {
                // Check if browser executable not found (Requirement 6.1)
                if (launchError.message && (
                    launchError.message.includes('executable') ||
                    launchError.message.includes('ENOENT') ||
                    launchError.message.includes('spawn') ||
                    launchError.message.includes('not found')
                )) {
                    const error = new Error('Browser executable not found. Please install Chrome/Firefox.');
                    error.code = 'BROWSER_NOT_FOUND';
                    error.originalError = launchError;
                    logger.error(`Browser executable not found for profile ${profileId}:`, launchError);
                    throw error;
                }
                // Re-throw other launch errors
                const error = new Error(`Failed to launch browser: ${launchError.message}`);
                error.code = 'LAUNCH_FAILED';
                error.originalError = launchError;
                throw error;
            }
            
            // Store session with headless mode (Requirement 6.4 - log mode in session info)
            const session = {
                browser,
                page,
                profile,
                startTime: new Date().toISOString(),
                status: 'running',
                headless
            };
            
            this.activeSessions.set(profileId, session);
            
            // Log session info including headless mode (Requirement 6.4)
            logger.info(`Session created for profile: ${profile.name} (${profileId}) - mode: ${headless ? 'headless' : 'visible'}`);
            
            // Set up browser event handlers
            browser.on('disconnected', () => {
                logger.info(`Browser disconnected for profile: ${profileId}`);
                this.activeSessions.delete(profileId);
            });

            // Navigate to specified URL or default test page
            const targetUrl = autoNavigateUrl || 'https://httpbin.org/headers';
            await page.goto(targetUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            logger.info(`Browser started successfully for profile: ${profile.name} (${profileId}) - headless: ${headless}`);
            
            return {
                profileId,
                profileName: profile.name,
                status: 'running',
                startTime: session.startTime,
                headless,
                browserInfo: {
                    userAgent: profile.userAgent,
                    viewport: profile.viewport,
                    timezone: profile.timezone,
                    proxy: profile.proxy ? {
                        host: profile.proxy.host,
                        port: profile.proxy.port,
                        type: profile.proxy.type
                    } : null
                }
            };
            
        } catch (error) {
            logger.error(`Failed to start browser for profile ${profileId}:`, error);
            
            // Clean up if browser creation failed
            if (this.activeSessions.has(profileId)) {
                const session = this.activeSessions.get(profileId);
                if (session.browser) {
                    try {
                        await session.browser.close();
                    } catch (closeError) {
                        logger.error('Error closing browser after failed start:', closeError);
                    }
                }
                this.activeSessions.delete(profileId);
            }
            
            throw error;
        } finally {
            // Always remove from starting profiles set
            this.startingProfiles.delete(profileId);
        }
    }

    /**
     * Stop browser session
     * @param {string} profileId - Profile ID
     * @returns {boolean} True if stopped, false if not running
     */
    async stopBrowser(profileId) {
        // Check if profile is currently being stopped
        if (this.stoppingProfiles.has(profileId)) {
            logger.info(`Browser is already being stopped for profile ${profileId}`);
            return true;
        }

        const session = this.activeSessions.get(profileId);
        if (!session) {
            return false;
        }

        // Mark profile as stopping to prevent race conditions
        this.stoppingProfiles.add(profileId);

        try {
            logger.info(`Stopping browser for profile: ${profileId}`);
            
            if (session.browser) {
                await session.browser.close();
            }
            
            this.activeSessions.delete(profileId);
            logger.info(`Browser stopped successfully for profile: ${profileId}`);
            
            return true;
        } catch (error) {
            logger.error(`Error stopping browser for profile ${profileId}:`, error);
            // Still remove from active sessions even if close failed
            this.activeSessions.delete(profileId);
            return true;
        } finally {
            // Always remove from stopping profiles set
            this.stoppingProfiles.delete(profileId);
        }
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

        return {
            profileId,
            profileName: session.profile.name,
            status: session.status,
            startTime: session.startTime,
            headless: session.headless,
            uptime: Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
        };
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
                uptime: Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)
            });
        }
        return sessions;
    }

    /**
     * Stop all browser sessions
     */
    async stopAllBrowsers() {
        const profileIds = Array.from(this.activeSessions.keys());
        const stopPromises = profileIds.map(profileId => this.stopBrowser(profileId));
        
        try {
            await Promise.all(stopPromises);
            logger.info('All browser sessions stopped successfully');
        } catch (error) {
            logger.error('Error stopping some browser sessions:', error);
        }
    }

    /**
     * Execute script in browser
     * @param {string} profileId - Profile ID
     * @param {string} script - JavaScript code to execute
     * @returns {any} Script result
     */
    async executeScript(profileId, script) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            throw new Error(`No active browser session for profile: ${profileId}`);
        }

        try {
            const result = await session.page.evaluate(script);
            logger.info(`Script executed successfully for profile: ${profileId}`);
            return result;
        } catch (error) {
            logger.error(`Script execution failed for profile ${profileId}:`, error);
            throw error;
        }
    }

    /**
     * Navigate to URL
     * @param {string} profileId - Profile ID
     * @param {string} url - URL to navigate to
     * @returns {Object} Navigation result
     */
    async navigateToUrl(profileId, url) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            throw new Error(`No active browser session for profile: ${profileId}`);
        }

        try {
            await session.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            const currentUrl = session.page.url();
            logger.info(`Navigation successful for profile ${profileId}: ${currentUrl}`);
            
            return {
                success: true,
                url: currentUrl,
                title: await session.page.title()
            };
        } catch (error) {
            logger.error(`Navigation failed for profile ${profileId}:`, error);
            throw error;
        }
    }
}

module.exports = BrowserService;