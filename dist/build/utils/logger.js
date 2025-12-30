/**
 * Simple logger utility with remote toggle support
 */
class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.enabled = true; // Can be toggled from admin
        this.consoleEnabled = true; // Console output toggle
    }

    /**
     * Enable/disable logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Enable/disable console output
     */
    setConsoleEnabled(enabled) {
        this.consoleEnabled = enabled;
    }

    /**
     * Get current logging status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            consoleEnabled: this.consoleEnabled,
            logLevel: this.logLevel
        };
    }

    /**
     * Get timestamp string
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format log message
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = this.getTimestamp();
        const logObj = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta
        };
        
        return JSON.stringify(logObj);
    }

    /**
     * Log info message
     */
    info(message, meta = {}) {
        if (this.enabled && this.consoleEnabled && this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, meta));
        }
    }

    /**
     * Log error message
     */
    error(message, meta = {}) {
        if (this.enabled && this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, meta));
        }
    }

    /**
     * Log warning message
     */
    warn(message, meta = {}) {
        if (this.enabled && this.consoleEnabled && this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }

    /**
     * Log debug message
     */
    debug(message, meta = {}) {
        if (this.enabled && this.consoleEnabled && this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message, meta));
        }
    }

    /**
     * Check if we should log at this level
     */
    shouldLog(level) {
        const levels = ['error', 'warn', 'info', 'debug'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        
        return currentLevelIndex >= messageLevelIndex;
    }
}

module.exports = new Logger();
