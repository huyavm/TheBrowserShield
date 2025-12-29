/**
 * Admin Proxy Manager Property Tests
 * Feature: admin-proxy-manager
 * 
 * Property-based tests using fast-check to validate Admin Proxy Manager correctness properties.
 * These tests validate the pure functions used for rendering proxy data in the admin interface.
 */
const fc = require('fast-check');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100, verbose: true };

/**
 * Section visibility management functions
 * These mirror the logic in showSection() method in admin.js
 */

// Available sections in the admin interface
const AVAILABLE_SECTIONS = ['profiles', 'sessions', 'logs', 'proxies'];

/**
 * Compute section visibility state after showing a specific section
 * Property 1: Section Visibility Toggle
 * Requirements: 1.3
 * 
 * @param {string} sectionToShow - The section name to show
 * @param {string[]} allSections - Array of all available section names
 * @returns {Object} Map of section name to visibility (true = visible, false = hidden)
 */
function computeSectionVisibility(sectionToShow, allSections = AVAILABLE_SECTIONS) {
    const visibility = {};
    for (const section of allSections) {
        visibility[section] = section === sectionToShow;
    }
    return visibility;
}

/**
 * Compute stats after proxy operations
 * Property 2: Stats Reactive Update
 * Requirements: 2.2, 8.2
 * 
 * @param {Object[]} proxies - Array of proxy objects
 * @returns {Object} Stats object with total, active, totalUsage, countryCount
 */
function computeProxyStats(proxies) {
    if (!Array.isArray(proxies)) {
        return { total: 0, active: 0, totalUsage: 0, countryCount: 0 };
    }
    
    const total = proxies.length;
    const active = proxies.filter(p => p.active === true).length;
    const totalUsage = proxies.reduce((sum, p) => sum + (p.usageCount || 0), 0);
    
    // Count unique countries (excluding null/undefined)
    const countries = new Set(
        proxies
            .map(p => p.country)
            .filter(c => c !== null && c !== undefined && c !== '')
    );
    const countryCount = countries.size;
    
    return { total, active, totalUsage, countryCount };
}

/**
 * Apply add proxy operation to proxy list
 * @param {Object[]} proxies - Current proxy list
 * @param {Object} newProxy - Proxy to add
 * @returns {Object[]} Updated proxy list
 */
function applyAddProxy(proxies, newProxy) {
    return [...proxies, { ...newProxy, active: true, usageCount: 0 }];
}

/**
 * Apply remove proxy operation to proxy list
 * @param {Object[]} proxies - Current proxy list
 * @param {string} proxyId - ID of proxy to remove
 * @returns {Object[]} Updated proxy list
 */
function applyRemoveProxy(proxies, proxyId) {
    return proxies.filter(p => p.id !== proxyId);
}

/**
 * Apply toggle proxy operation to proxy list
 * @param {Object[]} proxies - Current proxy list
 * @param {string} proxyId - ID of proxy to toggle
 * @returns {Object[]} Updated proxy list
 */
function applyToggleProxy(proxies, proxyId) {
    return proxies.map(p => 
        p.id === proxyId ? { ...p, active: !p.active } : p
    );
}

/**
 * Pure function implementations extracted from admin.js for testing
 * These mirror the actual implementations in public/admin.js
 */

/**
 * Get status indicator color based on proxy active state
 * Property 4: Status Color Mapping
 * Requirements: 3.3
 * @param {boolean} active - Proxy active status
 * @returns {string} Bootstrap badge class
 */
function getProxyStatusColor(active) {
    return active === true ? 'bg-success' : 'bg-danger';
}

/**
 * Get type badge styling based on proxy type
 * Property 5: Type Badge Color Mapping
 * Requirements: 3.4
 * @param {string} type - Proxy type (http, https, socks4, socks5)
 * @returns {Object} Badge styling object with class, bgColor, textColor
 */
function getProxyTypeBadge(type) {
    const typeColors = {
        'http': { class: 'badge-http', bgColor: '#e3f2fd', textColor: '#1565c0' },
        'https': { class: 'badge-https', bgColor: '#e8f5e9', textColor: '#2e7d32' },
        'socks4': { class: 'badge-socks4', bgColor: '#fff3e0', textColor: '#e65100' },
        'socks5': { class: 'badge-socks5', bgColor: '#fce4ec', textColor: '#c2185b' }
    };
    const normalizedType = (type || 'http').toLowerCase();
    return typeColors[normalizedType] || typeColors['http'];
}

/**
 * Get auth icon HTML if proxy has credentials
 * Property 3: Credential Indicator Display
 * Requirements: 3.2
 * @param {string|null} username - Proxy username
 * @param {string|null} password - Proxy password
 * @returns {string} HTML string for auth icon or empty string
 */
function getProxyAuthIcon(username, password) {
    if (username && password) {
        return '<i class="fas fa-key text-warning me-2" title="Authenticated"></i>';
    }
    return '';
}

/**
 * Validate add proxy form fields
 * Property 6: Form Validation for Required Fields
 * Requirements: 4.4
 * 
 * Pure function version for testing - validates host and port
 * 
 * @param {string} host - Proxy host value
 * @param {string|number} port - Proxy port value
 * @returns {Object} - { valid: boolean, errors: { host: string|null, port: string|null } }
 */
function validateAddProxyForm(host, port) {
    const errors = {
        host: null,
        port: null
    };
    
    // Validate host - must be non-empty string (not whitespace-only)
    const trimmedHost = (host || '').toString().trim();
    if (!trimmedHost || trimmedHost.length === 0) {
        errors.host = 'Host is required';
    }
    
    // Validate port - must be integer between 1 and 65535
    if (port === undefined || port === null || port === '') {
        errors.port = 'Valid port is required (1-65535)';
    } else {
        const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
        if (isNaN(portNum) || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
            errors.port = 'Valid port is required (1-65535)';
        }
    }
    
    return {
        valid: !errors.host && !errors.port,
        errors: errors
    };
}

/**
 * Parse a single proxy line into proxy data object
 * Property 7: Bulk Import Parsing
 * Requirements: 5.1, 5.3
 * 
 * Format: host:port or host:port:username:password
 * Lines with at least 2 parts (host:port) are valid
 * Lines with fewer than 2 parts are invalid
 * 
 * @param {string} line - Single line of proxy text
 * @returns {Object|null} Parsed proxy data or null if invalid
 */
function parseProxyLine(line) {
    if (!line || typeof line !== 'string') {
        return null;
    }
    
    const trimmedLine = line.trim();
    if (!trimmedLine) {
        return null;
    }
    
    const parts = trimmedLine.split(':');
    
    // Must have at least 2 parts (host:port)
    if (parts.length < 2) {
        return null;
    }
    
    const host = parts[0].trim();
    const portStr = parts[1].trim();
    
    // Validate host is non-empty
    if (!host) {
        return null;
    }
    
    // Validate port is a valid integer between 1-65535
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        return null;
    }
    
    const proxyData = {
        host: host,
        port: port,
        type: 'http' // Default type
    };
    
    // Optional: username (part 3)
    if (parts.length >= 3 && parts[2].trim()) {
        proxyData.username = parts[2].trim();
    }
    
    // Optional: password (part 4)
    if (parts.length >= 4 && parts[3].trim()) {
        proxyData.password = parts[3].trim();
    }
    
    return proxyData;
}

// Custom arbitraries for proxy data
const proxyType = fc.constantFrom('http', 'https', 'socks4', 'socks5');
const proxyActiveStatus = fc.boolean();
const proxyUsername = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });
const proxyPassword = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });

describe('Admin Proxy Manager Property Tests', () => {

    /**
     * Feature: admin-proxy-manager, Property 1: Section Visibility Toggle
     * Validates: Requirements 1.3
     * 
     * For any navigation section click, only the clicked section should be visible
     * while all other sections are hidden.
     */
    describe('Property 1: Section Visibility Toggle', () => {
        // Custom arbitrary for section names
        const sectionArbitrary = fc.constantFrom('profiles', 'sessions', 'logs', 'proxies');

        it('should show only the selected section and hide all others', () => {
            fc.assert(
                fc.property(sectionArbitrary, (selectedSection) => {
                    const visibility = computeSectionVisibility(selectedSection);
                    
                    // Selected section should be visible
                    expect(visibility[selectedSection]).toBe(true);
                    
                    // All other sections should be hidden
                    for (const section of AVAILABLE_SECTIONS) {
                        if (section !== selectedSection) {
                            expect(visibility[section]).toBe(false);
                        }
                    }
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should have exactly one visible section at any time', () => {
            fc.assert(
                fc.property(sectionArbitrary, (selectedSection) => {
                    const visibility = computeSectionVisibility(selectedSection);
                    
                    // Count visible sections
                    const visibleCount = Object.values(visibility).filter(v => v === true).length;
                    
                    expect(visibleCount).toBe(1);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should handle sequential section switches correctly', () => {
            fc.assert(
                fc.property(
                    fc.array(sectionArbitrary, { minLength: 1, maxLength: 10 }),
                    (sectionSequence) => {
                        // Apply each section switch in sequence
                        let currentVisibility = {};
                        
                        for (const section of sectionSequence) {
                            currentVisibility = computeSectionVisibility(section);
                        }
                        
                        // After all switches, only the last section should be visible
                        const lastSection = sectionSequence[sectionSequence.length - 1];
                        expect(currentVisibility[lastSection]).toBe(true);
                        
                        // All other sections should be hidden
                        for (const section of AVAILABLE_SECTIONS) {
                            if (section !== lastSection) {
                                expect(currentVisibility[section]).toBe(false);
                            }
                        }
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should be idempotent - clicking same section twice keeps it visible', () => {
            fc.assert(
                fc.property(sectionArbitrary, (selectedSection) => {
                    const firstClick = computeSectionVisibility(selectedSection);
                    const secondClick = computeSectionVisibility(selectedSection);
                    
                    // Both should produce identical visibility state
                    expect(firstClick).toEqual(secondClick);
                    expect(firstClick[selectedSection]).toBe(true);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should cover all available sections in visibility map', () => {
            fc.assert(
                fc.property(sectionArbitrary, (selectedSection) => {
                    const visibility = computeSectionVisibility(selectedSection);
                    
                    // All sections should be present in the visibility map
                    for (const section of AVAILABLE_SECTIONS) {
                        expect(visibility).toHaveProperty(section);
                        expect(typeof visibility[section]).toBe('boolean');
                    }
                    
                    return true;
                }),
                fcOptions
            );
        });
    });

    /**
     * Feature: admin-proxy-manager, Property 2: Stats Reactive Update
     * Validates: Requirements 2.2, 8.2
     * 
     * For any proxy add, remove, or toggle operation, the statistics displayed
     * (total count, active count, usage count) should immediately reflect the change
     * without requiring page reload.
     */
    describe('Property 2: Stats Reactive Update', () => {
        // Custom arbitrary for proxy object
        const proxyArbitrary = fc.record({
            id: fc.uuid(),
            host: fc.string({ minLength: 1, maxLength: 50 }),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
            active: fc.boolean(),
            usageCount: fc.integer({ min: 0, max: 1000 }),
            country: fc.option(fc.constantFrom('US', 'UK', 'DE', 'JP', 'VN', 'FR'), { nil: null })
        });

        // Custom arbitrary for proxy list
        const proxyListArbitrary = fc.array(proxyArbitrary, { minLength: 0, maxLength: 20 });

        it('should correctly compute total count from proxy list', () => {
            fc.assert(
                fc.property(proxyListArbitrary, (proxies) => {
                    const stats = computeProxyStats(proxies);
                    
                    expect(stats.total).toBe(proxies.length);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should correctly compute active count from proxy list', () => {
            fc.assert(
                fc.property(proxyListArbitrary, (proxies) => {
                    const stats = computeProxyStats(proxies);
                    const expectedActive = proxies.filter(p => p.active === true).length;
                    
                    expect(stats.active).toBe(expectedActive);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should correctly compute total usage from proxy list', () => {
            fc.assert(
                fc.property(proxyListArbitrary, (proxies) => {
                    const stats = computeProxyStats(proxies);
                    const expectedUsage = proxies.reduce((sum, p) => sum + (p.usageCount || 0), 0);
                    
                    expect(stats.totalUsage).toBe(expectedUsage);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should correctly compute country count from proxy list', () => {
            fc.assert(
                fc.property(proxyListArbitrary, (proxies) => {
                    const stats = computeProxyStats(proxies);
                    const uniqueCountries = new Set(
                        proxies.map(p => p.country).filter(c => c !== null && c !== undefined && c !== '')
                    );
                    
                    expect(stats.countryCount).toBe(uniqueCountries.size);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should increase total by 1 after adding a proxy', () => {
            fc.assert(
                fc.property(proxyListArbitrary, proxyArbitrary, (proxies, newProxy) => {
                    const statsBefore = computeProxyStats(proxies);
                    const updatedProxies = applyAddProxy(proxies, newProxy);
                    const statsAfter = computeProxyStats(updatedProxies);
                    
                    expect(statsAfter.total).toBe(statsBefore.total + 1);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should increase active count by 1 after adding a proxy (new proxies are active)', () => {
            fc.assert(
                fc.property(proxyListArbitrary, proxyArbitrary, (proxies, newProxy) => {
                    const statsBefore = computeProxyStats(proxies);
                    const updatedProxies = applyAddProxy(proxies, newProxy);
                    const statsAfter = computeProxyStats(updatedProxies);
                    
                    // New proxies are added as active by default
                    expect(statsAfter.active).toBe(statsBefore.active + 1);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should decrease total by 1 after removing a proxy', () => {
            fc.assert(
                fc.property(
                    fc.array(proxyArbitrary, { minLength: 1, maxLength: 20 }),
                    (proxies) => {
                        // Pick a random proxy to remove
                        const proxyToRemove = proxies[0];
                        const statsBefore = computeProxyStats(proxies);
                        const updatedProxies = applyRemoveProxy(proxies, proxyToRemove.id);
                        const statsAfter = computeProxyStats(updatedProxies);
                        
                        expect(statsAfter.total).toBe(statsBefore.total - 1);
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should update active count correctly after removing an active proxy', () => {
            fc.assert(
                fc.property(
                    fc.array(proxyArbitrary, { minLength: 1, maxLength: 20 }),
                    (proxies) => {
                        // Find an active proxy to remove
                        const activeProxy = proxies.find(p => p.active === true);
                        if (!activeProxy) return true; // Skip if no active proxy
                        
                        const statsBefore = computeProxyStats(proxies);
                        const updatedProxies = applyRemoveProxy(proxies, activeProxy.id);
                        const statsAfter = computeProxyStats(updatedProxies);
                        
                        expect(statsAfter.active).toBe(statsBefore.active - 1);
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should flip active count after toggling a proxy', () => {
            fc.assert(
                fc.property(
                    fc.array(proxyArbitrary, { minLength: 1, maxLength: 20 }),
                    (proxies) => {
                        const proxyToToggle = proxies[0];
                        const statsBefore = computeProxyStats(proxies);
                        const updatedProxies = applyToggleProxy(proxies, proxyToToggle.id);
                        const statsAfter = computeProxyStats(updatedProxies);
                        
                        // If proxy was active, active count decreases; if inactive, it increases
                        if (proxyToToggle.active) {
                            expect(statsAfter.active).toBe(statsBefore.active - 1);
                        } else {
                            expect(statsAfter.active).toBe(statsBefore.active + 1);
                        }
                        
                        // Total should remain unchanged
                        expect(statsAfter.total).toBe(statsBefore.total);
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should not change total after toggling a proxy', () => {
            fc.assert(
                fc.property(
                    fc.array(proxyArbitrary, { minLength: 1, maxLength: 20 }),
                    (proxies) => {
                        const proxyToToggle = proxies[0];
                        const statsBefore = computeProxyStats(proxies);
                        const updatedProxies = applyToggleProxy(proxies, proxyToToggle.id);
                        const statsAfter = computeProxyStats(updatedProxies);
                        
                        expect(statsAfter.total).toBe(statsBefore.total);
                        expect(statsAfter.totalUsage).toBe(statsBefore.totalUsage);
                        expect(statsAfter.countryCount).toBe(statsBefore.countryCount);
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should handle empty proxy list correctly', () => {
            const stats = computeProxyStats([]);
            
            expect(stats.total).toBe(0);
            expect(stats.active).toBe(0);
            expect(stats.totalUsage).toBe(0);
            expect(stats.countryCount).toBe(0);
        });

        it('should handle null/undefined proxy list gracefully', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(null, undefined),
                    (invalidList) => {
                        const stats = computeProxyStats(invalidList);
                        
                        expect(stats.total).toBe(0);
                        expect(stats.active).toBe(0);
                        expect(stats.totalUsage).toBe(0);
                        expect(stats.countryCount).toBe(0);
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });
    });

    /**
     * Feature: admin-proxy-manager, Property 4: Status Color Mapping
     * Validates: Requirements 3.3
     * 
     * For any proxy, if active === true the status indicator should be green (bg-success),
     * if active === false the status indicator should be red (bg-danger).
     */
    describe('Property 4: Status Color Mapping', () => {
        it('should return bg-success for active=true and bg-danger for active=false', () => {
            fc.assert(
                fc.property(proxyActiveStatus, (active) => {
                    const result = getProxyStatusColor(active);
                    
                    if (active === true) {
                        expect(result).toBe('bg-success');
                    } else {
                        expect(result).toBe('bg-danger');
                    }
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should always return a valid Bootstrap badge class', () => {
            fc.assert(
                fc.property(fc.anything(), (active) => {
                    const result = getProxyStatusColor(active);
                    
                    // Result should always be one of the two valid classes
                    expect(['bg-success', 'bg-danger']).toContain(result);
                    
                    return true;
                }),
                fcOptions
            );
        });
    });

    /**
     * Feature: admin-proxy-manager, Property 5: Type Badge Color Mapping
     * Validates: Requirements 3.4
     * 
     * For any proxy type, the badge color should match:
     * HTTP=blue (#e3f2fd), HTTPS=green (#e8f5e9), SOCKS4=orange (#fff3e0), SOCKS5=pink (#fce4ec).
     */
    describe('Property 5: Type Badge Color Mapping', () => {
        it('should return correct colors for each proxy type', () => {
            fc.assert(
                fc.property(proxyType, (type) => {
                    const result = getProxyTypeBadge(type);
                    
                    const expectedColors = {
                        'http': { bgColor: '#e3f2fd', textColor: '#1565c0' },
                        'https': { bgColor: '#e8f5e9', textColor: '#2e7d32' },
                        'socks4': { bgColor: '#fff3e0', textColor: '#e65100' },
                        'socks5': { bgColor: '#fce4ec', textColor: '#c2185b' }
                    };
                    
                    expect(result.bgColor).toBe(expectedColors[type].bgColor);
                    expect(result.textColor).toBe(expectedColors[type].textColor);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should default to HTTP colors for unknown types', () => {
            fc.assert(
                fc.property(
                    fc.string().filter(s => !['http', 'https', 'socks4', 'socks5'].includes(s.toLowerCase())),
                    (unknownType) => {
                        const result = getProxyTypeBadge(unknownType);
                        
                        // Should default to HTTP colors
                        expect(result.bgColor).toBe('#e3f2fd');
                        expect(result.textColor).toBe('#1565c0');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should handle null/undefined types by defaulting to HTTP', () => {
            const nullResult = getProxyTypeBadge(null);
            const undefinedResult = getProxyTypeBadge(undefined);
            
            expect(nullResult.bgColor).toBe('#e3f2fd');
            expect(undefinedResult.bgColor).toBe('#e3f2fd');
        });

        it('should be case-insensitive for type matching', () => {
            fc.assert(
                fc.property(proxyType, (type) => {
                    const lowerResult = getProxyTypeBadge(type.toLowerCase());
                    const upperResult = getProxyTypeBadge(type.toUpperCase());
                    const mixedResult = getProxyTypeBadge(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase());
                    
                    // All case variations should produce the same result
                    expect(lowerResult.bgColor).toBe(upperResult.bgColor);
                    expect(lowerResult.bgColor).toBe(mixedResult.bgColor);
                    
                    return true;
                }),
                fcOptions
            );
        });
    });

    /**
     * Feature: admin-proxy-manager, Property 3: Credential Indicator Display
     * Validates: Requirements 3.2
     * 
     * For any proxy with non-null username and password, the proxy table row should 
     * display a key icon indicator; for proxies without credentials, no key icon should appear.
     */
    describe('Property 3: Credential Indicator Display', () => {
        it('should return key icon HTML when both username and password are provided', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }),
                    fc.string({ minLength: 1, maxLength: 50 }),
                    (username, password) => {
                        const result = getProxyAuthIcon(username, password);
                        
                        // Should contain key icon
                        expect(result).toContain('fa-key');
                        expect(result).toContain('text-warning');
                        expect(result.length).toBeGreaterThan(0);
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return empty string when username is missing', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(null, undefined, ''),
                    fc.string({ minLength: 1, maxLength: 50 }),
                    (username, password) => {
                        const result = getProxyAuthIcon(username, password);
                        
                        expect(result).toBe('');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return empty string when password is missing', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }),
                    fc.constantFrom(null, undefined, ''),
                    (username, password) => {
                        const result = getProxyAuthIcon(username, password);
                        
                        expect(result).toBe('');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return empty string when both credentials are missing', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(null, undefined, ''),
                    fc.constantFrom(null, undefined, ''),
                    (username, password) => {
                        const result = getProxyAuthIcon(username, password);
                        
                        expect(result).toBe('');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });
    });

    /**
     * Feature: admin-proxy-manager, Property 6: Form Validation for Required Fields
     * Validates: Requirements 4.4
     * 
     * For any add proxy form submission, if host is empty or port is empty/invalid,
     * the form should not submit and should display validation feedback.
     */
    describe('Property 6: Form Validation for Required Fields', () => {
        it('should return valid=true for valid host and port', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
                    fc.integer({ min: 1, max: 65535 }),
                    (host, port) => {
                        const result = validateAddProxyForm(host, port);
                        
                        expect(result.valid).toBe(true);
                        expect(result.errors.host).toBeNull();
                        expect(result.errors.port).toBeNull();
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return valid=false with host error for empty/whitespace host', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('', '   ', '\t', '\n', null, undefined),
                    fc.integer({ min: 1, max: 65535 }),
                    (host, port) => {
                        const result = validateAddProxyForm(host, port);
                        
                        expect(result.valid).toBe(false);
                        expect(result.errors.host).toBe('Host is required');
                        expect(result.errors.port).toBeNull();
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return valid=false with port error for invalid port values', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
                    fc.constantFrom(0, -1, 65536, 100000, null, undefined, '', 'abc', NaN),
                    (host, port) => {
                        const result = validateAddProxyForm(host, port);
                        
                        expect(result.valid).toBe(false);
                        expect(result.errors.host).toBeNull();
                        expect(result.errors.port).toBe('Valid port is required (1-65535)');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return valid=false with both errors when both host and port are invalid', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('', '   ', null, undefined),
                    fc.constantFrom(0, -1, 65536, null, undefined, ''),
                    (host, port) => {
                        const result = validateAddProxyForm(host, port);
                        
                        expect(result.valid).toBe(false);
                        expect(result.errors.host).toBe('Host is required');
                        expect(result.errors.port).toBe('Valid port is required (1-65535)');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should accept port as string when it represents a valid integer', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
                    fc.integer({ min: 1, max: 65535 }),
                    (host, portNum) => {
                        const portStr = portNum.toString();
                        const result = validateAddProxyForm(host, portStr);
                        
                        expect(result.valid).toBe(true);
                        expect(result.errors.host).toBeNull();
                        expect(result.errors.port).toBeNull();
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should reject non-integer port values', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
                    fc.double({ min: 1.1, max: 65534.9 }).filter(n => !Number.isInteger(n)),
                    (host, port) => {
                        const result = validateAddProxyForm(host, port);
                        
                        expect(result.valid).toBe(false);
                        expect(result.errors.port).toBe('Valid port is required (1-65535)');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });
    });

    /**
     * Feature: admin-proxy-manager, Property 7: Bulk Import Parsing
     * Validates: Requirements 5.1, 5.3
     * 
     * For any bulk import text input, each line should be parsed as "host:port:user:pass" format.
     * Lines with at least 2 parts (host:port) should be added as proxies.
     * Lines with fewer than 2 parts should be skipped and counted as failures.
     */
    describe('Property 7: Bulk Import Parsing', () => {
        // Custom arbitrary for valid host (non-empty, no colons)
        const validHost = fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => s.trim().length > 0 && !s.includes(':'));
        
        // Custom arbitrary for valid port
        const validPort = fc.integer({ min: 1, max: 65535 });
        
        // Custom arbitrary for optional username (no colons)
        const optionalUsername = fc.option(
            fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(':')),
            { nil: null }
        );
        
        // Custom arbitrary for optional password (no colons)
        const optionalPassword = fc.option(
            fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(':')),
            { nil: null }
        );

        it('should parse valid host:port lines and return proxy data', () => {
            fc.assert(
                fc.property(validHost, validPort, (host, port) => {
                    const line = `${host}:${port}`;
                    const result = parseProxyLine(line);
                    
                    expect(result).not.toBeNull();
                    expect(result.host).toBe(host.trim());
                    expect(result.port).toBe(port);
                    expect(result.type).toBe('http');
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should parse valid host:port:username:password lines with credentials', () => {
            fc.assert(
                fc.property(
                    validHost,
                    validPort,
                    fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(':') && s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(':') && s.trim().length > 0),
                    (host, port, username, password) => {
                        const line = `${host}:${port}:${username}:${password}`;
                        const result = parseProxyLine(line);
                        
                        expect(result).not.toBeNull();
                        expect(result.host).toBe(host.trim());
                        expect(result.port).toBe(port);
                        expect(result.username).toBe(username.trim());
                        expect(result.password).toBe(password.trim());
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return null for lines with fewer than 2 parts', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 0, maxLength: 50 }).filter(s => !s.includes(':')),
                    (singlePart) => {
                        const result = parseProxyLine(singlePart);
                        
                        expect(result).toBeNull();
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return null for empty, null, or undefined input', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('', '   ', '\t', '\n', null, undefined),
                    (invalidInput) => {
                        const result = parseProxyLine(invalidInput);
                        
                        expect(result).toBeNull();
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return null for lines with invalid port values', () => {
            fc.assert(
                fc.property(
                    validHost,
                    fc.constantFrom('0', '-1', '65536', 'abc', '', '   '),
                    (host, invalidPort) => {
                        const line = `${host}:${invalidPort}`;
                        const result = parseProxyLine(line);
                        
                        expect(result).toBeNull();
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should return null for lines with empty host', () => {
            fc.assert(
                fc.property(validPort, (port) => {
                    const line = `:${port}`;
                    const result = parseProxyLine(line);
                    
                    expect(result).toBeNull();
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should handle whitespace around parts correctly', () => {
            fc.assert(
                fc.property(validHost, validPort, (host, port) => {
                    const line = `  ${host}  :  ${port}  `;
                    const result = parseProxyLine(line);
                    
                    expect(result).not.toBeNull();
                    expect(result.host).toBe(host.trim());
                    expect(result.port).toBe(port);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should parse host:port:username lines (3 parts) with username only', () => {
            fc.assert(
                fc.property(
                    validHost,
                    validPort,
                    fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(':') && s.trim().length > 0),
                    (host, port, username) => {
                        const line = `${host}:${port}:${username}`;
                        const result = parseProxyLine(line);
                        
                        expect(result).not.toBeNull();
                        expect(result.host).toBe(host.trim());
                        expect(result.port).toBe(port);
                        expect(result.username).toBe(username.trim());
                        expect(result.password).toBeUndefined();
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });
    });

    /**
     * Feature: admin-proxy-manager, Property 8: Toggle Status Flip
     * Validates: Requirements 6.2
     * 
     * For any proxy toggle operation, the proxy's active status should flip 
     * from true to false or false to true, and the UI should reflect the new status.
     */
    describe('Property 8: Toggle Status Flip', () => {
        /**
         * Pure function to simulate toggle status flip
         * This mirrors the logic in toggleProxy() method
         * 
         * @param {boolean} currentStatus - Current active status
         * @returns {boolean} New active status (flipped)
         */
        function toggleStatus(currentStatus) {
            return !currentStatus;
        }

        /**
         * Simulate the proxy object update after toggle
         * This mirrors the logic in toggleProxy() method that updates local proxy data
         * 
         * @param {Object} proxy - Proxy object with active status
         * @returns {Object} Updated proxy object with flipped status
         */
        function applyToggleToProxy(proxy) {
            return {
                ...proxy,
                active: !proxy.active
            };
        }

        it('should flip active status from true to false', () => {
            fc.assert(
                fc.property(fc.constant(true), (active) => {
                    const newStatus = toggleStatus(active);
                    
                    expect(newStatus).toBe(false);
                    expect(newStatus).not.toBe(active);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should flip active status from false to true', () => {
            fc.assert(
                fc.property(fc.constant(false), (active) => {
                    const newStatus = toggleStatus(active);
                    
                    expect(newStatus).toBe(true);
                    expect(newStatus).not.toBe(active);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should always produce the opposite boolean value', () => {
            fc.assert(
                fc.property(fc.boolean(), (active) => {
                    const newStatus = toggleStatus(active);
                    
                    // New status should always be the opposite
                    expect(newStatus).toBe(!active);
                    expect(typeof newStatus).toBe('boolean');
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should be idempotent when toggled twice (returns to original)', () => {
            fc.assert(
                fc.property(fc.boolean(), (active) => {
                    const afterFirstToggle = toggleStatus(active);
                    const afterSecondToggle = toggleStatus(afterFirstToggle);
                    
                    // Double toggle should return to original state
                    expect(afterSecondToggle).toBe(active);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should update proxy object with flipped status', () => {
            // Custom arbitrary for proxy object
            const proxyArbitrary = fc.record({
                id: fc.uuid(),
                host: fc.string({ minLength: 1, maxLength: 50 }),
                port: fc.integer({ min: 1, max: 65535 }),
                type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
                active: fc.boolean(),
                usageCount: fc.integer({ min: 0, max: 1000 }),
                country: fc.option(fc.string({ minLength: 2, maxLength: 2 }), { nil: null })
            });

            fc.assert(
                fc.property(proxyArbitrary, (proxy) => {
                    const originalActive = proxy.active;
                    const updatedProxy = applyToggleToProxy(proxy);
                    
                    // Active status should be flipped
                    expect(updatedProxy.active).toBe(!originalActive);
                    
                    // Other properties should remain unchanged
                    expect(updatedProxy.id).toBe(proxy.id);
                    expect(updatedProxy.host).toBe(proxy.host);
                    expect(updatedProxy.port).toBe(proxy.port);
                    expect(updatedProxy.type).toBe(proxy.type);
                    expect(updatedProxy.usageCount).toBe(proxy.usageCount);
                    expect(updatedProxy.country).toBe(proxy.country);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should produce correct status color after toggle', () => {
            fc.assert(
                fc.property(fc.boolean(), (active) => {
                    const newStatus = toggleStatus(active);
                    const statusColor = getProxyStatusColor(newStatus);
                    
                    // After toggle, color should match the new status
                    if (newStatus === true) {
                        expect(statusColor).toBe('bg-success');
                    } else {
                        expect(statusColor).toBe('bg-danger');
                    }
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should handle multiple sequential toggles correctly', () => {
            fc.assert(
                fc.property(
                    fc.boolean(),
                    fc.integer({ min: 1, max: 10 }),
                    (initialActive, toggleCount) => {
                        let currentStatus = initialActive;
                        
                        // Apply toggleCount toggles
                        for (let i = 0; i < toggleCount; i++) {
                            currentStatus = toggleStatus(currentStatus);
                        }
                        
                        // After odd number of toggles, status should be flipped
                        // After even number of toggles, status should be same as original
                        if (toggleCount % 2 === 0) {
                            expect(currentStatus).toBe(initialActive);
                        } else {
                            expect(currentStatus).toBe(!initialActive);
                        }
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });
    });

    /**
     * Feature: admin-proxy-manager, Property 9: Profile-Proxy Assignment Consistency
     * Validates: Requirements 7.2, 7.3
     * 
     * For any profile with an assigned proxy, viewing that profile's details should 
     * display the proxy information. After clearing the proxy assignment, the profile 
     * should show no proxy information.
     */
    describe('Property 9: Profile-Proxy Assignment Consistency', () => {
        /**
         * Pure function to build proxy info HTML
         * This mirrors the logic in buildProxyInfoHtml() method in admin.js
         * 
         * @param {Object|null} proxy - Proxy configuration object
         * @returns {string} HTML string for proxy info display
         */
        function buildProxyInfoHtml(proxy) {
            if (!proxy || !proxy.host) {
                return '<div class="text-muted">No proxy configured</div>';
            }

            const authStatus = proxy.username ? 
                '<span class="badge bg-success">Authenticated</span>' : 
                '<span class="badge bg-secondary">No Auth</span>';
            
            const proxyType = (proxy.type || 'http').toUpperCase();

            return `
                <table class="table table-sm">
                    <tr><td><strong>Host:</strong></td><td>${proxy.host}</td></tr>
                    <tr><td><strong>Port:</strong></td><td>${proxy.port}</td></tr>
                    <tr><td><strong>Type:</strong></td><td><span class="badge bg-info">${proxyType}</span></td></tr>
                    <tr><td><strong>Authentication:</strong></td><td>${authStatus}</td></tr>
                    ${proxy.username ? `<tr><td><strong>Username:</strong></td><td>${proxy.username}</td></tr>` : ''}
                </table>
            `;
        }

        /**
         * Pure function to simulate assigning proxy to profile
         * This mirrors the logic in assignProxyToProfile() method
         * 
         * @param {Object} profile - Profile object
         * @param {Object|null} proxy - Proxy configuration to assign
         * @returns {Object} Updated profile with proxy assigned
         */
        function assignProxyToProfile(profile, proxy) {
            return {
                ...profile,
                proxy: proxy
            };
        }

        /**
         * Pure function to simulate clearing proxy from profile
         * This mirrors the logic in clearProxy() method
         * 
         * @param {Object} profile - Profile object
         * @returns {Object} Updated profile with proxy cleared (null)
         */
        function clearProxyFromProfile(profile) {
            return {
                ...profile,
                proxy: null
            };
        }

        /**
         * Check if proxy info HTML indicates a configured proxy
         * @param {string} html - HTML string from buildProxyInfoHtml
         * @returns {boolean} True if proxy is configured
         */
        function hasProxyConfigured(html) {
            return !html.includes('No proxy configured');
        }

        // Custom arbitrary for valid proxy object
        const validProxyArbitrary = fc.record({
            host: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
            username: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
            password: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null })
        });

        // Custom arbitrary for profile object
        const profileArbitrary = fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            userAgent: fc.string({ minLength: 10, maxLength: 200 }),
            timezone: fc.constantFrom('America/New_York', 'Europe/London', 'Asia/Tokyo'),
            viewport: fc.record({
                width: fc.integer({ min: 800, max: 1920 }),
                height: fc.integer({ min: 600, max: 1080 })
            }),
            proxy: fc.constant(null)
        });

        it('should display proxy info when profile has assigned proxy', () => {
            fc.assert(
                fc.property(profileArbitrary, validProxyArbitrary, (profile, proxy) => {
                    // Assign proxy to profile
                    const updatedProfile = assignProxyToProfile(profile, proxy);
                    
                    // Build proxy info HTML
                    const proxyInfoHtml = buildProxyInfoHtml(updatedProfile.proxy);
                    
                    // Should show proxy information
                    expect(hasProxyConfigured(proxyInfoHtml)).toBe(true);
                    expect(proxyInfoHtml).toContain(proxy.host);
                    expect(proxyInfoHtml).toContain(proxy.port.toString());
                    expect(proxyInfoHtml).toContain(proxy.type.toUpperCase());
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should display "No proxy configured" when profile has no proxy', () => {
            fc.assert(
                fc.property(profileArbitrary, (profile) => {
                    // Ensure profile has no proxy
                    const profileWithoutProxy = { ...profile, proxy: null };
                    
                    // Build proxy info HTML
                    const proxyInfoHtml = buildProxyInfoHtml(profileWithoutProxy.proxy);
                    
                    // Should show "No proxy configured"
                    expect(hasProxyConfigured(proxyInfoHtml)).toBe(false);
                    expect(proxyInfoHtml).toContain('No proxy configured');
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should show "No proxy configured" after clearing proxy assignment', () => {
            fc.assert(
                fc.property(profileArbitrary, validProxyArbitrary, (profile, proxy) => {
                    // First assign proxy
                    const profileWithProxy = assignProxyToProfile(profile, proxy);
                    
                    // Verify proxy is assigned
                    const beforeClearHtml = buildProxyInfoHtml(profileWithProxy.proxy);
                    expect(hasProxyConfigured(beforeClearHtml)).toBe(true);
                    
                    // Clear proxy assignment
                    const profileAfterClear = clearProxyFromProfile(profileWithProxy);
                    
                    // Verify proxy is cleared
                    const afterClearHtml = buildProxyInfoHtml(profileAfterClear.proxy);
                    expect(hasProxyConfigured(afterClearHtml)).toBe(false);
                    expect(afterClearHtml).toContain('No proxy configured');
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should display authentication status correctly', () => {
            fc.assert(
                fc.property(
                    profileArbitrary,
                    fc.record({
                        host: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                        port: fc.integer({ min: 1, max: 65535 }),
                        type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
                        username: fc.string({ minLength: 1, maxLength: 30 }),
                        password: fc.string({ minLength: 1, maxLength: 30 })
                    }),
                    (profile, proxyWithAuth) => {
                        // Assign proxy with authentication
                        const updatedProfile = assignProxyToProfile(profile, proxyWithAuth);
                        
                        // Build proxy info HTML
                        const proxyInfoHtml = buildProxyInfoHtml(updatedProfile.proxy);
                        
                        // Should show authenticated status
                        expect(proxyInfoHtml).toContain('Authenticated');
                        expect(proxyInfoHtml).toContain(proxyWithAuth.username);
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should display "No Auth" for proxy without credentials', () => {
            fc.assert(
                fc.property(
                    profileArbitrary,
                    fc.record({
                        host: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                        port: fc.integer({ min: 1, max: 65535 }),
                        type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
                    }),
                    (profile, proxyWithoutAuth) => {
                        // Assign proxy without authentication
                        const updatedProfile = assignProxyToProfile(profile, proxyWithoutAuth);
                        
                        // Build proxy info HTML
                        const proxyInfoHtml = buildProxyInfoHtml(updatedProfile.proxy);
                        
                        // Should show "No Auth" status
                        expect(proxyInfoHtml).toContain('No Auth');
                        expect(proxyInfoHtml).not.toContain('Authenticated');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });

        it('should preserve profile data when assigning proxy', () => {
            fc.assert(
                fc.property(profileArbitrary, validProxyArbitrary, (profile, proxy) => {
                    // Assign proxy to profile
                    const updatedProfile = assignProxyToProfile(profile, proxy);
                    
                    // Profile data should be preserved
                    expect(updatedProfile.id).toBe(profile.id);
                    expect(updatedProfile.name).toBe(profile.name);
                    expect(updatedProfile.userAgent).toBe(profile.userAgent);
                    expect(updatedProfile.timezone).toBe(profile.timezone);
                    expect(updatedProfile.viewport).toEqual(profile.viewport);
                    
                    // Proxy should be assigned
                    expect(updatedProfile.proxy).toEqual(proxy);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should preserve profile data when clearing proxy', () => {
            fc.assert(
                fc.property(profileArbitrary, validProxyArbitrary, (profile, proxy) => {
                    // First assign proxy
                    const profileWithProxy = assignProxyToProfile(profile, proxy);
                    
                    // Clear proxy
                    const profileAfterClear = clearProxyFromProfile(profileWithProxy);
                    
                    // Profile data should be preserved
                    expect(profileAfterClear.id).toBe(profile.id);
                    expect(profileAfterClear.name).toBe(profile.name);
                    expect(profileAfterClear.userAgent).toBe(profile.userAgent);
                    expect(profileAfterClear.timezone).toBe(profile.timezone);
                    expect(profileAfterClear.viewport).toEqual(profile.viewport);
                    
                    // Proxy should be null
                    expect(profileAfterClear.proxy).toBeNull();
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should handle round-trip: assign then clear returns to no proxy state', () => {
            fc.assert(
                fc.property(profileArbitrary, validProxyArbitrary, (profile, proxy) => {
                    // Start with no proxy
                    const initialHtml = buildProxyInfoHtml(profile.proxy);
                    expect(hasProxyConfigured(initialHtml)).toBe(false);
                    
                    // Assign proxy
                    const profileWithProxy = assignProxyToProfile(profile, proxy);
                    const withProxyHtml = buildProxyInfoHtml(profileWithProxy.proxy);
                    expect(hasProxyConfigured(withProxyHtml)).toBe(true);
                    
                    // Clear proxy
                    const profileCleared = clearProxyFromProfile(profileWithProxy);
                    const clearedHtml = buildProxyInfoHtml(profileCleared.proxy);
                    expect(hasProxyConfigured(clearedHtml)).toBe(false);
                    
                    // Final state should match initial state
                    expect(clearedHtml).toBe(initialHtml);
                    
                    return true;
                }),
                fcOptions
            );
        });

        it('should handle empty proxy object as no proxy', () => {
            fc.assert(
                fc.property(
                    profileArbitrary,
                    fc.constantFrom({}, { host: '' }, { host: null }, { host: undefined }),
                    (profile, emptyProxy) => {
                        // Assign empty/invalid proxy
                        const updatedProfile = assignProxyToProfile(profile, emptyProxy);
                        
                        // Build proxy info HTML
                        const proxyInfoHtml = buildProxyInfoHtml(updatedProfile.proxy);
                        
                        // Should show "No proxy configured" for empty/invalid proxy
                        expect(hasProxyConfigured(proxyInfoHtml)).toBe(false);
                        expect(proxyInfoHtml).toContain('No proxy configured');
                        
                        return true;
                    }
                ),
                fcOptions
            );
        });
    });
});
