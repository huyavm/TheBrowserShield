/**
 * Startup Logger
 * Handles startup log file creation, diagnostic information collection,
 * and user-friendly error message formatting
 * 
 * Requirements: 7.1, 7.2, 7.5
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Default log directory
const DEFAULT_LOG_DIR = path.join(__dirname, '..', 'data', 'logs');
const STARTUP_LOG_FILE = 'startup.log';

/**
 * Error categories for browser launch failures
 * Requirements: 7.4
 */
const ErrorCategory = {
    BROWSER_NOT_FOUND: 'BROWSER_NOT_FOUND',
    BROWSER_PERMISSION: 'BROWSER_PERMISSION',
    BROWSER_CRASH: 'BROWSER_CRASH',
    CONFIG_INVALID: 'CONFIG_INVALID',
    CONFIG_MISSING: 'CONFIG_MISSING',
    DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PORT_IN_USE: 'PORT_IN_USE',
    UNKNOWN: 'UNKNOWN'
};

/**
 * User-friendly error messages in Vietnamese and English
 */
const UserFriendlyMessages = {
    [ErrorCategory.BROWSER_NOT_FOUND]: {
        vi: 'Không tìm thấy trình duyệt. Vui lòng cài đặt Chrome hoặc Firefox.',
        en: 'Browser not found. Please install Chrome or Firefox.'
    },
    [ErrorCategory.BROWSER_PERMISSION]: {
        vi: 'Không có quyền truy cập trình duyệt. Kiểm tra quyền file.',
        en: 'No permission to access browser. Check file permissions.'
    },
    [ErrorCategory.BROWSER_CRASH]: {
        vi: 'Trình duyệt bị crash. Thử khởi động lại hoặc dùng Mock mode.',
        en: 'Browser crashed. Try restarting or use Mock mode.'
    },
    [ErrorCategory.CONFIG_INVALID]: {
        vi: 'Cấu hình không hợp lệ. Kiểm tra file cấu hình.',
        en: 'Invalid configuration. Check configuration files.'
    },
    [ErrorCategory.CONFIG_MISSING]: {
        vi: 'Thiếu file cấu hình. Chạy lại cài đặt.',
        en: 'Missing configuration file. Run setup again.'
    },
    [ErrorCategory.DEPENDENCY_ERROR]: {
        vi: 'Lỗi dependencies. Chạy Fix-Dependencies.bat để sửa.',
        en: 'Dependency error. Run Fix-Dependencies.bat to fix.'
    },
    [ErrorCategory.DATABASE_ERROR]: {
        vi: 'Lỗi database. Kiểm tra quyền ghi thư mục data.',
        en: 'Database error. Check write permissions for data folder.'
    },
    [ErrorCategory.NETWORK_ERROR]: {
        vi: 'Lỗi mạng. Kiểm tra kết nối internet.',
        en: 'Network error. Check internet connection.'
    },
    [ErrorCategory.PORT_IN_USE]: {
        vi: 'Port đang được sử dụng. Đóng ứng dụng khác hoặc đổi port.',
        en: 'Port is in use. Close other applications or change port.'
    },
    [ErrorCategory.UNKNOWN]: {
        vi: 'Lỗi không xác định. Xem file startup.log để biết chi tiết.',
        en: 'Unknown error. Check startup.log for details.'
    }
};

/**
 * Suggestions for each error category
 */
const ErrorSuggestions = {
    [ErrorCategory.BROWSER_NOT_FOUND]: [
        'Cài đặt Google Chrome từ https://www.google.com/chrome/',
        'Hoặc cài đặt Firefox từ https://www.mozilla.org/firefox/',
        'Hoặc sử dụng Mock mode để test không cần browser thật'
    ],
    [ErrorCategory.BROWSER_PERMISSION]: [
        'Chạy ứng dụng với quyền Administrator',
        'Kiểm tra quyền truy cập file browser executable'
    ],
    [ErrorCategory.BROWSER_CRASH]: [
        'Khởi động lại máy tính',
        'Cập nhật browser lên phiên bản mới nhất',
        'Thử sử dụng Mock mode'
    ],
    [ErrorCategory.CONFIG_INVALID]: [
        'Kiểm tra file data/mode-config.json',
        'Xóa file cấu hình và khởi động lại để tạo mới'
    ],
    [ErrorCategory.CONFIG_MISSING]: [
        'Chạy npm install để cài đặt lại',
        'Kiểm tra thư mục data có tồn tại'
    ],
    [ErrorCategory.DEPENDENCY_ERROR]: [
        'Chạy Fix-Dependencies.bat',
        'Hoặc chạy: npm rebuild',
        'Hoặc xóa node_modules và chạy npm install'
    ],
    [ErrorCategory.DATABASE_ERROR]: [
        'Kiểm tra quyền ghi thư mục data/',
        'Xóa file data/browsershield.db và khởi động lại',
        'Chạy với quyền Administrator'
    ],
    [ErrorCategory.NETWORK_ERROR]: [
        'Kiểm tra kết nối internet',
        'Kiểm tra firewall không chặn ứng dụng'
    ],
    [ErrorCategory.PORT_IN_USE]: [
        'Đóng ứng dụng khác đang dùng port 5000',
        'Hoặc đặt biến môi trường PORT=5001 để dùng port khác',
        'Chạy: netstat -ano | findstr :5000 để tìm process'
    ],
    [ErrorCategory.UNKNOWN]: [
        'Xem chi tiết trong file data/logs/startup.log',
        'Liên hệ hỗ trợ với nội dung file log'
    ]
};


/**
 * Collect diagnostic information about the system
 * Requirements: 7.5
 * 
 * @returns {Object} Diagnostic information object
 */
function collectDiagnostics() {
    const diagnostics = {
        timestamp: new Date().toISOString(),
        system: {
            platform: process.platform,
            arch: process.arch,
            release: os.release(),
            type: os.type(),
            hostname: os.hostname(),
            cpus: os.cpus().length,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
            freeMemory: Math.round(os.freemem() / 1024 / 1024) + ' MB'
        },
        node: {
            version: process.version,
            execPath: process.execPath,
            pid: process.pid,
            cwd: process.cwd()
        },
        environment: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            PORT: process.env.PORT || '5000',
            LOG_LEVEL: process.env.LOG_LEVEL || 'info'
        },
        paths: {
            appRoot: path.resolve(__dirname, '..'),
            dataDir: path.resolve(__dirname, '..', 'data'),
            logsDir: DEFAULT_LOG_DIR
        }
    };

    // Add Windows-specific info
    if (process.platform === 'win32') {
        diagnostics.windows = {
            LOCALAPPDATA: process.env.LOCALAPPDATA || 'not set',
            APPDATA: process.env.APPDATA || 'not set',
            PROGRAMFILES: process.env.PROGRAMFILES || 'not set',
            'PROGRAMFILES(X86)': process.env['PROGRAMFILES(X86)'] || 'not set'
        };
    }

    return diagnostics;
}

/**
 * Categorize an error based on its message and type
 * Requirements: 7.4
 * 
 * @param {Error} error - The error to categorize
 * @returns {string} Error category from ErrorCategory enum
 */
function categorizeError(error) {
    if (!error) {
        return ErrorCategory.UNKNOWN;
    }

    const message = (error.message || '').toLowerCase();
    const code = error.code || '';

    // Browser not found errors
    if (message.includes('browser') && (message.includes('not found') || message.includes('không tìm thấy'))) {
        return ErrorCategory.BROWSER_NOT_FOUND;
    }
    if (message.includes('executable') && message.includes('not found')) {
        return ErrorCategory.BROWSER_NOT_FOUND;
    }
    if (message.includes('chrome') && message.includes('not') && message.includes('found')) {
        return ErrorCategory.BROWSER_NOT_FOUND;
    }
    if (message.includes('firefox') && message.includes('not') && message.includes('found')) {
        return ErrorCategory.BROWSER_NOT_FOUND;
    }

    // Permission errors
    if (code === 'EACCES' || code === 'EPERM' || message.includes('permission denied')) {
        return ErrorCategory.BROWSER_PERMISSION;
    }

    // Browser crash errors
    if (message.includes('crash') || message.includes('terminated unexpectedly')) {
        return ErrorCategory.BROWSER_CRASH;
    }
    if (message.includes('target closed') || message.includes('session closed')) {
        return ErrorCategory.BROWSER_CRASH;
    }

    // Configuration errors
    if (message.includes('invalid') && (message.includes('config') || message.includes('option'))) {
        return ErrorCategory.CONFIG_INVALID;
    }
    if (message.includes('missing') && message.includes('config')) {
        return ErrorCategory.CONFIG_MISSING;
    }

    // Dependency errors
    if (message.includes('cannot find module') || message.includes('module not found')) {
        return ErrorCategory.DEPENDENCY_ERROR;
    }
    if (message.includes('was compiled against a different node.js version')) {
        return ErrorCategory.DEPENDENCY_ERROR;
    }
    if (message.includes('.node') && message.includes('error')) {
        return ErrorCategory.DEPENDENCY_ERROR;
    }

    // Database errors
    if (message.includes('sqlite') || message.includes('database')) {
        return ErrorCategory.DATABASE_ERROR;
    }
    if (code === 'SQLITE_CANTOPEN' || code === 'SQLITE_READONLY') {
        return ErrorCategory.DATABASE_ERROR;
    }

    // Network errors
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
        return ErrorCategory.NETWORK_ERROR;
    }

    // Port in use
    if (code === 'EADDRINUSE' || message.includes('address already in use')) {
        return ErrorCategory.PORT_IN_USE;
    }
    if (message.includes('port') && message.includes('in use')) {
        return ErrorCategory.PORT_IN_USE;
    }

    return ErrorCategory.UNKNOWN;
}

/**
 * Format an error for user display
 * Requirements: 7.2
 * 
 * @param {Error} error - The error to format
 * @param {string} [lang='vi'] - Language for messages ('vi' or 'en')
 * @returns {Object} Formatted error object with user-friendly message
 */
function formatUserError(error, lang = 'vi') {
    const category = categorizeError(error);
    const userMessage = UserFriendlyMessages[category] || UserFriendlyMessages[ErrorCategory.UNKNOWN];
    const suggestions = ErrorSuggestions[category] || ErrorSuggestions[ErrorCategory.UNKNOWN];

    return {
        success: false,
        error: {
            code: category,
            message: userMessage[lang] || userMessage.en,
            userMessage: userMessage[lang] || userMessage.en,
            technicalMessage: error.message,
            suggestion: suggestions[0],
            suggestions: suggestions
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Ensure log directory exists
 * 
 * @param {string} [logDir] - Log directory path
 * @returns {boolean} True if directory exists or was created
 */
function ensureLogDirectory(logDir = DEFAULT_LOG_DIR) {
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        return true;
    } catch (error) {
        console.error(`Failed to create log directory: ${error.message}`);
        return false;
    }
}

/**
 * Write startup log entry
 * Requirements: 7.1, 7.5
 * 
 * @param {Object} entry - Log entry to write
 * @param {string} [logDir] - Log directory path
 * @returns {boolean} True if write was successful
 */
function writeStartupLog(entry, logDir = DEFAULT_LOG_DIR) {
    if (!ensureLogDirectory(logDir)) {
        return false;
    }

    const logPath = path.join(logDir, STARTUP_LOG_FILE);
    const timestamp = new Date().toISOString();
    
    const logEntry = {
        timestamp,
        ...entry
    };

    try {
        // Append to log file with separator
        const logLine = '\n' + '='.repeat(80) + '\n' + 
                       JSON.stringify(logEntry, null, 2) + '\n';
        
        fs.appendFileSync(logPath, logLine, 'utf8');
        return true;
    } catch (error) {
        console.error(`Failed to write startup log: ${error.message}`);
        return false;
    }
}

/**
 * Log a startup error with full stack trace
 * Requirements: 7.1
 * 
 * @param {Error} error - The error to log
 * @param {Object} [context] - Additional context information
 * @returns {boolean} True if log was written successfully
 */
function logStartupError(error, context = {}) {
    const diagnostics = collectDiagnostics();
    const category = categorizeError(error);

    const entry = {
        type: 'ERROR',
        category,
        error: {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        },
        context,
        diagnostics,
        userMessage: UserFriendlyMessages[category]
    };

    return writeStartupLog(entry);
}

/**
 * Log successful startup
 * 
 * @param {Object} [info] - Additional startup information
 * @returns {boolean} True if log was written successfully
 */
function logStartupSuccess(info = {}) {
    const diagnostics = collectDiagnostics();

    const entry = {
        type: 'SUCCESS',
        message: 'BrowserShield started successfully',
        info,
        diagnostics
    };

    return writeStartupLog(entry);
}

/**
 * Log a warning during startup
 * 
 * @param {string} message - Warning message
 * @param {Object} [details] - Additional details
 * @returns {boolean} True if log was written successfully
 */
function logStartupWarning(message, details = {}) {
    const entry = {
        type: 'WARNING',
        message,
        details,
        timestamp: new Date().toISOString()
    };

    return writeStartupLog(entry);
}

/**
 * Display user-friendly error in console
 * Requirements: 7.2
 * 
 * @param {Error} error - The error to display
 * @param {string} [lang='vi'] - Language for messages
 */
function displayUserError(error, lang = 'vi') {
    const formatted = formatUserError(error, lang);
    
    console.error('\n' + '='.repeat(60));
    console.error('❌ LỖI KHỞI ĐỘNG / STARTUP ERROR');
    console.error('='.repeat(60));
    console.error(`\n${formatted.error.userMessage}\n`);
    
    if (formatted.error.suggestions && formatted.error.suggestions.length > 0) {
        console.error('💡 Gợi ý sửa lỗi / Suggestions:');
        formatted.error.suggestions.forEach((suggestion, index) => {
            console.error(`   ${index + 1}. ${suggestion}`);
        });
    }
    
    console.error('\n📋 Chi tiết kỹ thuật / Technical details:');
    console.error(`   ${formatted.error.technicalMessage}`);
    console.error('\n📁 Xem file log để biết thêm chi tiết:');
    console.error(`   ${path.join(DEFAULT_LOG_DIR, STARTUP_LOG_FILE)}`);
    console.error('='.repeat(60) + '\n');
}

/**
 * Get the startup log file path
 * 
 * @returns {string} Path to startup log file
 */
function getStartupLogPath() {
    return path.join(DEFAULT_LOG_DIR, STARTUP_LOG_FILE);
}

/**
 * Read recent startup log entries
 * 
 * @param {number} [maxEntries=10] - Maximum number of entries to return
 * @returns {Array} Array of recent log entries
 */
function readRecentStartupLogs(maxEntries = 10) {
    const logPath = getStartupLogPath();
    
    try {
        if (!fs.existsSync(logPath)) {
            return [];
        }
        
        const content = fs.readFileSync(logPath, 'utf8');
        const entries = content.split('='.repeat(80))
            .filter(entry => entry.trim())
            .map(entry => {
                try {
                    return JSON.parse(entry.trim());
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
        
        return entries.slice(-maxEntries);
    } catch (error) {
        return [];
    }
}

/**
 * Clear startup log file
 * 
 * @returns {boolean} True if cleared successfully
 */
function clearStartupLog() {
    const logPath = getStartupLogPath();
    
    try {
        if (fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, '', 'utf8');
        }
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    // Error categories
    ErrorCategory,
    
    // Core functions
    collectDiagnostics,
    categorizeError,
    formatUserError,
    
    // Logging functions
    logStartupError,
    logStartupSuccess,
    logStartupWarning,
    writeStartupLog,
    
    // Display functions
    displayUserError,
    
    // Utility functions
    ensureLogDirectory,
    getStartupLogPath,
    readRecentStartupLogs,
    clearStartupLog,
    
    // Export for testing
    UserFriendlyMessages,
    ErrorSuggestions,
    DEFAULT_LOG_DIR
};
