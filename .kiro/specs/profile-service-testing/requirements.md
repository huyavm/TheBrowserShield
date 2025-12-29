# Requirements Document

## Introduction

Kế hoạch test cho ProfileService và ProfileRepository - hai module quản lý profile trong hệ thống BrowserShield. ProfileService sử dụng JSON file storage, ProfileRepository sử dụng SQLite database.

## Glossary

- **ProfileService**: Service quản lý profile sử dụng JSON file storage
- **ProfileRepository**: Repository quản lý profile sử dụng SQLite database
- **Profile**: Đối tượng chứa thông tin cấu hình browser (name, userAgent, timezone, viewport, proxy...)
- **Session**: Phiên làm việc của browser với một profile
- **Activity_Log**: Bản ghi hoạt động của profile

## Requirements

### Requirement 1: ProfileService - CRUD Operations

**User Story:** As a developer, I want to test ProfileService CRUD operations, so that I can ensure profile management works correctly with JSON storage.

#### Acceptance Criteria

1. WHEN a valid profile data is provided, THE ProfileService SHALL create a new profile with unique ID and save to JSON file
2. WHEN a profile is created without optional fields, THE ProfileService SHALL use default values (random userAgent, default timezone, default viewport)
3. WHEN getAllProfiles is called, THE ProfileService SHALL return all profiles from storage
4. WHEN getProfile is called with valid ID, THE ProfileService SHALL return the matching profile
5. WHEN getProfile is called with invalid ID, THE ProfileService SHALL return null
6. WHEN updateProfile is called with valid ID, THE ProfileService SHALL update profile and preserve ID and createdAt
7. WHEN deleteProfile is called with valid ID, THE ProfileService SHALL remove profile and return true
8. WHEN deleteProfile is called with invalid ID, THE ProfileService SHALL return false

### Requirement 2: ProfileService - Validation

**User Story:** As a developer, I want to test ProfileService validation, so that I can ensure invalid data is rejected properly.

#### Acceptance Criteria

1. WHEN profile name is empty or not a string, THE ProfileService SHALL throw error "Profile name is required and must be a string"
2. WHEN viewport dimensions are less than 100, THE ProfileService SHALL throw error "Viewport dimensions must be at least 100x100"
3. WHEN proxy is provided without host or port, THE ProfileService SHALL throw error "Proxy host and port are required"
4. WHEN proxy type is invalid, THE ProfileService SHALL default to "http"
5. WHEN defaultHeadless is not boolean, THE ProfileService SHALL throw error "defaultHeadless must be a boolean"

### Requirement 3: ProfileRepository - CRUD Operations

**User Story:** As a developer, I want to test ProfileRepository CRUD operations, so that I can ensure profile management works correctly with SQLite storage.

#### Acceptance Criteria

1. WHEN createProfile is called with valid data, THE ProfileRepository SHALL insert profile into SQLite and return created profile
2. WHEN createProfile is called with duplicate name, THE ProfileRepository SHALL throw error "Profile name already exists"
3. WHEN getProfile is called with valid ID, THE ProfileRepository SHALL return deserialized profile object
4. WHEN getAllProfiles is called, THE ProfileRepository SHALL return all profiles ordered by created_at DESC
5. WHEN updateProfile is called with valid ID, THE ProfileRepository SHALL update profile and set updated_at
6. WHEN updateProfile is called with invalid ID, THE ProfileRepository SHALL throw error "Profile not found"
7. WHEN deleteProfile is called with valid ID, THE ProfileRepository SHALL remove profile and return true
8. WHEN deleteProfile is called with invalid ID, THE ProfileRepository SHALL return false

### Requirement 4: ProfileRepository - Session Management

**User Story:** As a developer, I want to test ProfileRepository session management, so that I can ensure browser sessions are tracked correctly.

#### Acceptance Criteria

1. WHEN createSession is called, THE ProfileRepository SHALL create session record with unique ID and return sessionId
2. WHEN updateSession is called, THE ProfileRepository SHALL update session status and set end_time

### Requirement 5: ProfileRepository - Activity Logging

**User Story:** As a developer, I want to test ProfileRepository activity logging, so that I can ensure user activities are recorded properly.

#### Acceptance Criteria

1. WHEN logActivity is called, THE ProfileRepository SHALL insert activity log record
2. WHEN getActivityLogs is called without profileId, THE ProfileRepository SHALL return all logs with pagination
3. WHEN getActivityLogs is called with profileId, THE ProfileRepository SHALL return filtered logs for that profile

### Requirement 6: Data Serialization Round-Trip

**User Story:** As a developer, I want to ensure data integrity through serialization, so that profile data is not corrupted during storage and retrieval.

#### Acceptance Criteria

1. FOR ALL valid Profile objects, THE ProfileService SHALL preserve all fields after save and load (round-trip)
2. FOR ALL valid Profile objects, THE ProfileRepository SHALL preserve all fields after insert and select (round-trip)
3. WHEN JSON fields contain special characters, THE ProfileRepository SHALL correctly serialize and deserialize them
