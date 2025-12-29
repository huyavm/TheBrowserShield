# Design Document - Phase 4: Integration/API Testing

## Overview

Test suite cho API routes sử dụng supertest và integration tests.

## Architecture

```
tests/
├── integration/
│   ├── profiles.integration.test.js
│   ├── proxy.integration.test.js
│   └── mode.integration.test.js
├── unit/
│   └── routes/
│       ├── profiles.test.js
│       ├── proxy.test.js
│       └── mode.test.js
```

## Components and Interfaces

### Supertest Setup

```javascript
const request = require('supertest');
const app = require('../../server');

describe('Profiles API', () => {
  it('should get all profiles', async () => {
    const res = await request(app)
      .get('/api/profiles')
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
```

### Test Database

```javascript
// Use separate test database
process.env.NODE_ENV = 'test';
// Or use in-memory SQLite for isolation
```

## Data Models

Sử dụng data models từ services layer.

## Correctness Properties

### Property 1: API CRUD Round-Trip

*For any* valid profile data, POST then GET should return equivalent profile.

**Validates: Requirements 1.2, 1.4, 4.1**

### Property 2: API Validation Consistency

*For any* invalid profile data, POST should return 400 with validation errors matching Zod schema.

**Validates: Requirements 1.3**

### Property 3: API Delete Idempotence

*For any* profile, DELETE then GET should return 404, and second DELETE should also succeed or return 404.

**Validates: Requirements 1.7, 4.3**

## Error Handling

- API errors handled by errorHandler middleware
- Test both success and error responses

## Testing Strategy

- Supertest cho HTTP request testing
- Separate test database/in-memory SQLite
- Clean up data after each test
- Chạy với `--silent` và giới hạn output
- Integration tests chạy riêng: `npm test -- tests/integration --silent`
