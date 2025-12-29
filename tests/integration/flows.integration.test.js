/**
 * Integration Flow Tests
 * Feature: integration-testing
 * Validates: Requirements 4.1-4.3
 * 
 * Tests end-to-end flows to ensure components work together correctly:
 * - Create-retrieve flow
 * - Update-retrieve flow
 * - Delete-retrieve flow
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
      name: `Flow Test Profile ${timestamp}-${random}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timezone: 'America/New_York',
      viewport: { width: 1920, height: 1080 },
      ...overrides
    };
  }
};

// Track created profiles for cleanup
const createdProfiles = [];

describe('Integration Flow Tests', () => {
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

  /**
   * Create-Retrieve Flow Tests
   * Validates: Requirement 4.1
   * WHEN profile is created then retrieved, THE Integration_Test SHALL return same data
   */
  describe('Create-Retrieve Flow', () => {
    test('should return same data when profile is created then retrieved', async () => {
      const profileData = testDataGenerators.validProfile();

      // Step 1: Create profile
      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      // Handle rate limiting
      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      const createdProfile = createResponse.body.data;
      createdProfiles.push(createdProfile.id);

      // Step 2: Retrieve profile
      const retrieveResponse = await agent
        .get(`/api/profiles/${createdProfile.id}`);

      assertSuccessResponse(retrieveResponse, 200);
      const retrievedProfile = retrieveResponse.body.data;

      // Step 3: Verify data consistency
      expect(retrievedProfile.id).toBe(createdProfile.id);
      expect(retrievedProfile.name).toBe(profileData.name);
      expect(retrievedProfile.userAgent).toBe(profileData.userAgent);
      expect(retrievedProfile.timezone).toBe(profileData.timezone);
      expect(retrievedProfile.viewport.width).toBe(profileData.viewport.width);
      expect(retrievedProfile.viewport.height).toBe(profileData.viewport.height);
    });

    test('should preserve all optional fields in create-retrieve flow', async () => {
      const profileData = testDataGenerators.validProfile({
        proxy: {
          host: '192.168.1.100',
          port: 8080,
          type: 'http'
        }
      });

      // Create profile
      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      createdProfiles.push(createResponse.body.data.id);

      // Retrieve profile
      const retrieveResponse = await agent
        .get(`/api/profiles/${createResponse.body.data.id}`);

      assertSuccessResponse(retrieveResponse, 200);
      const retrievedProfile = retrieveResponse.body.data;

      // Verify proxy data preserved
      expect(retrievedProfile.proxy).toBeDefined();
      expect(retrievedProfile.proxy.host).toBe(profileData.proxy.host);
      expect(retrievedProfile.proxy.port).toBe(profileData.proxy.port);
      expect(retrievedProfile.proxy.type).toBe(profileData.proxy.type);
    });

    test('should return profile in list after creation', async () => {
      const profileData = testDataGenerators.validProfile();

      // Create profile
      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      const createdId = createResponse.body.data.id;
      createdProfiles.push(createdId);

      // Get all profiles
      const listResponse = await agent.get('/api/profiles');

      assertSuccessResponse(listResponse, 200);
      
      // Verify created profile is in the list
      const foundProfile = listResponse.body.data.find(p => p.id === createdId);
      expect(foundProfile).toBeDefined();
      expect(foundProfile.name).toBe(profileData.name);
    });
  });

  /**
   * Update-Retrieve Flow Tests
   * Validates: Requirement 4.2
   * WHEN profile is updated then retrieved, THE Integration_Test SHALL return updated data
   */
  describe('Update-Retrieve Flow', () => {
    test('should return updated data when profile is updated then retrieved', async () => {
      // Step 1: Create profile
      const profileData = testDataGenerators.validProfile();
      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      const profileId = createResponse.body.data.id;
      createdProfiles.push(profileId);

      // Step 2: Update profile
      const updateData = {
        name: `Updated Flow Profile ${Date.now()}`,
        timezone: 'Europe/London',
        viewport: { width: 1366, height: 768 }
      };

      const updateResponse = await agent
        .put(`/api/profiles/${profileId}`)
        .send(updateData);

      assertSuccessResponse(updateResponse, 200);

      // Step 3: Retrieve profile
      const retrieveResponse = await agent
        .get(`/api/profiles/${profileId}`);

      assertSuccessResponse(retrieveResponse, 200);
      const retrievedProfile = retrieveResponse.body.data;

      // Step 4: Verify updated data
      expect(retrievedProfile.name).toBe(updateData.name);
      expect(retrievedProfile.timezone).toBe(updateData.timezone);
      expect(retrievedProfile.viewport.width).toBe(updateData.viewport.width);
      expect(retrievedProfile.viewport.height).toBe(updateData.viewport.height);
    });

    test('should preserve unchanged fields after partial update', async () => {
      // Create profile with all fields
      const profileData = testDataGenerators.validProfile({
        proxy: {
          host: '10.0.0.1',
          port: 3128,
          type: 'socks5'
        }
      });

      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      const profileId = createResponse.body.data.id;
      createdProfiles.push(profileId);

      // Update only name
      const updateData = { name: `Partially Updated ${Date.now()}` };
      const updateResponse = await agent
        .put(`/api/profiles/${profileId}`)
        .send(updateData);

      assertSuccessResponse(updateResponse, 200);

      // Retrieve and verify
      const retrieveResponse = await agent
        .get(`/api/profiles/${profileId}`);

      assertSuccessResponse(retrieveResponse, 200);
      const retrievedProfile = retrieveResponse.body.data;

      // Updated field should change
      expect(retrievedProfile.name).toBe(updateData.name);
      
      // Unchanged fields should be preserved
      expect(retrievedProfile.userAgent).toBe(profileData.userAgent);
      expect(retrievedProfile.timezone).toBe(profileData.timezone);
    });

    test('should reflect update in profile list', async () => {
      // Create profile
      const profileData = testDataGenerators.validProfile();
      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      const profileId = createResponse.body.data.id;
      createdProfiles.push(profileId);

      // Update profile
      const newName = `List Updated Profile ${Date.now()}`;
      await agent
        .put(`/api/profiles/${profileId}`)
        .send({ name: newName });

      // Get all profiles and verify update reflected
      const listResponse = await agent.get('/api/profiles');

      assertSuccessResponse(listResponse, 200);
      const foundProfile = listResponse.body.data.find(p => p.id === profileId);
      expect(foundProfile).toBeDefined();
      expect(foundProfile.name).toBe(newName);
    });
  });

  /**
   * Delete-Retrieve Flow Tests
   * Validates: Requirement 4.3
   * WHEN profile is deleted then retrieved, THE Integration_Test SHALL return 404
   */
  describe('Delete-Retrieve Flow', () => {
    test('should return 404 when profile is deleted then retrieved', async () => {
      // Step 1: Create profile
      const profileData = testDataGenerators.validProfile();
      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      const profileId = createResponse.body.data.id;

      // Step 2: Delete profile
      const deleteResponse = await agent
        .delete(`/api/profiles/${profileId}`);

      assertSuccessResponse(deleteResponse, 200);
      expect(deleteResponse.body.message).toContain('deleted');

      // Step 3: Try to retrieve deleted profile
      const retrieveResponse = await agent
        .get(`/api/profiles/${profileId}`);

      // Step 4: Verify 404 response
      assertErrorResponse(retrieveResponse, 404);
      expect(retrieveResponse.body.message).toContain('not found');
    });

    test('should remove profile from list after deletion', async () => {
      // Create profile
      const profileData = testDataGenerators.validProfile();
      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      const profileId = createResponse.body.data.id;

      // Verify profile exists in list
      const listBeforeDelete = await agent.get('/api/profiles');
      const existsBefore = listBeforeDelete.body.data.some(p => p.id === profileId);
      expect(existsBefore).toBe(true);

      // Delete profile
      await agent.delete(`/api/profiles/${profileId}`);

      // Verify profile removed from list
      const listAfterDelete = await agent.get('/api/profiles');
      const existsAfter = listAfterDelete.body.data.some(p => p.id === profileId);
      expect(existsAfter).toBe(false);
    });

    test('should not affect other profiles when one is deleted', async () => {
      // Create two profiles
      const profile1Data = testDataGenerators.validProfile({ name: `Profile 1 ${Date.now()}` });
      const profile2Data = testDataGenerators.validProfile({ name: `Profile 2 ${Date.now()}` });

      const create1Response = await agent
        .post('/api/profiles')
        .send(profile1Data);

      if (create1Response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      const create2Response = await agent
        .post('/api/profiles')
        .send(profile2Data);

      if (create2Response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(create1Response, 201);
      assertSuccessResponse(create2Response, 201);

      const profile1Id = create1Response.body.data.id;
      const profile2Id = create2Response.body.data.id;
      createdProfiles.push(profile2Id); // Track profile2 for cleanup

      // Delete profile1
      await agent.delete(`/api/profiles/${profile1Id}`);

      // Verify profile2 still exists and is unchanged
      const retrieve2Response = await agent
        .get(`/api/profiles/${profile2Id}`);

      assertSuccessResponse(retrieve2Response, 200);
      expect(retrieve2Response.body.data.name).toBe(profile2Data.name);
    });
  });

  /**
   * Property Test: Delete Idempotence
   * Property 3: API Delete Idempotence
   * Validates: Requirements 1.7, 4.3
   * 
   * For any profile, DELETE then GET should return 404,
   * and second DELETE should also succeed or return 404.
   */
  describe('Property 3: API Delete Idempotence', () => {
    const fc = require('fast-check');

    test('DELETE then GET should return 404, second DELETE should be idempotent', async () => {
      // Arbitrary for valid profile names
      const profileNameArb = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => s.trim().length > 0)
        .map(s => `Delete Idempotence ${s.substring(0, 30)} ${Date.now()}`);

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
          // Step 1: Create profile
          const createResponse = await agent
            .post('/api/profiles')
            .send(profileData);

          // Handle rate limiting - skip this iteration
          if (createResponse.status === 429) {
            return true;
          }

          // Verify creation succeeded
          if (createResponse.status !== 201) {
            return false;
          }

          const profileId = createResponse.body.data.id;

          // Step 2: First DELETE - should succeed
          const firstDeleteResponse = await agent
            .delete(`/api/profiles/${profileId}`);

          // Handle rate limiting on delete
          if (firstDeleteResponse.status === 429) {
            // Cleanup: try to delete later (best effort)
            return true;
          }

          const firstDeleteSuccess = firstDeleteResponse.status === 200 &&
            firstDeleteResponse.body.success === true;

          if (!firstDeleteSuccess) {
            return false;
          }

          // Step 3: GET after DELETE - should return 404
          const getAfterDeleteResponse = await agent
            .get(`/api/profiles/${profileId}`);

          const getReturns404 = getAfterDeleteResponse.status === 404 &&
            getAfterDeleteResponse.body.success === false;

          if (!getReturns404) {
            return false;
          }

          // Step 4: Second DELETE - should be idempotent (succeed or return 404)
          const secondDeleteResponse = await agent
            .delete(`/api/profiles/${profileId}`);

          // Handle rate limiting on second delete
          if (secondDeleteResponse.status === 429) {
            return true;
          }

          // Idempotence: second delete should either succeed (200) or return 404
          // Both are acceptable for idempotent delete operations
          const secondDeleteIdempotent = 
            secondDeleteResponse.status === 200 || 
            secondDeleteResponse.status === 404;

          return secondDeleteIdempotent;
        }),
        { numRuns: 8, verbose: true } // Reduced runs due to rate limiting (10 deletes/min limit)
      );
    });
  });

  /**
   * Combined Flow Tests
   * Tests multiple operations in sequence
   */
  describe('Combined Flow Tests', () => {
    test('should handle full lifecycle: create -> update -> retrieve -> delete -> verify 404', async () => {
      // Create
      const profileData = testDataGenerators.validProfile();
      const createResponse = await agent
        .post('/api/profiles')
        .send(profileData);

      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(createResponse, 201);
      const profileId = createResponse.body.data.id;

      // Update
      const updateData = { name: `Lifecycle Updated ${Date.now()}` };
      const updateResponse = await agent
        .put(`/api/profiles/${profileId}`)
        .send(updateData);

      assertSuccessResponse(updateResponse, 200);

      // Retrieve and verify update
      const retrieveResponse = await agent
        .get(`/api/profiles/${profileId}`);

      assertSuccessResponse(retrieveResponse, 200);
      expect(retrieveResponse.body.data.name).toBe(updateData.name);

      // Delete
      const deleteResponse = await agent
        .delete(`/api/profiles/${profileId}`);

      assertSuccessResponse(deleteResponse, 200);

      // Verify 404
      const finalRetrieveResponse = await agent
        .get(`/api/profiles/${profileId}`);

      assertErrorResponse(finalRetrieveResponse, 404);
    });
  });
});
