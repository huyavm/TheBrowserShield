const express = require('express');
const path = require('path');
const fs = require('fs');
const ModeSwitcher = require('../config/mode-switcher');
const { validate, switchModeSchema } = require('../middleware/validation');
const { endpointRateLimits } = require('../middleware/performance');

const router = express.Router();
const modeSwitcher = new ModeSwitcher();

// Get BrowserService instance from profiles route
let browserServiceInstance = null;

// Lazy load to avoid circular dependency
function getBrowserService() {
    if (!browserServiceInstance) {
        try {
            const profileRoutes = require('./profiles');
            browserServiceInstance = profileRoutes.browserService;
        } catch (error) {
            console.warn('[Mode Switch] Could not get BrowserService:', error.message);
        }
    }
    return browserServiceInstance;
}

/**
 * Clean up browser profile cache directory
 * @returns {Object} Cleanup result with details
 */
function cleanBrowserProfileCache() {
    const profilesDir = path.join(__dirname, '..', 'data', 'browser-profiles');
    const result = {
        success: true,
        deletedProfiles: [],
        errors: []
    };
    
    try {
        if (fs.existsSync(profilesDir)) {
            const profiles = fs.readdirSync(profilesDir);
            
            for (const profile of profiles) {
                const profilePath = path.join(profilesDir, profile);
                try {
                    fs.rmSync(profilePath, { recursive: true, force: true });
                    result.deletedProfiles.push(profile);
                    console.log(`[Mode Switch] Deleted profile cache: ${profile}`);
                } catch (err) {
                    result.errors.push({ profile, error: err.message });
                    console.warn(`[Mode Switch] Failed to delete profile cache ${profile}:`, err.message);
                }
            }
        }
    } catch (error) {
        result.success = false;
        result.errors.push({ profile: 'all', error: error.message });
    }
    
    return result;
}

/**
 * Perform pre-restart cleanup operations
 * 1. Stop all active browser sessions
 * 2. Clean browser profile cache
 * @returns {Promise<Object>} Cleanup results
 */
async function performPreRestartCleanup() {
    const cleanupResult = {
        sessionsClosed: 0,
        sessionsFailedToClose: 0,
        profilesCleaned: 0,
        profilesFailedToClean: 0,
        messages: []
    };
    
    const browserService = getBrowserService();
    
    // Step 1: Stop all active browser sessions
    if (browserService) {
        try {
            const activeSessions = browserService.getAllActiveSessions();
            cleanupResult.messages.push(`Tìm thấy ${activeSessions.length} browser session đang chạy`);
            
            if (activeSessions.length > 0) {
                console.log(`[Mode Switch] Đang đóng ${activeSessions.length} browser sessions...`);
                await browserService.stopAllBrowsers();
                cleanupResult.sessionsClosed = activeSessions.length;
                cleanupResult.messages.push(`Đã đóng ${activeSessions.length} browser sessions`);
            }
        } catch (error) {
            console.error('[Mode Switch] Lỗi khi đóng browser sessions:', error);
            cleanupResult.messages.push(`Lỗi đóng sessions: ${error.message}`);
        }
    } else {
        cleanupResult.messages.push('BrowserService chưa được khởi tạo');
    }
    
    // Step 2: Clean browser profile cache
    console.log('[Mode Switch] Đang xóa browser profile cache...');
    const cacheResult = cleanBrowserProfileCache();
    cleanupResult.profilesCleaned = cacheResult.deletedProfiles.length;
    cleanupResult.profilesFailedToClean = cacheResult.errors.length;
    
    if (cacheResult.deletedProfiles.length > 0) {
        cleanupResult.messages.push(`Đã xóa ${cacheResult.deletedProfiles.length} profile cache`);
    }
    if (cacheResult.errors.length > 0) {
        cleanupResult.messages.push(`Không thể xóa ${cacheResult.errors.length} profile cache (có thể đang được sử dụng)`);
    }
    
    return cleanupResult;
}

/**
 * Perform cleanup operations when switching mode
 * Does NOT auto-restart - user must restart manually
 * This is the recommended approach for .exe applications
 */
async function performModeSwitch() {
    console.log('[Mode Switch] Bắt đầu quá trình chuyển mode...');
    
    // Perform cleanup
    const cleanupResult = await performPreRestartCleanup();
    
    console.log('[Mode Switch] Cleanup hoàn tất. Cần restart ứng dụng để áp dụng thay đổi.');
    
    return cleanupResult;
}

/**
 * GET /api/mode
 * Get current mode and available modes
 */
router.get('/', (req, res) => {
    try {
        const modeInfo = modeSwitcher.getCurrentModeInfo();
        res.json({
            success: true,
            data: modeInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get mode information'
        });
    }
});

/**
 * POST /api/mode/switch
 * Switch to a different mode
 * Performs cleanup and requires manual restart
 */
router.post('/switch', endpointRateLimits.modeSwitch, validate(switchModeSchema), async (req, res) => {
    try {
        const { mode } = req.body;

        const result = modeSwitcher.switchMode(mode);

        if (result.success) {
            // Prepare cleanup preview
            let cleanupPreview = {
                willStopSessions: 0,
                willCleanProfiles: 0
            };
            
            const browserService = getBrowserService();
            
            if (browserService) {
                const activeSessions = browserService.getAllActiveSessions();
                cleanupPreview.willStopSessions = activeSessions.length;
                
                // Count profile caches
                const profilesDir = path.join(__dirname, '..', 'data', 'browser-profiles');
                if (fs.existsSync(profilesDir)) {
                    cleanupPreview.willCleanProfiles = fs.readdirSync(profilesDir).length;
                }
            }
            
            const modeNames = {
                'mock': 'Mock Mode',
                'production': 'Production Mode (Chrome)',
                'firefox': 'Firefox Mode'
            };
            
            // Perform cleanup immediately
            const cleanupResult = await performModeSwitch();
            
            let message = `✅ Đã chuyển sang ${modeNames[mode] || mode}. `;
            
            if (cleanupResult.sessionsClosed > 0) {
                message += `Đã đóng ${cleanupResult.sessionsClosed} browser session. `;
            }
            if (cleanupResult.profilesCleaned > 0) {
                message += `Đã xóa ${cleanupResult.profilesCleaned} profile cache. `;
            }
            
            message += '⚠️ Vui lòng RESTART ứng dụng để áp dụng thay đổi.';
            
            res.json({
                success: true,
                data: {
                    ...result,
                    cleanup: cleanupResult,
                    requiresRestart: true
                },
                message: message
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to switch mode: ' + error.message
        });
    }
});

/**
 * GET /api/mode/check-requirements
 * Check requirements for all modes
 */
router.get('/check-requirements', (req, res) => {
    try {
        const modes = modeSwitcher.getAvailableModes();
        res.json({
            success: true,
            data: modes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check requirements'
        });
    }
});

module.exports = router;