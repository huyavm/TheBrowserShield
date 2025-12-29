/**
 * ProfileRepository Property Tests
 * Feature: profile-service-testing
 * 
 * Property-based tests using fast-check to validate ProfileRepository correctness properties.
 */
const fc = require('fast-check');
const { createTestProfileRepository, delay, generateUniqueName } = require('../helpers/testSetup');
const {
  validProfileName,
  validViewport,
  validProxy,
  validTimezone,
  validUserAgent,
  validRepositoryProfileData,
  specialCharacterString
} = require('../helpers/profileGenerator');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

describe('ProfileRepository Property Tests', () => {
  let repository;

  beforeEach(() => {
    repository = createTestProfileRepository();
  });

  afterEach(() => {
    if (repository) {
      repository.close();
    }
  });

  /**
   * Feature: profile-service-testing, Property 8: ProfileRepository Round-Trip Consistency
   * Validates: Requirements 3.1, 3.3, 6.2
   * 
   * For any valid profile data, creating a profile then retrieving it by ID 
   * should return an equivalent profile object with all JSON fields correctly deserialized.
   */
  describe('Property 8: Round-Trip Consistency', () => {
    it('should preserve all fields after create and retrieve with correct JSON deserialization', async () => {
      await fc.assert(
        fc.asyncProperty(validRepositoryProfileData, async (profileData) => {
          // Reset repository state for each test
          repository.reset();
          
          // Create profile
          const created = await repository.createProfile(profileData);
          
          // Retrieve profile
          const retrieved = await repository.getProfile(created.id);
          
          // Verify round-trip consistency
          expect(retrieved).not.toBeNull();
          expect(retrieved.id).toBe(created.id);
          expect(retrieved.name).toBe(profileData.name);
          
          // Check user-provided fields are preserved
          if (profileData.userAgent !== undefined) {
            expect(retrieved.userAgent).toBe(profileData.userAgent);
          }
          if (profileData.timezone !== undefined) {
            expect(retrieved.timezone).toBe(profileData.timezone);
          }
          
          // Verify JSON fields are correctly deserialized
          if (profileData.viewport !== undefined) {
            expect(retrieved.viewport).toEqual(profileData.viewport);
            expect(typeof retrieved.viewport).toBe('object');
            expect(typeof retrieved.viewport.width).toBe('number');
            expect(typeof retrieved.viewport.height).toBe('number');
          }
          
          if (profileData.proxy !== undefined) {
            expect(retrieved.proxy).toEqual(profileData.proxy);
            expect(typeof retrieved.proxy).toBe('object');
          }
          
          if (profileData.stealthConfig !== undefined) {
            expect(retrieved.stealthConfig).toEqual(profileData.stealthConfig);
          }
          
          if (profileData.hardwareConfig !== undefined) {
            expect(retrieved.hardwareConfig).toEqual(profileData.hardwareConfig);
          }
          
          if (profileData.screenConfig !== undefined) {
            expect(retrieved.screenConfig).toEqual(profileData.screenConfig);
          }
          
          if (profileData.languages !== undefined) {
            expect(retrieved.languages).toEqual(profileData.languages);
            expect(Array.isArray(retrieved.languages)).toBe(true);
          }
          
          if (profileData.autoNavigateUrl !== undefined) {
            expect(retrieved.autoNavigateUrl).toBe(profileData.autoNavigateUrl);
          }
          
          // Verify auto-generated fields exist
          expect(retrieved.createdAt).toBeDefined();
          expect(retrieved.updatedAt).toBeDefined();
          
          return true;
        }),
        fcOptions
      );
    });
  });


  /**
   * Feature: profile-service-testing, Property 9: ProfileRepository Ordering
   * Validates: Requirements 3.4
   * 
   * For any set of created profiles, getAllProfiles should return them 
   * ordered by created_at descending (newest first).
   */
  describe('Property 9: Ordering', () => {
    it('should return profiles ordered by created_at DESC (newest first)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validProfileName, { minLength: 2, maxLength: 10 }),
          async (names) => {
            // Reset repository state for each test
            repository.reset();
            
            // Ensure unique names
            const uniqueNames = [...new Set(names)];
            if (uniqueNames.length < 2) {
              return true; // Skip if not enough unique names
            }
            
            // Create profiles with delays to ensure different timestamps
            const createdProfiles = [];
            for (const name of uniqueNames) {
              const profile = await repository.createProfile({ name });
              createdProfiles.push(profile);
              await delay(5); // Small delay to ensure different timestamps
            }
            
            // Get all profiles
            const allProfiles = await repository.getAllProfiles();
            
            // Verify count matches
            expect(allProfiles.length).toBe(uniqueNames.length);
            
            // Verify ordering: newest first (last created should be first in result)
            // The last profile we created should be first in the result
            expect(allProfiles[0].id).toBe(createdProfiles[createdProfiles.length - 1].id);
            
            // Verify all profiles are in descending order by created_at
            for (let i = 0; i < allProfiles.length - 1; i++) {
              const currentTime = new Date(allProfiles[i].createdAt).getTime();
              const nextTime = new Date(allProfiles[i + 1].createdAt).getTime();
              expect(currentTime).toBeGreaterThanOrEqual(nextTime);
            }
            
            return true;
          }
        ),
        { ...fcOptions, numRuns: 50 } // Reduced runs due to delays
      );
    });
  });

  /**
   * Feature: profile-service-testing, Property 10: ProfileRepository Update Consistency
   * Validates: Requirements 3.5
   * 
   * For any existing profile and valid updates, updateProfile should apply changes 
   * and return updated profile with new updated_at timestamp.
   */
  describe('Property 10: Update Consistency', () => {
    it('should apply updates and set new updated_at timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          validProfileName,
          validProfileName,
          fc.option(validViewport, { nil: undefined }),
          fc.option(validTimezone, { nil: undefined }),
          async (originalName, newName, newViewport, newTimezone) => {
            // Reset repository state for each test
            repository.reset();
            
            // Create original profile
            const original = await repository.createProfile({ name: originalName });
            const originalId = original.id;
            const originalCreatedAt = original.createdAt;
            const originalUpdatedAt = original.updatedAt;
            
            // Small delay to ensure different timestamp
            await delay(10);
            
            // Prepare update data
            const updateData = { name: newName };
            if (newViewport !== undefined) {
              updateData.viewport = newViewport;
            }
            if (newTimezone !== undefined) {
              updateData.timezone = newTimezone;
            }
            
            // Update profile
            const updated = await repository.updateProfile(originalId, updateData);
            
            // Verify update was applied
            expect(updated).not.toBeNull();
            expect(updated.id).toBe(originalId);
            expect(updated.name).toBe(newName);
            
            if (newViewport !== undefined) {
              expect(updated.viewport).toEqual(newViewport);
            }
            if (newTimezone !== undefined) {
              expect(updated.timezone).toBe(newTimezone);
            }
            
            // Verify createdAt is preserved
            expect(updated.createdAt).toBe(originalCreatedAt);
            
            // Verify updated_at is set to a new value
            expect(updated.updatedAt).toBeDefined();
            const updatedTime = new Date(updated.updatedAt).getTime();
            const originalTime = new Date(originalUpdatedAt).getTime();
            expect(updatedTime).toBeGreaterThanOrEqual(originalTime);
            
            return true;
          }
        ),
        { ...fcOptions, numRuns: 50 } // Reduced runs due to delays
      );
    });
  });


  /**
   * Feature: profile-service-testing, Property 11: ProfileRepository Activity Log Filtering
   * Validates: Requirements 5.2, 5.3
   * 
   * For any set of activity logs across multiple profiles, getActivityLogs with a specific 
   * profileId should return only logs for that profile, and without profileId should return 
   * all logs respecting pagination limits.
   */
  describe('Property 11: Activity Log Filtering', () => {
    it('should filter logs by profileId and respect pagination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1, max: 10 }),
          async (actions, logsPerProfile) => {
            // Reset repository state for each test
            repository.reset();
            
            // Create two profiles
            const profile1 = await repository.createProfile({ name: generateUniqueName('profile1') });
            const profile2 = await repository.createProfile({ name: generateUniqueName('profile2') });
            
            // Log activities for profile1
            for (let i = 0; i < logsPerProfile; i++) {
              const action = actions[i % actions.length] || 'action';
              await repository.logActivity(profile1.id, `${action}_p1_${i}`, { index: i });
            }
            
            // Log activities for profile2
            for (let i = 0; i < logsPerProfile; i++) {
              const action = actions[i % actions.length] || 'action';
              await repository.logActivity(profile2.id, `${action}_p2_${i}`, { index: i });
            }
            
            // Test filtering by profileId
            const profile1Logs = await repository.getActivityLogs(profile1.id);
            const profile2Logs = await repository.getActivityLogs(profile2.id);
            
            // Verify filtering works correctly
            expect(profile1Logs.length).toBe(logsPerProfile);
            expect(profile2Logs.length).toBe(logsPerProfile);
            
            // Verify all logs belong to the correct profile
            expect(profile1Logs.every(log => log.profile_id === profile1.id)).toBe(true);
            expect(profile2Logs.every(log => log.profile_id === profile2.id)).toBe(true);
            
            // Test getting all logs without profileId
            const allLogs = await repository.getActivityLogs();
            expect(allLogs.length).toBe(logsPerProfile * 2);
            
            // Test pagination limit
            const limitedLogs = await repository.getActivityLogs(null, logsPerProfile);
            expect(limitedLogs.length).toBe(logsPerProfile);
            
            // Test pagination offset
            if (logsPerProfile >= 2) {
              const offsetLogs = await repository.getActivityLogs(null, logsPerProfile, logsPerProfile);
              expect(offsetLogs.length).toBe(logsPerProfile);
              
              // Verify no overlap between pages
              const firstPageIds = limitedLogs.map(l => l.id);
              const secondPageIds = offsetLogs.map(l => l.id);
              const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
              expect(overlap.length).toBe(0);
            }
            
            return true;
          }
        ),
        { ...fcOptions, numRuns: 50 } // Reduced runs due to multiple DB operations
      );
    });
  });

  /**
   * Feature: profile-service-testing, Property 12: JSON Special Characters Round-Trip
   * Validates: Requirements 6.3
   * 
   * For any profile with special characters (unicode, quotes, newlines) in string fields, 
   * serialization and deserialization should preserve the exact content.
   */
  describe('Property 12: JSON Special Characters Round-Trip', () => {
    it('should preserve special characters through serialization/deserialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          specialCharacterString,
          fc.option(specialCharacterString, { nil: undefined }),
          async (name, userAgent) => {
            // Reset repository state for each test
            repository.reset();
            
            // Create profile with special characters
            const profileData = { name };
            if (userAgent !== undefined) {
              profileData.userAgent = userAgent;
            }
            
            // Add complex JSON objects with special characters
            profileData.stealthConfig = {
              description: name,
              enabled: true
            };
            profileData.hardwareConfig = {
              label: userAgent || name,
              cores: 4
            };
            
            // Create profile
            const created = await repository.createProfile(profileData);
            
            // Retrieve profile
            const retrieved = await repository.getProfile(created.id);
            
            // Verify special characters are preserved in name
            expect(retrieved.name).toBe(name);
            
            // Verify special characters are preserved in userAgent
            if (userAgent !== undefined) {
              expect(retrieved.userAgent).toBe(userAgent);
            }
            
            // Verify special characters are preserved in JSON fields
            expect(retrieved.stealthConfig.description).toBe(name);
            expect(retrieved.hardwareConfig.label).toBe(userAgent || name);
            
            return true;
          }
        ),
        fcOptions
      );
    });
  });
});
