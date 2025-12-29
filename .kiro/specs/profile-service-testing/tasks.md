# Implementation Plan: Profile Service Testing

## Overview

Triển khai test suite cho ProfileService và ProfileRepository theo từng bước nhỏ, bắt đầu từ test utilities, sau đó unit tests, và cuối cùng là property-based tests.

## Tasks

- [x] 1. Setup test utilities và generators
  - [x] 1.1 Tạo file tests/helpers/profileGenerator.js với các fast-check arbitraries
    - Tạo validProfileName, validViewport, invalidViewport, validProxy, validProfileData arbitraries
    - _Requirements: 6.1, 6.2_
  - [x] 1.2 Tạo file tests/helpers/testSetup.js với mock utilities
    - Mock fs module cho ProfileService
    - Helper functions để reset state giữa các tests
    - _Requirements: 1.1, 3.1_

- [x] 2. ProfileService Unit Tests
  - [x] 2.1 Tạo tests/unit/ProfileService.unit.test.js - CRUD basic tests
    - Test createProfile với valid data
    - Test getProfile với valid/invalid ID
    - Test getAllProfiles
    - Test updateProfile
    - Test deleteProfile
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  - [x] 2.2 Tạo tests cho validation logic
    - Test invalid name rejection
    - Test invalid viewport rejection
    - Test invalid proxy rejection
    - Test invalid defaultHeadless rejection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Checkpoint - ProfileService Unit Tests
  - Chạy tests, đảm bảo pass. Hỏi user nếu có vấn đề.

- [x] 4. ProfileService Property Tests
  - [x] 4.1 Property test: Round-Trip Consistency
    - **Property 1: ProfileService Round-Trip Consistency**
    - **Validates: Requirements 1.1, 1.4, 6.1**
  - [x] 4.2 Property test: Default Values
    - **Property 2: ProfileService Default Values**
    - **Validates: Requirements 1.2**
  - [x] 4.3 Property test: Update Preserves Immutable Fields
    - **Property 3: ProfileService Update Preserves Immutable Fields**
    - **Validates: Requirements 1.6**
  - [x] 4.4 Property test: Delete Then Get Returns Null
    - **Property 4: ProfileService Delete Then Get Returns Null**
    - **Validates: Requirements 1.7**
  - [x] 4.5 Property test: Invalid Name Rejection
    - **Property 5: ProfileService Invalid Name Rejection**
    - **Validates: Requirements 2.1**
  - [x] 4.6 Property test: Invalid Viewport Rejection
    - **Property 6: ProfileService Invalid Viewport Rejection**
    - **Validates: Requirements 2.2**
  - [x] 4.7 Property test: Invalid Proxy Rejection
    - **Property 7: ProfileService Invalid Proxy Rejection**
    - **Validates: Requirements 2.3**

- [x] 5. Checkpoint - ProfileService Property Tests
  - Chạy tất cả ProfileService tests, đảm bảo pass.

- [x] 6. ProfileRepository Unit Tests
  - [x] 6.1 Tạo tests/unit/ProfileRepository.unit.test.js - CRUD tests
    - Test createProfile với valid data
    - Test createProfile với duplicate name (expect error)
    - Test getProfile với valid/invalid ID
    - Test getAllProfiles ordering
    - Test updateProfile với valid/invalid ID
    - Test deleteProfile với valid/invalid ID
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [x] 6.2 Tạo tests cho Session Management
    - Test createSession
    - Test updateSession
    - _Requirements: 4.1, 4.2_
  - [x] 6.3 Tạo tests cho Activity Logging
    - Test logActivity
    - Test getActivityLogs với/không profileId
    - Test pagination
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Checkpoint - ProfileRepository Unit Tests
  - Chạy tests, đảm bảo pass. Hỏi user nếu có vấn đề.

- [x] 8. ProfileRepository Property Tests
  - [x] 8.1 Property test: Round-Trip Consistency
    - **Property 8: ProfileRepository Round-Trip Consistency**
    - **Validates: Requirements 3.1, 3.3, 6.2**
  - [x] 8.2 Property test: Ordering
    - **Property 9: ProfileRepository Ordering**
    - **Validates: Requirements 3.4**
  - [x] 8.3 Property test: Update Consistency
    - **Property 10: ProfileRepository Update Consistency**
    - **Validates: Requirements 3.5**
  - [x] 8.4 Property test: Activity Log Filtering
    - **Property 11: ProfileRepository Activity Log Filtering**
    - **Validates: Requirements 5.2, 5.3**
  - [x] 8.5 Property test: JSON Special Characters Round-Trip
    - **Property 12: JSON Special Characters Round-Trip**
    - **Validates: Requirements 6.3**

- [x] 9. Final Checkpoint
  - Chạy toàn bộ test suite
  - Kiểm tra coverage report
  - Đảm bảo tất cả tests pass

## Notes

- Tất cả tasks đều required (comprehensive testing)
- Mỗi task reference requirements cụ thể để traceability
- Checkpoints đảm bảo validate từng phần trước khi tiếp tục
- Property tests validate correctness properties từ design document
- Unit tests validate specific examples và edge cases
