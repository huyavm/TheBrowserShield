const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ProfileRepository {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/profiles.db');
        this.ensureDataDir();
        this.db = new Database(this.dbPath);
        this.init();
    }

    ensureDataDir() {
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    init() {
        // Create profiles table with enhanced schema
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                user_agent TEXT,
                timezone TEXT,
                viewport TEXT,
                proxy TEXT,
                stealth_config TEXT,
                hardware_config TEXT,
                screen_config TEXT,
                languages TEXT,
                auto_navigate_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for better performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
            CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
        `);

        // Create sessions table for better session management
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                profile_id TEXT NOT NULL,
                status TEXT NOT NULL,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                browser_info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
            )
        `);

        // Create activity logs table
        this.db.exec(`
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

        // Prepare statements for better performance
        this.statements = {
            insert: this.db.prepare(`
                INSERT INTO profiles (id, name, user_agent, timezone, viewport, proxy, stealth_config, hardware_config, screen_config, languages, auto_navigate_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),
            update: this.db.prepare(`
                UPDATE profiles 
                SET name = ?, user_agent = ?, timezone = ?, viewport = ?, proxy = ?, 
                    stealth_config = ?, hardware_config = ?, screen_config = ?, languages = ?, 
                    auto_navigate_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `),
            selectAll: this.db.prepare('SELECT * FROM profiles ORDER BY created_at DESC'),
            selectById: this.db.prepare('SELECT * FROM profiles WHERE id = ?'),
            selectByName: this.db.prepare('SELECT * FROM profiles WHERE name = ?'),
            delete: this.db.prepare('DELETE FROM profiles WHERE id = ?'),
            insertSession: this.db.prepare(`
                INSERT INTO sessions (id, profile_id, status, browser_info)
                VALUES (?, ?, ?, ?)
            `),
            updateSession: this.db.prepare(`
                UPDATE sessions SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?
            `),
            insertLog: this.db.prepare(`
                INSERT INTO activity_logs (profile_id, action, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            `)
        };

        logger.info('ProfileRepository initialized with SQLite database');
    }

    /**
     * Create new profile
     */
    async createProfile(profileData) {
        try {
            const id = uuidv4();
            const profile = {
                id,
                name: profileData.name,
                userAgent: profileData.userAgent || '',
                timezone: profileData.timezone || 'America/New_York',
                viewport: profileData.viewport || { width: 1920, height: 1080 },
                proxy: profileData.proxy || null,
                stealthConfig: profileData.stealthConfig || {},
                hardwareConfig: profileData.hardwareConfig || {},
                screenConfig: profileData.screenConfig || {},
                languages: profileData.languages || ['en-US', 'en'],
                autoNavigateUrl: profileData.autoNavigateUrl || null
            };

            this.statements.insert.run(
                id,
                profile.name,
                profile.userAgent,
                profile.timezone,
                JSON.stringify(profile.viewport),
                JSON.stringify(profile.proxy),
                JSON.stringify(profile.stealthConfig),
                JSON.stringify(profile.hardwareConfig),
                JSON.stringify(profile.screenConfig),
                JSON.stringify(profile.languages),
                profile.autoNavigateUrl
            );

            logger.info(`Profile created: ${profile.name} (${id})`);
            return this.getProfile(id);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error(`Profile name '${profileData.name}' already exists`);
            }
            logger.error('Failed to create profile:', error);
            throw error;
        }
    }

    /**
     * Get profile by ID
     */
    async getProfile(id) {
        try {
            const row = this.statements.selectById.get(id);
            return row ? this.deserializeProfile(row) : null;
        } catch (error) {
            logger.error(`Failed to get profile ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get all profiles
     */
    async getAllProfiles() {
        try {
            const rows = this.statements.selectAll.all();
            return rows.map(row => this.deserializeProfile(row));
        } catch (error) {
            logger.error('Failed to get all profiles:', error);
            throw error;
        }
    }

    /**
     * Update profile
     */
    async updateProfile(id, updates) {
        try {
            const existingProfile = await this.getProfile(id);
            if (!existingProfile) {
                throw new Error(`Profile not found: ${id}`);
            }

            const profile = { ...existingProfile, ...updates };

            this.statements.update.run(
                profile.name,
                profile.userAgent,
                profile.timezone,
                JSON.stringify(profile.viewport),
                JSON.stringify(profile.proxy),
                JSON.stringify(profile.stealthConfig || {}),
                JSON.stringify(profile.hardwareConfig || {}),
                JSON.stringify(profile.screenConfig || {}),
                JSON.stringify(profile.languages || ['en-US', 'en']),
                profile.autoNavigateUrl,
                id
            );

            logger.info(`Profile updated: ${profile.name} (${id})`);
            return this.getProfile(id);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error(`Profile name '${updates.name}' already exists`);
            }
            logger.error(`Failed to update profile ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete profile
     */
    async deleteProfile(id) {
        try {
            const profile = await this.getProfile(id);
            if (!profile) {
                return false;
            }

            const result = this.statements.delete.run(id);
            logger.info(`Profile deleted: ${profile.name} (${id})`);
            return result.changes > 0;
        } catch (error) {
            logger.error(`Failed to delete profile ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create session record
     */
    async createSession(profileId, sessionData) {
        try {
            const sessionId = uuidv4();
            this.statements.insertSession.run(
                sessionId,
                profileId,
                sessionData.status || 'running',
                JSON.stringify(sessionData.browserInfo || {})
            );
            return sessionId;
        } catch (error) {
            logger.error('Failed to create session:', error);
            throw error;
        }
    }

    /**
     * Update session status
     */
    async updateSession(sessionId, status) {
        try {
            this.statements.updateSession.run(status, sessionId);
        } catch (error) {
            logger.error('Failed to update session:', error);
            throw error;
        }
    }

    /**
     * Log activity
     */
    async logActivity(profileId, action, details = {}) {
        try {
            this.statements.insertLog.run(
                profileId,
                action,
                JSON.stringify(details),
                details.ip || null,
                details.userAgent || null
            );
        } catch (error) {
            logger.error('Failed to log activity:', error);
        }
    }

    /**
     * Get activity logs with pagination
     */
    async getActivityLogs(profileId = null, limit = 100, offset = 0) {
        try {
            let query = 'SELECT * FROM activity_logs';
            let params = [];

            if (profileId) {
                query += ' WHERE profile_id = ?';
                params.push(profileId);
            }

            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = this.db.prepare(query);
            const rows = stmt.all(...params);

            return rows.map(row => ({
                ...row,
                details: row.details ? JSON.parse(row.details) : {}
            }));
        } catch (error) {
            logger.error('Failed to get activity logs:', error);
            return [];
        }
    }

    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const profileCount = this.db.prepare('SELECT COUNT(*) as count FROM profiles').get().count;
            const sessionCount = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
            const logCount = this.db.prepare('SELECT COUNT(*) as count FROM activity_logs').get().count;
            
            const dbSize = fs.statSync(this.dbPath).size;

            return {
                profiles: profileCount,
                sessions: sessionCount,
                logs: logCount,
                databaseSize: dbSize,
                databasePath: this.dbPath
            };
        } catch (error) {
            logger.error('Failed to get database stats:', error);
            return {};
        }
    }

    /**
     * Deserialize profile data from database row
     */
    deserializeProfile(row) {
        return {
            id: row.id,
            name: row.name,
            userAgent: row.user_agent,
            timezone: row.timezone,
            viewport: row.viewport ? JSON.parse(row.viewport) : { width: 1920, height: 1080 },
            proxy: row.proxy ? JSON.parse(row.proxy) : null,
            stealthConfig: row.stealth_config ? JSON.parse(row.stealth_config) : {},
            hardwareConfig: row.hardware_config ? JSON.parse(row.hardware_config) : {},
            screenConfig: row.screen_config ? JSON.parse(row.screen_config) : {},
            languages: row.languages ? JSON.parse(row.languages) : ['en-US', 'en'],
            autoNavigateUrl: row.auto_navigate_url,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }

    /**
     * Backup database
     */
    async backup(backupPath) {
        try {
            await this.db.backup(backupPath);
            logger.info(`Database backed up to: ${backupPath}`);
        } catch (error) {
            logger.error('Failed to backup database:', error);
            throw error;
        }
    }
}

module.exports = ProfileRepository;