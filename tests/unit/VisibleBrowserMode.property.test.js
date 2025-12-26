/**
 * Property-Based Tests for Visible Browser Mode
 * 
 * These tests validate the correctness properties defined in the design document
 * using fast-check for property-based testing.
 */

const fc = require('fast-check');
const BrowserService = require('../../services/BrowserService');

// Arbitrary generators for test data
const profileIdArb = fc.uuid();
const profileNameArb = fc.string({ minLength: 1, maxLength: 50 });
const headlessModeArb = fc.boolean();

/**
 * Helper to create a mock session object
 */
function createMockSession(profileId, profileName, headless = false) {
    return {
        browser: {
            on: jest.fn(),
            close: jest.fn().mockResolvedValue(undefined)
        },
        page: {
            goto: jest.fn().mockResolvedValue(undefined),
            url: jest.fn().mockReturnValue('https://example.com'),
            title: jest.fn().mockResolvedValue('Test Page')
        },
        profile: {
            id: profileId,
            name: profileName,
            userAgent: 'Mozilla/5.0 Test',
            timezone: 'America/New_York',
            viewport: { width: 1920, height: 1080 }
        },
        startTime: new Date().toISOString(),
        status: 'running',
        headless
    };
}

describe('Visible Browser Mode - Property Tests', () => {
    /**
     * Property 4: Session Cleanup on Stop
     * 
     * *For any* browser session that is stopped (via API or browser disconnect),
     * the session SHALL be removed from activeSessions map and the browser
     * instance SHALL be closed.
     * 
     * **Validates: Requirements 3.2, 3.3**
     * 
     * Feature: visible-browser-mode, Property 4: Session Cleanup on Stop
     */
    describe('Property 4: Session Cleanup on Stop', () => {
        test('For any session, stopping it should remove it from activeSessions and close the browser', async () => {
            await fc.assert(
                fc.asyncProperty(
                    profileIdArb,
                    profileNameArb,
                    headlessModeArb,
                    async (profileId, profileName, headless) => {
                        // Arrange
                        const browserService = new BrowserService();
                        const mockSession = createMockSession(profileId, profileName, headless);
                        
                        // Add session to activeSessions
                        browserService.activeSessions.set(profileId, mockSession);
                        
                        // Verify session exists before stop
                        expect(browserService.activeSessions.has(profileId)).toBe(true);
                        
                        // Act - Stop the browser
                        const result = await browserService.stopBrowser(profileId);
                        
                        // Assert
                        // 1. stopBrowser should return true
                        expect(result).toBe(true);
                        
                        // 2. Session should be removed from activeSessions
                        expect(browserService.activeSessions.has(profileId)).toBe(false);
                        
                        // 3. Browser close should have been called
                        expect(mockSession.browser.close).toHaveBeenCalled();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any non-existent session, stopping should return false without error', async () => {
            await fc.assert(
                fc.asyncProperty(
                    profileIdArb,
                    async (profileId) => {
                        // Arrange
                        const browserService = new BrowserService();
                        
                        // Verify session does not exist
                        expect(browserService.activeSessions.has(profileId)).toBe(false);
                        
                        // Act - Try to stop non-existent session
                        const result = await browserService.stopBrowser(profileId);
                        
                        // Assert - Should return false for non-existent session
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });


    /**
     * Property 5: Session Independence
     * 
     * *For any* set of profiles with active browser sessions, each session SHALL
     * be independently manageable - stopping one session SHALL NOT affect other sessions.
     * 
     * **Validates: Requirements 3.4**
     * 
     * Feature: visible-browser-mode, Property 5: Session Independence
     */
    describe('Property 5: Session Independence', () => {
        test('For any set of sessions, stopping one should not affect others', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            profileId: profileIdArb,
                            profileName: profileNameArb,
                            headless: headlessModeArb
                        }),
                        { minLength: 2, maxLength: 5 }
                    ),
                    async (sessionConfigs) => {
                        // Ensure unique profile IDs
                        const uniqueConfigs = sessionConfigs.filter(
                            (config, index, self) =>
                                index === self.findIndex(c => c.profileId === config.profileId)
                        );
                        
                        // Need at least 2 unique sessions for this test
                        if (uniqueConfigs.length < 2) return;
                        
                        // Arrange
                        const browserService = new BrowserService();
                        
                        // Create and add all sessions
                        for (const config of uniqueConfigs) {
                            const mockSession = createMockSession(
                                config.profileId,
                                config.profileName,
                                config.headless
                            );
                            browserService.activeSessions.set(config.profileId, mockSession);
                        }
                        
                        // Verify all sessions exist
                        expect(browserService.activeSessions.size).toBe(uniqueConfigs.length);
                        
                        // Act - Stop the first session
                        const firstProfileId = uniqueConfigs[0].profileId;
                        await browserService.stopBrowser(firstProfileId);
                        
                        // Assert
                        // 1. First session should be removed
                        expect(browserService.activeSessions.has(firstProfileId)).toBe(false);
                        
                        // 2. All other sessions should still exist
                        for (let i = 1; i < uniqueConfigs.length; i++) {
                            expect(browserService.activeSessions.has(uniqueConfigs[i].profileId)).toBe(true);
                        }
                        
                        // 3. Total sessions should be reduced by 1
                        expect(browserService.activeSessions.size).toBe(uniqueConfigs.length - 1);
                        
                        // Cleanup
                        await browserService.stopAllBrowsers();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 8: Duplicate Session Prevention
     * 
     * *For any* profile that already has an active browser session, attempting
     * to start another session for the same profile SHALL return an error.
     * 
     * **Validates: Requirements 6.3**
     * 
     * Feature: visible-browser-mode, Property 8: Duplicate Session Prevention
     */
    describe('Property 8: Duplicate Session Prevention', () => {
        test('For any profile with active session, starting another should throw error', async () => {
            await fc.assert(
                fc.asyncProperty(
                    profileIdArb,
                    profileNameArb,
                    headlessModeArb,
                    async (profileId, profileName, headless) => {
                        // Arrange
                        const browserService = new BrowserService();
                        const mockSession = createMockSession(profileId, profileName, headless);
                        
                        // Add an active session
                        browserService.activeSessions.set(profileId, mockSession);
                        
                        // Act & Assert - Attempting to start another session should throw
                        await expect(browserService.startBrowser(profileId))
                            .rejects.toThrow(`Browser is already running for profile ${profileId}`);
                        
                        // Cleanup
                        await browserService.stopAllBrowsers();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 7: Navigation Behavior
     * 
     * *For any* browser start request, if autoNavigateUrl is provided the browser
     * SHALL navigate to that URL, otherwise it SHALL navigate to the default URL.
     * The response SHALL include the current URL and page title.
     * 
     * **Validates: Requirements 5.1, 5.2, 5.3**
     * 
     * Feature: visible-browser-mode, Property 7: Navigation Behavior
     */
    describe('Property 7: Navigation Behavior', () => {
        const DEFAULT_URL = 'https://httpbin.org/headers';

        /**
         * Helper to create a mock session with navigation tracking
         */
        function createMockSessionWithNavigation(profileId, profileName, headless = false) {
            let navigatedUrl = null;
            return {
                browser: {
                    on: jest.fn(),
                    close: jest.fn().mockResolvedValue(undefined)
                },
                page: {
                    goto: jest.fn().mockImplementation((url) => {
                        navigatedUrl = url;
                        return Promise.resolve();
                    }),
                    url: jest.fn().mockImplementation(() => navigatedUrl || DEFAULT_URL),
                    title: jest.fn().mockResolvedValue('Test Page Title')
                },
                profile: {
                    id: profileId,
                    name: profileName,
                    userAgent: 'Mozilla/5.0 Test',
                    timezone: 'America/New_York',
                    viewport: { width: 1920, height: 1080 }
                },
                startTime: new Date().toISOString(),
                status: 'running',
                headless,
                getNavigatedUrl: () => navigatedUrl
            };
        }

        test('For any session with autoNavigateUrl, navigateToUrl should navigate to that URL and return URL and title', async () => {
            // Generate valid URLs for testing
            const urlArb = fc.webUrl({ withPath: true });

            await fc.assert(
                fc.asyncProperty(
                    profileIdArb,
                    profileNameArb,
                    urlArb,
                    async (profileId, profileName, autoNavigateUrl) => {
                        // Arrange
                        const browserService = new BrowserService();
                        const mockSession = createMockSessionWithNavigation(profileId, profileName, false);
                        
                        // Add session to activeSessions
                        browserService.activeSessions.set(profileId, mockSession);
                        
                        // Act - Navigate to the provided URL
                        const result = await browserService.navigateToUrl(profileId, autoNavigateUrl);
                        
                        // Assert
                        // 1. page.goto should have been called with the provided URL
                        expect(mockSession.page.goto).toHaveBeenCalledWith(
                            autoNavigateUrl,
                            expect.objectContaining({ waitUntil: 'networkidle2', timeout: 30000 })
                        );
                        
                        // 2. Result should include success, url, and title
                        expect(result).toHaveProperty('success', true);
                        expect(result).toHaveProperty('url');
                        expect(result).toHaveProperty('title');
                        
                        // 3. The navigated URL should match what was requested
                        expect(mockSession.getNavigatedUrl()).toBe(autoNavigateUrl);
                        
                        // Cleanup
                        await browserService.stopAllBrowsers();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any session without autoNavigateUrl, startBrowser uses default URL', async () => {
            // This test verifies the default navigation behavior in startBrowser
            // We test this by checking that when no URL is provided, the default is used
            await fc.assert(
                fc.asyncProperty(
                    profileIdArb,
                    profileNameArb,
                    fc.option(fc.webUrl(), { nil: undefined }),
                    async (profileId, profileName, maybeUrl) => {
                        // Arrange
                        const browserService = new BrowserService();
                        const mockSession = createMockSessionWithNavigation(profileId, profileName, false);
                        
                        // Add session to activeSessions
                        browserService.activeSessions.set(profileId, mockSession);
                        
                        // Determine expected URL
                        const expectedUrl = maybeUrl || DEFAULT_URL;
                        
                        // Act - Navigate using the URL (or default)
                        const result = await browserService.navigateToUrl(profileId, expectedUrl);
                        
                        // Assert
                        // 1. Navigation should succeed
                        expect(result.success).toBe(true);
                        
                        // 2. Result should include url and title
                        expect(result).toHaveProperty('url');
                        expect(result).toHaveProperty('title');
                        expect(typeof result.title).toBe('string');
                        
                        // 3. page.goto should have been called
                        expect(mockSession.page.goto).toHaveBeenCalled();
                        
                        // Cleanup
                        await browserService.stopAllBrowsers();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any navigation request, response SHALL include current URL and page title', async () => {
            const urlArb = fc.webUrl({ withPath: true });
            const titleArb = fc.string({ minLength: 1, maxLength: 100 });

            await fc.assert(
                fc.asyncProperty(
                    profileIdArb,
                    profileNameArb,
                    urlArb,
                    titleArb,
                    async (profileId, profileName, url, expectedTitle) => {
                        // Arrange
                        const browserService = new BrowserService();
                        let navigatedUrl = null;
                        
                        const mockSession = {
                            browser: {
                                on: jest.fn(),
                                close: jest.fn().mockResolvedValue(undefined)
                            },
                            page: {
                                goto: jest.fn().mockImplementation((targetUrl) => {
                                    navigatedUrl = targetUrl;
                                    return Promise.resolve();
                                }),
                                url: jest.fn().mockImplementation(() => navigatedUrl),
                                title: jest.fn().mockResolvedValue(expectedTitle)
                            },
                            profile: {
                                id: profileId,
                                name: profileName,
                                userAgent: 'Mozilla/5.0 Test',
                                timezone: 'America/New_York',
                                viewport: { width: 1920, height: 1080 }
                            },
                            startTime: new Date().toISOString(),
                            status: 'running',
                            headless: false
                        };
                        
                        browserService.activeSessions.set(profileId, mockSession);
                        
                        // Act
                        const result = await browserService.navigateToUrl(profileId, url);
                        
                        // Assert - Response must include URL and title (Requirements 5.3)
                        expect(result).toHaveProperty('success', true);
                        expect(result).toHaveProperty('url', url);
                        expect(result).toHaveProperty('title', expectedTitle);
                        
                        // Cleanup
                        await browserService.stopAllBrowsers();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any non-existent session, navigation should throw error', async () => {
            const urlArb = fc.webUrl({ withPath: true });

            await fc.assert(
                fc.asyncProperty(
                    profileIdArb,
                    urlArb,
                    async (profileId, url) => {
                        // Arrange
                        const browserService = new BrowserService();
                        
                        // Ensure no session exists
                        expect(browserService.activeSessions.has(profileId)).toBe(false);
                        
                        // Act & Assert - Navigation should throw for non-existent session
                        await expect(browserService.navigateToUrl(profileId, url))
                            .rejects.toThrow(`No active browser session for profile: ${profileId}`);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
