/**
 * Logger Module Tests
 * Feature: utils-testing
 * 
 * Unit tests and property-based tests for the logger utility module.
 * Validates: Requirements 2.1-2.4
 */
const fc = require('fast-check');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

describe('Logger Module Tests', () => {
  let logger;
  let consoleSpy;
  
  beforeEach(() => {
    // Clear module cache to get fresh logger instance
    jest.resetModules();
    logger = require('../../../utils/logger');
    
    // Reset logger state
    logger.setEnabled(true);
    logger.setConsoleEnabled(true);
    logger.logLevel = 'info';
    
    // Spy on console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
    };
  });
  
  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
  });

  describe('setEnabled/setConsoleEnabled', () => {
    it('should disable all logging when setEnabled(false)', () => {
      logger.setEnabled(false);
      
      logger.info('test info');
      logger.error('test error');
      logger.warn('test warn');
      logger.debug('test debug');
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('should enable logging when setEnabled(true)', () => {
      logger.setEnabled(false);
      logger.setEnabled(true);
      
      logger.info('test info');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should disable console output when setConsoleEnabled(false)', () => {
      logger.setConsoleEnabled(false);
      
      logger.info('test info');
      logger.warn('test warn');
      logger.debug('test debug');
      
      // info, warn, debug check consoleEnabled
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('should still log errors when consoleEnabled is false', () => {
      logger.setConsoleEnabled(false);
      
      logger.error('test error');
      
      // error does not check consoleEnabled
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should enable console output when setConsoleEnabled(true)', () => {
      logger.setConsoleEnabled(false);
      logger.setConsoleEnabled(true);
      
      logger.info('test info');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return current logging status', () => {
      logger.setEnabled(true);
      logger.setConsoleEnabled(false);
      logger.logLevel = 'debug';
      
      const status = logger.getStatus();
      
      expect(status.enabled).toBe(true);
      expect(status.consoleEnabled).toBe(false);
      expect(status.logLevel).toBe('debug');
    });
  });

  describe('Log Level Filtering', () => {
    it('should only log error when level is error', () => {
      logger.logLevel = 'error';
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log error and warn when level is warn', () => {
      logger.logLevel = 'warn';
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log error, warn, and info when level is info', () => {
      logger.logLevel = 'info';
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1); // only info, not debug
    });

    it('should log all messages when level is debug', () => {
      logger.logLevel = 'debug';
      
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // info and debug
    });
  });

  describe('shouldLog', () => {
    it('should return true for error at all levels', () => {
      const levels = ['error', 'warn', 'info', 'debug'];
      
      levels.forEach(level => {
        logger.logLevel = level;
        expect(logger.shouldLog('error')).toBe(true);
      });
    });

    it('should return false for debug when level is error', () => {
      logger.logLevel = 'error';
      expect(logger.shouldLog('debug')).toBe(false);
    });

    it('should return true for debug when level is debug', () => {
      logger.logLevel = 'debug';
      expect(logger.shouldLog('debug')).toBe(true);
    });
  });

  describe('formatMessage', () => {
    it('should return valid JSON string', () => {
      const result = logger.formatMessage('info', 'test message');
      
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should include timestamp, level, and message', () => {
      const result = logger.formatMessage('info', 'test message');
      const parsed = JSON.parse(result);
      
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('test message');
    });

    it('should include meta properties', () => {
      const meta = { userId: '123', action: 'login' };
      const result = logger.formatMessage('info', 'test message', meta);
      const parsed = JSON.parse(result);
      
      expect(parsed.userId).toBe('123');
      expect(parsed.action).toBe('login');
    });

    it('should uppercase the level', () => {
      const result = logger.formatMessage('debug', 'test');
      const parsed = JSON.parse(result);
      
      expect(parsed.level).toBe('DEBUG');
    });

    it('should return ISO timestamp format', () => {
      const result = logger.formatMessage('info', 'test');
      const parsed = JSON.parse(result);
      
      // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('getTimestamp', () => {
    it('should return ISO format timestamp', () => {
      const timestamp = logger.getTimestamp();
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Logging Methods', () => {
    it('should call console.log for info', () => {
      logger.info('info message');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      const loggedMessage = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('info message');
    });

    it('should call console.error for error', () => {
      logger.error('error message');
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const loggedMessage = consoleSpy.error.mock.calls[0][0];
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.level).toBe('ERROR');
      expect(parsed.message).toBe('error message');
    });

    it('should call console.warn for warn', () => {
      logger.warn('warn message');
      
      expect(consoleSpy.warn).toHaveBeenCalled();
      const loggedMessage = consoleSpy.warn.mock.calls[0][0];
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.level).toBe('WARN');
      expect(parsed.message).toBe('warn message');
    });

    it('should call console.log for debug', () => {
      logger.logLevel = 'debug';
      logger.debug('debug message');
      
      expect(consoleSpy.log).toHaveBeenCalled();
      const loggedMessage = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.level).toBe('DEBUG');
      expect(parsed.message).toBe('debug message');
    });

    it('should include meta in log output', () => {
      const meta = { requestId: 'abc123' };
      logger.info('test', meta);
      
      const loggedMessage = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.requestId).toBe('abc123');
    });
  });


  /**
   * Feature: utils-testing, Property 3: Logger Level Filtering
   * Validates: Requirements 2.2, 2.3
   * 
   * For any log level setting, only messages at or above that level should be output.
   * Level hierarchy: error (0) < warn (1) < info (2) < debug (3)
   */
  describe('Property 3: Logger Level Filtering', () => {
    it('should filter messages based on log level hierarchy', () => {
      const levels = ['error', 'warn', 'info', 'debug'];
      const levelArb = fc.constantFrom(...levels);
      const messageLevelArb = fc.constantFrom(...levels);
      const messageArb = fc.string({ minLength: 1, maxLength: 50 });
      
      fc.assert(
        fc.property(levelArb, messageLevelArb, messageArb, (configLevel, msgLevel, message) => {
          // Reset spies
          consoleSpy.log.mockClear();
          consoleSpy.error.mockClear();
          consoleSpy.warn.mockClear();
          
          // Reset logger state
          logger.setEnabled(true);
          logger.setConsoleEnabled(true);
          logger.logLevel = configLevel;
          
          // Get level indices (lower index = higher priority)
          const configLevelIndex = levels.indexOf(configLevel);
          const msgLevelIndex = levels.indexOf(msgLevel);
          
          // Log the message at the specified level
          switch (msgLevel) {
            case 'error':
              logger.error(message);
              break;
            case 'warn':
              logger.warn(message);
              break;
            case 'info':
              logger.info(message);
              break;
            case 'debug':
              logger.debug(message);
              break;
          }
          
          // Determine if message should have been logged
          // Message should be logged if configLevelIndex >= msgLevelIndex
          const shouldBeLogged = configLevelIndex >= msgLevelIndex;
          
          // Check the appropriate console method was called (or not)
          let wasLogged = false;
          switch (msgLevel) {
            case 'error':
              wasLogged = consoleSpy.error.mock.calls.length > 0;
              break;
            case 'warn':
              wasLogged = consoleSpy.warn.mock.calls.length > 0;
              break;
            case 'info':
            case 'debug':
              wasLogged = consoleSpy.log.mock.calls.length > 0;
              break;
          }
          
          expect(wasLogged).toBe(shouldBeLogged);
          
          return true;
        }),
        fcOptions
      );
    });

    it('should log all message types when level is debug', () => {
      const messageLevelArb = fc.constantFrom('error', 'warn', 'info', 'debug');
      const messageArb = fc.string({ minLength: 1, maxLength: 50 });
      
      fc.assert(
        fc.property(messageLevelArb, messageArb, (msgLevel, message) => {
          // Reset spies
          consoleSpy.log.mockClear();
          consoleSpy.error.mockClear();
          consoleSpy.warn.mockClear();
          
          // Set to debug level (logs everything)
          logger.setEnabled(true);
          logger.setConsoleEnabled(true);
          logger.logLevel = 'debug';
          
          // Log the message
          switch (msgLevel) {
            case 'error':
              logger.error(message);
              break;
            case 'warn':
              logger.warn(message);
              break;
            case 'info':
              logger.info(message);
              break;
            case 'debug':
              logger.debug(message);
              break;
          }
          
          // All messages should be logged at debug level
          let wasLogged = false;
          switch (msgLevel) {
            case 'error':
              wasLogged = consoleSpy.error.mock.calls.length > 0;
              break;
            case 'warn':
              wasLogged = consoleSpy.warn.mock.calls.length > 0;
              break;
            case 'info':
            case 'debug':
              wasLogged = consoleSpy.log.mock.calls.length > 0;
              break;
          }
          
          expect(wasLogged).toBe(true);
          
          return true;
        }),
        fcOptions
      );
    });

    it('should only log error when level is error', () => {
      const messageLevelArb = fc.constantFrom('error', 'warn', 'info', 'debug');
      const messageArb = fc.string({ minLength: 1, maxLength: 50 });
      
      fc.assert(
        fc.property(messageLevelArb, messageArb, (msgLevel, message) => {
          // Reset spies
          consoleSpy.log.mockClear();
          consoleSpy.error.mockClear();
          consoleSpy.warn.mockClear();
          
          // Set to error level (only logs errors)
          logger.setEnabled(true);
          logger.setConsoleEnabled(true);
          logger.logLevel = 'error';
          
          // Log the message
          switch (msgLevel) {
            case 'error':
              logger.error(message);
              break;
            case 'warn':
              logger.warn(message);
              break;
            case 'info':
              logger.info(message);
              break;
            case 'debug':
              logger.debug(message);
              break;
          }
          
          // Only error should be logged
          const shouldBeLogged = msgLevel === 'error';
          
          let wasLogged = false;
          switch (msgLevel) {
            case 'error':
              wasLogged = consoleSpy.error.mock.calls.length > 0;
              break;
            case 'warn':
              wasLogged = consoleSpy.warn.mock.calls.length > 0;
              break;
            case 'info':
            case 'debug':
              wasLogged = consoleSpy.log.mock.calls.length > 0;
              break;
          }
          
          expect(wasLogged).toBe(shouldBeLogged);
          
          return true;
        }),
        fcOptions
      );
    });
  });
});
