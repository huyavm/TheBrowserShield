/**
 * Error Constants and User-Friendly Error Messages
 * Provides localized error messages (EN/VI) and standardized error codes
 */

// Error codes by category
const ErrorCodes = {
    // Profile errors (P001-P099)
    PROFILE_NOT_FOUND: 'P001',
    PROFILE_NAME_EXISTS: 'P002',
    PROFILE_INVALID_DATA: 'P003',
    PROFILE_CREATION_FAILED: 'P004',

    // Browser errors (B001-B099)
    BROWSER_ALREADY_RUNNING: 'B001',
    BROWSER_NOT_RUNNING: 'B002',
    BROWSER_START_FAILED: 'B003',
    BROWSER_STOP_FAILED: 'B004',
    BROWSER_NAVIGATION_FAILED: 'B005',
    BROWSER_SCRIPT_FAILED: 'B006',

    // Proxy errors (X001-X099)
    PROXY_NOT_FOUND: 'X001',
    PROXY_INVALID_CONFIG: 'X002',
    PROXY_CONNECTION_FAILED: 'X003',
    PROXY_EXISTS: 'X004',

    // Mode errors (M001-M099)
    MODE_SWITCH_FAILED: 'M001',
    MODE_NOT_AVAILABLE: 'M002',
    MODE_INVALID: 'M003',

    // Validation errors (V001-V099)
    VALIDATION_FAILED: 'V001',
    REQUIRED_FIELD_MISSING: 'V002',
    INVALID_FORMAT: 'V003',

    // System errors (S001-S099)
    INTERNAL_ERROR: 'S001',
    DATABASE_ERROR: 'S002',
    RATE_LIMIT_EXCEEDED: 'S003',
    UNAUTHORIZED: 'S004',
    FORBIDDEN: 'S005'
};

// Bilingual error messages
const ErrorMessages = {
    [ErrorCodes.PROFILE_NOT_FOUND]: {
        en: 'Profile not found',
        vi: 'Không tìm thấy profile'
    },
    [ErrorCodes.PROFILE_NAME_EXISTS]: {
        en: 'A profile with this name already exists',
        vi: 'Đã tồn tại profile với tên này'
    },
    [ErrorCodes.PROFILE_INVALID_DATA]: {
        en: 'Invalid profile data provided',
        vi: 'Dữ liệu profile không hợp lệ'
    },
    [ErrorCodes.PROFILE_CREATION_FAILED]: {
        en: 'Failed to create profile',
        vi: 'Không thể tạo profile'
    },

    [ErrorCodes.BROWSER_ALREADY_RUNNING]: {
        en: 'Browser is already running for this profile',
        vi: 'Browser đang chạy cho profile này'
    },
    [ErrorCodes.BROWSER_NOT_RUNNING]: {
        en: 'No active browser session found for this profile',
        vi: 'Không có phiên browser nào đang chạy cho profile này'
    },
    [ErrorCodes.BROWSER_START_FAILED]: {
        en: 'Failed to start browser',
        vi: 'Không thể khởi động browser'
    },
    [ErrorCodes.BROWSER_STOP_FAILED]: {
        en: 'Failed to stop browser',
        vi: 'Không thể dừng browser'
    },
    [ErrorCodes.BROWSER_NAVIGATION_FAILED]: {
        en: 'Navigation failed',
        vi: 'Điều hướng thất bại'
    },
    [ErrorCodes.BROWSER_SCRIPT_FAILED]: {
        en: 'Script execution failed',
        vi: 'Thực thi script thất bại'
    },

    [ErrorCodes.PROXY_NOT_FOUND]: {
        en: 'Proxy not found',
        vi: 'Không tìm thấy proxy'
    },
    [ErrorCodes.PROXY_INVALID_CONFIG]: {
        en: 'Invalid proxy configuration',
        vi: 'Cấu hình proxy không hợp lệ'
    },
    [ErrorCodes.PROXY_CONNECTION_FAILED]: {
        en: 'Proxy connection test failed',
        vi: 'Kiểm tra kết nối proxy thất bại'
    },
    [ErrorCodes.PROXY_EXISTS]: {
        en: 'Proxy already exists in pool',
        vi: 'Proxy đã tồn tại trong pool'
    },

    [ErrorCodes.MODE_SWITCH_FAILED]: {
        en: 'Failed to switch mode',
        vi: 'Không thể chuyển chế độ'
    },
    [ErrorCodes.MODE_NOT_AVAILABLE]: {
        en: 'This mode is not available on this system',
        vi: 'Chế độ này không khả dụng trên hệ thống'
    },
    [ErrorCodes.MODE_INVALID]: {
        en: 'Invalid mode specified',
        vi: 'Chế độ được chỉ định không hợp lệ'
    },

    [ErrorCodes.VALIDATION_FAILED]: {
        en: 'Validation failed',
        vi: 'Xác thực thất bại'
    },
    [ErrorCodes.REQUIRED_FIELD_MISSING]: {
        en: 'Required field is missing',
        vi: 'Thiếu trường bắt buộc'
    },
    [ErrorCodes.INVALID_FORMAT]: {
        en: 'Invalid format',
        vi: 'Định dạng không hợp lệ'
    },

    [ErrorCodes.INTERNAL_ERROR]: {
        en: 'An internal error occurred',
        vi: 'Đã xảy ra lỗi nội bộ'
    },
    [ErrorCodes.DATABASE_ERROR]: {
        en: 'Database operation failed',
        vi: 'Thao tác cơ sở dữ liệu thất bại'
    },
    [ErrorCodes.RATE_LIMIT_EXCEEDED]: {
        en: 'Rate limit exceeded. Please try again later.',
        vi: 'Vượt quá giới hạn yêu cầu. Vui lòng thử lại sau.'
    },
    [ErrorCodes.UNAUTHORIZED]: {
        en: 'Authentication required',
        vi: 'Yêu cầu xác thực'
    },
    [ErrorCodes.FORBIDDEN]: {
        en: 'Access denied',
        vi: 'Truy cập bị từ chối'
    }
};

/**
 * Custom Application Error
 */
class AppError extends Error {
    constructor(code, statusCode = 400, details = null) {
        const messages = ErrorMessages[code] || ErrorMessages[ErrorCodes.INTERNAL_ERROR];
        super(messages.en);

        this.code = code;
        this.statusCode = statusCode;
        this.messages = messages;
        this.details = details;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }

    toJSON(lang = 'en') {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.messages[lang] || this.messages.en,
                details: this.details
            },
            timestamp: this.timestamp
        };
    }
}

/**
 * Get error message by code and language
 */
function getErrorMessage(code, lang = 'en') {
    const messages = ErrorMessages[code];
    if (!messages) return ErrorMessages[ErrorCodes.INTERNAL_ERROR][lang];
    return messages[lang] || messages.en;
}

/**
 * Create an error response object
 */
function createErrorResponse(code, lang = 'en', details = null) {
    const messages = ErrorMessages[code] || ErrorMessages[ErrorCodes.INTERNAL_ERROR];
    return {
        success: false,
        error: {
            code,
            message: messages[lang] || messages.en,
            details
        }
    };
}

module.exports = {
    ErrorCodes,
    ErrorMessages,
    AppError,
    getErrorMessage,
    createErrorResponse
};
