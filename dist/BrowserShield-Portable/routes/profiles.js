const express = require('express');
const ProfileService = require('../services/ProfileService');
const BrowserService = require('../services/BrowserService');
const ProfileLogService = require('../services/ProfileLogService');
const logger = require('../utils/logger');
const {
    validate,
    createProfileSchema,
    updateProfileSchema,
    startBrowserSchema,
    navigateSchema,
    executeScriptSchema
} = require('../middleware/validation');
const { endpointRateLimits } = require('../middleware/performance');

const router = express.Router();

// Initialize services
const browserService = new BrowserService();
const profileLogService = ProfileLogService;

/**
 * GET /api/profiles
 * Get all profiles
 */
router.get('/', async (req, res, next) => {
    try {
        const profiles = await ProfileService.getAllProfiles();
        res.json({
            success: true,
            data: profiles,
            count: profiles.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profiles
 * Create new profile
 */
router.post('/', endpointRateLimits.profileCreate, validate(createProfileSchema), async (req, res, next) => {
    try {
        const profile = await ProfileService.createProfile(req.body);

        // Log profile creation
        await ProfileLogService.logActivity(profile.id, 'PROFILE_CREATED', {
            profileName: profile.name,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            hasProxy: !!profile.proxy,
            spoofFingerprint: profile.spoofFingerprint
        });

        res.status(201).json({
            success: true,
            data: profile,
            message: 'Profile created successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/profiles/:id
 * Get profile by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const profile = await ProfileService.getProfile(req.params.id);
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/profiles/:id
 * Update profile
 */
router.put('/:id', endpointRateLimits.profileUpdate, validate(updateProfileSchema), async (req, res, next) => {
    try {
        const profile = await ProfileService.updateProfile(req.params.id, req.body);
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            data: profile,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/profiles/:id
 * Delete profile
 */
router.delete('/:id', endpointRateLimits.profileDelete, async (req, res, next) => {
    try {
        // Stop browser if running
        try {
            await BrowserService.stopBrowser(req.params.id);
        } catch (error) {
            // Ignore error if browser is not running
        }

        const deleted = await ProfileService.deleteProfile(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profiles/:id/start
 * Start browser with profile
 */
router.post('/:id/start', endpointRateLimits.browserStart, validate(startBrowserSchema), async (req, res, next) => {
    try {
        const { autoNavigateUrl, headless } = req.body;
        const sessionInfo = await browserService.startBrowser(req.params.id, autoNavigateUrl, { headless });

        // Log browser start
        await profileLogService.logActivity(req.params.id, 'BROWSER_STARTED', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            autoNavigateUrl: autoNavigateUrl || null,
            headless: sessionInfo.headless,
            sessionInfo: {
                startTime: sessionInfo.startTime,
                profileName: sessionInfo.profileName
            }
        });

        res.json({
            success: true,
            data: sessionInfo,
            message: `Browser started in ${sessionInfo.headless ? 'headless' : 'visible'} mode`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profiles/:id/stop
 * Stop browser session
 */
router.post('/:id/stop', async (req, res, next) => {
    try {
        const stopped = await browserService.stopBrowser(req.params.id);
        if (!stopped) {
            return res.status(404).json({
                success: false,
                message: 'No active browser session found for this profile'
            });
        }

        // Log browser stop
        await ProfileLogService.logActivity(req.params.id, 'BROWSER_STOPPED', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Browser stopped successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/profiles/:id/status
 * Get browser session status
 */
router.get('/:id/status', async (req, res, next) => {
    try {
        const status = browserService.getBrowserStatus(req.params.id);
        if (!status) {
            return res.json({
                success: true,
                data: {
                    profileId: req.params.id,
                    status: 'stopped'
                }
            });
        }

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/profiles/sessions/active
 * Get all active browser sessions
 */
router.get('/sessions/active', async (req, res, next) => {
    try {
        const sessions = browserService.getAllActiveSessions();
        res.json({
            success: true,
            data: sessions,
            count: sessions.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profiles/:id/navigate
 * Navigate to URL in browser
 */
router.post('/:id/navigate', endpointRateLimits.browserNavigate, validate(navigateSchema), async (req, res, next) => {
    try {
        const { url } = req.body;

        const result = await browserService.navigateToUrl(req.params.id, url);

        // Log navigation
        await profileLogService.logActivity(req.params.id, 'NAVIGATION', {
            url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            result: {
                status: result.status,
                title: result.title
            }
        });

        res.json({
            success: true,
            data: result,
            message: 'Navigation completed successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/profiles/:id/execute
 * Execute JavaScript in browser
 */
router.post('/:id/execute', endpointRateLimits.browserExecute, validate(executeScriptSchema), async (req, res, next) => {
    try {
        const { script } = req.body;

        const result = await browserService.executeScript(req.params.id, script);

        // Log script execution
        await profileLogService.logActivity(req.params.id, 'SCRIPT_EXECUTED', {
            script: script.substring(0, 200) + (script.length > 200 ? '...' : ''),
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            resultType: typeof result
        });

        res.json({
            success: true,
            data: result,
            message: 'Script executed successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/profiles/:id/logs
 * Get activity logs for a profile
 */
router.get('/:id/logs', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await profileLogService.getProfileLogs(req.params.id, limit);

        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/profiles/system/logs
 * Get system activity logs
 */
router.get('/system/logs', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await profileLogService.getActivityLogs(limit);

        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/profiles/system/stats
 * Get system statistics
 */
router.get('/system/stats', async (req, res, next) => {
    try {
        const [profiles, activeSessions, logStats] = await Promise.all([
            ProfileService.getAllProfiles(),
            Promise.resolve(browserService.getAllActiveSessions()),
            profileLogService.getLogStats()
        ]);

        const stats = {
            profiles: {
                total: profiles.length,
                withProxy: profiles.filter(p => p.proxy).length,
                withStealth: profiles.filter(p => p.spoofFingerprint).length
            },
            sessions: {
                active: activeSessions.length,
                totalUptime: activeSessions.reduce((total, session) => total + (session.uptime || 0), 0)
            },
            logs: logStats,
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform
            }
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
