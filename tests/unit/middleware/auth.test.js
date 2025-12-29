/**
 * Auth Middleware Unit Tests
 * Feature: middleware-testing
 * Requirements: 1.1-1.5, 2.1-2.3
 */

const { authenticateToken, rateLimiter } = require('../../../middleware/auth');

// Mock logger to prevent console output during tests
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const logger = require('../../../utils/logger');

/**
 * Create mock request object
 */
const mockRequest = (options = {}) => ({
  path: options.path || '/api/test',
  headers: options.headers || {},
  get: jest.fn((header) => options.headers?.[header.toLowerCase()]),
  ip: options.ip || '127.0.0.1',
  method: options.method || 'GET',
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
  res.get = jest.fn();
  res.on = jest.fn((event, cb) => { res._finishCb = cb; });
  res.statusCode = 200;
  return res;
};

describe('Auth Middleware - authenticateToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Skip Authentication', () => {
    // Requirement 1.1: WHEN request path does not start with /api, THE Auth_Middleware SHALL skip authentication
    test('should skip auth for non-API routes', () => {
      const req = mockRequest({ path: '/health' });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should skip auth for UI routes', () => {
      const req = mockRequest({ path: '/index.html' });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should skip auth for root path', () => {
      const req = mockRequest({ path: '/' });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    // Requirement 1.2: WHEN API_TOKEN env is not set, THE Auth_Middleware SHALL skip authentication with warning
    test('should skip auth when API_TOKEN is not set', () => {
      delete process.env.API_TOKEN;
      const req = mockRequest({ path: '/api/profiles' });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('API_TOKEN not set - authentication disabled');
    });
  });

  describe('Token Validation', () => {
    beforeEach(() => {
      process.env.API_TOKEN = 'valid-test-token';
    });

    // Requirement 1.3: WHEN no token provided, THE Auth_Middleware SHALL return 401 with "Access token required"
    test('should return 401 when no token provided', () => {
      const req = mockRequest({ path: '/api/profiles' });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
        error: 'No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when authorization header is empty', () => {
      const req = mockRequest({ 
        path: '/api/profiles',
        headers: { authorization: '' }
      });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    // Requirement 1.4: WHEN invalid token provided, THE Auth_Middleware SHALL return 403 with "Invalid access token"
    test('should return 403 when invalid token provided', () => {
      const req = mockRequest({ 
        path: '/api/profiles',
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid access token',
        error: 'Token verification failed'
      });
      expect(logger.warn).toHaveBeenCalledWith('Invalid API token attempt', expect.any(Object));
      expect(next).not.toHaveBeenCalled();
    });

    // Requirement 1.5: WHEN valid token provided, THE Auth_Middleware SHALL call next() and log request
    test('should call next() when valid token provided', () => {
      const req = mockRequest({ 
        path: '/api/profiles',
        headers: { authorization: 'Bearer valid-test-token' }
      });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('API request authenticated', expect.objectContaining({
        ip: '127.0.0.1',
        path: '/api/profiles',
        method: 'GET'
      }));
    });

    test('should handle Bearer token format correctly', () => {
      const req = mockRequest({ 
        path: '/api/test',
        headers: { authorization: 'Bearer valid-test-token' }
      });
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

describe('Auth Middleware - rateLimiter', () => {
  let limiter;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create fresh limiter for each test
    limiter = rateLimiter();
  });

  describe('Rate Limit Headers', () => {
    // Requirement 2.1: WHEN requests within limit, THE Auth_Middleware SHALL set rate limit headers and allow request
    test('should set rate limit headers on first request', () => {
      const req = mockRequest({ ip: '192.168.1.1' });
      const res = mockResponse();
      const next = jest.fn();

      limiter(req, res, next);

      expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit': 100,
        'X-RateLimit-Remaining': 99
      }));
      expect(next).toHaveBeenCalled();
    });

    test('should decrement remaining count on subsequent requests', () => {
      const req = mockRequest({ ip: '192.168.1.2' });
      const res = mockResponse();
      const next = jest.fn();

      // First request
      limiter(req, res, next);
      expect(res.set).toHaveBeenLastCalledWith(expect.objectContaining({
        'X-RateLimit-Remaining': 99
      }));

      // Second request
      const res2 = mockResponse();
      limiter(req, res2, next);
      expect(res2.set).toHaveBeenLastCalledWith(expect.objectContaining({
        'X-RateLimit-Remaining': 98
      }));
    });

    test('should include reset time in headers', () => {
      const req = mockRequest({ ip: '192.168.1.3' });
      const res = mockResponse();
      const next = jest.fn();

      limiter(req, res, next);

      expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Reset': expect.any(String)
      }));
    });
  });

  describe('Rate Limit Exceeded', () => {
    // Requirement 2.2: WHEN requests exceed limit, THE Auth_Middleware SHALL return 429 with retryAfter
    test('should return 429 when rate limit exceeded', () => {
      const req = mockRequest({ ip: '192.168.1.100' });
      const next = jest.fn();

      // Make 100 requests (at limit)
      for (let i = 0; i < 100; i++) {
        const res = mockResponse();
        limiter(req, res, next);
      }

      // 101st request should be blocked
      const res = mockResponse();
      limiter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Too many requests',
        retryAfter: expect.any(Number)
      }));
    });

    test('should include retryAfter in seconds', () => {
      const req = mockRequest({ ip: '192.168.1.101' });
      const next = jest.fn();

      // Exceed limit
      for (let i = 0; i < 101; i++) {
        const res = mockResponse();
        limiter(req, res, next);
      }

      const res = mockResponse();
      limiter(req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.retryAfter).toBeGreaterThan(0);
      expect(jsonCall.retryAfter).toBeLessThanOrEqual(15 * 60); // Max 15 minutes
    });
  });

  describe('Client Isolation', () => {
    test('should track requests per client IP', () => {
      const req1 = mockRequest({ ip: '10.0.0.1' });
      const req2 = mockRequest({ ip: '10.0.0.2' });
      const next = jest.fn();

      // Make requests from first IP
      for (let i = 0; i < 50; i++) {
        const res = mockResponse();
        limiter(req1, res, next);
      }

      // First request from second IP should have full quota
      const res = mockResponse();
      limiter(req2, res, next);

      expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Remaining': 99
      }));
    });
  });

  describe('Window Reset', () => {
    // Requirement 2.3: WHEN window expires, THE Auth_Middleware SHALL reset request count
    test('should reset count after window expires', () => {
      jest.useFakeTimers();
      const freshLimiter = rateLimiter();
      
      const req = mockRequest({ ip: '172.16.0.1' });
      const next = jest.fn();

      // Make some requests
      for (let i = 0; i < 50; i++) {
        const res = mockResponse();
        freshLimiter(req, res, next);
      }

      // Advance time past window (15 minutes + 1 second)
      jest.advanceTimersByTime(15 * 60 * 1000 + 1000);

      // Next request should have fresh count
      const res = mockResponse();
      freshLimiter(req, res, next);

      expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Remaining': 99
      }));

      jest.useRealTimers();
    });
  });
});


/**
 * Auth Middleware Property Tests
 * Feature: middleware-testing
 * 
 * Property-based tests using fast-check to validate auth middleware correctness properties.
 */
const fc = require('fast-check');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

/**
 * Generator for non-API paths (paths that don't start with /api)
 */
const nonApiPath = fc.oneof(
  fc.constant('/'),
  fc.constant('/health'),
  fc.constant('/index.html'),
  fc.constant('/admin.html'),
  fc.constant('/static/app.js'),
  fc.stringMatching(/^\/[a-z]+\.html$/),
  fc.stringMatching(/^\/static\/[a-z]+\.(js|css|png|jpg)$/),
  fc.stringMatching(/^\/[a-z]+$/).filter(p => !p.startsWith('/api'))
);

/**
 * Generator for API paths (paths that start with /api)
 */
const apiPath = fc.oneof(
  fc.constant('/api/profiles'),
  fc.constant('/api/sessions'),
  fc.constant('/api/test'),
  fc.stringMatching(/^\/api\/[a-z]+$/)
);

describe('Auth Middleware Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.API_TOKEN = 'test-token-for-property-tests';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Feature: middleware-testing, Property 1: Auth Skip Non-API Routes
   * Validates: Requirements 1.1
   * 
   * For any request path not starting with '/api', authenticateToken should 
   * call next() without checking token.
   */
  describe('Property 1: Auth Skip Non-API Routes', () => {
    it('should skip authentication for all non-API paths', async () => {
      await fc.assert(
        fc.asyncProperty(nonApiPath, async (path) => {
          const req = mockRequest({ path });
          const res = mockResponse();
          const next = jest.fn();

          authenticateToken(req, res, next);

          // Should call next() without checking token
          expect(next).toHaveBeenCalled();
          // Should not return any error response
          expect(res.status).not.toHaveBeenCalled();
          expect(res.json).not.toHaveBeenCalled();

          return true;
        }),
        fcOptions
      );
    });

    it('should require authentication for all API paths when token is set', async () => {
      await fc.assert(
        fc.asyncProperty(apiPath, async (path) => {
          // Skip /health endpoint which is explicitly excluded
          if (path === '/health') return true;

          const req = mockRequest({ path }); // No token provided
          const res = mockResponse();
          const next = jest.fn();

          authenticateToken(req, res, next);

          // Should return 401 for missing token
          expect(res.status).toHaveBeenCalledWith(401);
          expect(next).not.toHaveBeenCalled();

          return true;
        }),
        fcOptions
      );
    });
  });
});


/**
 * Generator for valid IP addresses
 */
const validIpAddress = fc.oneof(
  fc.tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 254 })
  ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
  fc.constant('127.0.0.1'),
  fc.constant('192.168.1.1'),
  fc.constant('10.0.0.1')
);

/**
 * Generator for request count within limit (1-100)
 */
const requestCountWithinLimit = fc.integer({ min: 1, max: 100 });

describe('Rate Limiter Property Tests', () => {
  /**
   * Feature: middleware-testing, Property 2: Rate Limit Headers Consistency
   * Validates: Requirements 2.1
   * 
   * For any request within rate limit, response headers X-RateLimit-Remaining 
   * should equal (MAX_REQUESTS - request_count).
   */
  describe('Property 2: Rate Limit Headers Consistency', () => {
    it('should have X-RateLimit-Remaining equal to (100 - request_count) for requests within limit', async () => {
      const MAX_REQUESTS = 100;

      await fc.assert(
        fc.asyncProperty(
          validIpAddress,
          requestCountWithinLimit,
          async (ip, requestCount) => {
            // Create fresh limiter for each property test
            const limiter = rateLimiter();
            
            let lastRes;
            
            // Make requestCount number of requests
            for (let i = 0; i < requestCount; i++) {
              const req = mockRequest({ ip });
              const res = mockResponse();
              const next = jest.fn();
              
              limiter(req, res, next);
              lastRes = res;
            }

            // Verify the last response has correct remaining count
            const expectedRemaining = MAX_REQUESTS - requestCount;
            
            expect(lastRes.set).toHaveBeenCalledWith(expect.objectContaining({
              'X-RateLimit-Limit': MAX_REQUESTS,
              'X-RateLimit-Remaining': expectedRemaining
            }));

            return true;
          }
        ),
        fcOptions
      );
    });

    it('should have X-RateLimit-Remaining be 0 when at or over limit', async () => {
      const MAX_REQUESTS = 100;

      await fc.assert(
        fc.asyncProperty(
          validIpAddress,
          fc.integer({ min: 100, max: 110 }), // At or over limit
          async (ip, requestCount) => {
            // Create fresh limiter for each property test
            const limiter = rateLimiter();
            
            let lastSuccessRes;
            
            // Make requests up to the limit
            for (let i = 0; i < Math.min(requestCount, MAX_REQUESTS); i++) {
              const req = mockRequest({ ip });
              const res = mockResponse();
              const next = jest.fn();
              
              limiter(req, res, next);
              lastSuccessRes = res;
            }

            // At exactly 100 requests, remaining should be 0
            if (requestCount >= MAX_REQUESTS) {
              expect(lastSuccessRes.set).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Remaining': 0
              }));
            }

            return true;
          }
        ),
        fcOptions
      );
    });

    it('should always include X-RateLimit-Reset as valid ISO date string', async () => {
      await fc.assert(
        fc.asyncProperty(validIpAddress, async (ip) => {
          const limiter = rateLimiter();
          const req = mockRequest({ ip });
          const res = mockResponse();
          const next = jest.fn();

          limiter(req, res, next);

          // Extract the set call arguments
          const setCall = res.set.mock.calls[0][0];
          const resetValue = setCall['X-RateLimit-Reset'];

          // Verify it's a valid ISO date string
          expect(resetValue).toBeDefined();
          const resetDate = new Date(resetValue);
          expect(resetDate.toString()).not.toBe('Invalid Date');
          
          // Reset time should be in the future (within 15 minutes)
          const now = Date.now();
          const resetTime = resetDate.getTime();
          expect(resetTime).toBeGreaterThan(now);
          expect(resetTime).toBeLessThanOrEqual(now + 15 * 60 * 1000 + 1000); // 15 min + 1s buffer

          return true;
        }),
        fcOptions
      );
    });
  });
});
