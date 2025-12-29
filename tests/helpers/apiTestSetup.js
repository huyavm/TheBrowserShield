/**
 * API Test Setup - Integration test utilities for API routes
 * Feature: integration-testing
 * Validates: Requirements 4.1-4.3
 */
const request = require('supertest');
const path = require('path');

// Set test environment before importing app
process.env.NODE_ENV = 'test';
process.env.SKIP_BROWSER_TESTS = 'true';

// Import the app
const app = require('../../server');

/**
 * Create a supertest request agent bound to the app
 * @returns {import('supertest').SuperTest<import('supertest').Test>}
 */
function createTestAgent() {
  return request(app);
}

/**
 * Test data generators for API testing
 */
const testDataGenerators = {
  /**
   * Generate valid profile data for testing
   * @param {Object} overrides - Optional field overrides
   * @returns {Object} Valid profile data
   */
  validProfile(overrides = {}) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return {
      name: `Test Profile ${timestamp}-${random}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      timezone: 'America/New_York',
      viewport: { width: 1920, height: 1080 },
      ...overrides
    };
  },

  /**
   * Generate invalid profile data for validation testing
   * @returns {Object} Invalid profile data (missing required fields)
   */
  invalidProfile() {
    return {
      // Missing required 'name' field
      userAgent: 'Mozilla/5.0...',
      timezone: 'America/New_York'
    };
  },

  /**
   * Generate valid proxy data for testing
   * @param {Object} overrides - Optional field overrides
   * @returns {Object} Valid proxy data
   */
  validProxy(overrides = {}) {
    return {
      host: '127.0.0.1',
      port: 8080 + Math.floor(Math.random() * 1000),
      type: 'http',
      ...overrides
    };
  },

  /**
   * Generate invalid proxy data for validation testing
   * @returns {Object} Invalid proxy data
   */
  invalidProxy() {
    return {
      // Missing required fields
      type: 'http'
    };
  }
};

/**
 * Cleanup utilities for test isolation
 */
const cleanup = {
  /** Track created profiles for cleanup */
  createdProfiles: [],
  
  /** Track created proxies for cleanup */
  createdProxies: [],

  /**
   * Register a profile for cleanup after tests
   * @param {string} profileId - Profile ID to track
   */
  trackProfile(profileId) {
    if (profileId && !this.createdProfiles.includes(profileId)) {
      this.createdProfiles.push(profileId);
    }
  },

  /**
   * Register a proxy for cleanup after tests
   * @param {string} proxyId - Proxy ID to track
   */
  trackProxy(proxyId) {
    if (proxyId && !this.createdProxies.includes(proxyId)) {
      this.createdProxies.push(proxyId);
    }
  },

  /**
   * Delete all tracked profiles
   * @returns {Promise<void>}
   */
  async cleanupProfiles() {
    const agent = createTestAgent();
    for (const profileId of this.createdProfiles) {
      try {
        await agent.delete(`/api/profiles/${profileId}`);
      } catch (error) {
        // Ignore cleanup errors - profile may already be deleted
      }
    }
    this.createdProfiles = [];
  },

  /**
   * Delete all tracked proxies
   * @returns {Promise<void>}
   */
  async cleanupProxies() {
    const agent = createTestAgent();
    for (const proxyId of this.createdProxies) {
      try {
        await agent.delete(`/api/proxy/${proxyId}`);
      } catch (error) {
        // Ignore cleanup errors - proxy may already be deleted
      }
    }
    this.createdProxies = [];
  },

  /**
   * Clean up all tracked test data
   * @returns {Promise<void>}
   */
  async cleanupAll() {
    await this.cleanupProfiles();
    await this.cleanupProxies();
  },

  /**
   * Reset tracking arrays without deleting
   */
  reset() {
    this.createdProfiles = [];
    this.createdProxies = [];
  }
};

/**
 * API helper functions for common operations
 */
const apiHelpers = {
  /**
   * Create a profile and track it for cleanup
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile response
   */
  async createProfile(profileData = {}) {
    const agent = createTestAgent();
    const data = testDataGenerators.validProfile(profileData);
    const response = await agent
      .post('/api/profiles')
      .send(data);
    
    if (response.body.success && response.body.data?.id) {
      cleanup.trackProfile(response.body.data.id);
    }
    return response;
  },

  /**
   * Create a proxy and track it for cleanup
   * @param {Object} proxyData - Proxy data
   * @returns {Promise<Object>} Created proxy response
   */
  async createProxy(proxyData = {}) {
    const agent = createTestAgent();
    const data = testDataGenerators.validProxy(proxyData);
    const response = await agent
      .post('/api/proxy')
      .send(data);
    
    if (response.body.success && response.body.data?.id) {
      cleanup.trackProxy(response.body.data.id);
    }
    return response;
  },

  /**
   * Get all profiles
   * @returns {Promise<Object>} Profiles response
   */
  async getAllProfiles() {
    const agent = createTestAgent();
    return agent.get('/api/profiles');
  },

  /**
   * Get profile by ID
   * @param {string} id - Profile ID
   * @returns {Promise<Object>} Profile response
   */
  async getProfile(id) {
    const agent = createTestAgent();
    return agent.get(`/api/profiles/${id}`);
  },

  /**
   * Update profile
   * @param {string} id - Profile ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated profile response
   */
  async updateProfile(id, updates) {
    const agent = createTestAgent();
    return agent.put(`/api/profiles/${id}`).send(updates);
  },

  /**
   * Delete profile
   * @param {string} id - Profile ID
   * @returns {Promise<Object>} Delete response
   */
  async deleteProfile(id) {
    const agent = createTestAgent();
    const response = await agent.delete(`/api/profiles/${id}`);
    // Remove from tracking if deleted successfully
    const index = cleanup.createdProfiles.indexOf(id);
    if (index > -1) {
      cleanup.createdProfiles.splice(index, 1);
    }
    return response;
  },

  /**
   * Get current mode
   * @returns {Promise<Object>} Mode response
   */
  async getCurrentMode() {
    const agent = createTestAgent();
    return agent.get('/api/mode');
  },

  /**
   * Switch mode
   * @param {string} mode - Mode to switch to
   * @returns {Promise<Object>} Switch response
   */
  async switchMode(mode) {
    const agent = createTestAgent();
    return agent.post('/api/mode/switch').send({ mode });
  },

  /**
   * Get proxy pool
   * @returns {Promise<Object>} Proxy pool response
   */
  async getProxyPool() {
    const agent = createTestAgent();
    return agent.get('/api/proxy');
  },

  /**
   * Delete proxy
   * @param {string} id - Proxy ID
   * @returns {Promise<Object>} Delete response
   */
  async deleteProxy(id) {
    const agent = createTestAgent();
    const response = await agent.delete(`/api/proxy/${id}`);
    // Remove from tracking if deleted successfully
    const index = cleanup.createdProxies.indexOf(id);
    if (index > -1) {
      cleanup.createdProxies.splice(index, 1);
    }
    return response;
  }
};

/**
 * Wait for server to be ready
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function waitForServer(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert response structure for success responses
 * @param {Object} response - Supertest response
 * @param {number} expectedStatus - Expected HTTP status code
 */
function assertSuccessResponse(response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(true);
}

/**
 * Assert response structure for error responses
 * @param {Object} response - Supertest response
 * @param {number} expectedStatus - Expected HTTP status code
 */
function assertErrorResponse(response, expectedStatus = 400) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
}

module.exports = {
  app,
  createTestAgent,
  testDataGenerators,
  cleanup,
  apiHelpers,
  waitForServer,
  assertSuccessResponse,
  assertErrorResponse
};
