# Requirements Document - Phase 3: Utils Testing

## Introduction

Kế hoạch test cho utils modules: errors, logger, browser-detector.

## Glossary

- **Errors_Module**: Module định nghĩa error codes và messages đa ngôn ngữ
- **Logger_Module**: Module logging với toggle support
- **BrowserDetector_Module**: Module phát hiện browser executables trên Windows/Linux

## Requirements

### Requirement 1: Errors Module

**User Story:** As a developer, I want to test error utilities, so that error handling is consistent.

#### Acceptance Criteria

1. FOR ALL ErrorCodes, THE Errors_Module SHALL have corresponding messages in both 'en' and 'vi'
2. WHEN AppError is created, THE Errors_Module SHALL set correct code, statusCode, and messages
3. WHEN AppError.toJSON is called, THE Errors_Module SHALL return formatted error object with correct language
4. WHEN getErrorMessage is called with invalid code, THE Errors_Module SHALL return INTERNAL_ERROR message

### Requirement 2: Logger Module

**User Story:** As a developer, I want to test logger functionality, so that logging works correctly.

#### Acceptance Criteria

1. WHEN logger.setEnabled(false), THE Logger_Module SHALL not output any logs
2. WHEN log level is 'error', THE Logger_Module SHALL only log error messages
3. WHEN log level is 'debug', THE Logger_Module SHALL log all message types
4. WHEN formatMessage is called, THE Logger_Module SHALL return valid JSON string

### Requirement 3: Browser Detector Module

**User Story:** As a developer, I want to test browser detection, so that correct browser paths are found.

#### Acceptance Criteria

1. WHEN validatePath is called with valid file, THE BrowserDetector_Module SHALL return true
2. WHEN validatePath is called with invalid/non-existent path, THE BrowserDetector_Module SHALL return false
3. WHEN getCachedPaths is called twice within TTL, THE BrowserDetector_Module SHALL return cached result
4. WHEN clearCache is called, THE BrowserDetector_Module SHALL invalidate cache
5. FOR ALL browser detection functions, THE BrowserDetector_Module SHALL return null if browser not found
