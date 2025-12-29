/**
 * Performance Middleware Unit Tests
 * Feature: middleware-testing
 * Requirements: 5.1-5.3
 */

const { performanceMonitor, createRateLimiter, requestTracker } = require('../../../middleware/performance');

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
  url: options.url || '/api/test',
  headers: options.headers || {},
  get: jest.fn((header) => options.headers?.[header.toLowerCase()]),
  ip: options.ip || '127.0.0.1',
  method: options.method || 'GET',
  body: options.body || {},
  query: options.query || {}
});

/**
 * Create mock response object with event emitter capability
 */
const mockResponse = () => {
  const res = {};
  const eventHandlers = {};
  
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.get = jest.fn((header) => res._headers?.[header.toLowerCase()]);
  res._headers = {};
  res.statusCode = 200;
  
  // Event emitter functionality
  res.on = jest.fn((event, cb) => {
    eventHandlers[event] = cb;
  });
  
  // Helper to trigger events
  res._emit = (event) => {
    if (eventHandlers[event]) {
      eventHandlers[event]();
    }
  };
  
  return res;
};

describe('Performance Middleware - performanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Request Completion Logging', () => {
    // Requirement 5.1: WHEN request completes, THE Performance_Middleware SHALL log duration and memory usage
    test('should log request completion with duration and memory usage', () => {
      const req = mockRequest({ 
        method: 'GET', 
        url: '/api/profiles',
        headers: { 'user-agent': 'test-agent' }
      });
      const res = mockResponse();
      const next = jest.fn();

      performanceMonitor(req, res, next);

      // Should call next immediately
      expect(next).toHaveBeenCalled();
      
      // Should set startTime on request
      expect(req.startTime).toBeDefined();
      expect(req.startMemory).toBeDefined();

      // Simulate response finish
      res._emit('finish');

      // Should log request completion
      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          method: 'GET',
          url: '/api/profiles',
          duration: expect.any(Number),
          status: 200,
          memoryDelta: expect.objectContaining({
            rss: expect.any(Number),
            heapUsed: expect.any(Number),
            heapTotal: expect.any(Number),
            external: expect.any(Number)
          }),
          timestamp: expect.any(String)
        })
      );
    });

    test('should include IP and user agent in log', () => {
      const req = mockRequest({ 
        ip: '192.168.1.100',
        headers: { 'user-agent': 'Mozilla/5.0' }
      });
      const res = mockResponse();
      const next = jest.fn();

      performanceMonitor(req, res, next);
      res._emit('finish');

      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0'
        })
      );
    });

    test('should include content length in log', () => {
      const req = mockRequest();
      const res = mockResponse();
      res.get = jest.fn((header) => {
        if (header === 'Content-Length') return '1024';
        return null;
      });
      const next = jest.fn();

      performanceMonitor(req, res, next);
      res._emit('finish');

      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          contentLength: '1024'
        })
      );
    });
  });

  describe('Slow Request Warning', () => {
    // Requirement 5.2: WHEN request takes > 5000ms, THE Performance_Middleware SHALL log warning
    test('should log warning for slow requests (>5000ms)', () => {
      jest.useFakeTimers();
      
      const req = mockRequest({ method: 'POST', url: '/api/slow-endpoint' });
      const res = mockResponse();
      const next = jest.fn();

      performanceMonitor(req, res, next);

      // Advance time by 5001ms (just over threshold)
      jest.advanceTimersByTime(5001);

      res._emit('finish');

      // Should log warning for slow request
      expect(logger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          method: 'POST',
          url: '/api/slow-endpoint',
          severity: 'HIGH',
          threshold: 5000,
          duration: expect.any(Number)
        })
      );

      jest.useRealTimers();
    });

    test('should not log warning for fast requests (<5000ms)', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();

      performanceMonitor(req, res, next);
      
      // Immediately finish (fast request)
      res._emit('finish');

      // Should not log slow request warning
      expect(logger.warn).not.toHaveBeenCalledWith(
        'Slow request detected',
        expect.anything()
      );
    });

    test('should log warning for exactly 5001ms request', () => {
      jest.useFakeTimers();
      
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();

      performanceMonitor(req, res, next);
      jest.advanceTimersByTime(5001);
      res._emit('finish');

      expect(logger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          severity: 'HIGH',
          threshold: 5000
        })
      );

      jest.useRealTimers();
    });
  });

  describe('Error Response Logging', () => {
    // Requirement 5.3: WHEN response status >= 500, THE Performance_Middleware SHALL log error with CRITICAL severity
    test('should log error with CRITICAL severity for 500 status', () => {
      const req = mockRequest({ method: 'GET', url: '/api/error-endpoint' });
      const res = mockResponse();
      res.statusCode = 500;
      const next = jest.fn();

      performanceMonitor(req, res, next);
      res._emit('finish');

      expect(logger.error).toHaveBeenCalledWith(
        'Server error response',
        expect.objectContaining({
          method: 'GET',
          url: '/api/error-endpoint',
          status: 500,
          severity: 'CRITICAL'
        })
      );
    });

    test('should log error with CRITICAL severity for 502 status', () => {
      const req = mockRequest();
      const res = mockResponse();
      res.statusCode = 502;
      const next = jest.fn();

      performanceMonitor(req, res, next);
      res._emit('finish');

      expect(logger.error).toHaveBeenCalledWith(
        'Server error response',
        expect.objectContaining({
          status: 502,
          severity: 'CRITICAL'
        })
      );
    });

    test('should log error with CRITICAL severity for 503 status', () => {
      const req = mockRequest();
      const res = mockResponse();
      res.statusCode = 503;
      const next = jest.fn();

      performanceMonitor(req, res, next);
      res._emit('finish');

      expect(logger.error).toHaveBeenCalledWith(
        'Server error response',
        expect.objectContaining({
          status: 503,
          severity: 'CRITICAL'
        })
      );
    });

    test('should not log error for 4xx status codes', () => {
      const req = mockRequest();
      const res = mockResponse();
      res.statusCode = 404;
      const next = jest.fn();

      performanceMonitor(req, res, next);
      res._emit('finish');

      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should not log error for 2xx status codes', () => {
      const req = mockRequest();
      const res = mockResponse();
      res.statusCode = 200;
      const next = jest.fn();

      performanceMonitor(req, res, next);
      res._emit('finish');

      expect(logger.error).not.toHaveBeenCalled();
    });

    test('should not log error for 3xx status codes', () => {
      const req = mockRequest();
      const res = mockResponse();
      res.statusCode = 302;
      const next = jest.fn();

      performanceMonitor(req, res, next);
      res._emit('finish');

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('Combined Scenarios', () => {
    test('should log both slow request warning and error for slow 500 response', () => {
      jest.useFakeTimers();
      
      const req = mockRequest({ url: '/api/slow-error' });
      const res = mockResponse();
      res.statusCode = 500;
      const next = jest.fn();

      performanceMonitor(req, res, next);
      jest.advanceTimersByTime(6000);
      res._emit('finish');

      // Should log both warning and error
      expect(logger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({ severity: 'HIGH' })
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Server error response',
        expect.objectContaining({ severity: 'CRITICAL' })
      );

      jest.useRealTimers();
    });
  });
});

describe('Performance Middleware - requestTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should assign unique request ID to request', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    requestTracker(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    expect(next).toHaveBeenCalled();
  });

  test('should set X-Request-ID header on response', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    requestTracker(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Request-ID', req.requestId);
  });

  test('should log request start with debug level', () => {
    const req = mockRequest({
      method: 'POST',
      url: '/api/profiles',
      ip: '10.0.0.1',
      headers: {
        'user-agent': 'TestAgent/1.0',
        'content-type': 'application/json',
        'content-length': '256'
      }
    });
    const res = mockResponse();
    const next = jest.fn();

    requestTracker(req, res, next);

    expect(logger.debug).toHaveBeenCalledWith(
      'Request started',
      expect.objectContaining({
        requestId: req.requestId,
        method: 'POST',
        url: '/api/profiles',
        ip: '10.0.0.1'
      })
    );
  });

  test('should generate different IDs for different requests', () => {
    const req1 = mockRequest();
    const req2 = mockRequest();
    const res1 = mockResponse();
    const res2 = mockResponse();
    const next = jest.fn();

    requestTracker(req1, res1, next);
    requestTracker(req2, res2, next);

    expect(req1.requestId).not.toBe(req2.requestId);
  });
});

describe('Performance Middleware - createRateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create rate limiter with default options', () => {
    const limiter = createRateLimiter();
    const req = mockRequest({ ip: '1.2.3.4' });
    const res = mockResponse();
    const next = jest.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-RateLimit-Limit': 100,
      'X-RateLimit-Remaining': 99
    }));
  });

  test('should create rate limiter with custom options', () => {
    const limiter = createRateLimiter({
      max: 10,
      windowMs: 60000,
      message: 'Custom rate limit message'
    });
    const req = mockRequest({ ip: '5.6.7.8' });
    const res = mockResponse();
    const next = jest.fn();

    limiter(req, res, next);

    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-RateLimit-Limit': 10,
      'X-RateLimit-Remaining': 9
    }));
  });

  test('should return 429 with custom message when limit exceeded', () => {
    const customMessage = 'Too many browser starts';
    const limiter = createRateLimiter({
      max: 2,
      message: customMessage
    });
    const req = mockRequest({ ip: '9.10.11.12' });
    const next = jest.fn();

    // Exhaust limit
    for (let i = 0; i < 2; i++) {
      const res = mockResponse();
      limiter(req, res, next);
    }

    // Next request should be blocked
    const res = mockResponse();
    limiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: customMessage,
      retryAfter: expect.any(Number)
    }));
  });

  test('should log warning when rate limit exceeded', () => {
    const limiter = createRateLimiter({ max: 1 });
    const req = mockRequest({ ip: '13.14.15.16' });
    const next = jest.fn();

    // First request OK
    limiter(req, mockResponse(), next);

    // Second request exceeds limit
    limiter(req, mockResponse(), next);

    expect(logger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({
        ip: '13.14.15.16',
        limit: 1
      })
    );
  });

  test('should disable standard headers when standardHeaders is false', () => {
    const limiter = createRateLimiter({
      standardHeaders: false
    });
    const req = mockRequest({ ip: '17.18.19.20' });
    const res = mockResponse();
    const next = jest.fn();

    limiter(req, res, next);

    expect(res.set).not.toHaveBeenCalled();
  });

  test('should clean up expired entries', () => {
    jest.useFakeTimers();
    
    const limiter = createRateLimiter({
      windowMs: 1000, // 1 second window
      max: 5
    });
    
    const req1 = mockRequest({ ip: '21.22.23.24' });
    const req2 = mockRequest({ ip: '25.26.27.28' });
    const next = jest.fn();

    // Make requests from first IP
    for (let i = 0; i < 3; i++) {
      limiter(req1, mockResponse(), next);
    }

    // Advance time past window
    jest.advanceTimersByTime(2000);

    // Make request from second IP (should trigger cleanup)
    const res = mockResponse();
    limiter(req2, res, next);

    // Second IP should have fresh quota
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-RateLimit-Remaining': 4
    }));

    jest.useRealTimers();
  });
});
