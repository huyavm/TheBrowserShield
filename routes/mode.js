const express = require('express');
const ModeSwitcher = require('../config/mode-switcher');
const { validate, switchModeSchema } = require('../middleware/validation');
const { endpointRateLimits } = require('../middleware/performance');

const router = express.Router();
const modeSwitcher = new ModeSwitcher();

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
 */
router.post('/switch', endpointRateLimits.modeSwitch, validate(switchModeSchema), (req, res) => {
    try {
        const { mode } = req.body;

        const result = modeSwitcher.switchMode(mode);

        if (result.success) {
            res.json({
                success: true,
                data: result,
                message: 'Mode switched successfully. Server restart required.'
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
            error: 'Failed to switch mode'
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