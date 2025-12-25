const logger = require('../utils/logger');
const { AppError, ErrorCodes, getErrorMessage, createErrorResponse } = require('../utils/errors');

/**
 * Get preferred language from request
 */
function getPreferredLanguage(req) {
    // Check query parameter
    if (req.query.lang && ['en', 'vi'].includes(req.query.lang)) {
        return req.query.lang;
    }
    // Check Accept-Language header
    const acceptLang = req.get('Accept-Language') || '';
    if (acceptLang.includes('vi')) return 'vi';
    return 'en';
}

/**
 * Global error handling middleware with bilingual support
 */
function errorHandler(error, req, res, next) {
    const lang = getPreferredLanguage(req);
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Log error
    logger.error('Error occurred:', {
        code: error.code,
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip,
        requestId: req.requestId
    });

    // Handle AppError instances
    if (error instanceof AppError) {
        return res.status(error.statusCode).json(error.toJSON(lang));
    }

    // Map common error patterns to AppError codes
    let errorCode = ErrorCodes.INTERNAL_ERROR;
    let statusCode = 500;
    let details = null;

    // Pattern matching for error messages
    if (error.message) {
        const msg = error.message.toLowerCase();

        if (msg.includes('not found') || msg.includes('không tìm thấy')) {
            if (msg.includes('profile')) {
                errorCode = ErrorCodes.PROFILE_NOT_FOUND;
            } else if (msg.includes('proxy')) {
                errorCode = ErrorCodes.PROXY_NOT_FOUND;
            }
            statusCode = 404;
        } else if (msg.includes('already exists') || msg.includes('đã tồn tại')) {
            if (msg.includes('profile')) {
                errorCode = ErrorCodes.PROFILE_NAME_EXISTS;
            } else if (msg.includes('proxy')) {
                errorCode = ErrorCodes.PROXY_EXISTS;
            }
            statusCode = 409;
        } else if (msg.includes('already running')) {
            errorCode = ErrorCodes.BROWSER_ALREADY_RUNNING;
            statusCode = 409;
        } else if (msg.includes('no active browser') || msg.includes('not running')) {
            errorCode = ErrorCodes.BROWSER_NOT_RUNNING;
            statusCode = 404;
        } else if (msg.includes('validation') || error.name === 'ZodError') {
            errorCode = ErrorCodes.VALIDATION_FAILED;
            statusCode = 400;
            details = error.errors || error.message;
        }
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
        errorCode = ErrorCodes.VALIDATION_FAILED;
        statusCode = 400;
        details = error.errors;
    }

    // Handle SQLite errors
    if (error.code && error.code.startsWith('SQLITE_')) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            errorCode = ErrorCodes.PROFILE_NAME_EXISTS;
            statusCode = 409;
        } else {
            errorCode = ErrorCodes.DATABASE_ERROR;
            statusCode = 500;
        }
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED') {
        statusCode = 503;
        details = isDevelopment ? 'Connection refused' : null;
    } else if (error.code === 'ETIMEDOUT') {
        statusCode = 504;
        details = isDevelopment ? 'Operation timed out' : null;
    }

    // Build error response
    const errorResponse = {
        success: false,
        error: {
            code: errorCode,
            message: getErrorMessage(errorCode, lang),
            details: isDevelopment || statusCode < 500 ? details : null
        },
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        requestId: req.requestId
    };

    // Add stack trace in development
    if (isDevelopment && error.stack) {
        errorResponse.stack = error.stack;
    }

    res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
