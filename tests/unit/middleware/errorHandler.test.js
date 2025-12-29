/**
 * ErrorHandler Middleware Unit Tests
 * Feature: middleware-testing
 * Requirements: 4.1-4.4
 */

const errorHandler = require('../../../middleware/errorHandler');
const { AppError, ErrorCodes, getErrorMessage } = require('../../../utils/errors');

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
  query: options.query || {},
  requestId: options.requestId || 'test-request-id'
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

describe('ErrorHandler Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('AppError Handling', () => {
    // Requirement 4.1: WHEN AppError thrown, THE ErrorHandler_Middleware SHALL return error with correct status and message
    test('should return correct status and message for AppError', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 404);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.PROFILE_NOT_FOUND,
          message: 'Profile not found'
        })
      }));
    });

    test('should return correct status for BROWSER_ALREADY_RUNNING error', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new AppError(ErrorCodes.BROWSER_ALREADY_RUNNING, 409);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.BROWSER_ALREADY_RUNNING,
          message: 'Browser is already running for this profile'
        })
      }));
    });

    test('should include details when provided in AppError', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const details = { field: 'name', reason: 'too long' };
      const error = new AppError(ErrorCodes.VALIDATION_FAILED, 400, details);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.VALIDATION_FAILED,
          details
        })
      }));
    });

    test('should include timestamp in AppError response', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new AppError(ErrorCodes.INTERNAL_ERROR, 500);

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(String)
      }));
    });
  });

  describe('Generic Error Handling', () => {
    // Requirement 4.2: WHEN generic Error thrown, THE ErrorHandler_Middleware SHALL map to appropriate error code
    test('should map "not found" error to PROFILE_NOT_FOUND', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Profile not found');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.PROFILE_NOT_FOUND
        })
      }));
    });

    test('should map "proxy not found" error to PROXY_NOT_FOUND', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Proxy not found');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.PROXY_NOT_FOUND
        })
      }));
    });

    test('should map "already exists" error to PROFILE_NAME_EXISTS', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Profile already exists');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.PROFILE_NAME_EXISTS
        })
      }));
    });

    test('should map "proxy already exists" error to PROXY_EXISTS', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Proxy already exists');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.PROXY_EXISTS
        })
      }));
    });

    test('should map "already running" error to BROWSER_ALREADY_RUNNING', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Browser already running');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.BROWSER_ALREADY_RUNNING
        })
      }));
    });

    test('should map "no active browser" error to BROWSER_NOT_RUNNING', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('No active browser session');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.BROWSER_NOT_RUNNING
        })
      }));
    });

    test('should map "not running" error to BROWSER_NOT_RUNNING', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Browser not running');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.BROWSER_NOT_RUNNING
        })
      }));
    });

    test('should map unknown error to INTERNAL_ERROR', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Something unexpected happened');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.INTERNAL_ERROR
        })
      }));
    });

    test('should handle SQLITE_CONSTRAINT_UNIQUE error', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Database constraint violation');
      error.code = 'SQLITE_CONSTRAINT_UNIQUE';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.PROFILE_NAME_EXISTS
        })
      }));
    });

    test('should handle generic SQLITE error', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Database error');
      error.code = 'SQLITE_ERROR';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.DATABASE_ERROR
        })
      }));
    });

    test('should handle ECONNREFUSED error', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    test('should handle ETIMEDOUT error', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Operation timed out');
      error.code = 'ETIMEDOUT';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(504);
    });
  });

  describe('Localization (en/vi)', () => {
    // Requirement 4.3: WHEN Accept-Language is 'vi', THE ErrorHandler_Middleware SHALL return Vietnamese message
    test('should return Vietnamese message when Accept-Language is vi', () => {
      const req = mockRequest({
        headers: { 'accept-language': 'vi' }
      });
      const res = mockResponse();
      const next = jest.fn();
      const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 404);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.PROFILE_NOT_FOUND,
          message: 'Không tìm thấy profile'
        })
      }));
    });

    test('should return English message when Accept-Language is en', () => {
      const req = mockRequest({
        headers: { 'accept-language': 'en' }
      });
      const res = mockResponse();
      const next = jest.fn();
      const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 404);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.PROFILE_NOT_FOUND,
          message: 'Profile not found'
        })
      }));
    });

    test('should return English message when Accept-Language is not set', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new AppError(ErrorCodes.BROWSER_ALREADY_RUNNING, 409);

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Browser is already running for this profile'
        })
      }));
    });

    test('should use lang query parameter over Accept-Language header', () => {
      const req = mockRequest({
        headers: { 'accept-language': 'en' },
        query: { lang: 'vi' }
      });
      const res = mockResponse();
      const next = jest.fn();
      const error = new AppError(ErrorCodes.VALIDATION_FAILED, 400);

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Xác thực thất bại'
        })
      }));
    });

    test('should return Vietnamese for generic error when Accept-Language is vi', () => {
      const req = mockRequest({
        headers: { 'accept-language': 'vi' }
      });
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Profile not found');

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Không tìm thấy profile'
        })
      }));
    });
  });

  describe('ZodError Handling', () => {
    // Requirement 4.4: WHEN ZodError thrown, THE ErrorHandler_Middleware SHALL return 400 with validation details
    test('should return 400 with validation details for ZodError', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Validation failed');
      error.name = 'ZodError';
      error.errors = [
        { path: ['name'], message: 'Required' },
        { path: ['port'], message: 'Must be a number' }
      ];

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.VALIDATION_FAILED,
          details: error.errors
        })
      }));
    });

    test('should handle ZodError with empty errors array', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Validation failed');
      error.name = 'ZodError';
      error.errors = [];

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.VALIDATION_FAILED
        })
      }));
    });

    test('should handle validation error message pattern', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Validation error occurred');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ErrorCodes.VALIDATION_FAILED
        })
      }));
    });
  });

  describe('Error Logging', () => {
    test('should log error with request details', () => {
      const req = mockRequest({
        url: '/api/profiles/123',
        method: 'DELETE',
        ip: '192.168.1.100',
        requestId: 'req-12345'
      });
      const res = mockResponse();
      const next = jest.fn();
      const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 404);

      errorHandler(error, req, res, next);

      expect(logger.error).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
        code: ErrorCodes.PROFILE_NOT_FOUND,
        url: '/api/profiles/123',
        method: 'DELETE',
        ip: '192.168.1.100',
        requestId: 'req-12345'
      }));
    });

    test('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        stack: expect.any(String)
      }));
    });

    test('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });
  });

  describe('Response Structure', () => {
    test('should include path and method in response', () => {
      const req = mockRequest({
        path: '/api/profiles',
        method: 'POST'
      });
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        path: '/api/profiles',
        method: 'POST'
      }));
    });

    test('should include requestId in response', () => {
      const req = mockRequest({
        requestId: 'unique-request-id'
      });
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        requestId: 'unique-request-id'
      }));
    });

    test('should include timestamp in response', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.timestamp).toBeDefined();
      // Verify it's a valid ISO date string
      expect(new Date(jsonCall.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
});


/**
 * ErrorHandler Middleware Property Tests
 * Feature: middleware-testing
 * 
 * Property-based tests using fast-check to validate error handler correctness properties.
 */
const fc = require('fast-check');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

/**
 * Generator for all valid error codes
 */
const validErrorCode = fc.constantFrom(
  ErrorCodes.PROFILE_NOT_FOUND,
  ErrorCodes.PROFILE_NAME_EXISTS,
  ErrorCodes.PROFILE_INVALID_DATA,
  ErrorCodes.PROFILE_CREATION_FAILED,
  ErrorCodes.BROWSER_ALREADY_RUNNING,
  ErrorCodes.BROWSER_NOT_RUNNING,
  ErrorCodes.BROWSER_START_FAILED,
  ErrorCodes.BROWSER_STOP_FAILED,
  ErrorCodes.BROWSER_NAVIGATION_FAILED,
  ErrorCodes.BROWSER_SCRIPT_FAILED,
  ErrorCodes.PROXY_NOT_FOUND,
  ErrorCodes.PROXY_INVALID_CONFIG,
  ErrorCodes.PROXY_CONNECTION_FAILED,
  ErrorCodes.PROXY_EXISTS,
  ErrorCodes.MODE_SWITCH_FAILED,
  ErrorCodes.MODE_NOT_AVAILABLE,
  ErrorCodes.MODE_INVALID,
  ErrorCodes.VALIDATION_FAILED,
  ErrorCodes.REQUIRED_FIELD_MISSING,
  ErrorCodes.INVALID_FORMAT,
  ErrorCodes.INTERNAL_ERROR,
  ErrorCodes.DATABASE_ERROR,
  ErrorCodes.RATE_LIMIT_EXCEEDED,
  ErrorCodes.UNAUTHORIZED,
  ErrorCodes.FORBIDDEN
);

/**
 * Generator for valid HTTP status codes
 */
const validStatusCode = fc.constantFrom(400, 401, 403, 404, 409, 500, 503, 504);

/**
 * Generator for supported languages
 */
const supportedLanguage = fc.constantFrom('en', 'vi');

describe('ErrorHandler Middleware Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Feature: middleware-testing, Property 4: Error Message Localization
   * Validates: Requirements 4.3
   * 
   * For any AppError with code, getErrorMessage(code, 'vi') should return Vietnamese message 
   * and getErrorMessage(code, 'en') should return English message.
   */
  describe('Property 4: Error Message Localization', () => {
    it('should return different messages for en and vi for all error codes', async () => {
      await fc.assert(
        fc.asyncProperty(validErrorCode, async (errorCode) => {
          const enMessage = getErrorMessage(errorCode, 'en');
          const viMessage = getErrorMessage(errorCode, 'vi');

          // Both messages should be non-empty strings
          expect(typeof enMessage).toBe('string');
          expect(typeof viMessage).toBe('string');
          expect(enMessage.length).toBeGreaterThan(0);
          expect(viMessage.length).toBeGreaterThan(0);

          // Messages should be different (localized)
          expect(enMessage).not.toBe(viMessage);

          return true;
        }),
        fcOptions
      );
    });

    it('should return consistent messages for the same error code and language', async () => {
      await fc.assert(
        fc.asyncProperty(
          validErrorCode,
          supportedLanguage,
          async (errorCode, lang) => {
            const message1 = getErrorMessage(errorCode, lang);
            const message2 = getErrorMessage(errorCode, lang);

            // Same code and language should always return same message
            expect(message1).toBe(message2);

            return true;
          }
        ),
        fcOptions
      );
    });

    it('should return localized message in errorHandler response based on Accept-Language', async () => {
      await fc.assert(
        fc.asyncProperty(
          validErrorCode,
          validStatusCode,
          supportedLanguage,
          async (errorCode, statusCode, lang) => {
            const req = mockRequest({
              headers: { 'accept-language': lang }
            });
            const res = mockResponse();
            const next = jest.fn();
            const error = new AppError(errorCode, statusCode);

            errorHandler(error, req, res, next);

            const expectedMessage = getErrorMessage(errorCode, lang);
            
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: errorCode,
                message: expectedMessage
              })
            }));

            return true;
          }
        ),
        fcOptions
      );
    });

    it('should default to English when language is not supported', async () => {
      const unsupportedLanguage = fc.constantFrom('de', 'fr', 'es', 'zh', 'ja', 'ko');

      await fc.assert(
        fc.asyncProperty(
          validErrorCode,
          unsupportedLanguage,
          async (errorCode, lang) => {
            const enMessage = getErrorMessage(errorCode, 'en');
            const unsupportedMessage = getErrorMessage(errorCode, lang);

            // Should fall back to English for unsupported languages
            expect(unsupportedMessage).toBe(enMessage);

            return true;
          }
        ),
        fcOptions
      );
    });

    it('should use query param lang over Accept-Language header', async () => {
      await fc.assert(
        fc.asyncProperty(
          validErrorCode,
          validStatusCode,
          async (errorCode, statusCode) => {
            // Header says 'en', but query param says 'vi'
            const req = mockRequest({
              headers: { 'accept-language': 'en' },
              query: { lang: 'vi' }
            });
            const res = mockResponse();
            const next = jest.fn();
            const error = new AppError(errorCode, statusCode);

            errorHandler(error, req, res, next);

            const viMessage = getErrorMessage(errorCode, 'vi');
            
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                message: viMessage
              })
            }));

            return true;
          }
        ),
        fcOptions
      );
    });

    it('should return fallback message for unknown error codes', async () => {
      const unknownErrorCode = fc.string({ minLength: 4, maxLength: 4 })
        .filter(s => !Object.values(ErrorCodes).includes(s));

      await fc.assert(
        fc.asyncProperty(
          unknownErrorCode,
          supportedLanguage,
          async (errorCode, lang) => {
            const message = getErrorMessage(errorCode, lang);
            const fallbackMessage = getErrorMessage(ErrorCodes.INTERNAL_ERROR, lang);

            // Unknown codes should return the internal error message
            expect(message).toBe(fallbackMessage);

            return true;
          }
        ),
        fcOptions
      );
    });
  });
});
