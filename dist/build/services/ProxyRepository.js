/**
 * Proxy Repository - SQLite-based proxy pool storage
 */

const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');
const logger = require('../utils/logger');

class ProxyRepository {
    constructor() {
        this.db = getDatabase();
        this.prepareStatements();
    }

    prepareStatements() {
        this.statements = {
            insert: this.db.prepare(`
                INSERT INTO proxy_pool (id, host, port, type, country, provider, username, password, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `),
            selectAll: this.db.prepare('SELECT * FROM proxy_pool ORDER BY created_at DESC'),
            selectActive: this.db.prepare('SELECT * FROM proxy_pool WHERE is_active = 1'),
            selectById: this.db.prepare('SELECT * FROM proxy_pool WHERE id = ?'),
            delete: this.db.prepare('DELETE FROM proxy_pool WHERE id = ?'),
            incrementUsage: this.db.prepare(`
                UPDATE proxy_pool SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?
            `),
            toggleActive: this.db.prepare('UPDATE proxy_pool SET is_active = ? WHERE id = ?'),
            getStats: this.db.prepare(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                    SUM(usage_count) as totalUsage
                FROM proxy_pool
            `)
        };
    }

    /**
     * Add proxy to pool
     */
    addProxy(proxyData) {
        try {
            const id = uuidv4();
            this.statements.insert.run(
                id,
                proxyData.host,
                proxyData.port,
                proxyData.type || 'http',
                proxyData.country || null,
                proxyData.provider || null,
                proxyData.username || null,
                proxyData.password || null
            );

            logger.info(`Proxy added: ${proxyData.host}:${proxyData.port}`);
            return this.getProxy(id);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error(`Proxy ${proxyData.host}:${proxyData.port} already exists`);
            }
            logger.error('Failed to add proxy:', error);
            throw error;
        }
    }

    /**
     * Get all proxies
     */
    getAllProxies() {
        try {
            const rows = this.statements.selectAll.all();
            return rows.map(row => this.deserializeProxy(row));
        } catch (error) {
            logger.error('Failed to get proxies:', error);
            return [];
        }
    }

    /**
     * Get active proxies only
     */
    getActiveProxies() {
        try {
            const rows = this.statements.selectActive.all();
            return rows.map(row => this.deserializeProxy(row));
        } catch (error) {
            logger.error('Failed to get active proxies:', error);
            return [];
        }
    }

    /**
     * Get proxy by ID
     */
    getProxy(id) {
        try {
            const row = this.statements.selectById.get(id);
            return row ? this.deserializeProxy(row) : null;
        } catch (error) {
            logger.error('Failed to get proxy:', error);
            return null;
        }
    }

    /**
     * Remove proxy from pool
     */
    removeProxy(id) {
        try {
            const result = this.statements.delete.run(id);
            if (result.changes > 0) {
                logger.info(`Proxy removed: ${id}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Failed to remove proxy:', error);
            return false;
        }
    }

    /**
     * Get random proxy
     */
    getRandomProxy(filters = {}) {
        try {
            let query = 'SELECT * FROM proxy_pool WHERE is_active = 1';
            const params = [];

            if (filters.country) {
                query += ' AND country = ?';
                params.push(filters.country);
            }
            if (filters.type) {
                query += ' AND type = ?';
                params.push(filters.type);
            }
            if (filters.provider) {
                query += ' AND provider = ?';
                params.push(filters.provider);
            }

            query += ' ORDER BY RANDOM() LIMIT 1';

            const row = this.db.prepare(query).get(...params);
            if (row) {
                this.statements.incrementUsage.run(row.id);
                return this.deserializeProxy(row);
            }
            return null;
        } catch (error) {
            logger.error('Failed to get random proxy:', error);
            return null;
        }
    }

    /**
     * Get least used proxy
     */
    getLeastUsedProxy(filters = {}) {
        try {
            let query = 'SELECT * FROM proxy_pool WHERE is_active = 1';
            const params = [];

            if (filters.country) {
                query += ' AND country = ?';
                params.push(filters.country);
            }
            if (filters.type) {
                query += ' AND type = ?';
                params.push(filters.type);
            }

            query += ' ORDER BY usage_count ASC LIMIT 1';

            const row = this.db.prepare(query).get(...params);
            if (row) {
                this.statements.incrementUsage.run(row.id);
                return this.deserializeProxy(row);
            }
            return null;
        } catch (error) {
            logger.error('Failed to get least used proxy:', error);
            return null;
        }
    }

    /**
     * Toggle proxy active status
     */
    toggleProxyStatus(id) {
        try {
            const proxy = this.getProxy(id);
            if (!proxy) return null;

            const newStatus = proxy.active ? 0 : 1;
            this.statements.toggleActive.run(newStatus, id);
            return newStatus === 1;
        } catch (error) {
            logger.error('Failed to toggle proxy status:', error);
            return null;
        }
    }

    /**
     * Get pool statistics
     */
    getPoolStats() {
        try {
            const stats = this.statements.getStats.get();
            const byCountry = this.db.prepare(`
                SELECT country, COUNT(*) as count FROM proxy_pool 
                WHERE is_active = 1 AND country IS NOT NULL 
                GROUP BY country
            `).all();
            const byType = this.db.prepare(`
                SELECT type, COUNT(*) as count FROM proxy_pool 
                WHERE is_active = 1 
                GROUP BY type
            `).all();

            return {
                total: stats.total,
                active: stats.active,
                inactive: stats.total - stats.active,
                totalUsage: stats.totalUsage || 0,
                byCountry: Object.fromEntries(byCountry.map(r => [r.country, r.count])),
                byType: Object.fromEntries(byType.map(r => [r.type, r.count]))
            };
        } catch (error) {
            logger.error('Failed to get pool stats:', error);
            return {};
        }
    }

    /**
     * Deserialize proxy row
     */
    deserializeProxy(row) {
        return {
            id: row.id,
            host: row.host,
            port: row.port,
            type: row.type,
            country: row.country,
            provider: row.provider,
            username: row.username,
            password: row.password,
            usageCount: row.usage_count,
            lastUsed: row.last_used,
            active: row.is_active === 1,
            createdAt: row.created_at
        };
    }
}

module.exports = new ProxyRepository();
