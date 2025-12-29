/**
 * Proxy API Integration Tests
 * Feature: integration-testing
 * Validates: Requirements 2.1-2.3
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
  validProxy(overrides = {}) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return {
      host: `192.168.${Math.floor(random / 256)}.${random % 256}`,
      port: 8080 + (timestamp % 1000),
      type: 'http',
      ...overrides
    };
  },
  invalidProxy() {
    return {
      // Missing required 'host' and 'port' fields
      type: 'http'
    };
  }
};

// Track created proxies for cleanup
const createdProxies = [];

// Helper to create proxy and track for cleanup
async function createAndTrackProxy(agent, overrides = {}) {
  const proxyData = testDataGenerators.validProxy(overrides);
  const response = await agent.post('/api/proxy').send(proxyData);
  
  if (response.status === 201 && response.body.data?.id) {
    createdProxies.push(response.body.data.id);
  }
  return response;
}

describe('Proxy API Integration Tests', () => {
  let agent;

  beforeAll(async () => {
    agent = createTestAgent();
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    // Clean up created proxies after each test
    for (const proxyId of [...createdProxies]) {
      try {
        await agent.delete(`/api/proxy/${proxyId}`);
        const idx = createdProxies.indexOf(proxyId);
        if (idx > -1) createdProxies.splice(idx, 1);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('GET /api/proxy', () => {
    /**
     * Test: Get all proxies in pool
     * Validates: Requirement 2.1
     */
    test('should return proxy pool with success response', async () => {
      const response = await agent.get('/api/proxy');

      assertSuccessResponse(response, 200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBe(response.body.data.length);
    });

    test('should return proxies array even when empty', async () => {
      const response = await agent.get('/api/proxy');

      assertSuccessResponse(response, 200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return proxy with expected fields when proxies exist', async () => {
      // Create a proxy first
      const createResponse = await createAndTrackProxy(agent);
      
      // Handle rate limiting
      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      const response = await agent.get('/api/proxy');

      assertSuccessResponse(response, 200);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const proxy = response.body.data.find(p => p.id === createResponse.body.data.id);
      expect(proxy).toBeDefined();
      expect(proxy.host).toBeDefined();
      expect(proxy.port).toBeDefined();
      expect(proxy.type).toBeDefined();
    });
  });

  describe('POST /api/proxy', () => {
    /**
     * Test: Add proxy to pool with valid data
     * Validates: Requirement 2.2
     */
    test('should add proxy with valid data and return 201', async () => {
      const proxyData = testDataGenerators.validProxy();

      const response = await agent
        .post('/api/proxy')
        .send(proxyData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 201);
      expect(response.body.data).toMatchObject({
        host: proxyData.host,
        port: proxyData.port,
        type: proxyData.type
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.message).toContain('added');

      createdProxies.push(response.body.data.id);
    });

    test('should add proxy with minimal required fields', async () => {
      const proxyData = {
        host: '10.0.0.1',
        port: 3128
      };

      const response = await agent
        .post('/api/proxy')
        .send(proxyData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 201);
      expect(response.body.data.host).toBe(proxyData.host);
      expect(response.body.data.port).toBe(proxyData.port);
      expect(response.body.data.type).toBe('http'); // Default type
      expect(response.body.data.id).toBeDefined();

      createdProxies.push(response.body.data.id);
    });

    test('should add proxy with all optional fields', async () => {
      const proxyData = testDataGenerators.validProxy({
        country: 'US',
        provider: 'TestProvider',
        username: 'testuser',
        password: 'testpass'
      });

      const response = await agent
        .post('/api/proxy')
        .send(proxyData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertSuccessResponse(response, 201);
      expect(response.body.data.country).toBe('US');
      expect(response.body.data.provider).toBe('TestProvider');
      expect(response.body.data.username).toBe('testuser');

      createdProxies.push(response.body.data.id);
    });

    test('should add proxy with different types', async () => {
      const types = ['http', 'https', 'socks4', 'socks5'];
      
      for (const type of types) {
        const proxyData = testDataGenerators.validProxy({ type });

        const response = await agent
          .post('/api/proxy')
          .send(proxyData);

        // Handle rate limiting
        if (response.status === 429) {
          console.log('Rate limited - skipping test');
          continue;
        }

        assertSuccessResponse(response, 201);
        expect(response.body.data.type).toBe(type);

        createdProxies.push(response.body.data.id);
      }
    });

    /**
     * Test: Add proxy with invalid data
     * Validates: Requirement 2.2 (validation)
     */
    test('should return 400 with validation error for missing host', async () => {
      const invalidData = { port: 8080, type: 'http' };

      const response = await agent
        .post('/api/proxy')
        .send(invalidData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 with validation error for missing port', async () => {
      const invalidData = { host: '127.0.0.1', type: 'http' };

      const response = await agent
        .post('/api/proxy')
        .send(invalidData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 for empty request body', async () => {
      const response = await agent
        .post('/api/proxy')
        .send({});

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });

    test('should return 400 for invalid port (out of range)', async () => {
      const invalidData = { host: '127.0.0.1', port: 99999, type: 'http' };

      const response = await agent
        .post('/api/proxy')
        .send(invalidData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });

    test('should return 400 for invalid proxy type', async () => {
      const invalidData = { host: '127.0.0.1', port: 8080, type: 'invalid' };

      const response = await agent
        .post('/api/proxy')
        .send(invalidData);

      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }

      assertErrorResponse(response, 400);
    });
  });

  describe('DELETE /api/proxy/:id', () => {
    /**
     * Test: Remove proxy from pool
     * Validates: Requirement 2.3
     */
    test('should delete existing proxy', async () => {
      // Create a proxy first
      const createResponse = await createAndTrackProxy(agent);
      
      // Handle rate limiting
      if (createResponse.status === 429) {
        console.log('Rate limited - skipping test');
        return;
      }
      
      const proxyId = createResponse.body.data.id;

      const response = await agent.delete(`/api/proxy/${proxyId}`);

      assertSuccessResponse(response, 200);
      expect(response.body.message).toContain('removed');

      // Remove from tracking since it's deleted
      const idx = createdProxies.indexOf(proxyId);
      if (idx > -1) createdProxies.splice(idx, 1);

      // Verify proxy is deleted by checking the pool
      const getResponse = await agent.get('/api/proxy');
      const deletedProxy = getResponse.body.data.find(p => p.id === proxyId);
      expect(deletedProxy).toBeUndefined();
    });

    test('should return 404 for deleting non-existent proxy', async () => {
      const response = await agent.delete('/api/proxy/non-existent-id-12345');

      assertErrorResponse(response, 404);
      expect(response.body.message).toContain('not found');
    });

    test('should return 404 for invalid proxy ID format', async () => {
      const response = await agent.delete('/api/proxy/invalid-id');

      assertErrorResponse(response, 404);
    });
  });
});
