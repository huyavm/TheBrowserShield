# Design Document: Profile Service Testing

## Overview

Thiết kế test suite cho ProfileService (JSON storage) và ProfileRepository (SQLite storage). Sử dụng Jest làm test framework và fast-check cho property-based testing.

## Architecture

```
tests/unit/
├── ProfileService.test.js          # Unit tests cho ProfileService
├── ProfileService.property.test.js # Property tests cho ProfileService
├── ProfileRepository.test.js       # Unit tests cho ProfileRepository
├── ProfileRepository.property.test.js # Property tests cho ProfileRepository
```

## Components and Interfaces

### Test Utilities

```javascript
// tests/helpers/profileGenerator.js
const fc = require('fast-check');

// Arbitrary cho valid profile name
const validProfileName = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

// Arbitrary cho valid viewport
const validViewport = fc.record({
  width: fc.integer({ min: 100, max: 3840 }),
  height: fc.integer({ min: 100, max: 2160 })
});

// Arbitrary cho invalid viewport (dimensions < 100)
const invalidViewport = fc.record({
  width: fc.integer({ min: 1, max: 99 }),
  height: fc.integer({ min: 1, max: 99 })
});

// Arbitrary cho valid proxy
const validProxy = fc.record({
  host: fc.string({ minLength: 1 }),
  port: fc.integer({ min: 1, max: 65535 }),
  type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
});

// Arbitrary cho valid profile data
const validProfileData = fc.record({
  name: validProfileName,
  userAgent: fc.option(fc.string()),
  timezone: fc.option(fc.string()),
  viewport: fc.option(validViewport),
  proxy: fc.option(validProxy),
  defaultHeadless: fc.option(fc.boolean())
});
```

### Mock Setup

```javascript
// Mock file system cho ProfileService tests
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// In-memory SQLite cho ProfileRepository tests
const Database = require('better-sqlite3');
const testDb = new Database(':memory:');
```

## Data Models

### Profile Object (ProfileService)

```javascript
{
  id: string,           // UUID v4
  name: string,         // Required, non-empty
  userAgent: string,    // Default: random from list
  timezone: string,     // Default: 'America/New_York'
  proxy: object | null, // { host, port, type }
  viewport: object,     // { width, height } min 100x100
  spoofFingerprint: boolean, // Default: true
  defaultHeadless: boolean,  // Default: false
  createdAt: string,    // ISO timestamp
  updatedAt: string     // ISO timestamp
}
```

### Profile Object (ProfileRepository)

```javascript
{
  id: string,
  name: string,           // Unique constraint
  userAgent: string,
  timezone: string,
  viewport: object,       // JSON serialized
  proxy: object | null,   // JSON serialized
  stealthConfig: object,  // JSON serialized
  hardwareConfig: object, // JSON serialized
  screenConfig: object,   // JSON serialized
  languages: array,       // JSON serialized
  autoNavigateUrl: string | null,
  createdAt: string,
  updatedAt: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system - essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: ProfileService Round-Trip Consistency

*For any* valid profile data, creating a profile then retrieving it by ID should return an equivalent profile object with all fields preserved (except auto-generated fields like id, createdAt, updatedAt).

**Validates: Requirements 1.1, 1.4, 6.1**

### Property 2: ProfileService Default Values

*For any* profile created with only required fields (name), the resulting profile should have valid default values for userAgent (non-empty string), timezone ('America/New_York'), viewport ({ width: 1366, height: 768 }), and defaultHeadless (false).

**Validates: Requirements 1.2**

### Property 3: ProfileService Update Preserves Immutable Fields

*For any* existing profile and any valid update data, updating the profile should preserve the original id and createdAt while updating other fields and setting new updatedAt.

**Validates: Requirements 1.6**

### Property 4: ProfileService Delete Then Get Returns Null

*For any* created profile, after deletion, getProfile with that ID should return null.

**Validates: Requirements 1.7**

### Property 5: ProfileService Invalid Name Rejection

*For any* profile data where name is empty string, whitespace-only, or non-string type, createProfile should throw error containing "Profile name is required".

**Validates: Requirements 2.1**

### Property 6: ProfileService Invalid Viewport Rejection

*For any* viewport with width < 100 or height < 100, createProfile should throw error containing "Viewport dimensions must be at least 100x100".

**Validates: Requirements 2.2**

### Property 7: ProfileService Invalid Proxy Rejection

*For any* proxy object missing host or port, createProfile should throw error containing "Proxy host and port are required".

**Validates: Requirements 2.3**

### Property 8: ProfileRepository Round-Trip Consistency

*For any* valid profile data, creating a profile then retrieving it by ID should return an equivalent profile object with all JSON fields correctly deserialized.

**Validates: Requirements 3.1, 3.3, 6.2**

### Property 9: ProfileRepository Ordering

*For any* set of created profiles, getAllProfiles should return them ordered by created_at descending (newest first).

**Validates: Requirements 3.4**

### Property 10: ProfileRepository Update Consistency

*For any* existing profile and valid updates, updateProfile should apply changes and return updated profile with new updated_at timestamp.

**Validates: Requirements 3.5**

### Property 11: ProfileRepository Activity Log Filtering

*For any* set of activity logs across multiple profiles, getActivityLogs with a specific profileId should return only logs for that profile, and without profileId should return all logs respecting pagination limits.

**Validates: Requirements 5.2, 5.3**

### Property 12: JSON Special Characters Round-Trip

*For any* profile with special characters (unicode, quotes, newlines) in string fields, serialization and deserialization should preserve the exact content.

**Validates: Requirements 6.3**

## Error Handling

### ProfileService Errors

| Condition | Error Message |
|-----------|---------------|
| Empty/invalid name | "Profile name is required and must be a string" |
| Viewport < 100x100 | "Viewport dimensions must be at least 100x100" |
| Proxy missing host/port | "Proxy host and port are required when proxy is specified" |
| Invalid defaultHeadless | "defaultHeadless must be a boolean" |

### ProfileRepository Errors

| Condition | Error Message |
|-----------|---------------|
| Duplicate name | "Profile name 'X' already exists" |
| Profile not found (update) | "Profile not found: {id}" |

## Testing Strategy

### Unit Tests

Unit tests sẽ cover các example cụ thể và edge cases:

- ProfileService: initialization, file not found handling, invalid ID operations
- ProfileRepository: database initialization, unique constraint violations, session/activity log operations

### Property-Based Tests

Sử dụng **fast-check** library với cấu hình:
- Minimum 100 iterations per property
- Seed logging for reproducibility
- Verbose mode for debugging failures

Mỗi property test sẽ được annotate với format:
```javascript
// Feature: profile-service-testing, Property N: [Property Title]
// Validates: Requirements X.Y
```

### Test Isolation

- ProfileService tests: Mock fs module, reset profiles Map before each test
- ProfileRepository tests: Use in-memory SQLite database, recreate tables before each test

### Coverage Goals

- Line coverage: > 90%
- Branch coverage: > 85%
- All acceptance criteria covered by at least one test
