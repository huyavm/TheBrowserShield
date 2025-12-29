/**
 * Browser Detector Module Tests
 * Feature: utils-testing
 * 
 * Unit tests and property-based tests for the browser-detector utility module.
 * Validates: Requirements 3.1-3.5
 */
const fc = require('fast-check');
const path = require('path');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

// Mock fs module before requiring browser-detector
jest.mock('fs', () => ({
  statSync: jest.fn(),
  accessSync: jest.fn(),
  existsSync: jest.fn(),
  constants: { R_OK: 4 }
}));

const fs = require('fs');

describe('Browser Detector Module Tests', () => {
  let browserDetector;
  
  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    
    // Re-mock fs after resetModules
    jest.mock('fs', () => ({
      statSync: jest.fn(),
      accessSync: jest.fn(),
      existsSync: jest.fn(),
      constants: { R_OK: 4 }
    }));
    
    // Get fresh fs reference
    const freshFs = require('fs');
    
    // Reset all mocks
    freshFs.statSync.mockReset();
    freshFs.accessSync.mockReset();
    freshFs.existsSync.mockReset();
    
    // Require browser-detector after mocking
    browserDetector = require('../../../utils/browser-detector');
    
    // Clear cache before each test
    browserDetector.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePath', () => {
    it('should return false for null input', () => {
      expect(browserDetector.validatePath(null)).toBe(false);
    });

    it('should return false for undefined input', () => {
      expect(browserDetector.validatePath(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(browserDetector.validatePath('')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(browserDetector.validatePath(123)).toBe(false);
      expect(browserDetector.validatePath({})).toBe(false);
      expect(browserDetector.validatePath([])).toBe(false);
    });

    it('should return true for valid file path', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockReturnValue({ isFile: () => true });
      freshFs.accessSync.mockReturnValue(undefined);
      
      expect(browserDetector.validatePath('/valid/path/chrome.exe')).toBe(true);
    });

    it('should return false for directory path', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockReturnValue({ isFile: () => false });
      
      expect(browserDetector.validatePath('/some/directory')).toBe(false);
    });

    it('should return false when file does not exist', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      
      expect(browserDetector.validatePath('/nonexistent/path')).toBe(false);
    });

    it('should return false when file is not readable', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockReturnValue({ isFile: () => true });
      freshFs.accessSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      
      expect(browserDetector.validatePath('/unreadable/file')).toBe(false);
    });
  });

  describe('detectChrome', () => {
    it('should return null when Chrome is not found', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      expect(browserDetector.detectChrome()).toBeNull();
    });

    it('should return first valid Chrome path', () => {
      const freshFs = require('fs');
      const validPath = browserDetector.CHROME_PATHS_WINDOWS[0] || browserDetector.CHROME_PATHS_LINUX[0];
      
      freshFs.statSync.mockImplementation((p) => {
        if (p === validPath) {
          return { isFile: () => true };
        }
        throw new Error('ENOENT');
      });
      freshFs.accessSync.mockReturnValue(undefined);
      
      const result = browserDetector.detectChrome();
      expect(result).toBe(validPath);
    });
  });

  describe('detectFirefox', () => {
    it('should return null when Firefox is not found', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      expect(browserDetector.detectFirefox()).toBeNull();
    });

    it('should return first valid Firefox path', () => {
      const freshFs = require('fs');
      const validPath = browserDetector.FIREFOX_PATHS_WINDOWS[0] || browserDetector.FIREFOX_PATHS_LINUX[0];
      
      freshFs.statSync.mockImplementation((p) => {
        if (p === validPath) {
          return { isFile: () => true };
        }
        throw new Error('ENOENT');
      });
      freshFs.accessSync.mockReturnValue(undefined);
      
      const result = browserDetector.detectFirefox();
      expect(result).toBe(validPath);
    });
  });

  describe('detectEdge', () => {
    it('should return null when Edge is not found', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      expect(browserDetector.detectEdge()).toBeNull();
    });

    it('should return null on non-Windows platforms', () => {
      // Edge detection only works on Windows
      const originalPlatform = process.platform;
      
      // Skip this test on Windows since we can't easily mock process.platform
      if (originalPlatform === 'win32') {
        const freshFs = require('fs');
        freshFs.statSync.mockImplementation(() => {
          throw new Error('ENOENT');
        });
        expect(browserDetector.detectEdge()).toBeNull();
      } else {
        expect(browserDetector.detectEdge()).toBeNull();
      }
    });
  });

  describe('getCachedPaths', () => {
    it('should return object with browser paths', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      const result = browserDetector.getCachedPaths();
      
      expect(result).toHaveProperty('chrome');
      expect(result).toHaveProperty('firefox');
      expect(result).toHaveProperty('edge');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('detectedAt');
    });

    it('should return cached result on subsequent calls', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      const result1 = browserDetector.getCachedPaths();
      const result2 = browserDetector.getCachedPaths();
      
      // Should be the exact same object reference
      expect(result1).toBe(result2);
      expect(result1.detectedAt).toBe(result2.detectedAt);
    });

    it('should refresh cache when forceRefresh is true', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      const result1 = browserDetector.getCachedPaths();
      
      // Wait a tiny bit to ensure different timestamp
      const result2 = browserDetector.getCachedPaths(true);
      
      // Should be different objects (new cache)
      expect(result1).not.toBe(result2);
    });
  });

  describe('clearCache', () => {
    it('should invalidate cache', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      const result1 = browserDetector.getCachedPaths();
      browserDetector.clearCache();
      const result2 = browserDetector.getCachedPaths();
      
      // Should be different objects after cache clear
      expect(result1).not.toBe(result2);
    });
  });

  describe('getBestChromePath', () => {
    it('should return null when no browsers found', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      // Also mock puppeteer to not be available
      jest.mock('puppeteer', () => {
        throw new Error('Cannot find module puppeteer');
      });
      
      const result = browserDetector.getBestChromePath();
      expect(result).toBeNull();
    });
  });

  describe('getBrowserAvailability', () => {
    it('should return availability status for all browsers', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      const result = browserDetector.getBrowserAvailability();
      
      expect(result).toHaveProperty('chrome');
      expect(result).toHaveProperty('firefox');
      expect(result).toHaveProperty('edge');
      expect(result).toHaveProperty('puppeteerChrome');
      
      // Each browser should have available, path, and message properties
      expect(result.chrome).toHaveProperty('available');
      expect(result.chrome).toHaveProperty('path');
      expect(result.chrome).toHaveProperty('message');
    });

    it('should show available=true when browser is found', () => {
      const freshFs = require('fs');
      const chromePath = browserDetector.CHROME_PATHS_WINDOWS[0] || browserDetector.CHROME_PATHS_LINUX[0];
      
      freshFs.statSync.mockImplementation((p) => {
        if (p === chromePath) {
          return { isFile: () => true };
        }
        throw new Error('ENOENT');
      });
      freshFs.accessSync.mockReturnValue(undefined);
      
      browserDetector.clearCache();
      const result = browserDetector.getBrowserAvailability();
      
      expect(result.chrome.available).toBe(true);
      expect(result.chrome.path).toBe(chromePath);
    });
  });

  describe('getDetectionReport', () => {
    it('should return detailed detection report', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      const report = browserDetector.getDetectionReport();
      
      expect(report).toHaveProperty('platform');
      expect(report).toHaveProperty('arch');
      expect(report).toHaveProperty('detectedAt');
      expect(report).toHaveProperty('browsers');
      expect(report).toHaveProperty('searchedPaths');
      expect(report).toHaveProperty('recommendation');
    });

    it('should include searched paths in report', () => {
      const freshFs = require('fs');
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      const report = browserDetector.getDetectionReport();
      
      expect(report.searchedPaths).toHaveProperty('chrome');
      expect(report.searchedPaths).toHaveProperty('firefox');
      expect(report.searchedPaths).toHaveProperty('edge');
      expect(Array.isArray(report.searchedPaths.chrome)).toBe(true);
    });
  });

  describe('Path Constants', () => {
    it('should export Chrome paths for Windows', () => {
      expect(Array.isArray(browserDetector.CHROME_PATHS_WINDOWS)).toBe(true);
    });

    it('should export Firefox paths for Windows', () => {
      expect(Array.isArray(browserDetector.FIREFOX_PATHS_WINDOWS)).toBe(true);
    });

    it('should export Edge paths for Windows', () => {
      expect(Array.isArray(browserDetector.EDGE_PATHS_WINDOWS)).toBe(true);
    });

    it('should export Chrome paths for Linux', () => {
      expect(Array.isArray(browserDetector.CHROME_PATHS_LINUX)).toBe(true);
    });

    it('should export Firefox paths for Linux', () => {
      expect(Array.isArray(browserDetector.FIREFOX_PATHS_LINUX)).toBe(true);
    });
  });


  /**
   * Feature: utils-testing, Property 4: Browser Path Validation
   * Validates: Requirements 3.1, 3.2
   * 
   * For any string input to validatePath, result should be boolean 
   * (true only if path exists and is readable file).
   */
  describe('Property 4: Browser Path Validation', () => {
    it('should always return boolean for any string input', () => {
      const freshFs = require('fs');
      
      // Generate arbitrary strings including edge cases
      const pathArb = fc.oneof(
        fc.string(), // Random strings
        fc.constant(''), // Empty string
        fc.constant(null), // Null
        fc.constant(undefined), // Undefined
        fc.constant(123), // Number
        fc.constant({}), // Object
        fc.constant([]), // Array
        fc.constantFrom(
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          '/usr/bin/google-chrome',
          '/nonexistent/path',
          'relative/path',
          '..\\..\\path',
          'path with spaces/file.exe',
          'path/with/special!@#$%chars'
        )
      );
      
      fc.assert(
        fc.property(pathArb, (inputPath) => {
          // Mock fs to simulate various scenarios
          freshFs.statSync.mockImplementation(() => {
            throw new Error('ENOENT');
          });
          
          const result = browserDetector.validatePath(inputPath);
          
          // Result should always be a boolean
          expect(typeof result).toBe('boolean');
          
          return true;
        }),
        fcOptions
      );
    });

    it('should return true only for valid file paths', () => {
      const freshFs = require('fs');
      
      // Test with paths that should be valid (mocked as existing files)
      const validPathArb = fc.constantFrom(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/firefox',
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe'
      );
      
      fc.assert(
        fc.property(validPathArb, (validPath) => {
          // Mock as valid file
          freshFs.statSync.mockReturnValue({ isFile: () => true });
          freshFs.accessSync.mockReturnValue(undefined);
          
          const result = browserDetector.validatePath(validPath);
          
          expect(result).toBe(true);
          
          return true;
        }),
        fcOptions
      );
    });

    it('should return false for invalid/non-existent paths', () => {
      const freshFs = require('fs');
      
      // Test with paths that should be invalid
      const invalidPathArb = fc.oneof(
        fc.constant(''),
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(123),
        fc.string({ minLength: 1, maxLength: 100 }) // Random strings
      );
      
      fc.assert(
        fc.property(invalidPathArb, (invalidPath) => {
          // Mock as non-existent
          freshFs.statSync.mockImplementation(() => {
            throw new Error('ENOENT: no such file or directory');
          });
          
          const result = browserDetector.validatePath(invalidPath);
          
          // For non-string inputs, should return false
          if (typeof invalidPath !== 'string' || invalidPath === '') {
            expect(result).toBe(false);
          }
          // For string inputs with mocked ENOENT, should return false
          else {
            expect(result).toBe(false);
          }
          
          return true;
        }),
        fcOptions
      );
    });
  });

  /**
   * Feature: utils-testing, Property 5: Cache Consistency
   * Validates: Requirements 3.3
   * 
   * For any sequence of getCachedPaths calls within TTL, 
   * all calls should return identical objects.
   */
  describe('Property 5: Cache Consistency', () => {
    it('should return identical objects for multiple calls within TTL', () => {
      const freshFs = require('fs');
      
      // Mock all paths as non-existent for consistent behavior
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      // Number of calls to make
      const numCallsArb = fc.integer({ min: 2, max: 10 });
      
      fc.assert(
        fc.property(numCallsArb, (numCalls) => {
          // Clear cache to start fresh
          browserDetector.clearCache();
          
          // Get first result
          const firstResult = browserDetector.getCachedPaths();
          
          // Make multiple subsequent calls
          for (let i = 1; i < numCalls; i++) {
            const subsequentResult = browserDetector.getCachedPaths();
            
            // Should be the exact same object reference
            expect(subsequentResult).toBe(firstResult);
            
            // All properties should be identical
            expect(subsequentResult.chrome).toBe(firstResult.chrome);
            expect(subsequentResult.firefox).toBe(firstResult.firefox);
            expect(subsequentResult.edge).toBe(firstResult.edge);
            expect(subsequentResult.platform).toBe(firstResult.platform);
            expect(subsequentResult.detectedAt).toBe(firstResult.detectedAt);
          }
          
          return true;
        }),
        fcOptions
      );
    });

    it('should return different objects after clearCache', () => {
      const freshFs = require('fs');
      
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Clear cache and get first result
          browserDetector.clearCache();
          const firstResult = browserDetector.getCachedPaths();
          
          // Clear cache again
          browserDetector.clearCache();
          const secondResult = browserDetector.getCachedPaths();
          
          // Should be different object references
          expect(secondResult).not.toBe(firstResult);
          
          // But should have same structure
          expect(secondResult).toHaveProperty('chrome');
          expect(secondResult).toHaveProperty('firefox');
          expect(secondResult).toHaveProperty('edge');
          expect(secondResult).toHaveProperty('platform');
          expect(secondResult).toHaveProperty('detectedAt');
          
          return true;
        }),
        fcOptions
      );
    });

    it('should return different objects after forceRefresh', () => {
      const freshFs = require('fs');
      
      freshFs.statSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Clear cache and get first result
          browserDetector.clearCache();
          const firstResult = browserDetector.getCachedPaths();
          
          // Force refresh
          const secondResult = browserDetector.getCachedPaths(true);
          
          // Should be different object references
          expect(secondResult).not.toBe(firstResult);
          
          return true;
        }),
        fcOptions
      );
    });
  });
});
