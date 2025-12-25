/**
 * Swagger/OpenAPI Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BrowserShield API',
            version: '1.3.0',
            description: 'Anti-Detect Browser Manager REST API - Manage browser profiles with stealth capabilities',
            contact: {
                name: 'BrowserShield Support'
            },
            license: {
                name: 'MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server'
            },
            {
                url: 'https://localhost:5443',
                description: 'Development server (HTTPS)'
            }
        ],
        tags: [
            { name: 'Profiles', description: 'Profile management operations' },
            { name: 'Browser', description: 'Browser session control' },
            { name: 'Proxy', description: 'Proxy pool management' },
            { name: 'Mode', description: 'Application mode switching' },
            { name: 'System', description: 'System health and stats' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'API Token'
                }
            },
            schemas: {
                Profile: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'My Profile' },
                        userAgent: { type: 'string' },
                        timezone: { type: 'string', example: 'America/New_York' },
                        viewport: {
                            type: 'object',
                            properties: {
                                width: { type: 'integer', example: 1920 },
                                height: { type: 'integer', example: 1080 }
                            }
                        },
                        proxy: { $ref: '#/components/schemas/ProxyConfig' },
                        spoofFingerprint: { type: 'boolean', default: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                ProfileCreate: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: { type: 'string', example: 'My Profile' },
                        userAgent: { type: 'string' },
                        timezone: { type: 'string' },
                        viewport: {
                            type: 'object',
                            properties: {
                                width: { type: 'integer' },
                                height: { type: 'integer' }
                            }
                        },
                        proxy: { $ref: '#/components/schemas/ProxyConfig' },
                        spoofFingerprint: { type: 'boolean' }
                    }
                },
                ProxyConfig: {
                    type: 'object',
                    properties: {
                        host: { type: 'string', example: '192.168.1.1' },
                        port: { type: 'integer', example: 8080 },
                        type: { type: 'string', enum: ['http', 'https', 'socks4', 'socks5'] },
                        username: { type: 'string' },
                        password: { type: 'string' }
                    }
                },
                Proxy: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        host: { type: 'string' },
                        port: { type: 'integer' },
                        type: { type: 'string' },
                        country: { type: 'string' },
                        provider: { type: 'string' },
                        usageCount: { type: 'integer' },
                        active: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                SessionInfo: {
                    type: 'object',
                    properties: {
                        profileId: { type: 'string' },
                        profileName: { type: 'string' },
                        status: { type: 'string', enum: ['running', 'stopped'] },
                        startTime: { type: 'string', format: 'date-time' },
                        uptime: { type: 'integer', description: 'Uptime in seconds' }
                    }
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' },
                        message: { type: 'string' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                message: { type: 'string' },
                                details: { type: 'object' }
                            }
                        },
                        timestamp: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        paths: {
            '/api/profiles': {
                get: {
                    tags: ['Profiles'],
                    summary: 'Get all profiles',
                    responses: {
                        200: { description: 'List of profiles' }
                    }
                },
                post: {
                    tags: ['Profiles'],
                    summary: 'Create new profile',
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProfileCreate' }
                            }
                        }
                    },
                    responses: {
                        201: { description: 'Profile created' },
                        400: { description: 'Validation error' }
                    }
                }
            },
            '/api/profiles/{id}': {
                get: {
                    tags: ['Profiles'],
                    summary: 'Get profile by ID',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Profile details' },
                        404: { description: 'Profile not found' }
                    }
                },
                put: {
                    tags: ['Profiles'],
                    summary: 'Update profile',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Profile updated' },
                        404: { description: 'Profile not found' }
                    }
                },
                delete: {
                    tags: ['Profiles'],
                    summary: 'Delete profile',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Profile deleted' },
                        404: { description: 'Profile not found' }
                    }
                }
            },
            '/api/profiles/{id}/start': {
                post: {
                    tags: ['Browser'],
                    summary: 'Start browser with profile',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Browser started' },
                        409: { description: 'Browser already running' }
                    }
                }
            },
            '/api/profiles/{id}/stop': {
                post: {
                    tags: ['Browser'],
                    summary: 'Stop browser session',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Browser stopped' },
                        404: { description: 'No active session' }
                    }
                }
            },
            '/api/profiles/{id}/navigate': {
                post: {
                    tags: ['Browser'],
                    summary: 'Navigate to URL',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['url'],
                                    properties: { url: { type: 'string', format: 'uri' } }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Navigation complete' } }
                }
            },
            '/api/proxy': {
                get: {
                    tags: ['Proxy'],
                    summary: 'Get all proxies',
                    responses: { 200: { description: 'List of proxies' } }
                },
                post: {
                    tags: ['Proxy'],
                    summary: 'Add proxy to pool',
                    responses: { 201: { description: 'Proxy added' } }
                }
            },
            '/api/mode': {
                get: {
                    tags: ['Mode'],
                    summary: 'Get current mode',
                    responses: { 200: { description: 'Current mode info' } }
                }
            },
            '/api/mode/switch': {
                post: {
                    tags: ['Mode'],
                    summary: 'Switch application mode',
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['mode'],
                                    properties: { mode: { type: 'string', enum: ['mock', 'production', 'firefox'] } }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Mode switched' } }
                }
            },
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health check',
                    responses: { 200: { description: 'Service healthy' } }
                }
            }
        }
    },
    apis: [] // We define everything inline
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'BrowserShield API Docs'
    }));

    // JSON spec endpoint
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}

module.exports = { setupSwagger, swaggerSpec };
