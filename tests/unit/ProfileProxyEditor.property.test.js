/**
 * Property-Based Tests for Profile Proxy Editor
 * 
 * These tests validate the correctness properties defined in the design document
 * using fast-check for property-based testing.
 * 
 * Feature: profile-proxy-editor
 */

const fc = require('fast-check');

/**
 * Simulate the filterActiveProxies function from admin.js
 * This is extracted for testability
 */
function filterActiveProxies(proxies) {
    if (!Array.isArray(proxies)) return [];
    return proxies.filter(p => p.active === true);
}

/**
 * Simulate the formatProxyDisplay function from admin.js
 */
function formatProxyDisplay(proxy) {
    if (!proxy || !proxy.host) {
        return 'No proxy configured';
    }
    let display = `${proxy.host}:${proxy.port} (${proxy.type || 'http'})`;
    if (proxy.username) {
        display += ` - Auth: ${proxy.username}:${'*'.repeat(proxy.password?.length || 4)}`;
    }
    return display;
}

/**
 * Simulate the populateProxyFromPool logic from admin.js
 * This function extracts proxy data and returns the form field values
 * that would be populated
 * 
 * @param {Object} proxyData - The proxy data from the selected dropdown option
 * @returns {Object} - The form field values that would be populated
 */
function extractProxyFormValues(proxyData) {
    if (!proxyData) return null;
    
    return {
        host: proxyData.host || '',
        port: proxyData.port || '',
        type: proxyData.type || 'http',
        username: proxyData.username || '',
        password: proxyData.password || ''
    };
}

/**
 * Simulate the validateProxyConfig function from admin.js
 * Property 4: Proxy Input Validation
 * Property 5: Authentication Consistency
 * 
 * Validates:
 * - Host must be a non-empty string (not whitespace-only)
 * - Port must be an integer between 1 and 65535
 * - Type must be one of: http, https, socks4, socks5
 * - If username is provided and non-empty, password must also be provided
 * - If password is provided and non-empty, username must also be provided
 * 
 * Requirements: 3.2, 3.3, 3.5, 3.6
 * 
 * @param {Object} proxy - Proxy configuration object
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateProxyConfig(proxy) {
    const errors = [];
    const validTypes = ['http', 'https', 'socks4', 'socks5'];

    // If proxy is null or undefined, it's valid (no proxy)
    if (proxy === null || proxy === undefined) {
        return { valid: true, errors: [] };
    }

    // If proxy is not an object, it's invalid
    if (typeof proxy !== 'object') {
        return { valid: false, errors: ['Proxy must be an object or null'] };
    }

    // Validate host - must be non-empty string (not whitespace-only)
    // Requirements: 3.2
    if (!proxy.host || typeof proxy.host !== 'string' || proxy.host.trim().length === 0) {
        errors.push('Proxy host is required');
    }

    // Validate port - must be integer between 1 and 65535
    // Requirements: 3.3
    const port = proxy.port;
    if (port === undefined || port === null || port === '') {
        errors.push('Port must be between 1 and 65535');
    } else {
        const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
        if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
            errors.push('Port must be between 1 and 65535');
        }
    }

    // Validate type - must be one of http, https, socks4, socks5
    // Requirements: 3.4 (implicit from design)
    if (proxy.type !== undefined && proxy.type !== null && proxy.type !== '') {
        if (!validTypes.includes(proxy.type)) {
            errors.push('Type must be one of: http, https, socks4, socks5');
        }
    }

    // Validate authentication consistency
    // Requirements: 3.5, 3.6
    const hasUsername = proxy.username && typeof proxy.username === 'string' && proxy.username.trim().length > 0;
    const hasPassword = proxy.password && typeof proxy.password === 'string' && proxy.password.trim().length > 0;

    if (hasUsername && !hasPassword) {
        errors.push('Password is required when username is provided');
    }
    if (hasPassword && !hasUsername) {
        errors.push('Username is required when password is provided');
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Arbitrary generators for test data
const proxyIdArb = fc.uuid();
const hostArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
const portArb = fc.integer({ min: 1, max: 65535 });
const proxyTypeArb = fc.constantFrom('http', 'https', 'socks4', 'socks5');
const countryArb = fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: null });
const providerArb = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });
const usernameArb = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });
const passwordArb = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });
const activeArb = fc.boolean();

// Generate a complete proxy object
const proxyArb = fc.record({
    id: proxyIdArb,
    host: hostArb,
    port: portArb,
    type: proxyTypeArb,
    country: countryArb,
    provider: providerArb,
    username: usernameArb,
    password: passwordArb,
    active: activeArb,
    usageCount: fc.nat(),
    lastUsed: fc.option(fc.constant('2024-01-01T00:00:00.000Z'), { nil: null }),
    createdAt: fc.constant('2024-01-01T00:00:00.000Z')
});

// Generate array of proxies
const proxyArrayArb = fc.array(proxyArb, { minLength: 0, maxLength: 20 });

describe('Profile Proxy Editor - Property Tests', () => {
    /**
     * Property 2: Active Proxy Filtering
     * 
     * *For any* proxy pool containing both active and inactive proxies,
     * the dropdown SHALL only display proxies where active is true.
     * 
     * **Validates: Requirements 2.4**
     * 
     * Feature: profile-proxy-editor, Property 2: Active Proxy Filtering
     */
    describe('Property 2: Active Proxy Filtering', () => {
        test('For any proxy pool, filterActiveProxies should only return proxies where active is true', () => {
            fc.assert(
                fc.property(
                    proxyArrayArb,
                    (proxies) => {
                        // Act
                        const filtered = filterActiveProxies(proxies);
                        
                        // Assert
                        // 1. All returned proxies must have active === true
                        filtered.forEach(proxy => {
                            expect(proxy.active).toBe(true);
                        });
                        
                        // 2. Count of filtered proxies should equal count of active proxies in original
                        const expectedActiveCount = proxies.filter(p => p.active === true).length;
                        expect(filtered.length).toBe(expectedActiveCount);
                        
                        // 3. No inactive proxy should be in the result
                        const inactiveInResult = filtered.some(p => p.active !== true);
                        expect(inactiveInResult).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy pool with only inactive proxies, filterActiveProxies should return empty array', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: proxyIdArb,
                            host: hostArb,
                            port: portArb,
                            type: proxyTypeArb,
                            active: fc.constant(false) // All inactive
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    (proxies) => {
                        // Act
                        const filtered = filterActiveProxies(proxies);
                        
                        // Assert - should be empty
                        expect(filtered.length).toBe(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy pool with only active proxies, filterActiveProxies should return all proxies', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: proxyIdArb,
                            host: hostArb,
                            port: portArb,
                            type: proxyTypeArb,
                            active: fc.constant(true) // All active
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    (proxies) => {
                        // Act
                        const filtered = filterActiveProxies(proxies);
                        
                        // Assert - should return all
                        expect(filtered.length).toBe(proxies.length);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('filterActiveProxies should handle empty array', () => {
            const filtered = filterActiveProxies([]);
            expect(filtered).toEqual([]);
        });

        test('filterActiveProxies should handle non-array input', () => {
            expect(filterActiveProxies(null)).toEqual([]);
            expect(filterActiveProxies(undefined)).toEqual([]);
            expect(filterActiveProxies('string')).toEqual([]);
            expect(filterActiveProxies(123)).toEqual([]);
            expect(filterActiveProxies({})).toEqual([]);
        });
    });

    /**
     * Property 3: Proxy Selection Population
     * 
     * *For any* proxy selected from the dropdown, all form fields (host, port, type, 
     * username, password) SHALL be populated with the corresponding values from the 
     * selected proxy.
     * 
     * **Validates: Requirements 2.2**
     * 
     * Feature: profile-proxy-editor, Property 3: Proxy Selection Population
     */
    describe('Property 3: Proxy Selection Population', () => {
        test('For any proxy selected, all form fields should be populated with corresponding values', () => {
            fc.assert(
                fc.property(
                    proxyArb,
                    (proxy) => {
                        // Act - simulate what populateProxyFromPool does
                        const formValues = extractProxyFormValues(proxy);
                        
                        // Assert - all fields should be populated with corresponding values
                        expect(formValues.host).toBe(proxy.host || '');
                        expect(formValues.port).toBe(proxy.port || '');
                        expect(formValues.type).toBe(proxy.type || 'http');
                        expect(formValues.username).toBe(proxy.username || '');
                        expect(formValues.password).toBe(proxy.password || '');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with all fields defined, form values should match exactly', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        id: proxyIdArb,
                        host: hostArb,
                        port: portArb,
                        type: proxyTypeArb,
                        username: fc.string({ minLength: 1, maxLength: 50 }),
                        password: fc.string({ minLength: 1, maxLength: 50 }),
                        active: fc.constant(true)
                    }),
                    (proxy) => {
                        // Act
                        const formValues = extractProxyFormValues(proxy);
                        
                        // Assert - all fields should match exactly
                        expect(formValues.host).toBe(proxy.host);
                        expect(formValues.port).toBe(proxy.port);
                        expect(formValues.type).toBe(proxy.type);
                        expect(formValues.username).toBe(proxy.username);
                        expect(formValues.password).toBe(proxy.password);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with optional fields undefined, form values should default correctly', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        id: proxyIdArb,
                        host: hostArb,
                        port: portArb,
                        // type, username, password are undefined
                        active: fc.constant(true)
                    }),
                    (proxy) => {
                        // Act
                        const formValues = extractProxyFormValues(proxy);
                        
                        // Assert - optional fields should have default values
                        expect(formValues.host).toBe(proxy.host);
                        expect(formValues.port).toBe(proxy.port);
                        expect(formValues.type).toBe('http'); // default type
                        expect(formValues.username).toBe(''); // empty string for undefined
                        expect(formValues.password).toBe(''); // empty string for undefined
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('extractProxyFormValues should handle null input', () => {
            const result = extractProxyFormValues(null);
            expect(result).toBeNull();
        });

        test('extractProxyFormValues should handle undefined input', () => {
            const result = extractProxyFormValues(undefined);
            expect(result).toBeNull();
        });
    });

    /**
     * Property 4: Proxy Input Validation
     * 
     * *For any* proxy configuration input:
     * - Host must be a non-empty string (not whitespace-only)
     * - Port must be an integer between 1 and 65535
     * - Type must be one of: http, https, socks4, socks5
     * 
     * **Validates: Requirements 3.2, 3.3**
     * 
     * Feature: profile-proxy-editor, Property 4: Proxy Input Validation
     */
    describe('Property 4: Proxy Input Validation', () => {
        // Generator for valid proxy configurations
        const validProxyArb = fc.record({
            host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
        });

        // Generator for invalid hosts (empty or whitespace-only)
        const invalidHostArb = fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\n'),
            fc.constant('  \t  ')
        );

        // Generator for invalid ports
        const invalidPortArb = fc.oneof(
            fc.constant(0),
            fc.constant(-1),
            fc.integer({ min: -1000, max: 0 }),
            fc.integer({ min: 65536, max: 100000 }),
            fc.constant(65536)
        );

        // Generator for invalid types
        const invalidTypeArb = fc.string({ minLength: 1, maxLength: 20 })
            .filter(s => !['http', 'https', 'socks4', 'socks5'].includes(s));

        test('For any valid proxy configuration, validateProxyConfig should return valid: true', () => {
            fc.assert(
                fc.property(
                    validProxyArb,
                    (proxy) => {
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert
                        expect(result.valid).toBe(true);
                        expect(result.errors).toEqual([]);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with empty or whitespace-only host, validateProxyConfig should return valid: false', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        host: invalidHostArb,
                        port: fc.integer({ min: 1, max: 65535 }),
                        type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
                    }),
                    (proxy) => {
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert
                        expect(result.valid).toBe(false);
                        expect(result.errors).toContain('Proxy host is required');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with port outside 1-65535 range, validateProxyConfig should return valid: false', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        port: invalidPortArb,
                        type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
                    }),
                    (proxy) => {
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert
                        expect(result.valid).toBe(false);
                        expect(result.errors).toContain('Port must be between 1 and 65535');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with invalid type, validateProxyConfig should return valid: false', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        port: fc.integer({ min: 1, max: 65535 }),
                        type: invalidTypeArb
                    }),
                    (proxy) => {
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert
                        expect(result.valid).toBe(false);
                        expect(result.errors).toContain('Type must be one of: http, https, socks4, socks5');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('validateProxyConfig should accept null as valid (no proxy)', () => {
            const result = validateProxyConfig(null);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('validateProxyConfig should accept undefined as valid (no proxy)', () => {
            const result = validateProxyConfig(undefined);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('validateProxyConfig should reject non-object input', () => {
            expect(validateProxyConfig('string').valid).toBe(false);
            expect(validateProxyConfig(123).valid).toBe(false);
            expect(validateProxyConfig(true).valid).toBe(false);
        });
    });

    /**
     * Property 5: Authentication Consistency
     * 
     * *For any* proxy configuration:
     * - If username is provided and non-empty, password must also be provided
     * - If password is provided and non-empty, username must also be provided
     * - Both empty is valid (no authentication)
     * - Both provided is valid (with authentication)
     * 
     * **Validates: Requirements 3.5, 3.6**
     * 
     * Feature: profile-proxy-editor, Property 5: Authentication Consistency
     */
    describe('Property 5: Authentication Consistency', () => {
        // Base valid proxy without auth
        const baseProxyArb = fc.record({
            host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
        });

        // Non-empty string generator for credentials
        const nonEmptyCredentialArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

        test('For any proxy with both username and password provided, validateProxyConfig should return valid: true', () => {
            fc.assert(
                fc.property(
                    baseProxyArb,
                    nonEmptyCredentialArb,
                    nonEmptyCredentialArb,
                    (baseProxy, username, password) => {
                        // Arrange
                        const proxy = { ...baseProxy, username, password };
                        
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert - should be valid (both credentials provided)
                        expect(result.valid).toBe(true);
                        expect(result.errors).toEqual([]);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with neither username nor password, validateProxyConfig should return valid: true', () => {
            fc.assert(
                fc.property(
                    baseProxyArb,
                    (proxy) => {
                        // Act - proxy without username and password
                        const result = validateProxyConfig(proxy);
                        
                        // Assert - should be valid (no auth)
                        expect(result.valid).toBe(true);
                        expect(result.errors).toEqual([]);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with username but no password, validateProxyConfig should return valid: false', () => {
            fc.assert(
                fc.property(
                    baseProxyArb,
                    nonEmptyCredentialArb,
                    (baseProxy, username) => {
                        // Arrange - proxy with username but no password
                        const proxy = { ...baseProxy, username };
                        
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert - should be invalid
                        expect(result.valid).toBe(false);
                        expect(result.errors).toContain('Password is required when username is provided');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with password but no username, validateProxyConfig should return valid: false', () => {
            fc.assert(
                fc.property(
                    baseProxyArb,
                    nonEmptyCredentialArb,
                    (baseProxy, password) => {
                        // Arrange - proxy with password but no username
                        const proxy = { ...baseProxy, password };
                        
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert - should be invalid
                        expect(result.valid).toBe(false);
                        expect(result.errors).toContain('Username is required when password is provided');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with empty string username and password, validateProxyConfig should return valid: true', () => {
            fc.assert(
                fc.property(
                    baseProxyArb,
                    (baseProxy) => {
                        // Arrange - proxy with empty credentials
                        const proxy = { ...baseProxy, username: '', password: '' };
                        
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert - should be valid (empty strings treated as no auth)
                        expect(result.valid).toBe(true);
                        expect(result.errors).toEqual([]);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with whitespace-only username and password, validateProxyConfig should return valid: true', () => {
            fc.assert(
                fc.property(
                    baseProxyArb,
                    fc.constantFrom('   ', '\t\t', '  \t  '),
                    fc.constantFrom('   ', '\t\t', '  \t  '),
                    (baseProxy, username, password) => {
                        // Arrange - proxy with whitespace-only credentials
                        const proxy = { ...baseProxy, username, password };
                        
                        // Act
                        const result = validateProxyConfig(proxy);
                        
                        // Assert - should be valid (whitespace-only treated as no auth)
                        expect(result.valid).toBe(true);
                        expect(result.errors).toEqual([]);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 6: Clear Proxy State Reset
     * 
     * *For any* profile with existing proxy configuration, clicking "Clear Proxy" 
     * SHALL result in all proxy form fields being empty and the proxy source being 
     * set to "none".
     * 
     * **Validates: Requirements 4.2**
     * 
     * Feature: profile-proxy-editor, Property 6: Clear Proxy State Reset
     */
    describe('Property 6: Clear Proxy State Reset', () => {
        /**
         * Simulate the form state before and after clearProxy()
         * This represents the state of the Edit Profile Modal's proxy section
         */
        class ProxyFormState {
            constructor(initialProxy = null) {
                // Initialize form fields with proxy data
                if (initialProxy) {
                    this.host = initialProxy.host || '';
                    this.port = initialProxy.port !== undefined ? String(initialProxy.port) : '';
                    this.type = initialProxy.type || 'http';
                    this.username = initialProxy.username || '';
                    this.password = initialProxy.password || '';
                    this.proxySource = initialProxy.host ? 'manual' : 'none';
                    this.poolSelection = '';
                } else {
                    this.host = '';
                    this.port = '';
                    this.type = 'http';
                    this.username = '';
                    this.password = '';
                    this.proxySource = 'none';
                    this.poolSelection = '';
                }
            }

            /**
             * Simulate the clearProxy() function from admin.js
             * This clears all proxy form fields and sets source to "none"
             */
            clearProxy() {
                // Clear all form fields (simulates clearProxyFields())
                this.host = '';
                this.port = '';
                this.type = 'http';
                this.username = '';
                this.password = '';
                this.poolSelection = '';
                
                // Set proxy source to "none"
                this.proxySource = 'none';
            }

            /**
             * Check if all proxy fields are empty/default
             */
            isCleared() {
                return (
                    this.host === '' &&
                    this.port === '' &&
                    this.type === 'http' &&
                    this.username === '' &&
                    this.password === '' &&
                    this.poolSelection === '' &&
                    this.proxySource === 'none'
                );
            }
        }

        // Generator for proxy configurations with various field combinations
        const proxyConfigArb = fc.record({
            host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
            username: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
            password: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' })
        });

        test('For any profile with existing proxy configuration, clearProxy should result in all fields being empty and source being "none"', () => {
            fc.assert(
                fc.property(
                    proxyConfigArb,
                    (proxyConfig) => {
                        // Arrange - create form state with existing proxy
                        const formState = new ProxyFormState(proxyConfig);
                        
                        // Verify initial state has proxy data
                        expect(formState.host).toBe(proxyConfig.host);
                        expect(formState.port).toBe(String(proxyConfig.port));
                        
                        // Act - clear proxy
                        formState.clearProxy();
                        
                        // Assert - all fields should be empty/default and source should be "none"
                        expect(formState.isCleared()).toBe(true);
                        expect(formState.host).toBe('');
                        expect(formState.port).toBe('');
                        expect(formState.type).toBe('http');
                        expect(formState.username).toBe('');
                        expect(formState.password).toBe('');
                        expect(formState.poolSelection).toBe('');
                        expect(formState.proxySource).toBe('none');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with authentication, clearProxy should clear both username and password', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        port: fc.integer({ min: 1, max: 65535 }),
                        type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
                        username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                        password: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
                    }),
                    (proxyConfig) => {
                        // Arrange - create form state with proxy that has authentication
                        const formState = new ProxyFormState(proxyConfig);
                        
                        // Verify initial state has credentials
                        expect(formState.username).toBe(proxyConfig.username);
                        expect(formState.password).toBe(proxyConfig.password);
                        
                        // Act - clear proxy
                        formState.clearProxy();
                        
                        // Assert - credentials should be cleared
                        expect(formState.username).toBe('');
                        expect(formState.password).toBe('');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy type, clearProxy should reset type to default "http"', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        port: fc.integer({ min: 1, max: 65535 }),
                        type: fc.constantFrom('https', 'socks4', 'socks5') // Non-default types
                    }),
                    (proxyConfig) => {
                        // Arrange - create form state with non-default proxy type
                        const formState = new ProxyFormState(proxyConfig);
                        
                        // Verify initial state has non-default type
                        expect(formState.type).toBe(proxyConfig.type);
                        expect(formState.type).not.toBe('http');
                        
                        // Act - clear proxy
                        formState.clearProxy();
                        
                        // Assert - type should be reset to default "http"
                        expect(formState.type).toBe('http');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('clearProxy is idempotent - calling it multiple times produces same result', () => {
            fc.assert(
                fc.property(
                    proxyConfigArb,
                    fc.integer({ min: 1, max: 5 }),
                    (proxyConfig, callCount) => {
                        // Arrange - create form state with existing proxy
                        const formState = new ProxyFormState(proxyConfig);
                        
                        // Act - call clearProxy multiple times
                        for (let i = 0; i < callCount; i++) {
                            formState.clearProxy();
                        }
                        
                        // Assert - state should be cleared regardless of how many times called
                        expect(formState.isCleared()).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('clearProxy on already empty form should maintain cleared state', () => {
            // Arrange - create form state without proxy (already cleared)
            const formState = new ProxyFormState(null);
            
            // Verify initial state is already cleared
            expect(formState.isCleared()).toBe(true);
            
            // Act - clear proxy
            formState.clearProxy();
            
            // Assert - should still be cleared
            expect(formState.isCleared()).toBe(true);
            expect(formState.proxySource).toBe('none');
        });
    });

    /**
     * Property 7: Valid Proxy Save Round-Trip
     * 
     * *For any* valid proxy configuration (passing all validation rules), 
     * saving the profile and then reloading it SHALL return the same proxy configuration.
     * 
     * **Validates: Requirements 5.1, 6.1**
     * 
     * Feature: profile-proxy-editor, Property 7: Valid Proxy Save Round-Trip
     */
    describe('Property 7: Valid Proxy Save Round-Trip', () => {
        /**
         * Simulate the buildProxyFromForm function from admin.js
         * Returns null if proxy source is "none"
         * Returns proxy object if source is "pool" or "manual"
         * 
         * @param {Object} formState - The form state object
         * @returns {Object|null} - Proxy configuration object or null
         */
        function buildProxyFromForm(formState) {
            // If source is "none", return null to remove proxy
            if (formState.proxySource === 'none') {
                return null;
            }
            
            // Get values from form fields
            const host = formState.host?.trim() || '';
            const portValue = formState.port;
            const type = formState.type || 'http';
            const username = formState.username?.trim() || '';
            const password = formState.password || '';
            
            // If host is empty, return null (no valid proxy)
            if (!host) {
                return null;
            }
            
            // Build proxy object
            const proxy = {
                host: host,
                port: portValue ? parseInt(portValue, 10) : null,
                type: type
            };
            
            // Only include username/password if provided
            if (username) {
                proxy.username = username;
            }
            if (password) {
                proxy.password = password;
            }
            
            return proxy;
        }

        /**
         * Simulate API save and reload behavior
         * This represents what happens when profile is saved and then reloaded
         * 
         * @param {Object|null} proxy - Proxy configuration to save
         * @returns {Object|null} - Proxy configuration after reload
         */
        function simulateSaveAndReload(proxy) {
            // Simulate API behavior: null proxy is stored as null
            if (proxy === null || proxy === undefined) {
                return null;
            }
            
            // Simulate API validation and storage
            // API stores the proxy object as-is (with validation)
            const validation = validateProxyConfig(proxy);
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Return the proxy as it would be stored and retrieved
            // API normalizes the proxy object
            const storedProxy = {
                host: proxy.host,
                port: proxy.port,
                type: proxy.type || 'http'
            };
            
            if (proxy.username) {
                storedProxy.username = proxy.username;
            }
            if (proxy.password) {
                storedProxy.password = proxy.password;
            }
            
            return storedProxy;
        }

        /**
         * Compare two proxy objects for equality
         * Handles null/undefined cases
         * 
         * @param {Object|null} proxy1 - First proxy
         * @param {Object|null} proxy2 - Second proxy
         * @returns {boolean} - True if proxies are equivalent
         */
        function proxiesAreEqual(proxy1, proxy2) {
            // Both null/undefined
            if (!proxy1 && !proxy2) return true;
            // One null, one not
            if (!proxy1 || !proxy2) return false;
            
            // Compare fields
            return (
                proxy1.host === proxy2.host &&
                proxy1.port === proxy2.port &&
                (proxy1.type || 'http') === (proxy2.type || 'http') &&
                (proxy1.username || '') === (proxy2.username || '') &&
                (proxy1.password || '') === (proxy2.password || '')
            );
        }

        // Generator for valid proxy configurations (passing all validation rules)
        const validProxyArb = fc.record({
            host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
        });

        // Generator for valid proxy with authentication
        const validProxyWithAuthArb = fc.record({
            host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
            username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            password: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        });

        test('For any valid proxy configuration, saving and reloading should return equivalent proxy', () => {
            fc.assert(
                fc.property(
                    validProxyArb,
                    (proxy) => {
                        // Act - simulate save and reload
                        const reloadedProxy = simulateSaveAndReload(proxy);
                        
                        // Assert - reloaded proxy should be equivalent to original
                        expect(proxiesAreEqual(proxy, reloadedProxy)).toBe(true);
                        expect(reloadedProxy.host).toBe(proxy.host);
                        expect(reloadedProxy.port).toBe(proxy.port);
                        expect(reloadedProxy.type).toBe(proxy.type);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any valid proxy with authentication, saving and reloading should preserve credentials', () => {
            fc.assert(
                fc.property(
                    validProxyWithAuthArb,
                    (proxy) => {
                        // Act - simulate save and reload
                        const reloadedProxy = simulateSaveAndReload(proxy);
                        
                        // Assert - credentials should be preserved
                        expect(reloadedProxy.username).toBe(proxy.username);
                        expect(reloadedProxy.password).toBe(proxy.password);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any form state with valid proxy, buildProxyFromForm then save/reload should round-trip correctly', () => {
            fc.assert(
                fc.property(
                    validProxyArb,
                    (proxy) => {
                        // Arrange - create form state from proxy
                        const formState = {
                            proxySource: 'manual',
                            host: proxy.host,
                            port: String(proxy.port),
                            type: proxy.type,
                            username: '',
                            password: ''
                        };
                        
                        // Act - build proxy from form, then save and reload
                        const builtProxy = buildProxyFromForm(formState);
                        const reloadedProxy = simulateSaveAndReload(builtProxy);
                        
                        // Assert - round-trip should preserve data
                        // Note: host is trimmed by buildProxyFromForm, so we compare trimmed values
                        expect(reloadedProxy.host).toBe(proxy.host.trim());
                        expect(reloadedProxy.port).toBe(proxy.port);
                        expect(reloadedProxy.type).toBe(proxy.type);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For proxy source "none", buildProxyFromForm should return null', () => {
            fc.assert(
                fc.property(
                    validProxyArb,
                    (proxy) => {
                        // Arrange - create form state with source "none"
                        const formState = {
                            proxySource: 'none',
                            host: proxy.host,
                            port: String(proxy.port),
                            type: proxy.type,
                            username: '',
                            password: ''
                        };
                        
                        // Act - build proxy from form
                        const builtProxy = buildProxyFromForm(formState);
                        
                        // Assert - should return null regardless of field values
                        expect(builtProxy).toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('Saving null proxy and reloading should return null', () => {
            // Act - simulate save and reload with null proxy
            const reloadedProxy = simulateSaveAndReload(null);
            
            // Assert - should return null
            expect(reloadedProxy).toBeNull();
        });

        test('For any valid proxy, type should default to "http" if not specified', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                        port: fc.integer({ min: 1, max: 65535 })
                        // type not specified
                    }),
                    (proxy) => {
                        // Act - simulate save and reload
                        const reloadedProxy = simulateSaveAndReload(proxy);
                        
                        // Assert - type should default to "http"
                        expect(reloadedProxy.type).toBe('http');
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Property 8: Invalid Proxy Rejection
     * 
     * *For any* invalid proxy configuration (failing validation rules), 
     * the API SHALL return HTTP 400 status and the profile's proxy SHALL remain unchanged.
     * 
     * **Validates: Requirements 5.2, 6.2**
     * 
     * Feature: profile-proxy-editor, Property 8: Invalid Proxy Rejection
     */
    describe('Property 8: Invalid Proxy Rejection', () => {
        /**
         * Simulate API behavior for invalid proxy
         * Returns error response for invalid proxy configurations
         * 
         * @param {Object} proxy - Proxy configuration to validate
         * @param {Object|null} existingProxy - Current proxy on profile
         * @returns {Object} - { success: boolean, status: number, proxy: Object|null }
         */
        function simulateApiUpdate(proxy, existingProxy) {
            const validation = validateProxyConfig(proxy);
            
            if (!validation.valid) {
                // API returns 400 for invalid proxy
                return {
                    success: false,
                    status: 400,
                    errors: validation.errors,
                    proxy: existingProxy // Proxy remains unchanged
                };
            }
            
            // Valid proxy - update succeeds
            return {
                success: true,
                status: 200,
                proxy: proxy
            };
        }

        // Generator for invalid proxy configurations
        const invalidHostProxyArb = fc.record({
            host: fc.oneof(
                fc.constant(''),
                fc.constant('   '),
                fc.constant('\t\n')
            ),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
        });

        const invalidPortProxyArb = fc.record({
            host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            port: fc.oneof(
                fc.constant(0),
                fc.constant(-1),
                fc.integer({ min: -1000, max: 0 }),
                fc.integer({ min: 65536, max: 100000 })
            ),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
        });

        const invalidTypeProxyArb = fc.record({
            host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.string({ minLength: 1, maxLength: 20 })
                .filter(s => !['http', 'https', 'socks4', 'socks5'].includes(s))
        });

        const invalidAuthProxyArb = fc.oneof(
            // Username without password
            fc.record({
                host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                port: fc.integer({ min: 1, max: 65535 }),
                type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
                username: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
                // password not provided
            }),
            // Password without username
            fc.record({
                host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                port: fc.integer({ min: 1, max: 65535 }),
                type: fc.constantFrom('http', 'https', 'socks4', 'socks5'),
                password: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
                // username not provided
            })
        );

        // Generator for valid existing proxy (to verify it remains unchanged)
        const existingProxyArb = fc.record({
            host: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            port: fc.integer({ min: 1, max: 65535 }),
            type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
        });

        test('For any proxy with invalid host, API should return 400 and proxy should remain unchanged', () => {
            fc.assert(
                fc.property(
                    invalidHostProxyArb,
                    existingProxyArb,
                    (invalidProxy, existingProxy) => {
                        // Act - simulate API update with invalid proxy
                        const result = simulateApiUpdate(invalidProxy, existingProxy);
                        
                        // Assert - should return 400 and proxy should remain unchanged
                        expect(result.success).toBe(false);
                        expect(result.status).toBe(400);
                        expect(result.errors).toContain('Proxy host is required');
                        expect(result.proxy).toEqual(existingProxy);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with invalid port, API should return 400 and proxy should remain unchanged', () => {
            fc.assert(
                fc.property(
                    invalidPortProxyArb,
                    existingProxyArb,
                    (invalidProxy, existingProxy) => {
                        // Act - simulate API update with invalid proxy
                        const result = simulateApiUpdate(invalidProxy, existingProxy);
                        
                        // Assert - should return 400 and proxy should remain unchanged
                        expect(result.success).toBe(false);
                        expect(result.status).toBe(400);
                        expect(result.errors).toContain('Port must be between 1 and 65535');
                        expect(result.proxy).toEqual(existingProxy);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with invalid type, API should return 400 and proxy should remain unchanged', () => {
            fc.assert(
                fc.property(
                    invalidTypeProxyArb,
                    existingProxyArb,
                    (invalidProxy, existingProxy) => {
                        // Act - simulate API update with invalid proxy
                        const result = simulateApiUpdate(invalidProxy, existingProxy);
                        
                        // Assert - should return 400 and proxy should remain unchanged
                        expect(result.success).toBe(false);
                        expect(result.status).toBe(400);
                        expect(result.errors).toContain('Type must be one of: http, https, socks4, socks5');
                        expect(result.proxy).toEqual(existingProxy);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any proxy with inconsistent authentication, API should return 400 and proxy should remain unchanged', () => {
            fc.assert(
                fc.property(
                    invalidAuthProxyArb,
                    existingProxyArb,
                    (invalidProxy, existingProxy) => {
                        // Act - simulate API update with invalid proxy
                        const result = simulateApiUpdate(invalidProxy, existingProxy);
                        
                        // Assert - should return 400 and proxy should remain unchanged
                        expect(result.success).toBe(false);
                        expect(result.status).toBe(400);
                        // Should have either username or password error
                        const hasAuthError = result.errors.some(e => 
                            e.includes('Password is required when username is provided') ||
                            e.includes('Username is required when password is provided')
                        );
                        expect(hasAuthError).toBe(true);
                        expect(result.proxy).toEqual(existingProxy);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any invalid proxy when profile has no existing proxy, proxy should remain null', () => {
            fc.assert(
                fc.property(
                    invalidHostProxyArb,
                    (invalidProxy) => {
                        // Act - simulate API update with invalid proxy, no existing proxy
                        const result = simulateApiUpdate(invalidProxy, null);
                        
                        // Assert - should return 400 and proxy should remain null
                        expect(result.success).toBe(false);
                        expect(result.status).toBe(400);
                        expect(result.proxy).toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('For any valid proxy, API should return 200 and update the proxy', () => {
            fc.assert(
                fc.property(
                    existingProxyArb,
                    existingProxyArb,
                    (newProxy, existingProxy) => {
                        // Act - simulate API update with valid proxy
                        const result = simulateApiUpdate(newProxy, existingProxy);
                        
                        // Assert - should return 200 and update the proxy
                        expect(result.success).toBe(true);
                        expect(result.status).toBe(200);
                        expect(result.proxy).toEqual(newProxy);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
