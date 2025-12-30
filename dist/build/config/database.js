/**
 * Unified Database Module
 * Manages SQLite database connections for all services
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_PATH = path.join(__dirname, '../data/browsershield.db');
const DATA_DIR = path.dirname(DB_PATH);

let db = null;

/**
 * Initialize database connection
 */
function initDatabase() {
    if (db) return db;

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Initialize all tables
    initializeTables();

    logger.info('Database initialized', { path: DB_PATH });
    return db;
}

/**
 * Initialize all database tables
 */
function initializeTables() {
    // Profiles table
    db.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            user_agent TEXT,
            timezone TEXT DEFAULT 'America/New_York',
            viewport TEXT DEFAULT '{"width":1920,"height":1080}',
            proxy TEXT,
            spoof_fingerprint INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Proxy pool table
    db.exec(`
        CREATE TABLE IF NOT EXISTS proxy_pool (
            id TEXT PRIMARY KEY,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            type TEXT DEFAULT 'http',
            country TEXT,
            provider TEXT,
            username TEXT,
            password TEXT,
            usage_count INTEGER DEFAULT 0,
            last_used DATETIME,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(host, port)
        )
    `);

    // Activity logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
        )
    `);

    // Sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL,
            status TEXT DEFAULT 'running',
            start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_time DATETIME,
            browser_info TEXT,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        )
    `);

    // Create indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
        CREATE INDEX IF NOT EXISTS idx_proxy_pool_active ON proxy_pool(is_active);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_profile ON activity_logs(profile_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
    `);
}

/**
 * Get database instance
 */
function getDatabase() {
    if (!db) {
        initDatabase();
    }
    return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        logger.info('Database connection closed');
    }
}

/**
 * Migrate data from JSON files to SQLite
 */
async function migrateFromJSON() {
    const profilesFile = path.join(DATA_DIR, 'profiles.json');
    const proxyPoolFile = path.join(DATA_DIR, 'proxy-pool.json');

    const db = getDatabase();
    const results = { profiles: 0, proxies: 0 };

    // Migrate profiles
    if (fs.existsSync(profilesFile)) {
        try {
            const profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
            const stmt = db.prepare(`
                INSERT OR IGNORE INTO profiles (id, name, user_agent, timezone, viewport, proxy, spoof_fingerprint, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const profile of profiles) {
                stmt.run(
                    profile.id,
                    profile.name,
                    profile.userAgent || '',
                    profile.timezone || 'America/New_York',
                    JSON.stringify(profile.viewport || { width: 1920, height: 1080 }),
                    JSON.stringify(profile.proxy || null),
                    profile.spoofFingerprint !== false ? 1 : 0,
                    profile.createdAt || new Date().toISOString(),
                    profile.updatedAt || new Date().toISOString()
                );
                results.profiles++;
            }
            logger.info(`Migrated ${results.profiles} profiles from JSON`);
        } catch (error) {
            logger.error('Failed to migrate profiles:', error);
        }
    }

    // Migrate proxy pool
    if (fs.existsSync(proxyPoolFile)) {
        try {
            const proxies = JSON.parse(fs.readFileSync(proxyPoolFile, 'utf8'));
            const stmt = db.prepare(`
                INSERT OR IGNORE INTO proxy_pool (id, host, port, type, country, provider, username, password, usage_count, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const proxy of proxies) {
                stmt.run(
                    proxy.id,
                    proxy.host,
                    proxy.port,
                    proxy.type || 'http',
                    proxy.country || null,
                    proxy.provider || null,
                    proxy.username || null,
                    proxy.password || null,
                    proxy.usageCount || 0,
                    proxy.active !== false ? 1 : 0
                );
                results.proxies++;
            }
            logger.info(`Migrated ${results.proxies} proxies from JSON`);
        } catch (error) {
            logger.error('Failed to migrate proxies:', error);
        }
    }

    return results;
}

/**
 * Get database statistics
 */
function getDatabaseStats() {
    const db = getDatabase();

    const stats = {
        profiles: db.prepare('SELECT COUNT(*) as count FROM profiles').get().count,
        proxies: db.prepare('SELECT COUNT(*) as count FROM proxy_pool').get().count,
        logs: db.prepare('SELECT COUNT(*) as count FROM activity_logs').get().count,
        sessions: db.prepare('SELECT COUNT(*) as count FROM sessions').get().count,
        databasePath: DB_PATH,
        databaseSize: fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0
    };

    return stats;
}

module.exports = {
    initDatabase,
    getDatabase,
    closeDatabase,
    migrateFromJSON,
    getDatabaseStats,
    DB_PATH,
    DATA_DIR
};
