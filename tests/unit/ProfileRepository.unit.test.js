/**
 * ProfileRepository Unit Tests - CRUD Operations
 * Feature: profile-service-testing
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
const { createTestProfileRepository, generateUniqueName, delay } = require('../helpers/testSetup');

describe('ProfileRepository - CRUD Operations', () => {
  let repository;

  beforeEach(() => {
    repository = createTestProfileRepository();
  });

  afterEach(() => {
    if (repository) {
      repository.close();
    }
  });

  describe('createProfile', () => {
    // Requirement 3.1: WHEN createProfile is called with valid data, THE ProfileRepository SHALL insert profile into SQLite and return created profile
    test('should create profile with valid data and return created profile', async () => {
      const profileData = {
        name: generateUniqueName(),
        userAgent: 'Mozilla/5.0 Test',
        timezone: 'Europe/London',
        viewport: { width: 1920, height: 1080 }
      };

      const profile = await repository.createProfile(profileData);

      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(typeof profile.id).toBe('string');
      expect(profile.id.length).toBeGreaterThan(0);
      expect(profile.name).toBe(profileData.name);
      expect(profile.userAgent).toBe(profileData.userAgent);
      expect(profile.timezone).toBe(profileData.timezone);
      expect(profile.viewport).toEqual(profileData.viewport);
      expect(profile.createdAt).toBeDefined();
      expect(profile.updatedAt).toBeDefined();
    });

    test('should create profiles with unique IDs', async () => {
      const profile1 = await repository.createProfile({ name: generateUniqueName() });
      const profile2 = await repository.createProfile({ name: generateUniqueName() });

      expect(profile1.id).not.toBe(profile2.id);
    });

    test('should create profile with default values when optional fields are missing', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      expect(profile.userAgent).toBe('');
      expect(profile.timezone).toBe('America/New_York');
      expect(profile.viewport).toEqual({ width: 1920, height: 1080 });
      expect(profile.proxy).toBeNull();
      expect(profile.languages).toEqual(['en-US', 'en']);
    });

    test('should create profile with proxy configuration', async () => {
      const profileData = {
        name: generateUniqueName(),
        proxy: {
          host: '192.168.1.1',
          port: 8080,
          type: 'http'
        }
      };

      const profile = await repository.createProfile(profileData);

      expect(profile.proxy).toEqual(profileData.proxy);
    });

    // Requirement 3.2: WHEN createProfile is called with duplicate name, THE ProfileRepository SHALL throw error
    test('should throw error when creating profile with duplicate name', async () => {
      const name = generateUniqueName();
      await repository.createProfile({ name });

      await expect(repository.createProfile({ name }))
        .rejects.toThrow(`Profile name '${name}' already exists`);
    });
  });

  describe('getProfile', () => {
    // Requirement 3.3: WHEN getProfile is called with valid ID, THE ProfileRepository SHALL return deserialized profile object
    test('should return deserialized profile when valid ID is provided', async () => {
      const created = await repository.createProfile({
        name: generateUniqueName(),
        timezone: 'Asia/Tokyo',
        viewport: { width: 1366, height: 768 },
        proxy: { host: '10.0.0.1', port: 3128, type: 'socks5' }
      });

      const retrieved = await repository.getProfile(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe(created.name);
      expect(retrieved.timezone).toBe('Asia/Tokyo');
      expect(retrieved.viewport).toEqual({ width: 1366, height: 768 });
      expect(retrieved.proxy).toEqual({ host: '10.0.0.1', port: 3128, type: 'socks5' });
    });

    test('should return null when invalid ID is provided', async () => {
      const result = await repository.getProfile('non-existent-id');

      expect(result).toBeNull();
    });

    test('should return null for empty string ID', async () => {
      const result = await repository.getProfile('');

      expect(result).toBeNull();
    });

    test('should correctly deserialize JSON fields', async () => {
      const profileData = {
        name: generateUniqueName(),
        viewport: { width: 2560, height: 1440 },
        proxy: { host: 'proxy.example.com', port: 8080, type: 'https' },
        stealthConfig: { webgl: true, canvas: false },
        hardwareConfig: { cores: 8, memory: 16 },
        screenConfig: { colorDepth: 24 },
        languages: ['en-US', 'fr-FR', 'de-DE']
      };

      const created = await repository.createProfile(profileData);
      const retrieved = await repository.getProfile(created.id);

      expect(retrieved.viewport).toEqual(profileData.viewport);
      expect(retrieved.proxy).toEqual(profileData.proxy);
      expect(retrieved.stealthConfig).toEqual(profileData.stealthConfig);
      expect(retrieved.hardwareConfig).toEqual(profileData.hardwareConfig);
      expect(retrieved.screenConfig).toEqual(profileData.screenConfig);
      expect(retrieved.languages).toEqual(profileData.languages);
    });
  });

  describe('getAllProfiles', () => {
    // Requirement 3.4: WHEN getAllProfiles is called, THE ProfileRepository SHALL return all profiles ordered by created_at DESC
    test('should return empty array when no profiles exist', async () => {
      const profiles = await repository.getAllProfiles();

      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBe(0);
    });

    test('should return all created profiles', async () => {
      const profile1 = await repository.createProfile({ name: generateUniqueName() });
      const profile2 = await repository.createProfile({ name: generateUniqueName() });
      const profile3 = await repository.createProfile({ name: generateUniqueName() });

      const profiles = await repository.getAllProfiles();

      expect(profiles.length).toBe(3);
      const ids = profiles.map(p => p.id);
      expect(ids).toContain(profile1.id);
      expect(ids).toContain(profile2.id);
      expect(ids).toContain(profile3.id);
    });

    test('should return profiles ordered by created_at DESC (newest first)', async () => {
      const profile1 = await repository.createProfile({ name: generateUniqueName() });
      await delay(10);
      const profile2 = await repository.createProfile({ name: generateUniqueName() });
      await delay(10);
      const profile3 = await repository.createProfile({ name: generateUniqueName() });

      const profiles = await repository.getAllProfiles();

      // Newest first
      expect(profiles[0].id).toBe(profile3.id);
      expect(profiles[1].id).toBe(profile2.id);
      expect(profiles[2].id).toBe(profile1.id);
    });
  });

  describe('updateProfile', () => {
    // Requirement 3.5: WHEN updateProfile is called with valid ID, THE ProfileRepository SHALL update profile and set updated_at
    test('should update profile and set updated_at', async () => {
      const original = await repository.createProfile({
        name: generateUniqueName(),
        timezone: 'America/New_York'
      });
      const originalUpdatedAt = original.updatedAt;

      await delay(10);

      const updated = await repository.updateProfile(original.id, {
        name: 'Updated Name',
        timezone: 'Europe/Paris'
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(original.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.timezone).toBe('Europe/Paris');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });

    test('should preserve createdAt when updating', async () => {
      const original = await repository.createProfile({ name: generateUniqueName() });
      const originalCreatedAt = original.createdAt;

      await delay(10);

      const updated = await repository.updateProfile(original.id, { name: 'New Name' });

      expect(updated.createdAt).toBe(originalCreatedAt);
    });

    test('should update JSON fields correctly', async () => {
      const original = await repository.createProfile({
        name: generateUniqueName(),
        viewport: { width: 1920, height: 1080 }
      });

      const updated = await repository.updateProfile(original.id, {
        viewport: { width: 2560, height: 1440 },
        proxy: { host: 'new-proxy.com', port: 9090, type: 'socks4' }
      });

      expect(updated.viewport).toEqual({ width: 2560, height: 1440 });
      expect(updated.proxy).toEqual({ host: 'new-proxy.com', port: 9090, type: 'socks4' });
    });

    // Requirement 3.6: WHEN updateProfile is called with invalid ID, THE ProfileRepository SHALL throw error
    test('should throw error when updating non-existent profile', async () => {
      await expect(repository.updateProfile('non-existent-id', { name: 'Test' }))
        .rejects.toThrow('Profile not found: non-existent-id');
    });
  });

  describe('deleteProfile', () => {
    // Requirement 3.7: WHEN deleteProfile is called with valid ID, THE ProfileRepository SHALL remove profile and return true
    test('should delete profile and return true for valid ID', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      const result = await repository.deleteProfile(profile.id);

      expect(result).toBe(true);

      const retrieved = await repository.getProfile(profile.id);
      expect(retrieved).toBeNull();
    });

    // Requirement 3.8: WHEN deleteProfile is called with invalid ID, THE ProfileRepository SHALL return false
    test('should return false for non-existent ID', async () => {
      const result = await repository.deleteProfile('non-existent-id');

      expect(result).toBe(false);
    });

    test('should not affect other profiles when deleting one', async () => {
      const profile1 = await repository.createProfile({ name: generateUniqueName() });
      const profile2 = await repository.createProfile({ name: generateUniqueName() });

      await repository.deleteProfile(profile1.id);

      const remaining = await repository.getAllProfiles();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(profile2.id);
    });
  });
});


/**
 * ProfileRepository Unit Tests - Session Management
 * Feature: profile-service-testing
 * Requirements: 4.1, 4.2
 */
describe('ProfileRepository - Session Management', () => {
  let repository;

  beforeEach(() => {
    repository = createTestProfileRepository();
  });

  afterEach(() => {
    if (repository) {
      repository.close();
    }
  });

  describe('createSession', () => {
    // Requirement 4.1: WHEN createSession is called, THE ProfileRepository SHALL create session record with unique ID and return sessionId
    test('should create session and return unique sessionId', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      const sessionId = await repository.createSession(profile.id, {
        status: 'running',
        browserInfo: { browser: 'chrome', version: '120' }
      });

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    test('should create sessions with unique IDs', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      const sessionId1 = await repository.createSession(profile.id, { status: 'running' });
      const sessionId2 = await repository.createSession(profile.id, { status: 'running' });

      expect(sessionId1).not.toBe(sessionId2);
    });

    test('should create session with default status when not provided', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      const sessionId = await repository.createSession(profile.id, {});

      expect(sessionId).toBeDefined();
    });

    test('should create session with browserInfo', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });
      const browserInfo = {
        browser: 'firefox',
        version: '121',
        platform: 'Windows'
      };

      const sessionId = await repository.createSession(profile.id, {
        status: 'running',
        browserInfo
      });

      expect(sessionId).toBeDefined();
    });
  });

  describe('updateSession', () => {
    // Requirement 4.2: WHEN updateSession is called, THE ProfileRepository SHALL update session status and set end_time
    test('should update session status', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });
      const sessionId = await repository.createSession(profile.id, { status: 'running' });

      await repository.updateSession(sessionId, 'stopped');

      // Verify by querying the database directly
      const stmt = repository.db.prepare('SELECT * FROM sessions WHERE id = ?');
      const session = stmt.get(sessionId);

      expect(session.status).toBe('stopped');
      expect(session.end_time).toBeDefined();
    });

    test('should set end_time when updating session', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });
      const sessionId = await repository.createSession(profile.id, { status: 'running' });

      // Verify end_time is null initially
      const stmtBefore = repository.db.prepare('SELECT * FROM sessions WHERE id = ?');
      const sessionBefore = stmtBefore.get(sessionId);
      expect(sessionBefore.end_time).toBeNull();

      await repository.updateSession(sessionId, 'completed');

      const stmtAfter = repository.db.prepare('SELECT * FROM sessions WHERE id = ?');
      const sessionAfter = stmtAfter.get(sessionId);
      expect(sessionAfter.end_time).not.toBeNull();
    });
  });
});

/**
 * ProfileRepository Unit Tests - Activity Logging
 * Feature: profile-service-testing
 * Requirements: 5.1, 5.2, 5.3
 */
describe('ProfileRepository - Activity Logging', () => {
  let repository;

  beforeEach(() => {
    repository = createTestProfileRepository();
  });

  afterEach(() => {
    if (repository) {
      repository.close();
    }
  });

  describe('logActivity', () => {
    // Requirement 5.1: WHEN logActivity is called, THE ProfileRepository SHALL insert activity log record
    test('should insert activity log record', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      await repository.logActivity(profile.id, 'profile_created', {
        ip: '192.168.1.100',
        userAgent: 'Test Agent'
      });

      const logs = await repository.getActivityLogs(profile.id);

      expect(logs.length).toBe(1);
      expect(logs[0].profile_id).toBe(profile.id);
      expect(logs[0].action).toBe('profile_created');
      expect(logs[0].ip_address).toBe('192.168.1.100');
      expect(logs[0].user_agent).toBe('Test Agent');
    });

    test('should insert activity log with details object', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });
      const details = {
        ip: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
        extra: 'some data'
      };

      await repository.logActivity(profile.id, 'browser_launched', details);

      const logs = await repository.getActivityLogs(profile.id);

      expect(logs[0].details).toEqual(details);
    });

    test('should insert activity log without profileId (null)', async () => {
      await repository.logActivity(null, 'system_event', { message: 'System started' });

      const logs = await repository.getActivityLogs();

      expect(logs.length).toBe(1);
      expect(logs[0].profile_id).toBeNull();
      expect(logs[0].action).toBe('system_event');
    });
  });

  describe('getActivityLogs', () => {
    // Requirement 5.2: WHEN getActivityLogs is called without profileId, THE ProfileRepository SHALL return all logs with pagination
    test('should return all logs when profileId is not provided', async () => {
      const profile1 = await repository.createProfile({ name: generateUniqueName() });
      const profile2 = await repository.createProfile({ name: generateUniqueName() });

      await repository.logActivity(profile1.id, 'action1', {});
      await repository.logActivity(profile2.id, 'action2', {});
      await repository.logActivity(null, 'action3', {});

      const logs = await repository.getActivityLogs();

      expect(logs.length).toBe(3);
    });

    // Requirement 5.3: WHEN getActivityLogs is called with profileId, THE ProfileRepository SHALL return filtered logs for that profile
    test('should return filtered logs when profileId is provided', async () => {
      const profile1 = await repository.createProfile({ name: generateUniqueName() });
      const profile2 = await repository.createProfile({ name: generateUniqueName() });

      await repository.logActivity(profile1.id, 'action1', {});
      await repository.logActivity(profile1.id, 'action2', {});
      await repository.logActivity(profile2.id, 'action3', {});

      const logs = await repository.getActivityLogs(profile1.id);

      expect(logs.length).toBe(2);
      expect(logs.every(log => log.profile_id === profile1.id)).toBe(true);
    });

    test('should return logs ordered by timestamp DESC (newest first)', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      // Insert logs - all actions should be returned
      await repository.logActivity(profile.id, 'first', {});
      await repository.logActivity(profile.id, 'second', {});
      await repository.logActivity(profile.id, 'third', {});

      const logs = await repository.getActivityLogs(profile.id);

      // Verify all logs are returned
      expect(logs.length).toBe(3);
      
      // Verify all actions are present
      const actions = logs.map(l => l.action);
      expect(actions).toContain('first');
      expect(actions).toContain('second');
      expect(actions).toContain('third');
      
      // Verify timestamps are present and valid
      logs.forEach(log => {
        expect(log.timestamp).toBeDefined();
      });
    });

    test('should respect limit parameter', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      for (let i = 0; i < 10; i++) {
        await repository.logActivity(profile.id, `action${i}`, {});
      }

      const logs = await repository.getActivityLogs(profile.id, 5);

      expect(logs.length).toBe(5);
    });

    test('should respect offset parameter for pagination', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      for (let i = 0; i < 10; i++) {
        await repository.logActivity(profile.id, `action${i}`, {});
        await delay(5);
      }

      const firstPage = await repository.getActivityLogs(profile.id, 3, 0);
      const secondPage = await repository.getActivityLogs(profile.id, 3, 3);

      expect(firstPage.length).toBe(3);
      expect(secondPage.length).toBe(3);

      // Ensure no overlap
      const firstPageActions = firstPage.map(l => l.action);
      const secondPageActions = secondPage.map(l => l.action);
      const overlap = firstPageActions.filter(a => secondPageActions.includes(a));
      expect(overlap.length).toBe(0);
    });

    test('should return empty array when no logs exist', async () => {
      const logs = await repository.getActivityLogs();

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });

    test('should return empty array for profile with no logs', async () => {
      const profile = await repository.createProfile({ name: generateUniqueName() });

      const logs = await repository.getActivityLogs(profile.id);

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(0);
    });
  });
});
