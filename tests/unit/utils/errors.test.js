/**
 * Errors Module Tests
 * Feature: utils-testing
 * 
 * Unit tests and property-based tests for the errors utility module.
 * Validates: Requirements 1.1-1.4
 */
const fc = require('fast-check');
const {
  ErrorCodes,
  ErrorMessages,
  AppError,
  getErrorMessage,
  createErrorResponse
} = require('../../../utils/errors');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

describe('Errors Module Tests', () => {
  
  describe('ErrorCodes and ErrorMessages Mapping', () => {
    it('should have all ErrorCodes defined', () => {
      expect(ErrorCodes).toBeDefined();
      expect(Object.keys(ErrorCodes).length).toBeGreaterThan(0);
    });

    it('should have ErrorMessages for all ErrorCodes', () => {
      const errorCodeValues = Object.values(ErrorCodes);
      
      errorCodeValues.forEach(code => {
        expect(ErrorMessages[code]).toBeDefined();
        expect(ErrorMessages[code].en).toBeDefined();
        expect(ErrorMessages[code].vi).toBeDefined();
      });
    });

    it('should have non-empty messages for all codes', () => {
      const errorCodeValues = Object.values(ErrorCodes);
      
      errorCodeValues.forEach(code => {
        expect(ErrorMessages[code].en.length).toBeGreaterThan(0);
        expect(ErrorMessages[code].vi.length).toBeGreaterThan(0);
      });
    });
  });

  describe('AppError Constructor', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 404);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCodes.PROFILE_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.messages).toEqual(ErrorMessages[ErrorCodes.PROFILE_NOT_FOUND]);
      expect(error.message).toBe(ErrorMessages[ErrorCodes.PROFILE_NOT_FOUND].en);
      expect(error.timestamp).toBeDefined();
    });

    it('should use default statusCode of 400', () => {
      const error = new AppError(ErrorCodes.VALIDATION_FAILED);
      expect(error.statusCode).toBe(400);
    });

    it('should store details when provided', () => {
      const details = { field: 'name', reason: 'too short' };
      const error = new AppError(ErrorCodes.VALIDATION_FAILED, 400, details);
      
      expect(error.details).toEqual(details);
    });

    it('should fallback to INTERNAL_ERROR for unknown codes', () => {
      const error = new AppError('UNKNOWN_CODE', 500);
      
      expect(error.messages).toEqual(ErrorMessages[ErrorCodes.INTERNAL_ERROR]);
    });
  });

  describe('AppError.toJSON', () => {
    it('should return correct JSON structure for English', () => {
      const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 404);
      const json = error.toJSON('en');
      
      expect(json.success).toBe(false);
      expect(json.error.code).toBe(ErrorCodes.PROFILE_NOT_FOUND);
      expect(json.error.message).toBe(ErrorMessages[ErrorCodes.PROFILE_NOT_FOUND].en);
      expect(json.timestamp).toBeDefined();
    });

    it('should return correct JSON structure for Vietnamese', () => {
      const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 404);
      const json = error.toJSON('vi');
      
      expect(json.success).toBe(false);
      expect(json.error.code).toBe(ErrorCodes.PROFILE_NOT_FOUND);
      expect(json.error.message).toBe(ErrorMessages[ErrorCodes.PROFILE_NOT_FOUND].vi);
    });

    it('should include details in JSON output', () => {
      const details = { field: 'email' };
      const error = new AppError(ErrorCodes.INVALID_FORMAT, 400, details);
      const json = error.toJSON('en');
      
      expect(json.error.details).toEqual(details);
    });

    it('should fallback to English for unknown language', () => {
      const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 404);
      const json = error.toJSON('fr');
      
      expect(json.error.message).toBe(ErrorMessages[ErrorCodes.PROFILE_NOT_FOUND].en);
    });
  });

  describe('getErrorMessage', () => {
    it('should return English message by default', () => {
      const message = getErrorMessage(ErrorCodes.BROWSER_ALREADY_RUNNING);
      expect(message).toBe(ErrorMessages[ErrorCodes.BROWSER_ALREADY_RUNNING].en);
    });

    it('should return Vietnamese message when specified', () => {
      const message = getErrorMessage(ErrorCodes.BROWSER_ALREADY_RUNNING, 'vi');
      expect(message).toBe(ErrorMessages[ErrorCodes.BROWSER_ALREADY_RUNNING].vi);
    });

    it('should return INTERNAL_ERROR message for invalid code', () => {
      const message = getErrorMessage('INVALID_CODE', 'en');
      expect(message).toBe(ErrorMessages[ErrorCodes.INTERNAL_ERROR].en);
    });

    it('should return INTERNAL_ERROR message in Vietnamese for invalid code', () => {
      const message = getErrorMessage('INVALID_CODE', 'vi');
      expect(message).toBe(ErrorMessages[ErrorCodes.INTERNAL_ERROR].vi);
    });

    it('should fallback to English for unknown language', () => {
      const message = getErrorMessage(ErrorCodes.PROFILE_NOT_FOUND, 'de');
      expect(message).toBe(ErrorMessages[ErrorCodes.PROFILE_NOT_FOUND].en);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with correct structure', () => {
      const response = createErrorResponse(ErrorCodes.PROXY_NOT_FOUND, 'en');
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ErrorCodes.PROXY_NOT_FOUND);
      expect(response.error.message).toBe(ErrorMessages[ErrorCodes.PROXY_NOT_FOUND].en);
      expect(response.error.details).toBeNull();
    });

    it('should include details when provided', () => {
      const details = { proxyId: '123' };
      const response = createErrorResponse(ErrorCodes.PROXY_NOT_FOUND, 'en', details);
      
      expect(response.error.details).toEqual(details);
    });

    it('should return Vietnamese message when specified', () => {
      const response = createErrorResponse(ErrorCodes.MODE_SWITCH_FAILED, 'vi');
      expect(response.error.message).toBe(ErrorMessages[ErrorCodes.MODE_SWITCH_FAILED].vi);
    });

    it('should fallback to INTERNAL_ERROR for invalid code', () => {
      const response = createErrorResponse('UNKNOWN', 'en');
      expect(response.error.message).toBe(ErrorMessages[ErrorCodes.INTERNAL_ERROR].en);
    });
  });

  /**
   * Feature: utils-testing, Property 1: Error Messages Bilingual Coverage
   * Validates: Requirements 1.1
   * 
   * For any ErrorCode in ErrorCodes, ErrorMessages[code] should have both 'en' and 'vi' 
   * keys with non-empty strings.
   */
  describe('Property 1: Error Messages Bilingual Coverage', () => {
    it('should have bilingual messages for all error codes', () => {
      // Get all error code values
      const errorCodeValues = Object.values(ErrorCodes);
      
      // Create an arbitrary that picks from actual error codes
      const errorCodeArb = fc.constantFrom(...errorCodeValues);
      
      fc.assert(
        fc.property(errorCodeArb, (code) => {
          // Check that ErrorMessages has this code
          expect(ErrorMessages[code]).toBeDefined();
          
          // Check 'en' key exists and is non-empty string
          expect(typeof ErrorMessages[code].en).toBe('string');
          expect(ErrorMessages[code].en.length).toBeGreaterThan(0);
          
          // Check 'vi' key exists and is non-empty string
          expect(typeof ErrorMessages[code].vi).toBe('string');
          expect(ErrorMessages[code].vi.length).toBeGreaterThan(0);
          
          return true;
        }),
        fcOptions
      );
    });
  });

  /**
   * Feature: utils-testing, Property 2: AppError JSON Serialization
   * Validates: Requirements 1.3
   * 
   * For any AppError instance, toJSON('en') and toJSON('vi') should return valid 
   * error objects with correct language messages.
   */
  describe('Property 2: AppError JSON Serialization', () => {
    it('should serialize AppError correctly for both languages', () => {
      const errorCodeValues = Object.values(ErrorCodes);
      const errorCodeArb = fc.constantFrom(...errorCodeValues);
      const statusCodeArb = fc.constantFrom(400, 401, 403, 404, 500, 502, 503);
      const detailsArb = fc.option(
        fc.record({
          field: fc.string({ minLength: 1, maxLength: 20 }),
          reason: fc.string({ minLength: 1, maxLength: 50 })
        }),
        { nil: null }
      );
      
      fc.assert(
        fc.property(errorCodeArb, statusCodeArb, detailsArb, (code, statusCode, details) => {
          const error = new AppError(code, statusCode, details);
          
          // Test English serialization
          const jsonEn = error.toJSON('en');
          expect(jsonEn.success).toBe(false);
          expect(jsonEn.error.code).toBe(code);
          expect(jsonEn.error.message).toBe(ErrorMessages[code].en);
          expect(jsonEn.error.details).toEqual(details);
          expect(typeof jsonEn.timestamp).toBe('string');
          
          // Test Vietnamese serialization
          const jsonVi = error.toJSON('vi');
          expect(jsonVi.success).toBe(false);
          expect(jsonVi.error.code).toBe(code);
          expect(jsonVi.error.message).toBe(ErrorMessages[code].vi);
          expect(jsonVi.error.details).toEqual(details);
          expect(typeof jsonVi.timestamp).toBe('string');
          
          // Timestamps should be the same
          expect(jsonEn.timestamp).toBe(jsonVi.timestamp);
          
          return true;
        }),
        fcOptions
      );
    });
  });
});
