const express = require('express');
const ProxyPoolService = require('../services/ProxyPoolService');
const logger = require('../utils/logger');
const { validate, addProxySchema } = require('../middleware/validation');
const { endpointRateLimits } = require('../middleware/performance');

const router = express.Router();

/**
 * GET /api/proxy
 * Get all proxies in pool
 */
router.get('/', async (req, res, next) => {
    try {
        const proxies = await ProxyPoolService.getAllProxies();
        res.json({
            success: true,
            data: proxies,
            count: proxies.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/proxy
 * Add proxy to pool
 */
router.post('/', endpointRateLimits.proxyAdd, validate(addProxySchema), async (req, res, next) => {
    try {
        const proxy = await ProxyPoolService.addProxy(req.body);
        res.status(201).json({
            success: true,
            data: proxy,
            message: 'Proxy added to pool successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/proxy/:id
 * Remove proxy from pool
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const removed = await ProxyPoolService.removeProxy(req.params.id);
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Proxy not found'
            });
        }

        res.json({
            success: true,
            message: 'Proxy removed from pool successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/proxy/random
 * Get random proxy from pool
 */
router.get('/random', async (req, res, next) => {
    try {
        const filters = {
            country: req.query.country,
            type: req.query.type,
            provider: req.query.provider
        };

        const proxy = await ProxyPoolService.getRandomProxy(filters);
        if (!proxy) {
            return res.status(404).json({
                success: false,
                message: 'No available proxy found matching criteria'
            });
        }

        res.json({
            success: true,
            data: proxy
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/proxy/least-used
 * Get least used proxy from pool
 */
router.get('/least-used', async (req, res, next) => {
    try {
        const filters = {
            country: req.query.country,
            type: req.query.type
        };

        const proxy = await ProxyPoolService.getLeastUsedProxy(filters);
        if (!proxy) {
            return res.status(404).json({
                success: false,
                message: 'No available proxy found matching criteria'
            });
        }

        res.json({
            success: true,
            data: proxy
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/proxy/:id/test
 * Test proxy connectivity
 */
router.post('/:id/test', async (req, res, next) => {
    try {
        const proxies = await ProxyPoolService.getAllProxies();
        const proxy = proxies.find(p => p.id === req.params.id);

        if (!proxy) {
            return res.status(404).json({
                success: false,
                message: 'Proxy not found'
            });
        }

        const testResult = await ProxyPoolService.testProxy(proxy);
        res.json({
            success: true,
            data: testResult
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/proxy/:id/toggle
 * Toggle proxy active status
 */
router.post('/:id/toggle', async (req, res, next) => {
    try {
        const newStatus = await ProxyPoolService.toggleProxyStatus(req.params.id);
        if (newStatus === null) {
            return res.status(404).json({
                success: false,
                message: 'Proxy not found'
            });
        }

        res.json({
            success: true,
            data: { active: newStatus },
            message: `Proxy ${newStatus ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/proxy/stats
 * Get proxy pool statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await ProxyPoolService.getPoolStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;