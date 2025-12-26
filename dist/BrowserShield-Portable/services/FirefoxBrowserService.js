const { createFirefoxBrowserWithProfile } = require('../config/firefox-puppeteer-simple');
const logger = require('../utils/logger');

/**
 * Firefox Browser Service
 * Manages Firefox browser instances using puppeteer-firefox
 */
class FirefoxBrowserService {
    constructor() {
        this.activeSessions = new Map();
        this.profileService = null;
        this.logService = null;
        
        // Cleanup handler
        process.on('SIGINT', () => this.stopAllBrowsers());
        process.on('SIGTERM', () => this.stopAllBrowsers());
    }

    setProfileService(profileService) {
        this.profileService = profileService;
    }

    setLogService(logService) {
        this.logService = logService;
    }

    /**
     * Start Firefox browser with profile
     * @param {string} profileId - Profile ID
     * @param {string} autoNavigateUrl - URL to navigate to after starting
     * @param {Object} options - Additional options
     * @param {boolean} [options.headless] - Override headless mode (default: false for visible mode)
     * @returns {Object} Session info
     */
    async startBrowser(profileId, autoNavigateUrl = null, options = {}) {
        try {
            if (this.activeSessions.has(profileId)) {
                throw new Error('Browser session already active for this profile');
            }

            // Get profile from server's in-memory storage (for compatibility)
            // In production, this would use proper profile service
            const profile = {
                id: profileId,
                name: 'Firefox Profile',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
                timezone: 'America/New_York',
                viewport: { width: 1920, height: 1080 },
                proxy: null,
                defaultHeadless: false
            };

            // Determine headless mode with precedence: options.headless → profile.defaultHeadless → false
            const headless = options.headless ?? profile.defaultHeadless ?? false;

            logger.info(`Starting Firefox browser for profile: ${profileId} (headless: ${headless})`);

            const { browser, page } = await createFirefoxBrowserWithProfile(profile, { headless });

            const session = {
                profileId,
                browser,
                page,
                startTime: Date.now(),
                status: 'active',
                currentUrl: null,
                browserType: 'firefox',
                headless
            };

            // Handle browser disconnect
            browser.on('disconnected', () => {
                logger.warn(`Firefox browser disconnected for profile: ${profileId}`);
                this.activeSessions.delete(profileId);
            });

            this.activeSessions.set(profileId, session);

            // Auto-navigate if URL provided
            if (autoNavigateUrl) {
                try {
                    await page.goto(autoNavigateUrl, { 
                        waitUntil: 'networkidle2',
                        timeout: 30000 
                    });
                    session.currentUrl = autoNavigateUrl;
                    logger.info(`Auto-navigated to: ${autoNavigateUrl}`);
                } catch (navError) {
                    logger.warn(`Auto-navigation failed: ${navError.message}`);
                }
            }

            // Log activity
            if (this.logService) {
                await this.logService.logActivity(profileId, 'browser_start', {
                    browserType: 'firefox',
                    autoNavigateUrl,
                    userAgent: profile.userAgent,
                    viewport: profile.viewport,
                    headless
                });
            }

            logger.info(`Firefox browser started successfully for profile: ${profileId} (headless: ${headless})`);

            return {
                profileId,
                status: 'started',
                startTime: session.startTime,
                browserType: 'firefox',
                currentUrl: session.currentUrl,
                headless
            };

        } catch (error) {
            logger.error(`Failed to start Firefox browser for profile ${profileId}:`, error.message);
            
            if (this.logService) {
                await this.logService.logActivity(profileId, 'browser_start_failed', {
                    error: error.message,
                    browserType: 'firefox'
                });
            }
            
            throw error;
        }
    }

    /**
     * Stop Firefox browser session
     * @param {string} profileId - Profile ID
     * @returns {boolean} True if stopped, false if not running
     */
    async stopBrowser(profileId) {
        try {
            const session = this.activeSessions.get(profileId);
            if (!session) {
                return false;
            }

            logger.info(`Stopping Firefox browser for profile: ${profileId}`);

            await session.browser.close();
            this.activeSessions.delete(profileId);

            // Log activity
            if (this.logService) {
                const uptime = Math.floor((Date.now() - session.startTime) / 1000);
                await this.logService.logActivity(profileId, 'browser_stop', {
                    browserType: 'firefox',
                    uptime: `${uptime}s`,
                    finalUrl: session.currentUrl
                });
            }

            logger.info(`Firefox browser stopped for profile: ${profileId}`);
            return true;

        } catch (error) {
            logger.error(`Error stopping Firefox browser for profile ${profileId}:`, error.message);
            this.activeSessions.delete(profileId);
            return true;
        }
    }

    /**
     * Get Firefox browser session status
     * @param {string} profileId - Profile ID
     * @returns {Object|null} Session status or null if not running
     */
    getBrowserStatus(profileId) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            return null;
        }

        const uptime = Math.floor((Date.now() - session.startTime) / 1000);

        return {
            profileId,
            status: session.status,
            startTime: session.startTime,
            uptime,
            currentUrl: session.currentUrl,
            browserType: 'firefox',
            headless: session.headless
        };
    }

    /**
     * Get all active Firefox browser sessions
     * @returns {Array} Array of active sessions
     */
    getAllActiveSessions() {
        const sessions = [];
        for (const [profileId, session] of this.activeSessions) {
            const uptime = Math.floor((Date.now() - session.startTime) / 1000);
            sessions.push({
                profileId,
                status: session.status,
                startTime: session.startTime,
                uptime,
                currentUrl: session.currentUrl,
                browserType: 'firefox',
                headless: session.headless
            });
        }
        return sessions;
    }

    /**
     * Stop all Firefox browser sessions
     */
    async stopAllBrowsers() {
        logger.info('Stopping all Firefox browser sessions...');
        
        const stopPromises = [];
        for (const profileId of this.activeSessions.keys()) {
            stopPromises.push(this.stopBrowser(profileId));
        }
        
        await Promise.all(stopPromises);
        logger.info('All Firefox browser sessions stopped');
    }

    /**
     * Execute script in Firefox browser
     * @param {string} profileId - Profile ID
     * @param {string} script - JavaScript code to execute
     * @returns {any} Script result
     */
    async executeScript(profileId, script) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            throw new Error('No active browser session found');
        }

        try {
            logger.info(`Executing script in Firefox for profile: ${profileId}`);
            const result = await session.page.evaluate(script);
            
            if (this.logService) {
                await this.logService.logActivity(profileId, 'script_executed', {
                    browserType: 'firefox',
                    scriptLength: script.length,
                    success: true
                });
            }
            
            return result;
        } catch (error) {
            logger.error(`Script execution failed for profile ${profileId}:`, error.message);
            
            if (this.logService) {
                await this.logService.logActivity(profileId, 'script_execution_failed', {
                    browserType: 'firefox',
                    error: error.message
                });
            }
            
            throw error;
        }
    }

    /**
     * Navigate to URL in Firefox
     * @param {string} profileId - Profile ID
     * @param {string} url - URL to navigate to
     * @returns {Object} Navigation result
     */
    async navigateToUrl(profileId, url) {
        const session = this.activeSessions.get(profileId);
        if (!session) {
            throw new Error('No active browser session found');
        }

        try {
            logger.info(`Navigating to ${url} in Firefox for profile: ${profileId}`);
            
            await session.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            session.currentUrl = url;
            
            if (this.logService) {
                await this.logService.logActivity(profileId, 'navigation', {
                    browserType: 'firefox',
                    url,
                    success: true
                });
            }
            
            return {
                success: true,
                url,
                title: await session.page.title()
            };
            
        } catch (error) {
            logger.error(`Navigation failed for profile ${profileId}:`, error.message);
            
            if (this.logService) {
                await this.logService.logActivity(profileId, 'navigation_failed', {
                    browserType: 'firefox',
                    url,
                    error: error.message
                });
            }
            
            throw error;
        }
    }
}

module.exports = FirefoxBrowserService;