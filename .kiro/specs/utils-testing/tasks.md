# Implementation Plan - Phase 3: Utils Testing

## Overview

Test utils layer theo từng module riêng biệt.

## Tasks

- [x] 1. Errors Module Tests
  - [x] 1.1 Tạo tests/unit/utils/errors.test.js
    - Test ErrorCodes và ErrorMessages mapping
    - Test AppError constructor và toJSON
    - Test getErrorMessage và createErrorResponse
    - _Requirements: 1.1-1.4_
  - [x] 1.2 Property test: Bilingual Coverage
    - **Property 1: Error Messages Bilingual Coverage**
    - **Validates: Requirements 1.1**
  - [x] 1.3 Property test: AppError Serialization
    - **Property 2: AppError JSON Serialization**
    - **Validates: Requirements 1.3**

- [x] 2. Logger Module Tests
  - [x] 2.1 Tạo tests/unit/utils/logger.test.js
    - Test setEnabled/setConsoleEnabled
    - Test log level filtering
    - Test formatMessage output
    - _Requirements: 2.1-2.4_
  - [x] 2.2 Property test: Level Filtering
    - **Property 3: Logger Level Filtering**
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Browser Detector Tests
  - [x] 3.1 Tạo tests/unit/utils/browser-detector.test.js
    - Test validatePath với mock fs
    - Test detectChrome, detectFirefox, detectEdge
    - Test caching behavior
    - _Requirements: 3.1-3.5_
  - [x] 3.2 Property test: Path Validation
    - **Property 4: Browser Path Validation**
    - **Validates: Requirements 3.1, 3.2**
  - [x] 3.3 Property test: Cache Consistency
    - **Property 5: Cache Consistency**
    - **Validates: Requirements 3.3**

- [x] 4. Checkpoint - Utils Tests
  - Chạy: `npm test -- tests/unit/utils --silent`
  - Đảm bảo tất cả tests pass

## Notes

- Mock fs module cho browser-detector tests
- Spy console methods cho logger tests
- Chạy với `--silent` để giảm output
