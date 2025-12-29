/**
 * Test Setup - Mock utilities and helper functions for ProfileService and ProfileRepository testing
 * Feature: profile-service-testing
 * Validates: Requirements 1.1, 3.1
 */
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Create a fresh ProfileService instance for testing
 * This creates a new instance that doesn't share state with the singleton
 */
function createFreshProfileService() {
  // Clear require cache to get fresh instance
  const servicePath = require.resolve('../../services/ProfileService');
  delete require.cache[servicePath];
  
  // Create a mock fs module for testing
  const mockFs = createMockFs();
  
  // We need to create a new class instance, not use the singleton
  const ProfileServiceClass = class {
    constructor() {
      this.profiles = new Map();
      this.initialized = false;
      this.mockFs = mockFs;
    }

    async initialize() {
      if (this.initialized) return;
      this.profiles = new Map();
      this.initialized = true;
    }

    async loadProfiles() {
      // No-op for testing - profiles are in memory
    }

    async saveProfiles() {
      // No-op for testing - profiles are in memory
    }

    async createProfile(profileData) {
      await this.initialize();
      
      const { v4: uuidv4 } = require('uuid');
      const profile = {
        id: uuidv4(),
        name: profileData.name,
        userAgent: profileData.userAgent || this.getRandomUserAgent(),
        timezone: profileData.timezone || 'America/New_York',
        proxy: profileData.proxy || null,
        viewport: profileData.viewport || { width: 1366, height: 768 },
        spoofFingerprint: profileData.spoofFingerprint !== false,
        defaultHeadless: profileData.defaultHeadless ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.validateProfile(profile);
      this.profiles.set(profile.id, profile);
      return profile;
    }

    async getAllProfiles() {
      await this.initialize();
      return Array.from(this.profiles.values());
    }

    async getProfile(id) {
      await this.initialize();
      return this.profiles.get(id) || null;
    }

    async updateProfile(id, updateData) {
      await this.initialize();
      
      const profile = this.profiles.get(id);
      if (!profile) return null;
      
      const updatedProfile = {
        ...profile,
        ...updateData,
        id: profile.id,
        createdAt: profile.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      this.validateProfile(updatedProfile);
      this.profiles.set(id, updatedProfile);
      return updatedProfile;
    }

    async deleteProfile(id) {
      await this.initialize();
      
      const profile = this.profiles.get(id);
      if (!profile) return false;
      
      this.profiles.delete(id);
      return true;
    }

    validateProfile(profile) {
      if (!profile.name || typeof profile.name !== 'string') {
        throw new Error('Profile name is required and must be a string');
      }
      
      if (profile.name.trim().length === 0) {
        throw new Error('Profile name is required and must be a string');
      }
      
      if (profile.viewport) {
        if (!profile.viewport.width || !profile.viewport.height) {
          throw new Error('Viewport width and height are required');
        }
        if (profile.viewport.width < 100 || profile.viewport.height < 100) {
          throw new Error('Viewport dimensions must be at least 100x100');
        }
      }
      
      if (profile.proxy) {
        if (!profile.proxy.host || !profile.proxy.port) {
          throw new Error('Proxy host and port are required when proxy is specified');
        }
        if (!['http', 'https', 'socks4', 'socks5'].includes(profile.proxy.type)) {
          profile.proxy.type = 'http';
        }
      }
      
      if (profile.defaultHeadless !== undefined && typeof profile.defaultHeadless !== 'boolean') {
        throw new Error('defaultHeadless must be a boolean');
      }
    }

    getRandomUserAgent() {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];
      return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    reset() {
      this.profiles.clear();
      this.initialized = false;
    }
  };

  return new ProfileServiceClass();
}

/**
 * Create a mock fs module for ProfileService testing
 */
function createMockFs() {
  let fileContent = '[]';
  
  return {
    promises: {
      readFile: jest.fn().mockImplementation(async () => fileContent),
      writeFile: jest.fn().mockImplementation(async (path, content) => {
        fileContent = content;
      }),
      mkdir: jest.fn().mockResolvedValue(undefined)
    },
    setContent: (content) => {
      fileContent = typeof content === 'string' ? content : JSON.stringify(content);
    },
    getContent: () => fileContent,
    reset: () => {
      fileContent = '[]';
    }
  };
}

/**
 * Create an in-memory ProfileRepository for testing
 */
function createTestProfileRepository() {
  const db = new Database(':memory:');
  
  // Initialize tables
  db.exec(`
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
    CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
  `);

  db.exec(`
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

  // Prepare statements
  const statements = {
    insert: db.prepare(`
      INSERT INTO profiles (id, name, user_agent, timezone, viewport, proxy, stealth_config, hardware_config, screen_config, languages, auto_navigate_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    update: db.prepare(`
      UPDATE profiles 
      SET name = ?, user_agent = ?, timezone = ?, viewport = ?, proxy = ?, 
          stealth_config = ?, hardware_config = ?, screen_config = ?, languages = ?, 
          auto_navigate_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    selectAll: db.prepare('SELECT * FROM profiles ORDER BY created_at DESC'),
    selectById: db.prepare('SELECT * FROM profiles WHERE id = ?'),
    selectByName: db.prepare('SELECT * FROM profiles WHERE name = ?'),
    delete: db.prepare('DELETE FROM profiles WHERE id = ?'),
    insertSession: db.prepare(`
      INSERT INTO sessions (id, profile_id, status, browser_info)
      VALUES (?, ?, ?, ?)
    `),
    updateSession: db.prepare(`
      UPDATE sessions SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?
    `),
    insertLog: db.prepare(`
      INSERT INTO activity_logs (profile_id, action, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `)
  };

  function deserializeProfile(row) {
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

  return {
    db,
    statements,

    async createProfile(profileData) {
      const { v4: uuidv4 } = require('uuid');
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

        statements.insert.run(
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

        return this.getProfile(id);
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          throw new Error(`Profile name '${profileData.name}' already exists`);
        }
        throw error;
      }
    },

    async getProfile(id) {
      const row = statements.selectById.get(id);
      return row ? deserializeProfile(row) : null;
    },

    async getAllProfiles() {
      const rows = statements.selectAll.all();
      return rows.map(row => deserializeProfile(row));
    },

    async updateProfile(id, updates) {
      const existingProfile = await this.getProfile(id);
      if (!existingProfile) {
        throw new Error(`Profile not found: ${id}`);
      }

      const profile = { ...existingProfile, ...updates };

      try {
        statements.update.run(
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

        return this.getProfile(id);
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          throw new Error(`Profile name '${updates.name}' already exists`);
        }
        throw error;
      }
    },

    async deleteProfile(id) {
      const profile = await this.getProfile(id);
      if (!profile) {
        return false;
      }
      const result = statements.delete.run(id);
      return result.changes > 0;
    },

    async createSession(profileId, sessionData) {
      const { v4: uuidv4 } = require('uuid');
      const sessionId = uuidv4();
      statements.insertSession.run(
        sessionId,
        profileId,
        sessionData.status || 'running',
        JSON.stringify(sessionData.browserInfo || {})
      );
      return sessionId;
    },

    async updateSession(sessionId, status) {
      statements.updateSession.run(status, sessionId);
    },

    async logActivity(profileId, action, details = {}) {
      statements.insertLog.run(
        profileId,
        action,
        JSON.stringify(details),
        details.ip || null,
        details.userAgent || null
      );
    },

    async getActivityLogs(profileId = null, limit = 100, offset = 0) {
      let query = 'SELECT * FROM activity_logs';
      let params = [];

      if (profileId) {
        query += ' WHERE profile_id = ?';
        params.push(profileId);
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = db.prepare(query);
      const rows = stmt.all(...params);

      return rows.map(row => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : {}
      }));
    },

    reset() {
      db.exec('DELETE FROM activity_logs');
      db.exec('DELETE FROM sessions');
      db.exec('DELETE FROM profiles');
    },

    close() {
      db.close();
    }
  };
}

/**
 * Helper to wait for async operations
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to generate unique profile names for testing
 */
function generateUniqueName(prefix = 'test-profile') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  createFreshProfileService,
  createMockFs,
  createTestProfileRepository,
  delay,
  generateUniqueName
};
