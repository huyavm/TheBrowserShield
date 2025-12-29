# Requirements Document - Phase 2: Middleware Testing

## Introduction

Kế hoạch test cho các middleware modules: auth, validation, errorHandler, performance.

## Glossary

- **Auth_Middleware**: Middleware xác thực API token và rate limiting
- **Validation_Middleware**: Middleware validate input sử dụng Zod schemas
- **ErrorHandler_Middleware**: Middleware xử lý lỗi với hỗ trợ đa ngôn ngữ
- **Performance_Middleware**: Middleware theo dõi performance và rate limiting

## Requirements

### Requirement 1: Auth Middleware - Token Authentication

**User Story:** As a developer, I want to test token authentication, so that API security works correctly.

#### Acceptance Criteria

1. WHEN request path does not start with /api, THE Auth_Middleware SHALL skip authentication
2. WHEN API_TOKEN env is not set, THE Auth_Middleware SHALL skip authentication with warning
3. WHEN no token provided, THE Auth_Middleware SHALL return 401 with "Access token required"
4. WHEN invalid token provided, THE Auth_Middleware SHALL return 403 with "Invalid access token"
5. WHEN valid token provided, THE Auth_Middleware SHALL call next() and log request

### Requirement 2: Auth Middleware - Rate Limiting

**User Story:** As a developer, I want to test rate limiting, so that API abuse is prevented.

#### Acceptance Criteria

1. WHEN requests within limit, THE Auth_Middleware SHALL set rate limit headers and allow request
2. WHEN requests exceed limit, THE Auth_Middleware SHALL return 429 with retryAfter
3. WHEN window expires, THE Auth_Middleware SHALL reset request count

### Requirement 3: Validation Middleware - Schema Validation

**User Story:** As a developer, I want to test input validation, so that invalid data is rejected.

#### Acceptance Criteria

1. WHEN valid data provided, THE Validation_Middleware SHALL parse data and call next()
2. WHEN invalid data provided, THE Validation_Middleware SHALL return 400 with field errors
3. FOR ALL Zod schemas, THE Validation_Middleware SHALL correctly validate and transform data

### Requirement 4: ErrorHandler Middleware

**User Story:** As a developer, I want to test error handling, so that errors are properly formatted.

#### Acceptance Criteria

1. WHEN AppError thrown, THE ErrorHandler_Middleware SHALL return error with correct status and message
2. WHEN generic Error thrown, THE ErrorHandler_Middleware SHALL map to appropriate error code
3. WHEN Accept-Language is 'vi', THE ErrorHandler_Middleware SHALL return Vietnamese message
4. WHEN ZodError thrown, THE ErrorHandler_Middleware SHALL return 400 with validation details

### Requirement 5: Performance Middleware

**User Story:** As a developer, I want to test performance monitoring, so that slow requests are tracked.

#### Acceptance Criteria

1. WHEN request completes, THE Performance_Middleware SHALL log duration and memory usage
2. WHEN request takes > 5000ms, THE Performance_Middleware SHALL log warning
3. WHEN response status >= 500, THE Performance_Middleware SHALL log error with CRITICAL severity
