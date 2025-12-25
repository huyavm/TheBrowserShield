/**
 * Proxy Pool Service
 * Uses SQLite-based ProxyRepository for storage
 */

const ProxyRepository = require('./ProxyRepository');
const logger = require('../utils/logger');

class ProxyPoolService {
    constructor() {
        this.repository = ProxyRepository;
    }

    /**
     * Add proxy to pool
     * @param {Object} proxyConfig - Proxy configuration
     * @returns {Object} Added proxy with ID
     */
    async addProxy(proxyConfig) {
        return this.repository.addProxy(proxyConfig);
    }

    /**
     * Remove proxy from pool
     * @param {string} proxyId - Proxy ID
     * @returns {boolean} True if removed
     */
    async removeProxy(proxyId) {
        return this.repository.removeProxy(proxyId);
    }

    /**
     * Get all proxies in pool
     * @returns {Array} Array of proxies
     */
    async getAllProxies() {
        return this.repository.getAllProxies();
    }

    /**
     * Get random proxy from pool
     * @param {Object} filters - Optional filters
     * @returns {Object|null} Random proxy or null if none available
     */
    async getRandomProxy(filters = {}) {
        return this.repository.getRandomProxy(filters);
    }

    /**
     * Get least used proxy from pool
     * @param {Object} filters - Optional filters
     * @returns {Object|null} Least used proxy or null if none available
     */
    async getLeastUsedProxy(filters = {}) {
        return this.repository.getLeastUsedProxy(filters);
    }

    /**
     * Test proxy connectivity
     * @param {Object} proxy - Proxy configuration
     * @returns {Object} Test result
     */
    async testProxy(proxy) {
        // Mock implementation for demo
        const testResult = {
            proxyId: proxy.id,
            host: proxy.host,
            port: proxy.port,
            tested: true,
            success: Math.random() > 0.2, // 80% success rate for demo
            responseTime: Math.floor(Math.random() * 1000) + 100,
            testedAt: new Date().toISOString(),
            mock: true
        };

        logger.info(`Proxy test ${testResult.success ? 'passed' : 'failed'}: ${proxy.host}:${proxy.port}`);
        return testResult;
    }

    /**
     * Get proxy pool statistics
     * @returns {Object} Statistics
     */
    async getPoolStats() {
        return this.repository.getPoolStats();
    }

    /**
     * Toggle proxy active status
     * @param {string} proxyId - Proxy ID
     * @returns {boolean} New active status
     */
    async toggleProxyStatus(proxyId) {
        return this.repository.toggleProxyStatus(proxyId);
    }
}

module.exports = new ProxyPoolService();