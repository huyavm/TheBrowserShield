# Implementation Plan: Profile Proxy Editor

## Overview

Triển khai tính năng chỉnh sửa proxy trong Edit Profile Modal. Sử dụng JavaScript thuần (vanilla JS) cho frontend và Express.js cho backend. Tận dụng validation schema và API endpoints đã có sẵn.

## Tasks

- [x] 1. Thêm Proxy Configuration Section vào Edit Profile Modal
  - Thêm HTML cho proxy source dropdown (none/pool/manual)
  - Thêm dropdown để chọn proxy từ pool
  - Thêm form fields cho manual proxy input (host, port, type, username, password)
  - Thêm hiển thị current proxy info
  - _Requirements: 2.1, 3.1, 3.4, 4.1_

- [x] 2. Implement proxy loading và display logic
  - [x] 2.1 Implement loadProxyPool() function để fetch danh sách proxy từ API
    - Gọi GET /api/proxy
    - Filter chỉ lấy active proxies
    - Populate dropdown với proxy list
    - _Requirements: 2.1, 2.4_
  - [x] 2.2 Write property test cho Active Proxy Filtering
    - **Property 2: Active Proxy Filtering**
    - **Validates: Requirements 2.4**
  - [x] 2.3 Implement displayCurrentProxy() để hiển thị proxy hiện tại của profile
    - Hiển thị host:port và type
    - Mask password với asterisks
    - Hiển thị "No proxy configured" nếu không có proxy
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Implement proxy source switching logic
  - [x] 3.1 Implement handleProxySourceChange() function
    - Toggle visibility của proxyPoolSection và manualProxySection
    - Clear fields khi switch source
    - _Requirements: 2.1, 3.1_
  - [x] 3.2 Implement populateProxyFromPool() khi user chọn proxy từ dropdown
    - Fill tất cả form fields với data từ selected proxy
    - _Requirements: 2.2_
  - [x] 3.3 Write property test cho Proxy Selection Population
    - **Property 3: Proxy Selection Population**
    - **Validates: Requirements 2.2**

- [x] 4. Implement proxy validation
  - [x] 4.1 Implement validateProxyConfig() function
    - Validate host không empty
    - Validate port trong range 1-65535
    - Validate type là một trong http/https/socks4/socks5
    - Validate username/password consistency
    - _Requirements: 3.2, 3.3, 3.5, 3.6_
  - [x] 4.2 Write property test cho Proxy Input Validation
    - **Property 4: Proxy Input Validation**
    - **Validates: Requirements 3.2, 3.3**
  - [x] 4.3 Write property test cho Authentication Consistency
    - **Property 5: Authentication Consistency**
    - **Validates: Requirements 3.5, 3.6**

- [x] 5. Implement clear proxy functionality
  - [x] 5.1 Implement clearProxy() function
    - Clear tất cả proxy form fields
    - Set proxy source về "none"
    - Show confirmation message
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 5.2 Write property test cho Clear Proxy State Reset
    - **Property 6: Clear Proxy State Reset**
    - **Validates: Requirements 4.2**

- [x] 6. Integrate proxy vào updateProfile flow
  - [x] 6.1 Modify updateProfile() để include proxy data
    - Build proxy object từ form fields
    - Validate trước khi gửi
    - Send proxy: null nếu source là "none"
    - _Requirements: 5.1, 6.1, 6.4_
  - [x] 6.2 Write property test cho Valid Proxy Save Round-Trip
    - **Property 7: Valid Proxy Save Round-Trip**
    - **Validates: Requirements 5.1, 6.1**
  - [x] 6.3 Write property test cho Invalid Proxy Rejection
    - **Property 8: Invalid Proxy Rejection**
    - **Validates: Requirements 5.2, 6.2**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update showProfileDetails để hiển thị proxy info
  - Thêm proxy section vào profile details modal
  - Hiển thị đầy đủ thông tin proxy (host, port, type, auth status)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 9. Final testing và polish
  - [x] 9.1 Test end-to-end flow: create profile → edit → add proxy → save → verify
  - [x] 9.2 Test edge cases: empty pool, invalid inputs, clear proxy
  - [x] 9.3 Verify UI responsiveness và error messages
  - _Requirements: All_

## Notes

- All tasks including property-based tests are required
- Sử dụng fast-check library đã có trong devDependencies
- API validation đã có sẵn trong middleware/validation.js với proxyConfigSchema
- Không cần modify backend API vì PUT /api/profiles/:id đã hỗ trợ proxy update
