/**
 * Validation Middleware Unit Tests
 * Feature: middleware-testing
 * Requirements: 3.1-3.3
 */

const {
  validate,
  validateQuery,
  createProfileSchema,
  updateProfileSchema,
  startBrowserSchema,
  navigateSchema,
  executeScriptSchema,
  addProxySchema,
  switchModeSchema
} = require('../../../middleware/validation');

/**
 * Create mock request object
 */
const mockRequest = (options = {}) => ({
  path: options.path || '/api/test',
  headers: options.headers || {},
  get: jest.fn((header) => options.headers?.[header.toLowerCase()]),
  ip: options.ip || '127.0.0.1',
  method: options.method || 'POST',
  body: options.body || {},
  query: options.query || {}
});

/**
 * Create mock response object
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

describe('Validation Middleware - validate()', () => {
  describe('Valid Data', () => {
    // Requirement 3.1: WHEN valid data provided, THE Validation_Middleware SHALL parse data and call next()
    test('should call next() when valid data provided for createProfileSchema', () => {
      const req = mockRequest({
        body: {
          name: 'Test Profile',
          userAgent: 'Mozilla/5.0',
          timezone: 'America/New_York',
          spoofFingerprint: true
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body.name).toBe('Test Profile');
    });

    test('should apply default values from schema', () => {
      const req = mockRequest({
        body: {
          name: 'Profile with defaults'
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.spoofFingerprint).toBe(true); // Default value
    });

    test('should validate nested viewport object', () => {
      const req = mockRequest({
        body: {
          name: 'Profile with viewport',
          viewport: {
            width: 1920,
            height: 1080
          }
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.viewport.width).toBe(1920);
      expect(req.body.viewport.height).toBe(1080);
    });

    test('should validate nested proxy config', () => {
      const req = mockRequest({
        body: {
          name: 'Profile with proxy',
          proxy: {
            host: 'proxy.example.com',
            port: 8080,
            type: 'http',
            username: 'user',
            password: 'pass'
          }
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.proxy.host).toBe('proxy.example.com');
      expect(req.body.proxy.port).toBe(8080);
    });
  });

  describe('Invalid Data', () => {
    // Requirement 3.2: WHEN invalid data provided, THE Validation_Middleware SHALL return 400 with field errors
    test('should return 400 when required field is missing', () => {
      const req = mockRequest({
        body: {} // Missing required 'name' field
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when name exceeds max length', () => {
      const req = mockRequest({
        body: {
          name: 'a'.repeat(101) // Exceeds 100 char limit
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when viewport dimensions are invalid', () => {
      const req = mockRequest({
        body: {
          name: 'Test Profile',
          viewport: {
            width: 50, // Below minimum 100
            height: 5000 // Above maximum 4096
          }
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when proxy port is invalid', () => {
      const req = mockRequest({
        body: {
          name: 'Test Profile',
          proxy: {
            host: 'proxy.example.com',
            port: 70000 // Above max 65535
          }
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 400 when proxy type is invalid', () => {
      const req = mockRequest({
        body: {
          name: 'Test Profile',
          proxy: {
            host: 'proxy.example.com',
            port: 8080,
            type: 'invalid-type'
          }
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(createProfileSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('Validation Middleware - validateQuery()', () => {
  const querySchema = require('zod').z.object({
    page: require('zod').z.coerce.number().int().min(1).optional(),
    limit: require('zod').z.coerce.number().int().min(1).max(100).optional(),
    search: require('zod').z.string().optional()
  });

  test('should call next() when valid query params provided', () => {
    const req = mockRequest({
      query: {
        page: '1',
        limit: '10',
        search: 'test'
      }
    });
    const res = mockResponse();
    const next = jest.fn();

    const middleware = validateQuery(querySchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(1); // Coerced to number
    expect(req.query.limit).toBe(10);
  });

  test('should return 400 when invalid query params provided', () => {
    const req = mockRequest({
      query: {
        page: '-1', // Invalid: below minimum
        limit: '200' // Invalid: above maximum
      }
    });
    const res = mockResponse();
    const next = jest.fn();

    const middleware = validateQuery(querySchema);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Invalid query parameters'
    }));
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Validation Middleware - Schema Tests', () => {
  describe('updateProfileSchema', () => {
    test('should validate partial update with single field', () => {
      const req = mockRequest({
        body: {
          name: 'Updated Name'
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(updateProfileSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject empty update object', () => {
      const req = mockRequest({
        body: {}
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(updateProfileSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('startBrowserSchema', () => {
    test('should validate with optional fields', () => {
      const req = mockRequest({
        body: {
          autoNavigateUrl: 'https://example.com',
          headless: true
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(startBrowserSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should validate empty body (all fields optional)', () => {
      const req = mockRequest({
        body: {}
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(startBrowserSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject invalid URL format', () => {
      const req = mockRequest({
        body: {
          autoNavigateUrl: 'not-a-valid-url'
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(startBrowserSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('navigateSchema', () => {
    test('should validate valid URL', () => {
      const req = mockRequest({
        body: {
          url: 'https://example.com/page'
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(navigateSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject invalid URL', () => {
      const req = mockRequest({
        body: {
          url: 'invalid-url'
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(navigateSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('executeScriptSchema', () => {
    test('should validate non-empty script', () => {
      const req = mockRequest({
        body: {
          script: 'console.log("test");'
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(executeScriptSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject empty script', () => {
      const req = mockRequest({
        body: {
          script: ''
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(executeScriptSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('addProxySchema', () => {
    test('should validate complete proxy config', () => {
      const req = mockRequest({
        body: {
          host: 'proxy.example.com',
          port: 8080,
          type: 'socks5',
          country: 'US',
          provider: 'ProxyProvider',
          username: 'user',
          password: 'pass'
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(addProxySchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should apply default type', () => {
      const req = mockRequest({
        body: {
          host: 'proxy.example.com',
          port: 8080
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(addProxySchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.type).toBe('http'); // Default value
    });

    test('should reject missing required fields', () => {
      const req = mockRequest({
        body: {
          host: 'proxy.example.com'
          // Missing port
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(addProxySchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('switchModeSchema', () => {
    test('should validate valid mode values', () => {
      const validModes = ['mock', 'production', 'firefox'];

      validModes.forEach(mode => {
        const req = mockRequest({
          body: { mode }
        });
        const res = mockResponse();
        const next = jest.fn();

        const middleware = validate(switchModeSchema);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body.mode).toBe(mode);
      });
    });

    test('should reject invalid mode value', () => {
      const req = mockRequest({
        body: {
          mode: 'invalid-mode'
        }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validate(switchModeSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});


/**
 * Validation Middleware Property Tests
 * Feature: middleware-testing
 * 
 * Property-based tests using fast-check to validate validation middleware correctness properties.
 */
const fc = require('fast-check');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

/**
 * Generator for valid profile names (1-100 chars, non-empty)
 */
const validProfileName = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

/**
 * Generator for valid viewport dimensions
 */
const validViewport = fc.record({
  width: fc.integer({ min: 100, max: 4096 }),
  height: fc.integer({ min: 100, max: 4096 })
});

/**
 * Generator for valid proxy types
 */
const validProxyType = fc.constantFrom('http', 'https', 'socks4', 'socks5');

/**
 * Generator for valid port numbers
 */
const validPort = fc.integer({ min: 1, max: 65535 });

/**
 * Generator for valid proxy host
 */
const validProxyHost = fc.oneof(
  fc.constant('proxy.example.com'),
  fc.constant('192.168.1.1'),
  fc.constant('localhost'),
  fc.stringMatching(/^[a-z][a-z0-9-]{0,20}\.[a-z]{2,4}$/)
);

/**
 * Generator for valid proxy config
 */
const validProxyConfig = fc.record({
  host: validProxyHost,
  port: validPort,
  type: validProxyType,
  username: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  password: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined })
});

/**
 * Generator for valid createProfile input
 */
const validCreateProfileInput = fc.record({
  name: validProfileName,
  userAgent: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  timezone: fc.option(fc.constantFrom('America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC'), { nil: undefined }),
  viewport: fc.option(validViewport, { nil: undefined }),
  proxy: fc.option(validProxyConfig, { nil: undefined }),
  spoofFingerprint: fc.option(fc.boolean(), { nil: undefined })
});

/**
 * Generator for valid URLs
 */
const validUrl = fc.oneof(
  fc.constant('https://example.com'),
  fc.constant('https://google.com/search'),
  fc.constant('http://localhost:3000'),
  fc.webUrl()
);

/**
 * Generator for valid mode values
 */
const validMode = fc.constantFrom('mock', 'production', 'firefox');

describe('Validation Middleware Property Tests', () => {
  /**
   * Feature: middleware-testing, Property 3: Validation Schema Round-Trip
   * Validates: Requirements 3.3
   * 
   * For any valid input matching a Zod schema, validate middleware should 
   * parse and return equivalent data.
   */
  describe('Property 3: Validation Schema Round-Trip', () => {
    it('should parse and return equivalent data for valid createProfile inputs', async () => {
      await fc.assert(
        fc.asyncProperty(validCreateProfileInput, async (input) => {
          // Clean up undefined values for comparison
          const cleanInput = JSON.parse(JSON.stringify(input));
          
          const req = {
            body: { ...cleanInput }
          };
          const res = mockResponse();
          const next = jest.fn();

          const middleware = validate(createProfileSchema);
          middleware(req, res, next);

          // Should call next() for valid input
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();

          // Parsed data should preserve essential fields
          expect(req.body.name).toBe(cleanInput.name);
          
          // Optional fields should be preserved if provided
          if (cleanInput.userAgent !== undefined) {
            expect(req.body.userAgent).toBe(cleanInput.userAgent);
          }
          if (cleanInput.timezone !== undefined) {
            expect(req.body.timezone).toBe(cleanInput.timezone);
          }
          if (cleanInput.viewport !== undefined) {
            expect(req.body.viewport.width).toBe(cleanInput.viewport.width);
            expect(req.body.viewport.height).toBe(cleanInput.viewport.height);
          }
          if (cleanInput.proxy !== undefined) {
            expect(req.body.proxy.host).toBe(cleanInput.proxy.host);
            expect(req.body.proxy.port).toBe(cleanInput.proxy.port);
          }

          // Default value should be applied
          expect(req.body.spoofFingerprint).toBeDefined();

          return true;
        }),
        fcOptions
      );
    });

    it('should parse and return equivalent data for valid navigate inputs', async () => {
      await fc.assert(
        fc.asyncProperty(validUrl, async (url) => {
          const req = {
            body: { url }
          };
          const res = mockResponse();
          const next = jest.fn();

          const middleware = validate(navigateSchema);
          middleware(req, res, next);

          // Should call next() for valid URL
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();

          // URL should be preserved exactly
          expect(req.body.url).toBe(url);

          return true;
        }),
        fcOptions
      );
    });

    it('should parse and return equivalent data for valid switchMode inputs', async () => {
      await fc.assert(
        fc.asyncProperty(validMode, async (mode) => {
          const req = {
            body: { mode }
          };
          const res = mockResponse();
          const next = jest.fn();

          const middleware = validate(switchModeSchema);
          middleware(req, res, next);

          // Should call next() for valid mode
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();

          // Mode should be preserved exactly
          expect(req.body.mode).toBe(mode);

          return true;
        }),
        fcOptions
      );
    });

    it('should parse and return equivalent data for valid addProxy inputs', async () => {
      await fc.assert(
        fc.asyncProperty(validProxyConfig, async (proxyInput) => {
          // Clean up undefined values
          const cleanInput = JSON.parse(JSON.stringify(proxyInput));
          
          const req = {
            body: { ...cleanInput }
          };
          const res = mockResponse();
          const next = jest.fn();

          const middleware = validate(addProxySchema);
          middleware(req, res, next);

          // Should call next() for valid proxy config
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();

          // Essential fields should be preserved
          expect(req.body.host).toBe(cleanInput.host);
          expect(req.body.port).toBe(cleanInput.port);
          expect(req.body.type).toBe(cleanInput.type);

          // Optional fields should be preserved if provided
          if (cleanInput.username !== undefined) {
            expect(req.body.username).toBe(cleanInput.username);
          }
          if (cleanInput.password !== undefined) {
            expect(req.body.password).toBe(cleanInput.password);
          }

          return true;
        }),
        fcOptions
      );
    });

    it('should parse and return equivalent data for valid executeScript inputs', async () => {
      const validScript = fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0);

      await fc.assert(
        fc.asyncProperty(validScript, async (script) => {
          const req = {
            body: { script }
          };
          const res = mockResponse();
          const next = jest.fn();

          const middleware = validate(executeScriptSchema);
          middleware(req, res, next);

          // Should call next() for valid script
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();

          // Script should be preserved exactly
          expect(req.body.script).toBe(script);

          return true;
        }),
        fcOptions
      );
    });

    it('should apply default values consistently for all valid inputs', async () => {
      await fc.assert(
        fc.asyncProperty(validProfileName, async (name) => {
          const req = {
            body: { name }
          };
          const res = mockResponse();
          const next = jest.fn();

          const middleware = validate(createProfileSchema);
          middleware(req, res, next);

          // Should call next()
          expect(next).toHaveBeenCalled();

          // Default spoofFingerprint should always be true
          expect(req.body.spoofFingerprint).toBe(true);

          return true;
        }),
        fcOptions
      );
    });
  });
});
