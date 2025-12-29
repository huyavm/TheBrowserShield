# Implementation Plan - Phase 2: Middleware Testing

## Overview

Test middleware layer theo từng file riêng biệt.

## Tasks

- [x] 1. Auth Middleware Tests
  - [x] 1.1 Tạo tests/unit/middleware/auth.test.js
    - Test authenticateToken với các scenarios
    - Test rateLimiter với window và limit
    - _Requirements: 1.1-1.5, 2.1-2.3_
  - [x] 1.2 Property test: Auth Skip Non-API Routes
    - **Property 1: Auth Skip Non-API Routes**
    - **Validates: Requirements 1.1**
  - [x] 1.3 Property test: Rate Limit Headers
    - **Property 2: Rate Limit Headers Consistency**
    - **Validates: Requirements 2.1**

- [x] 2. Validation Middleware Tests
  - [x] 2.1 Tạo tests/unit/middleware/validation.test.js
    - Test validate() với valid/invalid data
    - Test validateQuery()
    - Test các schemas: createProfileSchema, updateProfileSchema, etc.
    - _Requirements: 3.1-3.3_
  - [x] 2.2 Property test: Schema Round-Trip
    - **Property 3: Validation Schema Round-Trip**
    - **Validates: Requirements 3.3**

- [x] 3. ErrorHandler Middleware Tests
  - [x] 3.1 Tạo tests/unit/middleware/errorHandler.test.js
    - Test với AppError
    - Test với generic Error
    - Test localization (en/vi)
    - Test ZodError handling
    - _Requirements: 4.1-4.4_
  - [x] 3.2 Property test: Error Localization
    - **Property 4: Error Message Localization**
    - **Validates: Requirements 4.3**

- [x] 4. Performance Middleware Tests
  - [x] 4.1 Tạo tests/unit/middleware/performance.test.js
    - Test performanceMonitor logging
    - Test slow request warning
    - Test error response logging
    - _Requirements: 5.1-5.3_

- [x] 5. Checkpoint - Middleware Tests
  - Chạy: `npm test -- tests/unit/middleware --silent`
  - Đảm bảo tất cả tests pass

## Notes

- Sử dụng mock request/response objects
- Chạy tests với `--silent` để giảm output
- Mỗi middleware test trong file riêng
