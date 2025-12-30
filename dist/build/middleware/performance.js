const logger = require('../utils/logger');

/**
 * Performance monitoring middleware
 * Tracks request duration and identifies slow requests
 */
const performanceMonitor = (req, res, next) => {
    const start = Date.now();
    const startMemory = process.memoryUsage();

    // Track request start
    req.startTime = start;
    req.startMemory = startMemory;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const endMemory = process.memoryUsage();
        const memoryDelta = {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            external: endMemory.external - startMemory.external
        };

        const performanceData = {
            method: req.method,
            url: req.url,
            duration,
            status: res.statusCode,
            contentLength: res.get('Content-Length') || 0,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            memoryDelta,
            timestamp: new Date().toISOString()
        };

        // Log all requests
        logger.info('Request completed', performanceData);

        // Warning for slow requests (>5000ms)
        if (duration > 5000) {
            logger.warn('Slow request detected', {
                ...performanceData,
                severity: 'HIGH',
                threshold: 5000
            });
        }

        // Warning for memory-intensive requests (>50MB heap increase)
        if (memoryDelta.heapUsed > 50 * 1024 * 1024) {
            logger.warn('Memory-intensive request detected', {
                ...performanceData,
                severity: 'MEDIUM',
                memoryThreshold: 50 * 1024 * 1024
            });
        }

        // Error tracking for 5xx responses
        if (res.statusCode >= 500) {
            logger.error('Server error response', {
                ...performanceData,
                severity: 'CRITICAL'
            });
        }
    });

    next();
};

/**
 * System health monitoring
 * Provides system metrics and health status
 */
const systemHealthMonitor = () => {
    const getSystemHealth = () => {
        const memory = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const uptime = process.uptime();

        return {
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            memory: {
                rss: Math.round(memory.rss / 1024 / 1024), // MB
                heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
                external: Math.round(memory.external / 1024 / 1024), // MB
                heapUsagePercent: Math.round((memory.heapUsed / memory.heapTotal) * 100)
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };
    };

    // Log system health every 5 minutes
    setInterval(() => {
        const health = getSystemHealth();

        // Check for memory issues
        if (health.memory.heapUsagePercent > 90) {
            logger.warn('High memory usage detected', {
                ...health,
                severity: 'HIGH',
                alert: 'MEMORY_PRESSURE'
            });
        }

        // Check for long uptime without restart
        if (health.uptime > 7 * 24 * 3600) { // 7 days
            logger.info('Long uptime detected - consider restart', {
                ...health,
                alert: 'LONG_UPTIME'
            });
        }

        logger.info('System health check', health);
    }, 5 * 60 * 1000); // 5 minutes

    return { getSystemHealth };
};

/**
 * Rate limiting with performance tracking
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // limit each IP to 100 requests per windowMs
        message = 'Too many requests, please try again later.',
        standardHeaders = true,
        legacyHeaders = false
    } = options;

    const clients = new Map();

    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean up old entries
        for (const [clientKey, data] of clients.entries()) {
            if (data.resetTime < now) {
                clients.delete(clientKey);
            }
        }

        // Get or create client data
        let clientData = clients.get(key);
        if (!clientData || clientData.resetTime < now) {
            clientData = {
                count: 0,
                resetTime: now + windowMs,
                firstRequest: now
            };
            clients.set(key, clientData);
        }

        // Check if limit exceeded
        if (clientData.count >= max) {
            const remaining = Math.ceil((clientData.resetTime - now) / 1000);

            logger.warn('Rate limit exceeded', {
                ip: key,
                count: clientData.count,
                limit: max,
                resetIn: remaining,
                url: req.url,
                method: req.method,
                userAgent: req.get('User-Agent')
            });

            if (standardHeaders) {
                res.set({
                    'X-RateLimit-Limit': max,
                    'X-RateLimit-Remaining': 0,
                    'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000)
                });
            }

            return res.status(429).json({
                success: false,
                error: message,
                retryAfter: remaining
            });
        }

        // Increment counter
        clientData.count++;

        if (standardHeaders) {
            res.set({
                'X-RateLimit-Limit': max,
                'X-RateLimit-Remaining': Math.max(0, max - clientData.count),
                'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000)
            });
        }

        next();
    };
};

/**
 * Per-endpoint rate limiting configurations
 */
const endpointRateLimits = {
    // Browser operations - more restrictive (expensive operations)
    browserStart: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 5,                 // 5 starts per minute
        message: 'Too many browser start requests. Please wait before starting another browser.'
    }),
    browserStop: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 10,                // 10 stops per minute
        message: 'Too many browser stop requests.'
    }),
    browserExecute: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 30,                // 30 script executions per minute
        message: 'Too many script execution requests.'
    }),
    browserNavigate: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 20,                // 20 navigations per minute
        message: 'Too many navigation requests.'
    }),

    // Profile CRUD - moderate limits
    profileCreate: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 10,                // 10 creates per minute
        message: 'Too many profile creation requests.'
    }),
    profileUpdate: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 30,                // 30 updates per minute
        message: 'Too many profile update requests.'
    }),
    profileDelete: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 10,                // 10 deletes per minute
        message: 'Too many profile delete requests.'
    }),
    profileRead: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 100,               // 100 reads per minute
        message: 'Too many profile read requests.'
    }),

    // Proxy operations
    proxyAdd: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 20,                // 20 adds per minute
        message: 'Too many proxy add requests.'
    }),
    proxyTest: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 10,                // 10 tests per minute
        message: 'Too many proxy test requests.'
    }),

    // Mode switching - very restrictive
    modeSwitch: createRateLimiter({
        windowMs: 60 * 1000,    // 1 minute
        max: 3,                 // 3 switches per minute
        message: 'Too many mode switch requests. Server restart is required after each switch.'
    }),

    // Default/fallback
    default: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: 'Too many requests, please try again later.'
    })
};

/**
 * Request tracking for debugging
 */
const requestTracker = (req, res, next) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;

    // Add request ID to response headers
    res.set('X-Request-ID', requestId);

    // Log request start
    logger.debug('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length')
    });

    next();
};

module.exports = {
    performanceMonitor,
    systemHealthMonitor,
    createRateLimiter,
    endpointRateLimits,
    requestTracker
};