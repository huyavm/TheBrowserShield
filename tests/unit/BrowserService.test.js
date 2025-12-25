const BrowserService = require('../../services/BrowserService');
const ProfileService = require('../../services/ProfileService');

// Mock dependencies
jest.mock('../../services/ProfileService');
jest.mock('../../config/puppeteer');

describe('BrowserService', () => {
    let browserService;

    beforeEach(() => {
        browserService = new BrowserService();
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await browserService.stopAllBrowsers();
    });

    describe('Race Condition Prevention', () => {
        test('should prevent concurrent browser starts for same profile', async () => {
            const profileId = 'test-profile-id';
            const mockProfile = {
                id: profileId,
                name: 'Test Profile',
                userAgent: 'Mozilla/5.0...',
                timezone: 'America/New_York',
                viewport: { width: 1920, height: 1080 }
            };

            ProfileService.getProfile.mockResolvedValue(mockProfile);

            // Mock createBrowserWithProfile to simulate slow operation
            const { createBrowserWithProfile } = require('../../config/puppeteer');
            createBrowserWithProfile.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    browser: {
                        on: jest.fn(),
                        close: jest.fn()
                    },
                    page: {
                        goto: jest.fn().mockResolvedValue(),
                        url: jest.fn().mockReturnValue('https://example.com'),
                        title: jest.fn().mockResolvedValue('Test Page')
                    }
                }), 100))
            );

            // Start two browsers concurrently
            const promise1 = browserService.startBrowser(profileId);
            const promise2 = browserService.startBrowser(profileId);

            const results = await Promise.allSettled([promise1, promise2]);

            // One should succeed, one should fail with race condition error
            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
            expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
            expect(results.find(r => r.status === 'rejected').reason.message)
                .toContain('currently starting');
        });

        test('should clean up starting profiles set on completion', async () => {
            const profileId = 'test-profile-id';
            const mockProfile = { id: profileId, name: 'Test Profile' };

            ProfileService.getProfile.mockResolvedValue(mockProfile);

            const { createBrowserWithProfile } = require('../../config/puppeteer');
            createBrowserWithProfile.mockResolvedValue({
                browser: { on: jest.fn(), close: jest.fn() },
                page: { goto: jest.fn().mockResolvedValue() }
            });

            await browserService.startBrowser(profileId);

            expect(browserService.startingProfiles.has(profileId)).toBe(false);
        });
    });

    describe('Session Management', () => {
        test('should track active sessions correctly', () => {
            const session1 = {
                browser: { on: jest.fn() },
                page: {},
                profile: { id: 'profile1', name: 'Profile 1' },
                startTime: new Date().toISOString(),
                status: 'running'
            };

            browserService.activeSessions.set('profile1', session1);

            const activeSessions = browserService.getAllActiveSessions();
            expect(activeSessions).toHaveLength(1);
            expect(activeSessions[0].profileId).toBe('profile1');
            expect(activeSessions[0].profileName).toBe('Profile 1');
            expect(activeSessions[0].status).toBe('running');
        });

        test('should calculate uptime correctly', () => {
            const startTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
            const session = {
                browser: { on: jest.fn() },
                page: {},
                profile: { id: 'profile1', name: 'Profile 1' },
                startTime,
                status: 'running'
            };

            browserService.activeSessions.set('profile1', session);

            const status = browserService.getBrowserStatus('profile1');
            expect(status.uptime).toBeGreaterThan(50); // Should be around 60 seconds
        });
    });

    describe('Error Handling', () => {
        test('should handle profile not found error', async () => {
            ProfileService.getProfile.mockResolvedValue(null);

            await expect(browserService.startBrowser('nonexistent-profile'))
                .rejects.toThrow('Profile not found');
        });

        test('should clean up on browser creation failure', async () => {
            const profileId = 'test-profile-id';
            ProfileService.getProfile.mockResolvedValue({ id: profileId, name: 'Test' });

            const { createBrowserWithProfile } = require('../../config/puppeteer');
            createBrowserWithProfile.mockRejectedValue(new Error('Browser creation failed'));

            await expect(browserService.startBrowser(profileId))
                .rejects.toThrow('Browser creation failed');

            expect(browserService.startingProfiles.has(profileId)).toBe(false);
        });
    });
});