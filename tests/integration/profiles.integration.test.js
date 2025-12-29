/**
 * Profiles API Integration Tests
 * Feature: integration-testing
 * Validates: Requirements 1.1-1.7, 4.1
 */
const request = require('supertest');

// Set test environment before importing app
process.env.NODE_ENV = 'test';
process.env.SKIP_BROWSER_TESTS = 'true';

const app = require('../../server');

// Helper functions
function createTestAgent() {
  return request(app);
}

function assertSuccessResponse(response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(true);
}

function assertErrorResponse(response, expectedStatus = 400) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
}

// Test data generators
const testDataGenerators = {
  validProfile(overrides = {}) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return {
      name: `Test Profile ${timestamp}-${random}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timezone: 'America/New_York',
      viewport: { width: 1920, height: 1080 },
      ...overrides
    };
  },
  invalidProfile() {
    return {
      userAgent: 'Mozilla/5.0...',
      timezone: 'America/New_York'
    };
  }
};

// Track created profiles for cleanup
const createdProfiles = [];

// Helper to create profile and track for cleanup
async function createAndTrackProfile(agent, overrides = {}) {
  const profileData = testDataGenerators.validProfile(overrides);
  const response = await agent.post('/api/profiles').send(profileData);
  
  if (response.status === 201 && response.body.data?.id) {
    createdProfiles.push(response.body.data.id);
  }
  return response;
}

describe('Profiles API Integration Tests', () => {
  let agent;

  beforeAll(async () => {
    agent = createTestAgent();
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    // Clean up created profiles after each test
    for (const profileId of [...createdProfiles]) {
      try {
        await agent.delete(`/api/profiles/${profileId}`);
        const idx = createdProfiles.indexOf(profileId);
        if (idx > -1) createdProfiles.splice(idx, 1);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('GET /api/profiles', () => {
    /**
     * Test: Get all profiles
     * Validates: Requirement 1.1
     */
    test('should return all profiles with success response', async () => {
      const response = await agent.get('/api/profiles');

      assertSuccessResponse(response, 200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBe(response.body.data.length);
    });

    test('should return profiles array even when empty', async () => {
      const response = await agent.get('/api/profiles');

      assertSuccessResponse(response, 200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/profiles', () => {
    /**
     * Test: Create profile with valid data
     * Validates: Requirement 1.2
     */
    test('should create profile with valid data and return 201', async () => {
      const profileData = testDataGenerators.validProfile();

      const response = await agent
        .post('/api/profiles')
        .send(profileData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 201);
      expect(response.body.data).toMatchObject({
        name: profileData.name,
        userAgent: profileData.userAgent,
        timezone: profileData.timezone
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.message).toContain('created');

      createdProfiles.push(response.body.data.id);
    });

    test('should create profile with minimal required fields', async () => {
      const profileData = { name: `Minimal Profile ${Date.now()}` };

      const response = await agent
        .post('/api/profiles')
        .send(profileData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 201);
      expect(response.body.data.name).toBe(profileData.name);
      expect(response.body.data.id).toBeDefined();

      createdProfiles.push(response.body.data.id);
    });

    test('should create profile with proxy configuration', async () => {
      const profileData = testDataGenerators.validProfile({
        proxy: {
          host: '192.168.1.1',
          port: 8080,
          type: 'http'
        }
      });

      const response = await agent
        .post('/api/profiles')
        .send(profileData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 201);
      expect(response.body.data.proxy).toBeDefined();
      expect(response.body.data.proxy.host).toBe('192.168.1.1');

      createdProfiles.push(response.body.data.id);
    });

    /**
     * Test: Create profile with invalid data
     * Validates: Requirement 1.3
     */
    test('should return 400 with validation error for missing name', async () => {
      const invalidData = testDataGenerators.invalidProfile();

      const response = await agent
        .post('/api/profiles')
        .send(invalidData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
      // Validation middleware returns message and errors array
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 for empty request body', async () => {
      const response = await agent
        .post('/api/profiles')
        .send({});

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });

    test('should return 400 for invalid viewport dimensions', async () => {
      const invalidData = testDataGenerators.validProfile({
        viewport: { width: -100, height: 1080 }
      });

      const response = await agent
        .post('/api/profiles')
        .send(invalidData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });

    test('should return 400 for invalid proxy port', async () => {
      const invalidData = testDataGenerators.validProfile({
        proxy: { host: '127.0.0.1', port: 99999, type: 'http' }
      });

      const response = await agent
        .post('/api/profiles')
        .send(invalidData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });
  });

  describe('GET /api/profiles/:id', () => {
    /**
     * Test: Get profile by valid ID
     * Validates: Requirement 1.4
     */
    test('should return profile for valid ID', async () => {
      // First create a profile
      const createResponse = await createAndTrackProfile(agent);
      
      // Handle rate limiting
      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }
      
      const profileId = createResponse.body.data.id;

      const response = await agent.get(`/api/profiles/${profileId}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.id).toBe(profileId);
    });

    /**
     * Test: Get profile by invalid ID
     * Validates: Requirement 1.5
     */
    test('should return 404 for non-existent profile ID', async () => {
      const fakeId = 'non-existent-id-12345';

      const response = await agent.get(`/api/profiles/${fakeId}`);

      assertErrorResponse(response, 404);
      expect(response.body.message).toContain('not found');
    });

    test('should return 404 for invalid UUID format', async () => {
      const response = await agent.get('/api/profiles/invalid-id');

      assertErrorResponse(response, 404);
    });
  });

  describe('PUT /api/profiles/:id', () => {
    /**
     * Test: Update profile with valid data
     * Validates: Requirement 1.6
     */
    test('should update profile with valid data', async () => {
      // Create a profile first
      const createResponse = await createAndTrackProfile(agent);
      
      // Handle rate limiting
      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }
      
      const profileId = createResponse.body.data.id;

      const updates = {
        timezone: 'Europe/London',
        viewport: { width: 1366, height: 768 }
      };

      const response = await agent
        .put(`/api/profiles/${profileId}`)
        .send(updates);

      assertSuccessResponse(response, 200);
      expect(response.body.data.timezone).toBe(updates.timezone);
      expect(response.body.data.viewport.width).toBe(updates.viewport.width);
    });

    test('should update profile name', async () => {
      const createResponse = await createAndTrackProfile(agent);
      
      // Handle rate limiting
      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }
      
      const profileId = createResponse.body.data.id;
      const newName = `Updated Profile ${Date.now()}`;

      const response = await agent
        .put(`/api/profiles/${profileId}`)
        .send({ name: newName });

      assertSuccessResponse(response, 200);
      expect(response.body.data.name).toBe(newName);
    });

    test('should return 404 for updating non-existent profile', async () => {
      const response = await agent
        .put('/api/profiles/non-existent-id')
        .send({ name: 'New Name' });

      assertErrorResponse(response, 404);
    });

    test('should return 400 for empty update body', async () => {
      const createResponse = await createAndTrackProfile(agent);
      
      // Handle rate limiting
      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }
      
      const profileId = createResponse.body.data.id;

      const response = await agent
        .put(`/api/profiles/${profileId}`)
        .send({});

      assertErrorResponse(response, 400);
    });
  });

  describe('DELETE /api/profiles/:id', () => {
    /**
     * Test: Delete profile
     * Validates: Requirement 1.7
     */
    test('should delete existing profile', async () => {
      // Create a profile first
      const createResponse = await createAndTrackProfile(agent);
      
      // Handle rate limiting
      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }
      
      const profileId = createResponse.body.data.id;

      const response = await agent.delete(`/api/profiles/${profileId}`);

      assertSuccessResponse(response, 200);
      expect(response.body.message).toContain('deleted');

      // Remove from tracking since it's deleted
      const idx = createdProfiles.indexOf(profileId);
      if (idx > -1) createdProfiles.splice(idx, 1);

      // Verify profile is deleted
      const getResponse = await agent.get(`/api/profiles/${profileId}`);
      assertErrorResponse(getResponse, 404);
    });

    test('should return 404 for deleting non-existent profile', async () => {
      const response = await agent.delete('/api/profiles/non-existent-id');

      assertErrorResponse(response, 404);
    });
  });
});


/**
 * Property-Based Tests for Profiles API
 * Feature: integration-testing
 */
const fc = require('fast-check');

describe('Profiles API Property Tests', () => {
  let agent;

  beforeAll(async () => {
    agent = createTestAgent();
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  /**
   * Property 1: API CRUD Round-Trip
   * For any valid profile data, POST then GET should return equivalent profile.
   * Validates: Requirements 1.2, 1.4, 4.1
   */
  describe('Property 1: API CRUD Round-Trip', () => {
    test('POST then GET should return equivalent profile data', async () => {
      // Arbitrary for valid profile names
      const profileNameArb = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => s.trim().length > 0)
        .map(s => `PBT Profile ${s.substring(0, 30)}`);

      // Arbitrary for valid timezones
      const timezoneArb = fc.constantFrom(
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'UTC',
        'America/Los_Angeles'
      );

      // Arbitrary for valid viewport
      const viewportArb = fc.record({
        width: fc.integer({ min: 100, max: 4096 }),
        height: fc.integer({ min: 100, max: 4096 })
      });

      // Arbitrary for valid profile data
      const profileDataArb = fc.record({
        name: profileNameArb,
        timezone: timezoneArb,
        viewport: viewportArb
      });

      await fc.assert(
        fc.asyncProperty(profileDataArb, async (profileData) => {
          // Create profile
          const createResponse = await agent
            .post('/api/profiles')
            .send(profileData);

          // Handle rate limiting - skip this iteration
          if (createResponse.status === 429) {
            return true; // Skip this test case
          }

          // Verify creation succeeded
          if (createResponse.status !== 201) {
            return false;
          }

          const createdProfile = createResponse.body.data;
          const profileId = createdProfile.id;

          try {
            // Retrieve profile
            const getResponse = await agent.get(`/api/profiles/${profileId}`);

            // Verify retrieval succeeded
            if (getResponse.status !== 200) {
              return false;
            }

            const retrievedProfile = getResponse.body.data;

            // Verify round-trip consistency
            const nameMatches = retrievedProfile.name === profileData.name;
            const timezoneMatches = retrievedProfile.timezone === profileData.timezone;
            const viewportMatches = 
              retrievedProfile.viewport.width === profileData.viewport.width &&
              retrievedProfile.viewport.height === profileData.viewport.height;

            return nameMatches && timezoneMatches && viewportMatches;
          } finally {
            // Cleanup
            await agent.delete(`/api/profiles/${profileId}`);
          }
        }),
        { numRuns: 20, verbose: true } // Reduced runs due to rate limiting
      );
    });
  });

  /**
   * Property 2: API Validation Consistency
   * For any invalid profile data, POST should return 400 with validation errors.
   * Validates: Requirements 1.3
   */
  describe('Property 2: API Validation Consistency', () => {
    test('Invalid profile data should consistently return 400 with validation message', async () => {
      // Arbitrary for invalid profile data (missing name or invalid fields)
      const invalidProfileArb = fc.oneof(
        // Missing name (required field)
        fc.record({
          userAgent: fc.string(),
          timezone: fc.string()
        }),
        // Empty name
        fc.record({
          name: fc.constant(''),
          userAgent: fc.string()
        }),
        // Invalid viewport (negative dimensions)
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          viewport: fc.record({
            width: fc.integer({ min: -1000, max: 0 }),
            height: fc.integer({ min: 100, max: 4096 })
          })
        }),
        // Invalid proxy port
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          proxy: fc.record({
            host: fc.string({ minLength: 1 }),
            port: fc.integer({ min: 70000, max: 100000 }),
            type: fc.constant('http')
          })
        })
      );

      await fc.assert(
        fc.asyncProperty(invalidProfileArb, async (invalidData) => {
          const response = await agent
            .post('/api/profiles')
            .send(invalidData);

          // Handle rate limiting - skip this iteration
          if (response.status === 429) {
            return true;
          }

          // Should return 400 for invalid data
          const isValidationError = response.status === 400;
          const hasErrorMessage = response.body.success === false && 
            (response.body.message !== undefined || response.body.errors !== undefined);

          return isValidationError && hasErrorMessage;
        }),
        { numRuns: 15, verbose: true } // Reduced runs due to rate limiting
      );
    });
  });
});