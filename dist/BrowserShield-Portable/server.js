const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const https = require('https');
const profileRoutes = require('./routes/profiles');
const proxyRoutes = require('./routes/proxy');
const modeRoutes = require('./routes/mode');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { authenticateToken, rateLimiter } = require('./middleware/auth');
const {
    performanceMonitor,
    systemHealthMonitor,
    createRateLimiter,
    requestTracker
} = require('./middleware/performance');
const ModeSwitcher = require('./config/mode-switcher');
const { getSSLOptions, isHTTPSEnabled, getHTTPSPort } = require('./config/ssl');

// Startup validation and logging utilities
const { validateAll, formatValidationReport } = require('./utils/dependency-validator');
const { getDetectionReport, getBrowserAvailability } = require('./utils/browser-detector');
const {
    logStartupError,
    logStartupSuccess,
    logStartupWarning,
    displayUserError,
    categorizeError,
    ErrorCategory
} = require('./utils/startup-logger');

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = getHTTPSPort();

/**
 * Perform startup validation
 * Requirements: 5.1, 7.3, 7.4
 * 
 * @returns {Promise<{success: boolean, warnings: string[]}>}
 */
async function performStartupValidation() {
    console.log('🔍 Validating dependencies...');
    
    try {
        // Validate all dependencies
        const validationResult = await validateAll();
        
        if (!validationResult.success) {
            // Log validation errors
            const report = formatValidationReport(validationResult);
            console.error('\n' + report);
            
            // Log to startup log file
            logStartupError(new Error('Dependency validation failed'), {
                validationResult,
                phase: 'startup_validation'
            });
            
            // Display user-friendly error for the first error
            if (validationResult.errors.length > 0) {
                const firstError = validationResult.errors[0];
                const error = new Error(firstError.message);
                error.code = firstError.type;
                displayUserError(error);
            }
            
            return { success: false, warnings: validationResult.warnings };
        }
        
        // Log warnings if any
        if (validationResult.warnings.length > 0) {
            validationResult.warnings.forEach(warning => {
                console.warn('⚠️', warning);
                logStartupWarning(warning);
            });
        }
        
        console.log('✅ Dependencies validated successfully');
        return { success: true, warnings: validationResult.warnings };
        
    } catch (error) {
        logStartupError(error, { phase: 'startup_validation' });
        displayUserError(error);
        return { success: false, warnings: [] };
    }
}

/**
 * Log browser detection results
 * Requirements: 7.3
 */
function logBrowserDetection() {
    console.log('🔍 Detecting browsers...');
    
    try {
        const detectionReport = getDetectionReport();
        const availability = getBrowserAvailability();
        
        // Log browser availability
        Object.entries(availability).forEach(([browser, info]) => {
            if (info.available) {
                console.log(`✅ ${browser}: ${info.path}`);
            } else {
                console.log(`⚪ ${browser}: not found`);
            }
        });
        
        // Log recommendation
        console.log(`💡 ${detectionReport.recommendation}`);
        
        // Log to startup log
        logStartupWarning('Browser detection completed', {
            browsers: availability,
            recommendation: detectionReport.recommendation
        });
        
        return detectionReport;
        
    } catch (error) {
        console.warn('⚠️ Browser detection failed:', error.message);
        logStartupWarning('Browser detection failed', { error: error.message });
        return null;
    }
}

/**
 * Handle browser launch errors with categorization
 * Requirements: 7.4
 * 
 * @param {Error} error - The browser launch error
 * @param {string} profileId - The profile ID that failed
 * @returns {Object} Categorized error response
 */
function handleBrowserLaunchError(error, profileId = null) {
    const category = categorizeError(error);
    
    // Log the error with context
    logStartupError(error, {
        phase: 'browser_launch',
        profileId,
        category
    });
    
    // Determine if it's a browser issue or configuration issue
    const isBrowserIssue = [
        ErrorCategory.BROWSER_NOT_FOUND,
        ErrorCategory.BROWSER_PERMISSION,
        ErrorCategory.BROWSER_CRASH
    ].includes(category);
    
    const isConfigIssue = [
        ErrorCategory.CONFIG_INVALID,
        ErrorCategory.CONFIG_MISSING
    ].includes(category);
    
    return {
        success: false,
        error: {
            code: category,
            message: error.message,
            isBrowserIssue,
            isConfigIssue,
            profileId
        }
    };
}

// Export error handler for use in other modules
module.exports.handleBrowserLaunchError = handleBrowserLaunchError;

// Initialize mode switcher
const modeSwitcher = new ModeSwitcher();

// Initialize system health monitoring
const healthMonitor = systemHealthMonitor();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request tracking for debugging
app.use(requestTracker);

// Performance monitoring
app.use(performanceMonitor);

// Enhanced rate limiting with performance tracking
app.use('/api', createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.ENABLE_RATE_LIMIT === 'true' ? 100 : 10000, // Higher limit for development
    message: 'Too many requests, please try again later.'
}));

// API Authentication (optional)
if (process.env.API_TOKEN) {
    app.use('/api', authenticateToken);
}

// Routes
app.use('/api/profiles', profileRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/mode', modeRoutes);

// Swagger API Documentation
const { setupSwagger } = require('./config/swagger');
setupSwagger(app);

// Health check endpoint
app.get('/health', (req, res) => {
    const currentMode = modeSwitcher.getCurrentModeInfo();
    res.json({
        status: 'ok',
        service: 'BrowserShield Anti-Detect Browser Manager',
        mode: currentMode.name,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        https: isHTTPSEnabled()
    });
});

// Enhanced system health endpoint
app.get('/api/system/health', (req, res) => {
    try {
        const memory = process.memoryUsage();
        const uptime = process.uptime();
        const currentMode = modeSwitcher.getCurrentModeInfo();

        const systemHealth = {
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            memory: {
                rss: Math.round(memory.rss / 1024 / 1024), // MB
                heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
                external: Math.round(memory.external / 1024 / 1024), // MB
                heapUsagePercent: Math.round((memory.heapUsed / memory.heapTotal) * 100)
            },
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        res.json({
            success: true,
            data: {
                ...systemHealth,
                mode: currentMode,
                service: 'BrowserShield Anti-Detect Browser Manager',
                version: '2.0.0',
                status: 'healthy',
                https: isHTTPSEnabled()
            }
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            details: error.message
        });
    }
});

// Logger control endpoints
app.get('/api/system/logs/status', (req, res) => {
    res.json({
        success: true,
        data: logger.getStatus()
    });
});

app.post('/api/system/logs/toggle', (req, res) => {
    const { enabled, consoleEnabled } = req.body;
    
    if (typeof enabled === 'boolean') {
        logger.setEnabled(enabled);
    }
    if (typeof consoleEnabled === 'boolean') {
        logger.setConsoleEnabled(consoleEnabled);
    }
    
    res.json({
        success: true,
        data: logger.getStatus(),
        message: `Console logging ${logger.getStatus().consoleEnabled ? 'enabled' : 'disabled'}`
    });
});

// Serve documentation files
app.get('/docs/:file', (req, res) => {
    const file = req.params.file;
    const allowedFiles = ['INSTALL.md', 'CHANGELOG.md', 'README.md'];

    if (allowedFiles.includes(file)) {
        res.sendFile(path.join(__dirname, file));
    } else {
        res.status(404).json({ error: 'Documentation file not found' });
    }
});

// Mode manager interface
app.get('/mode-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mode-manager.html'));
});

// Admin interface
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Browser control interface
app.get('/browser-control', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'browser-control.html'));
});

// Root endpoint - redirect to main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use(errorHandler);

// Startup function with validation
async function startServer() {
    try {
        // Perform startup validation (Requirements: 5.1)
        const validationResult = await performStartupValidation();
        if (!validationResult.success) {
            console.error('\n❌ Startup validation failed. Please fix the issues above and try again.');
            process.exit(1);
        }
        
        // Log browser detection (Requirements: 7.3)
        logBrowserDetection();
        
        // Start HTTP server
        const httpServer = http.createServer(app);
        httpServer.listen(PORT, '0.0.0.0', () => {
            const modeInfo = modeSwitcher.getCurrentModeInfo();
            const modeName = modeInfo.info?.name || modeInfo.currentMode || 'mock';
            console.log('\n🛡️ BrowserShield Anti-Detect Browser Manager');
            console.log('📱 Environment:', process.env.NODE_ENV || 'development');
            console.log('🌐 HTTP:  http://localhost:' + PORT);
            console.log('🎭 Mode:', modeName);

            logger.info('BrowserShield HTTP server started', {
                port: PORT,
                mode: modeName,
                version: '2.0.0'
            });
            
            // Log successful startup
            logStartupSuccess({
                port: PORT,
                mode: modeName,
                https: isHTTPSEnabled()
            });
        });
        
        // Handle HTTP server errors
        httpServer.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                const portError = new Error(`Port ${PORT} is already in use`);
                portError.code = 'EADDRINUSE';
                logStartupError(portError, { phase: 'http_server_start' });
                displayUserError(portError);
            } else {
                logStartupError(error, { phase: 'http_server_start' });
                displayUserError(error);
            }
            process.exit(1);
        });

        // Start HTTPS server if enabled
        const sslOptions = getSSLOptions();
        if (sslOptions) {
            const httpsServer = https.createServer(sslOptions, app);
            httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
                console.log('🔒 HTTPS: https://localhost:' + HTTPS_PORT);
                logger.info('BrowserShield HTTPS server started', {
                    port: HTTPS_PORT
                });
            });
            
            httpsServer.on('error', (error) => {
                console.warn('⚠️ HTTPS server failed to start:', error.message);
                logStartupWarning('HTTPS server failed to start', { error: error.message });
            });
        }
        
    } catch (error) {
        logStartupError(error, { phase: 'server_startup' });
        displayUserError(error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down BrowserShield server...');

    try {
        // Get the appropriate browser service and stop all browsers
        const BrowserServiceClass = modeSwitcher.getBrowserServiceClass();
        if (BrowserServiceClass) {
            const browserService = new BrowserServiceClass();
            await browserService.stopAllBrowsers();
            console.log('✅ All browser sessions closed');
        }
    } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
    }

    console.log('👋 BrowserShield server stopped');
    process.exit(0);
});

module.exports = app;