const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const LOGS_DIR = path.join(__dirname, '../data/logs');
const MAX_LOG_FILES = 10;
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_LOG_ENTRIES = 10000; // Maximum entries per file

class ProfileLogService {
    constructor() {
        this.ensureLogDir();
    }

    async ensureLogDir() {
        try {
            await fs.mkdir(LOGS_DIR, { recursive: true });
        } catch (error) {
            logger.error('Failed to create logs directory:', error);
        }
    }

    /**
     * Log profile activity
     * @param {string} profileId - Profile ID
     * @param {string} action - Action performed
     * @param {Object} details - Additional details
     */
    async logActivity(profileId, action, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            profileId,
            action,
            details,
            ip: details.ip || 'unknown',
            userAgent: details.userAgent || 'unknown'
        };

        try {
            // Log to general activity log
            await this.writeToLogFile('activity.log', logEntry);
            
            // Log to profile-specific log
            await this.writeToLogFile(`profile-${profileId}.log`, logEntry);
            
            logger.info(`Profile activity logged: ${action}`, { profileId, action });
        } catch (error) {
            logger.error('Failed to log profile activity:', error);
        }
    }

    /**
     * Write log entry to file
     * @param {string} filename - Log file name
     * @param {Object} logEntry - Log entry object
     */
    async writeToLogFile(filename, logEntry) {
        const logFile = path.join(LOGS_DIR, filename);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        try {
            await fs.appendFile(logFile, logLine, 'utf8');
            
            // Rotate log file if it gets too large
            await this.rotateLogIfNeeded(logFile);
        } catch (error) {
            logger.error(`Failed to write to log file ${filename}:`, error);
        }
    }

    /**
     * Rotate log file if it exceeds size limit
     * @param {string} logFile - Path to log file
     */
    async rotateLogIfNeeded(logFile) {
        try {
            const stats = await fs.stat(logFile);
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            if (stats.size > maxSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedFile = `${logFile}.${timestamp}`;
                
                await fs.rename(logFile, rotatedFile);
                logger.info(`Log file rotated: ${path.basename(logFile)}`);
                
                // Clean up old rotated files
                await this.cleanupOldLogs(path.dirname(logFile), path.basename(logFile));
            }
        } catch (error) {
            // Ignore rotation errors
        }
    }

    /**
     * Clean up old rotated log files
     * @param {string} logDir - Log directory
     * @param {string} baseFilename - Base log filename
     */
    async cleanupOldLogs(logDir, baseFilename) {
        try {
            const files = await fs.readdir(logDir);
            const rotatedFiles = files
                .filter(file => file.startsWith(baseFilename + '.'))
                .sort()
                .reverse();
            
            if (rotatedFiles.length > MAX_LOG_FILES) {
                const filesToDelete = rotatedFiles.slice(MAX_LOG_FILES);
                for (const file of filesToDelete) {
                    await fs.unlink(path.join(logDir, file));
                }
                logger.info(`Cleaned up ${filesToDelete.length} old log files`);
            }
        } catch (error) {
            logger.error('Failed to cleanup old logs:', error);
        }
    }

    /**
     * Get activity logs for a profile
     * @param {string} profileId - Profile ID
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Array of log entries
     */
    async getProfileLogs(profileId, limit = 100) {
        const logFile = path.join(LOGS_DIR, `profile-${profileId}.log`);
        
        try {
            const data = await fs.readFile(logFile, 'utf8');
            const lines = data.trim().split('\n').filter(line => line);
            
            const logs = lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(log => log !== null)
                .reverse() // Most recent first
                .slice(0, limit);
            
            return logs;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // No logs yet
            }
            throw error;
        }
    }

    /**
     * Get general activity logs
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Array of log entries
     */
    async getActivityLogs(limit = 100) {
        const logFile = path.join(LOGS_DIR, 'activity.log');
        
        try {
            const data = await fs.readFile(logFile, 'utf8');
            const lines = data.trim().split('\n').filter(line => line);
            
            const logs = lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(log => log !== null)
                .reverse() // Most recent first
                .slice(0, limit);
            
            return logs;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // No logs yet
            }
            throw error;
        }
    }

    /**
     * Get log statistics
     * @returns {Object} Log statistics
     */
    async getLogStats() {
        try {
            const files = await fs.readdir(LOGS_DIR);
            const stats = {
                totalLogFiles: files.length,
                profileLogFiles: files.filter(f => f.startsWith('profile-')).length,
                activityLogFiles: files.filter(f => f.startsWith('activity.')).length,
                totalSize: 0
            };

            // Calculate total size
            for (const file of files) {
                try {
                    const filePath = path.join(LOGS_DIR, file);
                    const fileStat = await fs.stat(filePath);
                    stats.totalSize += fileStat.size;
                } catch (error) {
                    // Ignore individual file errors
                }
            }

            return stats;
        } catch (error) {
            return {
                totalLogFiles: 0,
                profileLogFiles: 0,
                activityLogFiles: 0,
                totalSize: 0,
                error: error.message
            };
        }
    }
}

module.exports = new ProfileLogService();