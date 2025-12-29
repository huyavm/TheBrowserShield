/**
 * ProfileService Property Tests
 * Feature: profile-service-testing
 * 
 * Property-based tests using fast-check to validate ProfileService correctness properties.
 */
const fc = require('fast-check');
const { createFreshProfileService } = require('../helpers/testSetup');
const {
  validProfileData,
  validProfileName,
  validViewport,
  invalidViewport,
  validProxy,
  invalidProxy,
  invalidProfileName
} = require('../helpers/profileGenerator');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

describe('ProfileService Property Tests', () => {
  let profileService;

  beforeEach(() => {
    profileService = createFreshProfileService();
  });

  /**
   * Feature: profile-service-testing, Property 1: ProfileService Round-Trip Consistency
   * Validates: Requirements 1.1, 1.4, 6.1
   * 
   * For any valid profile data, creating a profile then retrieving it by ID 
   * should return an equivalent profile object with all fields preserved 
   * (except auto-generated fields like id, createdAt, updatedAt).
   */
  describe('Property 1: Round-Trip Consistency', () => {
    it('should preserve all user-provided fields after create and retrieve', async () => {
      await fc.assert(
        fc.asyncProperty(validProfileData, async (profileData) => {
          // Reset service state for each test
          profileService.reset();
          
          // Create profile
          const created = await profileService.createProfile(profileData);
          
          // Retrieve profile
          const retrieved = await profileService.getProfile(created.id);
          
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
          if (profileData.viewport !== undefined) {
            expect(retrieved.viewport).toEqual(profileData.viewport);
          }
          if (profileData.proxy !== undefined) {
            expect(retrieved.proxy.host).toBe(profileData.proxy.host);
            expect(retrieved.proxy.port).toBe(profileData.proxy.port);
          }
          if (profileData.defaultHeadless !== undefined) {
            expect(retrieved.defaultHeadless).toBe(profileData.defaultHeadless);
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
   * Feature: profile-service-testing, Property 2: ProfileService Default Values
   * Validates: Requirements 1.2
   * 
   * For any profile created with only required fields (name), the resulting profile 
   * should have valid default values for userAgent (non-empty string), 
   * timezone ('America/New_York'), viewport ({ width: 1366, height: 768 }), 
   * and defaultHeadless (false).
   */
  describe('Property 2: Default Values', () => {
    it('should apply correct default values when only name is provided', async () => {
      await fc.assert(
        fc.asyncProperty(validProfileName, async (name) => {
          // Reset service state for each test
          profileService.reset();
          
          // Create profile with only name
          const profile = await profileService.createProfile({ name });
          
          // Verify default values
          expect(profile.userAgent).toBeDefined();
          expect(typeof profile.userAgent).toBe('string');
          expect(profile.userAgent.length).toBeGreaterThan(0);
          
          expect(profile.timezone).toBe('America/New_York');
          
          expect(profile.viewport).toEqual({ width: 1366, height: 768 });
          
          expect(profile.defaultHeadless).toBe(false);
          
          // Verify proxy defaults to null
          expect(profile.proxy).toBeNull();
          
          // Verify spoofFingerprint defaults to true
          expect(profile.spoofFingerprint).toBe(true);
          
          return true;
        }),
        fcOptions
      );
    });
  });

  /**
   * Feature: profile-service-testing, Property 3: ProfileService Update Preserves Immutable Fields
   * Validates: Requirements 1.6
   * 
   * For any existing profile and any valid update data, updating the profile 
   * should preserve the original id and createdAt while updating other fields 
   * and setting new updatedAt.
   */
  describe('Property 3: Update Preserves Immutable Fields', () => {
    it('should preserve id and createdAt after update', async () => {
      await fc.assert(
        fc.asyncProperty(
          validProfileName,
          validProfileName,
          fc.option(validViewport, { nil: undefined }),
          async (originalName, newName, newViewport) => {
            // Reset service state for each test
            profileService.reset();
            
            // Create original profile
            const original = await profileService.createProfile({ name: originalName });
            const originalId = original.id;
            const originalCreatedAt = original.createdAt;
            
            // Prepare update data
            const updateData = { name: newName };
            if (newViewport !== undefined) {
              updateData.viewport = newViewport;
            }
            
            // Update profile
            const updated = await profileService.updateProfile(originalId, updateData);
            
            // Verify immutable fields are preserved
            expect(updated).not.toBeNull();
            expect(updated.id).toBe(originalId);
            expect(updated.createdAt).toBe(originalCreatedAt);
            
            // Verify mutable fields are updated
            expect(updated.name).toBe(newName);
            if (newViewport !== undefined) {
              expect(updated.viewport).toEqual(newViewport);
            }
            
            // Verify updatedAt is set
            expect(updated.updatedAt).toBeDefined();
            
            return true;
          }
        ),
        fcOptions
      );
    });
  });


  /**
   * Feature: profile-service-testing, Property 4: ProfileService Delete Then Get Returns Null
   * Validates: Requirements 1.7
   * 
   * For any created profile, after deletion, getProfile with that ID should return null.
   */
  describe('Property 4: Delete Then Get Returns Null', () => {
    it('should return null when getting a deleted profile', async () => {
      await fc.assert(
        fc.asyncProperty(validProfileData, async (profileData) => {
          // Reset service state for each test
          profileService.reset();
          
          // Create profile
          const created = await profileService.createProfile(profileData);
          const profileId = created.id;
          
          // Verify profile exists
          const beforeDelete = await profileService.getProfile(profileId);
          expect(beforeDelete).not.toBeNull();
          
          // Delete profile
          const deleteResult = await profileService.deleteProfile(profileId);
          expect(deleteResult).toBe(true);
          
          // Verify profile no longer exists
          const afterDelete = await profileService.getProfile(profileId);
          expect(afterDelete).toBeNull();
          
          return true;
        }),
        fcOptions
      );
    });
  });

  /**
   * Feature: profile-service-testing, Property 5: ProfileService Invalid Name Rejection
   * Validates: Requirements 2.1
   * 
   * For any profile data where name is empty string, whitespace-only, or non-string type, 
   * createProfile should throw error containing "Profile name is required".
   */
  describe('Property 5: Invalid Name Rejection', () => {
    it('should reject profiles with invalid names', async () => {
      await fc.assert(
        fc.asyncProperty(invalidProfileName, async (invalidName) => {
          // Reset service state for each test
          profileService.reset();
          
          // Attempt to create profile with invalid name
          await expect(profileService.createProfile({ name: invalidName }))
            .rejects.toThrow('Profile name is required');
          
          return true;
        }),
        fcOptions
      );
    });
  });

  /**
   * Feature: profile-service-testing, Property 6: ProfileService Invalid Viewport Rejection
   * Validates: Requirements 2.2
   * 
   * For any viewport with width < 100 or height < 100, createProfile should throw 
   * error containing "Viewport dimensions must be at least 100x100".
   */
  describe('Property 6: Invalid Viewport Rejection', () => {
    it('should reject profiles with invalid viewport dimensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          validProfileName,
          invalidViewport,
          async (name, viewport) => {
            // Reset service state for each test
            profileService.reset();
            
            // Attempt to create profile with invalid viewport
            await expect(profileService.createProfile({ name, viewport }))
              .rejects.toThrow('Viewport dimensions must be at least 100x100');
            
            return true;
          }
        ),
        fcOptions
      );
    });
  });

  /**
   * Feature: profile-service-testing, Property 7: ProfileService Invalid Proxy Rejection
   * Validates: Requirements 2.3
   * 
   * For any proxy object missing host or port, createProfile should throw 
   * error containing "Proxy host and port are required".
   */
  describe('Property 7: Invalid Proxy Rejection', () => {
    it('should reject profiles with invalid proxy configuration', async () => {
      await fc.assert(
        fc.asyncProperty(
          validProfileName,
          invalidProxy,
          async (name, proxy) => {
            // Reset service state for each test
            profileService.reset();
            
            // Attempt to create profile with invalid proxy
            await expect(profileService.createProfile({ name, proxy }))
              .rejects.toThrow('Proxy host and port are required');
            
            return true;
          }
        ),
        fcOptions
      );
    });
  });
});
