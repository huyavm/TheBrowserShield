# Requirements Document

## Introduction

Tính năng cho phép người dùng chỉnh sửa cấu hình proxy trực tiếp trong giao diện chi tiết profile. Hiện tại, profile có thể lưu trữ thông tin proxy nhưng chưa có UI để chỉnh sửa proxy trong màn hình edit profile. Tính năng này sẽ bổ sung khả năng:
- Chọn proxy từ proxy pool có sẵn
- Nhập proxy thủ công (host, port, type, username, password)
- Xóa proxy khỏi profile
- Hiển thị thông tin proxy hiện tại trong chi tiết profile

## Glossary

- **Profile**: Cấu hình trình duyệt ảo bao gồm user agent, timezone, viewport, proxy
- **Proxy**: Máy chủ trung gian để định tuyến traffic, bao gồm host, port, type (http/https/socks4/socks5), và thông tin xác thực
- **Proxy_Pool**: Danh sách các proxy đã được thêm vào hệ thống, lưu trong database
- **Profile_Editor**: Giao diện chỉnh sửa thông tin profile trong admin.html
- **Edit_Profile_Modal**: Modal popup hiển thị khi người dùng click nút Edit trên profile

## Requirements

### Requirement 1: Hiển thị thông tin proxy trong chi tiết profile

**User Story:** As a user, I want to see the current proxy configuration in profile details, so that I can verify which proxy is assigned to a profile.

#### Acceptance Criteria

1. WHEN a user views profile details, THE Profile_Editor SHALL display proxy information including host, port, type, and authentication status
2. WHEN a profile has no proxy configured, THE Profile_Editor SHALL display "No proxy configured" message
3. WHEN a profile has proxy with authentication, THE Profile_Editor SHALL mask the password field with asterisks

### Requirement 2: Chọn proxy từ Proxy Pool

**User Story:** As a user, I want to select a proxy from the existing proxy pool, so that I can quickly assign a pre-configured proxy to my profile.

#### Acceptance Criteria

1. WHEN a user opens the Edit_Profile_Modal, THE Profile_Editor SHALL display a dropdown list of available proxies from Proxy_Pool
2. WHEN a user selects a proxy from the dropdown, THE Profile_Editor SHALL populate the proxy fields with the selected proxy's configuration
3. WHEN the Proxy_Pool is empty, THE Profile_Editor SHALL display "No proxies available" in the dropdown
4. THE Profile_Editor SHALL only show active proxies in the dropdown list

### Requirement 3: Nhập proxy thủ công

**User Story:** As a user, I want to manually enter proxy configuration, so that I can use a proxy that is not in the pool.

#### Acceptance Criteria

1. THE Profile_Editor SHALL provide input fields for proxy host, port, type, username, and password
2. WHEN a user enters proxy host, THE Profile_Editor SHALL validate that it is a non-empty string
3. WHEN a user enters proxy port, THE Profile_Editor SHALL validate that it is a number between 1 and 65535
4. THE Profile_Editor SHALL provide a dropdown to select proxy type with options: http, https, socks4, socks5
5. WHEN username is provided, THE Profile_Editor SHALL require password field to be filled
6. WHEN password is provided without username, THE Profile_Editor SHALL show validation error

### Requirement 4: Xóa proxy khỏi profile

**User Story:** As a user, I want to remove proxy from a profile, so that the profile can connect directly without proxy.

#### Acceptance Criteria

1. THE Profile_Editor SHALL provide a "Clear Proxy" button to remove proxy configuration
2. WHEN a user clicks "Clear Proxy", THE Profile_Editor SHALL clear all proxy fields and set profile proxy to null
3. WHEN proxy is cleared, THE Profile_Editor SHALL show confirmation message

### Requirement 5: Lưu cấu hình proxy

**User Story:** As a user, I want to save proxy configuration changes, so that the profile uses the new proxy settings.

#### Acceptance Criteria

1. WHEN a user saves profile with valid proxy configuration, THE Profile_Editor SHALL update the profile with new proxy settings
2. WHEN a user saves profile with invalid proxy configuration, THE Profile_Editor SHALL display validation errors and prevent saving
3. WHEN proxy configuration is saved successfully, THE Profile_Editor SHALL display success message
4. IF saving proxy configuration fails, THEN THE Profile_Editor SHALL display error message with details

### Requirement 6: API hỗ trợ cập nhật proxy

**User Story:** As a developer, I want the API to support proxy updates, so that the frontend can save proxy changes.

#### Acceptance Criteria

1. WHEN a PUT request is sent to /api/profiles/:id with proxy data, THE API SHALL update the profile's proxy configuration
2. WHEN proxy data is invalid, THE API SHALL return 400 status with validation errors
3. THE API SHALL accept proxy object with fields: host, port, type, username, password
4. THE API SHALL accept null value for proxy to remove proxy from profile
