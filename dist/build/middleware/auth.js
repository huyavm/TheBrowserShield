const logger = require('../utils/logger');

/**
 * Simple API token authentication middleware
 */
function authenticateToken(req, res, next) {
    // Skip auth for UI routes and health check
    if (req.path.startsWith('/api') === false || req.path === '/health') {
        return next();
    }

    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // If no API_TOKEN is set in environment, skip authentication
    const requiredToken = process.env.API_TOKEN;
    if (!requiredToken) {
        logger.warn('API_TOKEN not set - authentication disabled');
        return next();
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required',
            error: 'No token provided'
        });
    }

    if (token !== requiredToken) {
        logger.warn('Invalid API token attempt', { 
            ip: req.ip, 
            userAgent: req.get('User-Agent'),
            token: token.substring(0, 10) + '...' 
        });
        
        return res.status(403).json({
            success: false,
            message: 'Invalid access token',
            error: 'Token verification failed'
        });
    }

    logger.info('API request authenticated', { 
        ip: req.ip, 
        path: req.path, 
        method: req.method 
    });
    
    next();
}

/**
 * Rate limiting middleware
 */
function rateLimiter() {
    const requestCounts = new Map();
    const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
    const MAX_REQUESTS = 100; // requests per window

    return (req, res, next) => {
        const clientId = req.ip;
        const now = Date.now();
        
        // Clean old entries
        for (const [id, data] of requestCounts.entries()) {
            if (now - data.windowStart > WINDOW_SIZE) {
                requestCounts.delete(id);
            }
        }
        
        // Get or create client data
        let clientData = requestCounts.get(clientId);
        if (!clientData || now - clientData.windowStart > WINDOW_SIZE) {
            clientData = {
                count: 0,
                windowStart: now
            };
            requestCounts.set(clientId, clientData);
        }
        
        clientData.count++;
        
        // Check rate limit
        if (clientData.count > MAX_REQUESTS) {
            logger.warn('Rate limit exceeded', { 
                ip: clientId, 
                count: clientData.count,
                path: req.path 
            });
            
            return res.status(429).json({
                success: false,
                message: 'Too many requests',
                retryAfter: Math.ceil((WINDOW_SIZE - (now - clientData.windowStart)) / 1000)
            });
        }
        
        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': MAX_REQUESTS,
            'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS - clientData.count),
            'X-RateLimit-Reset': new Date(clientData.windowStart + WINDOW_SIZE).toISOString()
        });
        
        next();
    };
}

module.exports = {
    authenticateToken,
    rateLimiter
};