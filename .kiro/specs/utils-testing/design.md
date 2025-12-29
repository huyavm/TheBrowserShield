# Design Document - Phase 3: Utils Testing

## Overview

Test suite cho utils layer: errors, logger, browser-detector.

## Architecture

```
tests/unit/
├── utils/
│   ├── errors.test.js
│   ├── logger.test.js
│   └── browser-detector.test.js
```

## Components and Interfaces

### Mock File System (for browser-detector)

```javascript
jest.mock('fs', () => ({
  statSync: jest.fn(),
  accessSync: jest.fn(),
  existsSync: jest.fn()
}));
```

## Data Models

### ErrorCodes Structure

```javascript
{
  PROFILE_NOT_FOUND: 'P001',
  BROWSER_ALREADY_RUNNING: 'B001',
  // ... etc
}
```

### ErrorMessages Structure

```javascript
{
  'P001': { en: 'Profile not found', vi: 'Không tìm thấy profile' },
  // ... etc
}
```

## Correctness Properties

### Property 1: Error Messages Bilingual Coverage

*For any* ErrorCode in ErrorCodes, ErrorMessages[code] should have both 'en' and 'vi' keys with non-empty strings.

**Validates: Requirements 1.1**

### Property 2: AppError JSON Serialization

*For any* AppError instance, toJSON('en') and toJSON('vi') should return valid error objects with correct language messages.

**Validates: Requirements 1.3**

### Property 3: Logger Level Filtering

*For any* log level setting, only messages at or above that level should be output.

**Validates: Requirements 2.2, 2.3**

### Property 4: Browser Path Validation

*For any* string input to validatePath, result should be boolean (true only if path exists and is readable file).

**Validates: Requirements 3.1, 3.2**

### Property 5: Cache Consistency

*For any* sequence of getCachedPaths calls within TTL, all calls should return identical objects.

**Validates: Requirements 3.3**

## Error Handling

- validatePath catches all fs errors and returns false
- Logger catches JSON stringify errors

## Testing Strategy

- Jest với mock fs module cho browser-detector
- Console spy cho logger tests
- Property tests với fast-check cho error codes coverage
- Chạy với `--silent` để giảm output
