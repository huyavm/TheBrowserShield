/**
 * Input Validation Middleware using Zod
 * Provides schema validation for all API routes
 */

const { z } = require('zod');

// =====================
// Profile Schemas
// =====================

const viewportSchema = z.object({
    width: z.number().int().min(100).max(4096),
    height: z.number().int().min(100).max(4096)
}).optional();

const proxyConfigSchema = z.object({
    host: z.string().min(1, 'Proxy host is required'),
    port: z.number().int().min(1).max(65535),
    type: z.enum(['http', 'https', 'socks4', 'socks5']).default('http'),
    username: z.string().optional(),
    password: z.string().optional()
}).optional();

const createProfileSchema = z.object({
    name: z.string().min(1, 'Profile name is required').max(100),
    userAgent: z.string().optional(),
    timezone: z.string().optional(),
    viewport: viewportSchema,
    proxy: proxyConfigSchema,
    spoofFingerprint: z.boolean().optional().default(true)
});

const updateProfileSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    userAgent: z.string().optional(),
    timezone: z.string().optional(),
    viewport: viewportSchema,
    proxy: proxyConfigSchema,
    spoofFingerprint: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
});

const startBrowserSchema = z.object({
    autoNavigateUrl: z.string().url().optional(),
    headless: z.boolean().optional()
});

const navigateSchema = z.object({
    url: z.string().url('Invalid URL format')
});

const executeScriptSchema = z.object({
    script: z.string().min(1, 'Script is required')
});

// =====================
// Proxy Pool Schemas
// =====================

const addProxySchema = z.object({
    host: z.string().min(1, 'Host is required'),
    port: z.number().int().min(1).max(65535),
    type: z.enum(['http', 'https', 'socks4', 'socks5']).default('http'),
    country: z.string().optional(),
    provider: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional()
});

// =====================
// Mode Schemas
// =====================

const switchModeSchema = z.object({
    mode: z.enum(['mock', 'production', 'firefox'])
});

// =====================
// Validation Middleware
// =====================

/**
 * Creates a validation middleware for the given schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors
                });
            }

            // Replace body with parsed/transformed data
            req.body = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.message
            });
        }
    };
};

/**
 * Validate query parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.query);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid query parameters',
                    errors: result.error.errors
                });
            }

            req.query = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Query validation error',
                error: error.message
            });
        }
    };
};

module.exports = {
    // Schemas
    createProfileSchema,
    updateProfileSchema,
    startBrowserSchema,
    navigateSchema,
    executeScriptSchema,
    addProxySchema,
    switchModeSchema,

    // Middleware
    validate,
    validateQuery
};
