# Requirements Document - Phase 4: Integration/API Testing

## Introduction

Kế hoạch test cho API routes và integration tests.

## Glossary

- **Profiles_API**: API endpoints cho profile management
- **Proxy_API**: API endpoints cho proxy pool management
- **Mode_API**: API endpoints cho mode switching
- **Integration_Test**: Test end-to-end flows qua nhiều layers

## Requirements

### Requirement 1: Profiles API

**User Story:** As a developer, I want to test profile API endpoints, so that CRUD operations work correctly.

#### Acceptance Criteria

1. WHEN GET /api/profiles is called, THE Profiles_API SHALL return all profiles
2. WHEN POST /api/profiles is called with valid data, THE Profiles_API SHALL create profile and return 201
3. WHEN POST /api/profiles is called with invalid data, THE Profiles_API SHALL return 400 with validation errors
4. WHEN GET /api/profiles/:id is called with valid ID, THE Profiles_API SHALL return profile
5. WHEN GET /api/profiles/:id is called with invalid ID, THE Profiles_API SHALL return 404
6. WHEN PUT /api/profiles/:id is called with valid data, THE Profiles_API SHALL update profile
7. WHEN DELETE /api/profiles/:id is called, THE Profiles_API SHALL delete profile

### Requirement 2: Proxy API

**User Story:** As a developer, I want to test proxy API endpoints, so that proxy management works correctly.

#### Acceptance Criteria

1. WHEN GET /api/proxy/pool is called, THE Proxy_API SHALL return proxy pool
2. WHEN POST /api/proxy/pool is called with valid proxy, THE Proxy_API SHALL add proxy
3. WHEN DELETE /api/proxy/pool/:id is called, THE Proxy_API SHALL remove proxy

### Requirement 3: Mode API

**User Story:** As a developer, I want to test mode API endpoints, so that mode switching works correctly.

#### Acceptance Criteria

1. WHEN GET /api/mode is called, THE Mode_API SHALL return current mode
2. WHEN POST /api/mode/switch is called with valid mode, THE Mode_API SHALL switch mode

### Requirement 4: Integration Flows

**User Story:** As a developer, I want to test end-to-end flows, so that components work together correctly.

#### Acceptance Criteria

1. WHEN profile is created then retrieved, THE Integration_Test SHALL return same data
2. WHEN profile is updated then retrieved, THE Integration_Test SHALL return updated data
3. WHEN profile is deleted then retrieved, THE Integration_Test SHALL return 404
