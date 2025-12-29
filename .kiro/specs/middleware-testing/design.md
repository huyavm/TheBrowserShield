# Design Document - Phase 2: Middleware Testing

## Overview

Test suite cho middleware layer sử dụng Jest với mock request/response objects.

## Architecture

```
tests/unit/
├── middleware/
│   ├── auth.test.js
│   ├── validation.test.js
│   ├── errorHandler.test.js
│   └── performance.test.js
```

## Components and Interfaces

### Mock Request/Response

```javascript
const mockRequest = (options = {}) => ({
  path: options.path || '/api/test',
  headers: options.headers || {},
  get: jest.fn((header) => options.headers?.[header.toLowerCase()]),
  ip: options.ip || '127.0.0.1',
  method: options.method || 'GET',
  body: options.body || {},
  query: options.query || {}
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.get = jest.fn();
  res.on = jest.fn((event, cb) => { res._finishCb = cb; });
  res.statusCode = 200;
  return res;
};
```

## Data Models

N/A - Middleware không có data models riêng.

## Correctness Properties

### Property 1: Auth Skip Non-API Routes

*For any* request path not starting with '/api', authenticateToken should call next() without checking token.

**Validates: Requirements 1.1**

### Property 2: Rate Limit Headers Consistency

*For any* request within rate limit, response headers X-RateLimit-Remaining should equal (MAX_REQUESTS - request_count).

**Validates: Requirements 2.1**

### Property 3: Validation Schema Round-Trip

*For any* valid input matching a Zod schema, validate middleware should parse and return equivalent data.

**Validates: Requirements 3.3**

### Property 4: Error Message Localization

*For any* AppError with code, getErrorMessage(code, 'vi') should return Vietnamese message and getErrorMessage(code, 'en') should return English message.

**Validates: Requirements 4.3**

## Error Handling

Covered by errorHandler middleware tests.

## Testing Strategy

- Jest với mock objects
- Không cần database
- Test isolation: reset mocks before each test
- Chạy test với `--silent` để giảm output
