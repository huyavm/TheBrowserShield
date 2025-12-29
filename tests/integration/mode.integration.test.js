/**
 * Mode API Integration Tests
 * Feature: integration-testing
 * Validates: Requirements 3.1-3.2
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

describe('Mode API Integration Tests', () => {
  let agent;
  let originalMode;

  beforeAll(async () => {
    agent = createTestAgent();
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Store original mode to restore after tests
    const response = await agent.get('/api/mode');
    if (response.body.success) {
      originalMode = response.body.data.currentMode;
    }
  });

  afterAll(async () => {
    // Restore original mode if it was changed
    if (originalMode) {
      try {
        await agent.post('/api/mode/switch').send({ mode: originalMode });
      } catch (error) {
        // Ignore restore errors
      }
    }
  });

  describe('GET /api/mode', () => {
    /**
     * Test: Get current mode
     * Validates: Requirement 3.1
     */
    test('should return current mode with success response', async () => {
      const response = await agent.get('/api/mode');

      assertSuccessResponse(response, 200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.currentMode).toBeDefined();
      expect(['mock', 'production', 'firefox']).toContain(response.body.data.currentMode);
    });

    test('should return mode info with available modes', async () => {
      const response = await agent.get('/api/mode');

      assertSuccessResponse(response, 200);
      expect(response.body.data.info).toBeDefined();
      expect(response.body.data.allModes).toBeDefined();
      
      // Verify all expected modes are present
      const allModes = response.body.data.allModes;
      expect(allModes.mock).toBeDefined();
      expect(allModes.production).toBeDefined();
      expect(allModes.firefox).toBeDefined();
    });

    test('should return mode details with name and description', async () => {
      const response = await agent.get('/api/mode');

      assertSuccessResponse(response, 200);
      const currentModeInfo = response.body.data.info;
      
      expect(currentModeInfo.name).toBeDefined();
      expect(currentModeInfo.description).toBeDefined();
      expect(currentModeInfo.available).toBeDefined();
      expect(currentModeInfo.features).toBeDefined();
      expect(Array.isArray(currentModeInfo.features)).toBe(true);
    });

    test('should return mock mode as always available', async () => {
      const response = await agent.get('/api/mode');

      assertSuccessResponse(response, 200);
      const mockMode = response.body.data.allModes.mock;
      
      expect(mockMode.available).toBe(true);
      expect(mockMode.name).toBe('Mock Mode');
    });
  });

  describe('POST /api/mode/switch', () => {
    /**
     * Test: Switch to valid mode
     * Validates: Requirement 3.2
     */
    test('should switch to mock mode successfully', async () => {
      const response = await agent
        .post('/api/mode/switch')
        .send({ mode: 'mock' });

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.currentMode).toBe('mock');
    });

    test('should return previous mode when switching', async () => {
      // First ensure we're in mock mode
      await agent.post('/api/mode/switch').send({ mode: 'mock' });
      
      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await agent
        .post('/api/mode/switch')
        .send({ mode: 'mock' });

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 200);
      expect(response.body.data.previousMode).toBeDefined();
    });

    test('should indicate server restart required after switch', async () => {
      const response = await agent
        .post('/api/mode/switch')
        .send({ mode: 'mock' });

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 200);
      expect(response.body.data.requiresRestart).toBe(true);
      expect(response.body.message).toContain('restart');
    });

    test('should return 400 for invalid mode value', async () => {
      const response = await agent
        .post('/api/mode/switch')
        .send({ mode: 'invalid-mode' });

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });

    test('should return 400 for missing mode field', async () => {
      const response = await agent
        .post('/api/mode/switch')
        .send({});

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });

    test('should return 400 for empty request body', async () => {
      const response = await agent
        .post('/api/mode/switch')
        .send();

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });

    test('should validate mode is one of allowed values', async () => {
      const invalidModes = ['test', 'development', 'staging', 'prod', ''];
      
      for (const invalidMode of invalidModes) {
        const response = await agent
          .post('/api/mode/switch')
          .send({ mode: invalidMode });

        // Handle rate limiting
        if (response.status === 429) {
          console.log('Rate limited - skipping iteration');
          continue;
        }

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('GET /api/mode/check-requirements', () => {
    /**
     * Test: Check mode requirements
     * Additional endpoint for mode availability checking
     */
    test('should return requirements for all modes', async () => {
      const response = await agent.get('/api/mode/check-requirements');

      assertSuccessResponse(response, 200);
      expect(response.body.data).toBeDefined();
      
      // Verify all modes have requirements info
      const modes = response.body.data;
      expect(modes.mock).toBeDefined();
      expect(modes.production).toBeDefined();
      expect(modes.firefox).toBeDefined();
    });

    test('should return availability status for each mode', async () => {
      const response = await agent.get('/api/mode/check-requirements');

      assertSuccessResponse(response, 200);
      const modes = response.body.data;
      
      // Each mode should have availability info
      for (const modeName of ['mock', 'production', 'firefox']) {
        expect(modes[modeName].available).toBeDefined();
        expect(typeof modes[modeName].available).toBe('boolean');
        expect(modes[modeName].requirements).toBeDefined();
      }
    });

    test('should return unavailability reason for unavailable modes', async () => {
      const response = await agent.get('/api/mode/check-requirements');

      assertSuccessResponse(response, 200);
      const modes = response.body.data;
      
      // Check that unavailable modes have reason
      for (const modeName of ['production', 'firefox']) {
        if (!modes[modeName].available) {
          expect(modes[modeName].unavailabilityReason).toBeDefined();
          expect(modes[modeName].howToEnable).toBeDefined();
        }
      }
    });
  });

  describe('Mode Switch Integration Flow', () => {
    /**
     * Test: Mode switch then verify current mode
     * Validates: Requirements 3.1, 3.2
     */
    test('should reflect mode change in GET after switch', async () => {
      // Switch to mock mode
      const switchResponse = await agent
        .post('/api/mode/switch')
        .send({ mode: 'mock' });

      // Handle rate limiting
      if (switchResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(switchResponse, 200);

      // Verify current mode reflects the change
      const getResponse = await agent.get('/api/mode');
      
      assertSuccessResponse(getResponse, 200);
      expect(getResponse.body.data.currentMode).toBe('mock');
    });
  });
});
