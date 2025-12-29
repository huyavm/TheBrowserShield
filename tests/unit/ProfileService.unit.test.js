/**
 * ProfileService Unit Tests - CRUD Operations
 * Feature: profile-service-testing
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
const { createFreshProfileService, generateUniqueName } = require('../helpers/testSetup');

describe('ProfileService - CRUD Operations', () => {
  let profileService;

  beforeEach(() => {
    profileService = createFreshProfileService();
  });

  describe('createProfile', () => {
    // Requirement 1.1: WHEN a valid profile data is provided, THE ProfileService SHALL create a new profile with unique ID
    test('should create profile with valid data and unique ID', async () => {
      const profileData = {
        name: generateUniqueName(),
        userAgent: 'Mozilla/5.0 Test',
        timezone: 'Europe/London',
        viewport: { width: 1920, height: 1080 }
      };

      const profile = await profileService.createProfile(profileData);

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
      const profile1 = await profileService.createProfile({ name: generateUniqueName() });
      const profile2 = await profileService.createProfile({ name: generateUniqueName() });

      expect(profile1.id).not.toBe(profile2.id);
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

      const profile = await profileService.createProfile(profileData);

      expect(profile.proxy).toEqual(profileData.proxy);
    });
  });

  describe('getAllProfiles', () => {
    // Requirement 1.3: WHEN getAllProfiles is called, THE ProfileService SHALL return all profiles from storage
    test('should return empty array when no profiles exist', async () => {
      const profiles = await profileService.getAllProfiles();

      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBe(0);
    });

    test('should return all created profiles', async () => {
      const profile1 = await profileService.createProfile({ name: generateUniqueName() });
      const profile2 = await profileService.createProfile({ name: generateUniqueName() });
      const profile3 = await profileService.createProfile({ name: generateUniqueName() });

      const profiles = await profileService.getAllProfiles();

      expect(profiles.length).toBe(3);
      const ids = profiles.map(p => p.id);
      expect(ids).toContain(profile1.id);
      expect(ids).toContain(profile2.id);
      expect(ids).toContain(profile3.id);
    });
  });

  describe('getProfile', () => {
    // Requirement 1.4: WHEN getProfile is called with valid ID, THE ProfileService SHALL return the matching profile
    test('should return profile when valid ID is provided', async () => {
      const created = await profileService.createProfile({ 
        name: generateUniqueName(),
        timezone: 'Asia/Tokyo'
      });

      const retrieved = await profileService.getProfile(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe(created.name);
      expect(retrieved.timezone).toBe('Asia/Tokyo');
    });

    // Requirement 1.5: WHEN getProfile is called with invalid ID, THE ProfileService SHALL return null
    test('should return null when invalid ID is provided', async () => {
      const result = await profileService.getProfile('non-existent-id');

      expect(result).toBeNull();
    });

    test('should return null for empty string ID', async () => {
      const result = await profileService.getProfile('');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    // Requirement 1.6: WHEN updateProfile is called with valid ID, THE ProfileService SHALL update profile and preserve ID and createdAt
    test('should update profile and preserve ID and createdAt', async () => {
      const original = await profileService.createProfile({ 
        name: generateUniqueName(),
        timezone: 'America/New_York'
      });
      const originalCreatedAt = original.createdAt;

      // Small delay to ensure updatedAt differs
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await profileService.updateProfile(original.id, {
        name: 'Updated Name',
        timezone: 'Europe/Paris'
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(original.id);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.name).toBe('Updated Name');
      expect(updated.timezone).toBe('Europe/Paris');
    });

    test('should update updatedAt timestamp', async () => {
      const original = await profileService.createProfile({ name: generateUniqueName() });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await profileService.updateProfile(original.id, { name: 'New Name' });

      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(original.updatedAt).getTime()
      );
    });

    test('should return null when updating non-existent profile', async () => {
      const result = await profileService.updateProfile('non-existent-id', { name: 'Test' });

      expect(result).toBeNull();
    });

    test('should preserve ID even if update data contains different ID', async () => {
      const original = await profileService.createProfile({ name: generateUniqueName() });

      const updated = await profileService.updateProfile(original.id, {
        id: 'different-id',
        name: 'Updated'
      });

      expect(updated.id).toBe(original.id);
    });
  });

  describe('deleteProfile', () => {
    // Requirement 1.7: WHEN deleteProfile is called with valid ID, THE ProfileService SHALL remove profile and return true
    test('should delete profile and return true for valid ID', async () => {
      const profile = await profileService.createProfile({ name: generateUniqueName() });

      const result = await profileService.deleteProfile(profile.id);

      expect(result).toBe(true);
      
      const retrieved = await profileService.getProfile(profile.id);
      expect(retrieved).toBeNull();
    });

    // Requirement 1.8: WHEN deleteProfile is called with invalid ID, THE ProfileService SHALL return false
    test('should return false for non-existent ID', async () => {
      const result = await profileService.deleteProfile('non-existent-id');

      expect(result).toBe(false);
    });

    test('should not affect other profiles when deleting one', async () => {
      const profile1 = await profileService.createProfile({ name: generateUniqueName() });
      const profile2 = await profileService.createProfile({ name: generateUniqueName() });

      await profileService.deleteProfile(profile1.id);

      const remaining = await profileService.getAllProfiles();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(profile2.id);
    });
  });
});


/**
 * ProfileService Unit Tests - Validation Logic
 * Feature: profile-service-testing
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
describe('ProfileService - Validation Logic', () => {
  let profileService;

  beforeEach(() => {
    profileService = createFreshProfileService();
  });

  describe('Invalid Name Rejection', () => {
    // Requirement 2.1: WHEN profile name is empty or not a string, THE ProfileService SHALL throw error
    test('should reject empty string name', async () => {
      await expect(profileService.createProfile({ name: '' }))
        .rejects.toThrow('Profile name is required and must be a string');
    });

    test('should reject whitespace-only name', async () => {
      await expect(profileService.createProfile({ name: '   ' }))
        .rejects.toThrow('Profile name is required and must be a string');
    });

    test('should reject null name', async () => {
      await expect(profileService.createProfile({ name: null }))
        .rejects.toThrow('Profile name is required and must be a string');
    });

    test('should reject undefined name', async () => {
      await expect(profileService.createProfile({ name: undefined }))
        .rejects.toThrow('Profile name is required and must be a string');
    });

    test('should reject number as name', async () => {
      await expect(profileService.createProfile({ name: 12345 }))
        .rejects.toThrow('Profile name is required and must be a string');
    });

    test('should reject object as name', async () => {
      await expect(profileService.createProfile({ name: { value: 'test' } }))
        .rejects.toThrow('Profile name is required and must be a string');
    });

    test('should reject array as name', async () => {
      await expect(profileService.createProfile({ name: ['test'] }))
        .rejects.toThrow('Profile name is required and must be a string');
    });
  });

  describe('Invalid Viewport Rejection', () => {
    // Requirement 2.2: WHEN viewport dimensions are less than 100, THE ProfileService SHALL throw error
    test('should reject viewport with width less than 100', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        viewport: { width: 99, height: 768 }
      })).rejects.toThrow('Viewport dimensions must be at least 100x100');
    });

    test('should reject viewport with height less than 100', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        viewport: { width: 1366, height: 99 }
      })).rejects.toThrow('Viewport dimensions must be at least 100x100');
    });

    test('should reject viewport with both dimensions less than 100', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        viewport: { width: 50, height: 50 }
      })).rejects.toThrow('Viewport dimensions must be at least 100x100');
    });

    test('should accept viewport with exactly 100x100', async () => {
      const profile = await profileService.createProfile({
        name: generateUniqueName(),
        viewport: { width: 100, height: 100 }
      });

      expect(profile.viewport).toEqual({ width: 100, height: 100 });
    });

    test('should accept viewport with dimensions greater than 100', async () => {
      const profile = await profileService.createProfile({
        name: generateUniqueName(),
        viewport: { width: 1920, height: 1080 }
      });

      expect(profile.viewport).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('Invalid Proxy Rejection', () => {
    // Requirement 2.3: WHEN proxy is provided without host or port, THE ProfileService SHALL throw error
    test('should reject proxy without host', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        proxy: { port: 8080, type: 'http' }
      })).rejects.toThrow('Proxy host and port are required');
    });

    test('should reject proxy without port', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        proxy: { host: '192.168.1.1', type: 'http' }
      })).rejects.toThrow('Proxy host and port are required');
    });

    test('should reject proxy with empty host', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        proxy: { host: '', port: 8080, type: 'http' }
      })).rejects.toThrow('Proxy host and port are required');
    });

    test('should reject empty proxy object', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        proxy: {}
      })).rejects.toThrow('Proxy host and port are required');
    });

    // Requirement 2.4: WHEN proxy type is invalid, THE ProfileService SHALL default to "http"
    test('should default to http when proxy type is invalid', async () => {
      const profile = await profileService.createProfile({
        name: generateUniqueName(),
        proxy: { host: '192.168.1.1', port: 8080, type: 'invalid-type' }
      });

      expect(profile.proxy.type).toBe('http');
    });

    test('should default to http when proxy type is missing', async () => {
      const profile = await profileService.createProfile({
        name: generateUniqueName(),
        proxy: { host: '192.168.1.1', port: 8080 }
      });

      expect(profile.proxy.type).toBe('http');
    });

    test('should accept valid proxy types', async () => {
      const validTypes = ['http', 'https', 'socks4', 'socks5'];

      for (const type of validTypes) {
        const profile = await profileService.createProfile({
          name: generateUniqueName(),
          proxy: { host: '192.168.1.1', port: 8080, type }
        });

        expect(profile.proxy.type).toBe(type);
      }
    });
  });

  describe('Invalid defaultHeadless Rejection', () => {
    // Requirement 2.5: WHEN defaultHeadless is not boolean, THE ProfileService SHALL throw error
    test('should reject string as defaultHeadless', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        defaultHeadless: 'true'
      })).rejects.toThrow('defaultHeadless must be a boolean');
    });

    test('should reject number as defaultHeadless', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        defaultHeadless: 1
      })).rejects.toThrow('defaultHeadless must be a boolean');
    });

    test('should reject object as defaultHeadless', async () => {
      await expect(profileService.createProfile({
        name: generateUniqueName(),
        defaultHeadless: {}
      })).rejects.toThrow('defaultHeadless must be a boolean');
    });

    test('should accept true as defaultHeadless', async () => {
      const profile = await profileService.createProfile({
        name: generateUniqueName(),
        defaultHeadless: true
      });

      expect(profile.defaultHeadless).toBe(true);
    });

    test('should accept false as defaultHeadless', async () => {
      const profile = await profileService.createProfile({
        name: generateUniqueName(),
        defaultHeadless: false
      });

      expect(profile.defaultHeadless).toBe(false);
    });

    test('should default to false when defaultHeadless is not provided', async () => {
      const profile = await profileService.createProfile({
        name: generateUniqueName()
      });

      expect(profile.defaultHeadless).toBe(false);
    });
  });
});
