# Implementation Plan - Phase 4: Integration/API Testing

## Overview

Test API routes và integration flows.

## Tasks

- [x] 1. Setup Integration Test Infrastructure
  - [x] 1.1 Tạo tests/helpers/apiTestSetup.js
    - Setup supertest với app
    - Test database configuration
    - Cleanup utilities
    - _Requirements: 4.1-4.3_

- [x] 2. Profiles API Tests
  - [x] 2.1 Tạo tests/integration/profiles.integration.test.js
    - Test GET /api/profiles
    - Test POST /api/profiles (valid/invalid)
    - Test GET /api/profiles/:id
    - Test PUT /api/profiles/:id
    - Test DELETE /api/profiles/:id
    - _Requirements: 1.1-1.7_
  - [x] 2.2 Property test: CRUD Round-Trip
    - **Property 1: API CRUD Round-Trip**
    - **Validates: Requirements 1.2, 1.4, 4.1**
  - [x] 2.3 Property test: Validation Consistency
    - **Property 2: API Validation Consistency**
    - **Validates: Requirements 1.3**

- [x] 3. Proxy API Tests
  - [x] 3.1 Tạo tests/integration/proxy.integration.test.js
    - Test GET /api/proxy/pool
    - Test POST /api/proxy/pool
    - Test DELETE /api/proxy/pool/:id
    - _Requirements: 2.1-2.3_

- [x] 4. Mode API Tests
  - [x] 4.1 Tạo tests/integration/mode.integration.test.js
    - Test GET /api/mode
    - Test POST /api/mode/switch
    - _Requirements: 3.1-3.2_

- [x] 5. Integration Flow Tests
  - [x] 5.1 Tạo tests/integration/flows.integration.test.js
    - Test create-retrieve flow
    - Test update-retrieve flow
    - Test delete-retrieve flow
    - _Requirements: 4.1-4.3_
  - [x] 5.2 Property test: Delete Idempotence
    - **Property 3: API Delete Idempotence**
    - **Validates: Requirements 1.7, 4.3**

- [x] 6. Final Checkpoint - All Tests
  - Chạy: `npm test --silent 2>&1 | Select-String -Pattern "(PASS|FAIL|Tests:)"`
  - Kiểm tra coverage: `npm test -- --coverage --silent 2>&1 | Select-String -Pattern "(Statements|Branches|Functions|Lines)"`

## Notes

- Sử dụng supertest cho HTTP testing
- Chạy với `--silent` để giảm output
- Pipe qua Select-String để lọc kết quả quan trọng
- Clean up test data sau mỗi test
