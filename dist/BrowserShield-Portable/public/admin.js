// BrowserShield Admin Interface JavaScript
class BrowserShieldAdmin {
    constructor() {
        this.baseUrl = window.location.origin;
        this.profiles = [];
        this.sessions = [];
        this.logs = [];
        this.proxies = [];
        this.proxyStats = null;
        this.currentSection = 'profiles';
        this.refreshInterval = null;

        this.init();
    }

    async init() {
        console.log('Initializing BrowserShield Admin...');

        // Setup event handlers
        this.setupEventHandlers();

        // Load initial data
        await this.loadInitialData();

        // Start auto-refresh
        this.startAutoRefresh();

        console.log('Admin interface initialized');
    }

    setupEventHandlers() {
        // Profile form submission
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProfile();
        });

        // Navigation clicks - use closest() to handle clicks on nested elements (icons)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Use closest() to get the nav-link element even if icon was clicked
                const navLink = e.target.closest('.nav-link');
                if (navLink) {
                    const href = navLink.getAttribute('href');
                    if (href) {
                        const section = href.substring(1);
                        this.showSection(section);
                    }
                }
            });
        });

        // Add proxy form submission - wire up form submit event
        const addProxyForm = document.getElementById('addProxyForm');
        if (addProxyForm) {
            addProxyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addProxy(e);
            });
        }

        // Proxy form field validation on input - provide real-time feedback
        const proxyHostInput = document.getElementById('proxyHost');
        const proxyPortInput = document.getElementById('proxyPort');
        
        if (proxyHostInput) {
            proxyHostInput.addEventListener('input', () => {
                this.validateAddProxyForm();
            });
            proxyHostInput.addEventListener('blur', () => {
                this.validateAddProxyForm();
            });
        }
        
        if (proxyPortInput) {
            proxyPortInput.addEventListener('input', () => {
                this.validateAddProxyForm();
            });
            proxyPortInput.addEventListener('blur', () => {
                this.validateAddProxyForm();
            });
        }

        // Live logs toggle - restore from localStorage and sync with server
        const enableServerLogs = document.getElementById('enableServerLogs');
        if (enableServerLogs) {
            // Load initial state from server
            this.loadLogStatus().then(status => {
                const savedState = status?.consoleEnabled ?? (localStorage.getItem('enableServerLogs') === 'true');
                enableServerLogs.checked = savedState;
                if (savedState) {
                    this.startServerLogPolling();
                }
            });
            
            enableServerLogs.addEventListener('change', async (e) => {
                localStorage.setItem('enableServerLogs', e.target.checked);
                // Toggle server console logging
                await this.toggleServerLogs(e.target.checked);
                
                if (e.target.checked) {
                    this.startServerLogPolling();
                } else {
                    this.stopServerLogPolling();
                }
            });
        }

        // Auto refresh logs toggle - restore from localStorage
        const autoRefreshLogs = document.getElementById('autoRefreshLogs');
        if (autoRefreshLogs) {
            const savedAutoRefresh = localStorage.getItem('autoRefreshLogs') !== 'false'; // default true
            autoRefreshLogs.checked = savedAutoRefresh;
            
            autoRefreshLogs.addEventListener('change', (e) => {
                localStorage.setItem('autoRefreshLogs', e.target.checked);
            });
        }
    }

    startServerLogPolling() {
        if (this.serverLogInterval) return;
        
        this.appendServerLog('Live logging enabled - polling server...', 'success');
        
        this.serverLogInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.baseUrl}/api/profiles/system/logs?limit=5`);
                const data = await response.json();
                
                if (data.success && data.data && data.data.length > 0) {
                    // Show only new logs
                    const lastLogTime = this.lastServerLogTime || 0;
                    const newLogs = data.data.filter(log => {
                        const logTime = new Date(log.timestamp || log.createdAt).getTime();
                        return logTime > lastLogTime;
                    });
                    
                    newLogs.forEach(log => {
                        const action = log.action || log.type || 'INFO';
                        const details = log.details || log.message || JSON.stringify(log.data || {});
                        this.appendServerLog(`[${action}] ${details}`, action.includes('ERROR') ? 'error' : 'info');
                    });
                    
                    if (newLogs.length > 0) {
                        this.lastServerLogTime = Date.now();
                    }
                }
            } catch (error) {
                // Silent fail for polling
            }
        }, 3000); // Poll every 3 seconds
    }

    stopServerLogPolling() {
        if (this.serverLogInterval) {
            clearInterval(this.serverLogInterval);
            this.serverLogInterval = null;
            this.appendServerLog('Live logging disabled', 'info');
        }
    }

    async loadLogStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/system/logs/status`);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.warn('Could not load log status:', error);
            return null;
        }
    }

    async toggleServerLogs(enabled) {
        try {
            const response = await fetch(`${this.baseUrl}/api/system/logs/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consoleEnabled: enabled })
            });
            const data = await response.json();
            if (data.success) {
                this.showToast(data.message, 'success');
            }
        } catch (error) {
            console.error('Failed to toggle server logs:', error);
        }
    }

    async loadInitialData() {
        await this.loadCurrentMode();
        // Load profiles and sessions first, then update stats
        await Promise.all([
            this.loadProfiles(),
            this.loadSessions()
        ]);
        // Now update stats after profiles are loaded
        await this.updateStats();
        await this.loadLogs();
    }

    async loadCurrentMode() {
        try {
            const response = await fetch('/api/mode');
            const data = await response.json();
            if (data.success) {
                const mode = data.data.currentMode;
                const modeDisplay = mode === 'mock' ? 'Mock Mode' :
                    mode === 'production' ? 'Production Mode' :
                        mode === 'firefox' ? 'Firefox Mode' : 'Unknown Mode';

                // Update mode display in navbar
                const modeIndicator = document.querySelector('.mode-indicator');
                if (modeIndicator) {
                    modeIndicator.textContent = modeDisplay;
                }

                // Update mode badge in stats section
                const currentModeEl = document.getElementById('currentMode');
                if (currentModeEl) {
                    currentModeEl.textContent = modeDisplay;
                }
            }
        } catch (error) {
            console.warn('Failed to load current mode:', error);
        }
    }

    async loadProfiles() {
        try {
            console.log('Loading profiles...');
            const response = await fetch(`${this.baseUrl}/api/profiles`);
            const data = await response.json();

            // Handle different response formats
            if (data.success && data.data) {
                this.profiles = data.data;
            } else if (data.profiles) {
                this.profiles = data.profiles;
            } else if (Array.isArray(data)) {
                this.profiles = data;
            } else {
                this.profiles = [];
            }

            this.renderProfiles();
            console.log(`Loaded ${this.profiles.length} profiles`);
        } catch (error) {
            console.error('Error loading profiles:', error);
            this.showToast('Error loading profiles', 'error');
        }
    }

    async loadSessions() {
        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/sessions/active`);
            const data = await response.json();

            // Handle different response formats
            if (data.success && data.data) {
                this.sessions = data.data;
            } else if (data.sessions) {
                this.sessions = data.sessions;
            } else if (Array.isArray(data)) {
                this.sessions = data;
            } else {
                this.sessions = [];
            }

            this.renderSessions();
            console.log(`Loaded ${this.sessions.length} active sessions`);
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showToast('Error loading sessions', 'error');
        }
    }

    async loadLogs() {
        try {
            // Try to load real logs from server
            const response = await fetch(`${this.baseUrl}/api/profiles/system/logs?limit=100`);
            const data = await response.json();
            
            if (data.success && data.data && data.data.length > 0) {
                this.logs = data.data.map(log => {
                    let detailsText = '';
                    if (log.details) {
                        if (log.details.profileName) {
                            detailsText = `Profile: ${log.details.profileName}`;
                        }
                        if (log.details.url) {
                            detailsText += (detailsText ? ' | ' : '') + `URL: ${log.details.url}`;
                        }
                        if (log.details.sessionInfo?.profileName) {
                            detailsText = `Profile: ${log.details.sessionInfo.profileName}`;
                        }
                        if (log.details.autoNavigateUrl) {
                            detailsText += (detailsText ? ' | ' : '') + `Navigate: ${log.details.autoNavigateUrl}`;
                        }
                        if (!detailsText && log.details.ip) {
                            detailsText = `IP: ${log.details.ip}`;
                        }
                    }
                    return {
                        timestamp: log.timestamp,
                        action: log.action || 'Activity',
                        details: detailsText || 'No details',
                        profileId: log.profileId
                    };
                });
            } else {
                // No logs from server
                this.logs = [];
            }
            this.renderLogs();
        } catch (error) {
            console.error('Error loading logs:', error);
            this.logs = [];
            this.renderLogs();
        }
    }

    /**
     * Load all proxies from API
     * Fetches from /api/proxy and updates this.proxies
     * Requirements: 2.3, 3.1
     */
    async loadProxies() {
        // Show loading state in proxy table
        const tbody = document.getElementById('proxyTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center p-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 mb-0">Loading proxies...</p>
                    </td>
                </tr>
            `;
        }
        
        try {
            console.log('Loading proxies...');
            const response = await fetch(`${this.baseUrl}/api/proxy`);
            const data = await response.json();

            if (data.success && data.data) {
                this.proxies = data.data;
            } else if (Array.isArray(data)) {
                this.proxies = data;
            } else {
                this.proxies = [];
            }

            this.renderProxyTable();
            await this.loadProxyStats();
            console.log(`Loaded ${this.proxies.length} proxies`);
        } catch (error) {
            console.error('Error loading proxies:', error);
            this.showToast('Error loading proxies', 'error');
            this.proxies = [];
            this.renderProxyTable();
        }
    }

    /**
     * Load proxy pool statistics from API
     * Fetches from /api/proxy/stats and updates stats cards
     * Requirements: 2.3
     */
    async loadProxyStats() {
        try {
            const response = await fetch(`${this.baseUrl}/api/proxy/stats`);
            const data = await response.json();

            if (data.success && data.data) {
                this.proxyStats = data.data;
                this.renderProxyStats(this.proxyStats);
            }
        } catch (error) {
            console.error('Error loading proxy stats:', error);
        }
    }

    /**
     * Render proxy statistics to stats cards
     * Updates proxyTotal, proxyActive, proxyUsage, proxyCountries elements
     * Requirements: 2.1
     * @param {Object} stats - Statistics object from API
     */
    renderProxyStats(stats) {
        if (!stats) return;

        const totalEl = document.getElementById('proxyTotal');
        const activeEl = document.getElementById('proxyActive');
        const usageEl = document.getElementById('proxyUsage');
        const countriesEl = document.getElementById('proxyCountries');

        if (totalEl) totalEl.textContent = stats.total || 0;
        if (activeEl) activeEl.textContent = stats.active || 0;
        if (usageEl) usageEl.textContent = stats.totalUsage || 0;
        if (countriesEl) {
            const countryCount = stats.byCountry ? Object.keys(stats.byCountry).length : 0;
            countriesEl.textContent = countryCount;
        }

        // Also update the main stats card for proxies
        const totalProxiesEl = document.getElementById('totalProxies');
        if (totalProxiesEl) {
            totalProxiesEl.textContent = stats.total || 0;
        }
    }

    /**
     * Render proxy table with all proxies
     * Displays status indicator, type badge, auth icon for each proxy
     * Requirements: 3.1, 3.2, 3.3, 3.4
     */
    renderProxyTable() {
        const tbody = document.getElementById('proxyTableBody');
        if (!tbody) return;

        if (this.proxies.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center p-4">
                        <i class="fas fa-server fa-3x text-muted mb-3"></i>
                        <p class="mb-0">No proxies found. Add proxies using the form above.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const rows = this.proxies.map(proxy => {
            // Status indicator color - Requirements 3.3
            const statusColor = this.getProxyStatusColor(proxy.active);
            const statusText = proxy.active ? 'Active' : 'Inactive';

            // Type badge color - Requirements 3.4
            const typeBadge = this.getProxyTypeBadge(proxy.type);

            // Auth icon - Requirements 3.2
            const authIcon = this.getProxyAuthIcon(proxy.username, proxy.password);

            return `
                <tr data-proxy-id="${proxy.id}">
                    <td>
                        <span class="badge ${statusColor}">${statusText}</span>
                    </td>
                    <td>
                        ${authIcon}
                        <span>${proxy.host}:${proxy.port}</span>
                    </td>
                    <td>
                        <span class="badge ${typeBadge.class}" style="background-color: ${typeBadge.bgColor}; color: ${typeBadge.textColor};">
                            ${(proxy.type || 'http').toUpperCase()}
                        </span>
                    </td>
                    <td>${proxy.country || '-'}</td>
                    <td>${proxy.usageCount || 0}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-info" onclick="browserShieldAdmin.testProxy('${proxy.id}')" title="Test">
                                <i class="fas fa-vial"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="browserShieldAdmin.toggleProxy('${proxy.id}')" title="Toggle">
                                <i class="fas fa-power-off"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="browserShieldAdmin.deleteProxy('${proxy.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }

    /**
     * Get status indicator color based on proxy active state
     * Property 4: Status Color Mapping
     * Requirements: 3.3
     * @param {boolean} active - Proxy active status
     * @returns {string} Bootstrap badge class
     */
    getProxyStatusColor(active) {
        return active === true ? 'bg-success' : 'bg-danger';
    }

    /**
     * Get type badge styling based on proxy type
     * Property 5: Type Badge Color Mapping
     * Requirements: 3.4
     * @param {string} type - Proxy type (http, https, socks4, socks5)
     * @returns {Object} Badge styling object with class, bgColor, textColor
     */
    getProxyTypeBadge(type) {
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
    getProxyAuthIcon(username, password) {
        if (username && password) {
            return '<i class="fas fa-key text-warning me-2" title="Authenticated"></i>';
        }
        return '';
    }

    async updateStats() {
        try {
            // Safely update profile count
            const totalProfilesEl = document.getElementById('totalProfiles');
            if (totalProfilesEl) {
                totalProfilesEl.textContent = this.profiles.length;
            }

            // Safely update active sessions count
            const activeSessionsEl = document.getElementById('activeSessions');
            if (activeSessionsEl) {
                activeSessionsEl.textContent = this.sessions.length;
            }

            // Load current mode safely
            try {
                const modeResponse = await fetch(`${this.baseUrl}/api/mode`);
                const modeData = await modeResponse.json();
                const currentModeEl = document.getElementById('currentMode');
                if (modeData.success && modeData.data && currentModeEl) {
                    const mode = modeData.data.currentMode || modeData.data.mode || 'MOCK';
                    currentModeEl.textContent = mode.toUpperCase();
                }
            } catch (modeError) {
                console.warn('Could not load mode info:', modeError);
                const currentModeEl = document.getElementById('currentMode');
                if (currentModeEl) {
                    currentModeEl.textContent = 'MOCK';
                }
            }

            // Safely update proxy count from API
            try {
                const proxyResponse = await fetch(`${this.baseUrl}/api/proxy/stats`);
                const proxyData = await proxyResponse.json();
                const totalProxiesEl = document.getElementById('totalProxies');
                if (proxyData.success && proxyData.data && totalProxiesEl) {
                    totalProxiesEl.textContent = proxyData.data.total || 0;
                }
            } catch (proxyError) {
                console.warn('Could not load proxy stats:', proxyError);
                const totalProxiesEl = document.getElementById('totalProxies');
                if (totalProxiesEl) {
                    totalProxiesEl.textContent = '0';
                }
            }

            // Safely update uptime
            try {
                const response = await fetch(`${this.baseUrl}/health`);
                const data = await response.json();
                const systemUptimeEl = document.getElementById('systemUptime');
                if (data.uptime && systemUptimeEl) {
                    systemUptimeEl.textContent = this.formatUptime(data.uptime);
                }
            } catch (uptimeError) {
                console.warn('Could not load uptime:', uptimeError);
            }
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    renderProfiles() {
        const container = document.getElementById('profilesContainer');

        if (this.profiles.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5>No Profiles Found</h5>
                    <p class="text-muted">Create your first browser profile to get started</p>
                    <button class="btn btn-primary" onclick="showCreateProfile()">
                        <i class="fas fa-plus me-2"></i>Create Profile
                    </button>
                </div>
            `;
            return;
        }

        const profilesHtml = this.profiles.map(profile => {
            const isActive = this.sessions.some(session => session.profileId === profile.id);
            const activeSession = this.sessions.find(session => session.profileId === profile.id);

            return `
                <div class="profile-card card mb-3 ${isActive ? 'active' : ''}">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-2">
                                    <span class="session-indicator ${isActive ? 'session-active' : 'session-inactive'}"></span>
                                    <h6 class="mb-0 me-2">${profile.name}</h6>
                                    <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'} status-badge">
                                        ${isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div class="small text-muted">
                                    <div><strong>User Agent:</strong> ${this.truncateText(profile.userAgent, 50)}</div>
                                    <div><strong>Timezone:</strong> ${profile.timezone}</div>
                                    <div><strong>Viewport:</strong> ${profile.viewport.width}x${profile.viewport.height}</div>
                                    ${profile.proxy ? `<div><strong>Proxy:</strong> <span class="proxy-indicator proxy-active">Enabled</span></div>` : ''}
                                    ${activeSession ? `<div><strong>Uptime:</strong> ${this.formatUptime(activeSession.uptime)}</div>` : ''}
                                </div>
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="btn-group" role="group">
                                    ${isActive ?
                    `<button class="btn btn-sm btn-outline-danger btn-action" onclick="browserShieldAdmin.stopSession('${profile.id}')">
                                            <i class="fas fa-stop"></i> Stop
                                        </button>` :
                    `<button class="btn btn-sm btn-outline-success btn-action" onclick="browserShieldAdmin.startSession('${profile.id}')">
                                            <i class="fas fa-play"></i> Start
                                        </button>`
                }
                                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="browserShieldAdmin.showProfileDetails('${profile.id}')">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                    <button class="btn btn-sm btn-outline-info btn-action" onclick="browserShieldAdmin.openBrowserControl('${profile.id}')">
                                        <i class="fas fa-desktop"></i> Control
                                    </button>
                                    <button class="btn btn-sm btn-outline-warning btn-action" onclick="browserShieldAdmin.editProfile('${profile.id}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="browserShieldAdmin.deleteProfile('${profile.id}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = profilesHtml;
    }

    renderSessions() {
        const container = document.getElementById('sessionsContainer');

        if (this.sessions.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-desktop fa-3x text-muted mb-3"></i>
                    <h5>No Active Sessions</h5>
                    <p class="text-muted">Start a browser profile to see active sessions here</p>
                </div>
            `;
            return;
        }

        const sessionsHtml = this.sessions.map(session => {
            const profile = this.profiles.find(p => p.id === session.profileId);
            const profileName = profile ? profile.name : 'Unknown Profile';

            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-2">
                                    <span class="session-indicator session-active"></span>
                                    <h6 class="mb-0 me-2">${profileName}</h6>
                                    <span class="badge bg-success status-badge">Active</span>
                                </div>
                                <div class="small text-muted">
                                    <div><strong>Session ID:</strong> ${session.sessionId || 'N/A'}</div>
                                    <div><strong>Browser:</strong> ${session.browserType || 'Chrome'}</div>
                                    <div><strong>Current URL:</strong> ${session.currentUrl || 'about:blank'}</div>
                                    <div><strong>Uptime:</strong> ${session.uptime ? this.formatUptime(session.uptime) : 'N/A'}</div>
                                    <div><strong>Started:</strong> ${session.startTime ? new Date(session.startTime).toLocaleString() : 'N/A'}</div>
                                </div>
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="browserShieldAdmin.navigateSession('${session.profileId}')">
                                        <i class="fas fa-globe"></i> Navigate
                                    </button>
                                    <button class="btn btn-sm btn-outline-warning btn-action" onclick="browserShieldAdmin.executeScript('${session.profileId}')">
                                        <i class="fas fa-code"></i> Script
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="browserShieldAdmin.stopSession('${session.profileId}')">
                                        <i class="fas fa-stop"></i> Stop
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = sessionsHtml;
    }

    renderLogs() {
        const container = document.getElementById('activityLogs');
        const logCountEl = document.getElementById('logCount');
        const lastUpdateEl = document.getElementById('lastLogUpdate');

        if (logCountEl) logCountEl.textContent = this.logs.length;
        if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString();

        if (this.logs.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-list fa-3x text-muted mb-3"></i>
                    <h5>No Activity Logs</h5>
                    <p class="text-muted">Activity logs will appear here</p>
                </div>
            `;
            return;
        }

        const logsHtml = this.logs.map(log => {
            const actionClass = this.getLogActionClass(log.action);
            return `
                <div class="log-entry" data-action="${log.action}">
                    <div>
                        <div class="fw-bold">
                            <span class="badge ${actionClass} me-2">${log.action}</span>
                        </div>
                        <div class="text-muted small">${log.details}</div>
                    </div>
                    <div class="log-time">${new Date(log.timestamp).toLocaleString()}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = logsHtml;
    }

    getLogActionClass(action) {
        const classes = {
            'BROWSER_STARTED': 'bg-success',
            'BROWSER_STOPPED': 'bg-danger',
            'PROFILE_CREATED': 'bg-primary',
            'PROFILE_DELETED': 'bg-warning',
            'NAVIGATION': 'bg-info',
            'SCRIPT_EXECUTED': 'bg-secondary',
            'Session Started': 'bg-success',
            'Session Stopped': 'bg-danger',
            'Profile Created': 'bg-primary',
            'Profile Deleted': 'bg-warning'
        };
        return classes[action] || 'bg-secondary';
    }

    async refreshLogs() {
        await this.loadLogs();
        this.showToast('Logs refreshed', 'info');
    }

    clearLogs() {
        this.logs = [];
        this.renderLogs();
        this.showToast('Logs cleared', 'info');
    }

    filterLogs() {
        const filterText = document.getElementById('logFilter')?.value?.toLowerCase() || '';
        const typeFilter = document.getElementById('logTypeFilter')?.value || '';
        
        const entries = document.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            const text = entry.textContent.toLowerCase();
            const action = entry.dataset.action || '';
            
            const matchesText = !filterText || text.includes(filterText);
            const matchesType = !typeFilter || action.includes(typeFilter);
            
            entry.style.display = (matchesText && matchesType) ? '' : 'none';
        });
    }

    clearServerLogs() {
        const console = document.getElementById('serverConsole');
        if (console) {
            console.innerHTML = '<span class="text-muted">> Console cleared</span>';
        }
    }

    appendServerLog(message, type = 'info') {
        const console = document.getElementById('serverConsole');
        if (!console) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const color = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8';
        
        console.innerHTML += `\n<span style="color: ${color}">[${timestamp}] ${message}</span>`;
        console.scrollTop = console.scrollHeight;
    }

    async createProfile() {
        // Build proxy object from create form
        const proxy = this.buildCreateProxyFromForm();
        
        // Validate proxy configuration if provided
        if (proxy !== null) {
            const validation = this.validateProxyConfig(proxy);
            if (!validation.valid) {
                this.showToast(validation.errors.join(', '), 'error');
                return;
            }
        }

        const formData = {
            name: document.getElementById('profileName').value,
            userAgent: document.getElementById('userAgent').value,
            timezone: document.getElementById('timezone').value,
            viewport: {
                width: parseInt(document.getElementById('viewportWidth').value),
                height: parseInt(document.getElementById('viewportHeight').value)
            },
            autoNavigateUrl: document.getElementById('autoNavigateUrl').value || null,
            proxy: proxy  // Include proxy in create request
        };

        try {
            const response = await fetch(`${this.baseUrl}/api/profiles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Profile created successfully', 'success');
                this.hideCreateProfile();
                await this.loadProfiles();
                await this.updateStats();

                // Add to logs - use data.data instead of data.profile
                const createdProfile = data.data || data.profile;
                this.logs.unshift({
                    timestamp: new Date().toISOString(),
                    action: 'Profile Created',
                    details: `New profile "${formData.name}" created`,
                    profileId: createdProfile?.id
                });
                this.renderLogs();
            } else {
                this.showToast('Failed to create profile', 'error');
            }
        } catch (error) {
            console.error('Error creating profile:', error);
            this.showToast('Error creating profile', 'error');
        }
    }

    async startSession(profileId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    autoNavigateUrl: 'https://bot.sannysoft.com/'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Start session response:', data);

            if (data.success) {
                this.showToast(`Browser session started successfully${data.message ? ': ' + data.message : ''}`, 'success');
                await this.loadSessions();
                await this.loadProfiles();
                await this.updateStats();

                // Add to logs
                const profile = this.profiles.find(p => p.id === profileId);
                this.logs.unshift({
                    timestamp: new Date().toISOString(),
                    action: 'Session Started',
                    details: `Browser session started for profile "${profile?.name || 'Unknown'}"`,
                    profileId: profileId
                });
                this.renderLogs();
            } else {
                this.showToast(data.message || 'Failed to start session', 'error');
            }
        } catch (error) {
            console.error('Error starting session:', error);
            this.showToast(`Error starting session: ${error.message}`, 'error');
        }
    }

    async stopSession(profileId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Stop session response:', data);

            if (data.success) {
                this.showToast(`Browser session stopped successfully${data.message ? ': ' + data.message : ''}`, 'success');
                await this.loadSessions();
                await this.loadProfiles();
                await this.updateStats();

                // Add to logs
                const profile = this.profiles.find(p => p.id === profileId);
                this.logs.unshift({
                    timestamp: new Date().toISOString(),
                    action: 'Session Stopped',
                    details: `Browser session stopped for profile "${profile?.name || 'Unknown'}"`,
                    profileId: profileId
                });
                this.renderLogs();
            } else {
                this.showToast(data.message || 'Failed to stop session', 'error');
            }
        } catch (error) {
            console.error('Error stopping session:', error);
            this.showToast(`Error stopping session: ${error.message}`, 'error');
        }
    }

    async deleteProfile(profileId) {
        if (!confirm('Are you sure you want to delete this profile?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Profile deleted successfully', 'success');
                await this.loadProfiles();
                await this.updateStats();

                // Add to logs
                this.logs.unshift({
                    timestamp: new Date().toISOString(),
                    action: 'Profile Deleted',
                    details: `Profile deleted`,
                    profileId: profileId
                });
                this.renderLogs();
            } else {
                this.showToast('Failed to delete profile', 'error');
            }
        } catch (error) {
            console.error('Error deleting profile:', error);
            this.showToast('Error deleting profile', 'error');
        }
    }

    showProfileDetails(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) return;

        const session = this.sessions.find(s => s.profileId === profileId);

        // Build proxy info section
        const proxyInfo = this.buildProxyInfoHtml(profile.proxy);

        const modalBody = document.getElementById('profileModalBody');
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Basic Information</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Name:</strong></td><td>${profile.name}</td></tr>
                        <tr><td><strong>ID:</strong></td><td>${profile.id}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>${session ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td></tr>
                        <tr><td><strong>Created:</strong></td><td>${new Date(profile.createdAt).toLocaleString()}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Browser Settings</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Timezone:</strong></td><td>${profile.timezone}</td></tr>
                        <tr><td><strong>Viewport:</strong></td><td>${profile.viewport.width}x${profile.viewport.height}</td></tr>
                        <tr><td><strong>Auto Navigate:</strong></td><td>${profile.autoNavigateUrl || 'None'}</td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Proxy Configuration</h6>
                    ${proxyInfo}
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>User Agent</h6>
                    <div class="bg-light p-2 rounded small">${profile.userAgent}</div>
                </div>
            </div>
            ${session ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Session Information</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Session ID:</strong></td><td>${session.sessionId}</td></tr>
                            <tr><td><strong>Browser Type:</strong></td><td>${session.browserType}</td></tr>
                            <tr><td><strong>Current URL:</strong></td><td>${session.currentUrl}</td></tr>
                            <tr><td><strong>Uptime:</strong></td><td>${this.formatUptime(session.uptime)}</td></tr>
                            <tr><td><strong>Started:</strong></td><td>${new Date(session.startTime).toLocaleString()}</td></tr>
                        </table>
                    </div>
                </div>
            ` : ''}
        `;

        const modal = new bootstrap.Modal(document.getElementById('profileModal'));
        modal.show();
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const section = document.getElementById(`${sectionName}-section`);
        if (section) {
            section.style.display = 'block';
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`a[href="#${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load section-specific data
        if (sectionName === 'proxies') {
            this.loadProxies();
        }
    }

    showCreateProfile() {
        const modal = new bootstrap.Modal(document.getElementById('createProfileModal'));
        modal.show();
        document.getElementById('profileName').focus();
    }

    hideCreateProfile() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('createProfileModal'));
        if (modal) modal.hide();
        document.getElementById('profileForm').reset();
        // Reset proxy section
        this.resetCreateProxySection();
    }

    /**
     * Reset create profile proxy section to default state
     * Requirements: 7.1
     */
    resetCreateProxySection() {
        const sourceEl = document.getElementById('createProxySource');
        const poolSection = document.getElementById('createProxyPoolSection');
        const manualSection = document.getElementById('createManualProxySection');
        
        if (sourceEl) sourceEl.value = 'none';
        if (poolSection) poolSection.style.display = 'none';
        if (manualSection) manualSection.style.display = 'none';
        
        // Clear proxy fields
        const fields = ['createProxyHost', 'createProxyPort', 'createProxyUsername', 'createProxyPassword'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const typeEl = document.getElementById('createProxyType');
        if (typeEl) typeEl.value = 'http';
        const poolEl = document.getElementById('createProxyPool');
        if (poolEl) poolEl.value = '';
    }

    /**
     * Handle proxy source change in create profile modal
     * Toggle visibility of proxyPoolSection and manualProxySection
     * Requirements: 7.1
     */
    handleCreateProxySourceChange() {
        const source = document.getElementById('createProxySource')?.value;
        const poolSection = document.getElementById('createProxyPoolSection');
        const manualSection = document.getElementById('createManualProxySection');
        
        if (!poolSection || !manualSection) return;
        
        // Clear fields when switching source
        const fields = ['createProxyHost', 'createProxyPort', 'createProxyUsername', 'createProxyPassword'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const typeEl = document.getElementById('createProxyType');
        if (typeEl) typeEl.value = 'http';
        const poolEl = document.getElementById('createProxyPool');
        if (poolEl) poolEl.value = '';
        
        // Hide all sections first
        poolSection.style.display = 'none';
        manualSection.style.display = 'none';
        
        if (source === 'pool') {
            poolSection.style.display = 'block';
            manualSection.style.display = 'block';
            // Load proxy pool for dropdown
            this.loadCreateProxyPool();
        } else if (source === 'manual') {
            manualSection.style.display = 'block';
        }
        // If 'none', both sections stay hidden
    }

    /**
     * Load proxy pool for create profile dropdown
     * Fetches proxies from API and filters only active ones
     * Requirements: 7.1
     */
    async loadCreateProxyPool() {
        try {
            const response = await fetch(`${this.baseUrl}/api/proxy`);
            const data = await response.json();
            
            const dropdown = document.getElementById('createProxyPool');
            if (!dropdown) return [];
            
            if (data.success && data.data && data.data.length > 0) {
                // Filter only active proxies
                const activeProxies = this.filterActiveProxies(data.data);
                
                if (activeProxies.length === 0) {
                    dropdown.innerHTML = '<option value="">No active proxies available</option>';
                    return [];
                }
                
                dropdown.innerHTML = '<option value="">-- Select a proxy --</option>' +
                    activeProxies.map(proxy => 
                        `<option value="${proxy.id}" data-proxy='${JSON.stringify(proxy)}'>
                            ${proxy.host}:${proxy.port} (${proxy.type || 'http'})${proxy.country ? ' - ' + proxy.country : ''}
                        </option>`
                    ).join('');
                
                return activeProxies;
            } else {
                dropdown.innerHTML = '<option value="">No proxies available</option>';
                return [];
            }
        } catch (error) {
            console.error('Error loading proxy pool:', error);
            const dropdown = document.getElementById('createProxyPool');
            if (dropdown) {
                dropdown.innerHTML = '<option value="">Error loading proxies</option>';
            }
            return [];
        }
    }

    /**
     * Populate create proxy fields from pool selection
     * Fill all form fields with data from selected proxy
     * Requirements: 7.1
     */
    populateCreateProxyFromPool() {
        const dropdown = document.getElementById('createProxyPool');
        if (!dropdown) return;
        
        const selectedOption = dropdown.options[dropdown.selectedIndex];
        if (!selectedOption || !selectedOption.value) return;
        
        try {
            const proxyData = JSON.parse(selectedOption.dataset.proxy);
            
            // Populate all form fields with proxy data
            document.getElementById('createProxyHost').value = proxyData.host || '';
            document.getElementById('createProxyPort').value = proxyData.port || '';
            document.getElementById('createProxyType').value = proxyData.type || 'http';
            document.getElementById('createProxyUsername').value = proxyData.username || '';
            document.getElementById('createProxyPassword').value = proxyData.password || '';
        } catch (error) {
            console.error('Error parsing proxy data:', error);
        }
    }

    /**
     * Build proxy object from create profile form fields
     * Returns null if proxy source is "none"
     * Returns proxy object if source is "pool" or "manual"
     * Requirements: 7.1, 7.2
     * 
     * @returns {Object|null} - Proxy configuration object or null
     */
    buildCreateProxyFromForm() {
        const source = document.getElementById('createProxySource')?.value;
        
        // If source is "none", return null (no proxy)
        if (source === 'none') {
            return null;
        }
        
        // Get values from form fields
        const host = document.getElementById('createProxyHost')?.value?.trim() || '';
        const portValue = document.getElementById('createProxyPort')?.value;
        const type = document.getElementById('createProxyType')?.value || 'http';
        const username = document.getElementById('createProxyUsername')?.value?.trim() || '';
        const password = document.getElementById('createProxyPassword')?.value || '';
        
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
     * Assign proxy to profile
     * Updates profile with proxy configuration
     * Property 9: Profile-Proxy Assignment Consistency
     * Requirements: 7.2
     * 
     * @param {string} profileId - Profile ID to update
     * @param {Object|null} proxy - Proxy configuration or null to clear
     * @returns {Promise<boolean>} - Success status
     */
    async assignProxyToProfile(profileId, proxy) {
        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxy: proxy })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update local profile data
                    const profile = this.profiles.find(p => p.id === profileId);
                    if (profile) {
                        profile.proxy = proxy;
                    }
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error assigning proxy to profile:', error);
            return false;
        }
    }

    submitCreateProfile() {
        this.createProfile();
    }

    async refreshProfiles() {
        await this.loadProfiles();
        await this.updateStats();
        this.showToast('Profiles refreshed', 'info');
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(async () => {
            await this.loadSessions();
            await this.updateStats();

            // Auto refresh logs if enabled
            const autoRefreshLogs = document.getElementById('autoRefreshLogs');
            if (autoRefreshLogs && autoRefreshLogs.checked && this.currentSection === 'logs') {
                await this.loadLogs();
            }

            if (this.currentSection === 'profiles') {
                this.renderProfiles();
            } else if (this.currentSection === 'sessions') {
                this.renderSessions();
            }
        }, 30000); // Refresh every 30 seconds
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast-' + Date.now();

        const bgClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        const toastHtml = `
            <div id="${toastId}" class="toast ${bgClass} text-white" role="alert">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}-circle me-2"></i>
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    /**
     * Show loading state on a button
     * Requirements: 4.3 - Show spinners during API calls
     * @param {HTMLElement|string} buttonOrId - Button element or ID
     * @param {boolean} loading - Whether to show loading state
     * @param {string} originalText - Original button text to restore
     */
    setButtonLoading(buttonOrId, loading, originalText = '') {
        const button = typeof buttonOrId === 'string' 
            ? document.getElementById(buttonOrId) 
            : buttonOrId;
        
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.dataset.originalHtml = button.innerHTML;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalHtml || originalText;
        }
    }

    /**
     * Show loading overlay on a container
     * Requirements: 4.3 - Show spinners during API calls
     * @param {string} containerId - Container element ID
     * @param {boolean} loading - Whether to show loading state
     */
    setContainerLoading(containerId, loading) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (loading) {
            container.classList.add('loading');
            // Add loading overlay if not exists
            if (!container.querySelector('.loading-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'loading-overlay';
                overlay.innerHTML = `
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                `;
                overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; z-index: 10;';
                container.style.position = 'relative';
                container.appendChild(overlay);
            }
        } else {
            container.classList.remove('loading');
            const overlay = container.querySelector('.loading-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    }

    /**
     * Handle API errors gracefully
     * Requirements: 4.3 - Handle errors gracefully
     * @param {Error} error - Error object
     * @param {string} context - Context description for error message
     */
    handleApiError(error, context = 'operation') {
        console.error(`Error during ${context}:`, error);
        
        let message = 'An unexpected error occurred';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            message = 'Network error. Please check your connection.';
        } else if (error.message) {
            message = error.message;
        }
        
        this.showToast(`${context}: ${message}`, 'error');
    }

    formatUptime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    buildProxyInfoHtml(proxy) {
        if (!proxy || !proxy.host) {
            return `<div class="text-muted">No proxy configured</div>`;
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

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Edit profile functionality
    async editProfile(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) {
            this.showToast('Profile not found', 'error');
            return;
        }

        // Determine current proxy source
        let proxySource = 'none';
        if (profile.proxy && profile.proxy.host) {
            proxySource = 'manual'; // Default to manual if proxy exists
        }

        // Create edit profile modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'editProfileModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-edit"></i> Edit Profile - ${profile.name}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editProfileForm">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Profile Name</label>
                                        <input type="text" class="form-control" id="editProfileName" value="${profile.name}" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Timezone</label>
                                        <select class="form-select" id="editTimezone">
                                            <option value="America/New_York" ${profile.timezone === 'America/New_York' ? 'selected' : ''}>America/New_York</option>
                                            <option value="Europe/London" ${profile.timezone === 'Europe/London' ? 'selected' : ''}>Europe/London</option>
                                            <option value="Asia/Tokyo" ${profile.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Asia/Tokyo</option>
                                            <option value="Asia/Ho_Chi_Minh" ${profile.timezone === 'Asia/Ho_Chi_Minh' ? 'selected' : ''}>Asia/Ho_Chi_Minh</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Width</label>
                                        <input type="number" class="form-control" id="editWidth" value="${profile.viewport.width}">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Height</label>
                                        <input type="number" class="form-control" id="editHeight" value="${profile.viewport.height}">
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">User Agent</label>
                                <textarea class="form-control" id="editUserAgent" rows="2">${profile.userAgent}</textarea>
                            </div>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="editSpoofFingerprint" ${profile.spoofFingerprint ? 'checked' : ''}>
                                <label class="form-check-label" for="editSpoofFingerprint">
                                    Enable Anti-Detection (Stealth Mode)
                                </label>
                            </div>
                            
                            <!-- Proxy Configuration Section -->
                            <div class="card mt-3">
                                <div class="card-header">
                                    <i class="fas fa-globe"></i> Proxy Configuration
                                </div>
                                <div class="card-body">
                                    <!-- Current Proxy Display -->
                                    <div id="currentProxyInfo" class="alert alert-info mb-3" style="${profile.proxy && profile.proxy.host ? '' : 'display: none;'}">
                                        <strong>Current Proxy:</strong> <span id="currentProxyText">${this.formatProxyDisplay(profile.proxy)}</span>
                                    </div>
                                    
                                    <!-- Proxy Source Selection -->
                                    <div class="mb-3">
                                        <label class="form-label">Proxy Source</label>
                                        <select class="form-select" id="editProxySource" onchange="browserShieldAdmin.handleProxySourceChange()">
                                            <option value="none" ${proxySource === 'none' ? 'selected' : ''}>No Proxy</option>
                                            <option value="pool">Select from Proxy Pool</option>
                                            <option value="manual" ${proxySource === 'manual' ? 'selected' : ''}>Enter Manually</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Proxy Pool Dropdown (shown when source = pool) -->
                                    <div id="proxyPoolSection" style="display: none;">
                                        <div class="mb-3">
                                            <label class="form-label">Select Proxy</label>
                                            <select class="form-select" id="editProxyPool" onchange="browserShieldAdmin.populateProxyFromPool()">
                                                <option value="">Loading proxies...</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <!-- Manual Proxy Input (shown when source = manual or pool selected) -->
                                    <div id="manualProxySection" style="${proxySource === 'manual' ? '' : 'display: none;'}">
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Host *</label>
                                                <input type="text" class="form-control" id="editProxyHost" placeholder="proxy.example.com" value="${profile.proxy?.host || ''}">
                                            </div>
                                            <div class="col-md-3 mb-3">
                                                <label class="form-label">Port *</label>
                                                <input type="number" class="form-control" id="editProxyPort" placeholder="8080" min="1" max="65535" value="${profile.proxy?.port || ''}">
                                            </div>
                                            <div class="col-md-3 mb-3">
                                                <label class="form-label">Type</label>
                                                <select class="form-select" id="editProxyType">
                                                    <option value="http" ${profile.proxy?.type === 'http' ? 'selected' : ''}>HTTP</option>
                                                    <option value="https" ${profile.proxy?.type === 'https' ? 'selected' : ''}>HTTPS</option>
                                                    <option value="socks4" ${profile.proxy?.type === 'socks4' ? 'selected' : ''}>SOCKS4</option>
                                                    <option value="socks5" ${profile.proxy?.type === 'socks5' ? 'selected' : ''}>SOCKS5</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Username (optional)</label>
                                                <input type="text" class="form-control" id="editProxyUsername" placeholder="username" value="${profile.proxy?.username || ''}">
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">Password (optional)</label>
                                                <input type="password" class="form-control" id="editProxyPassword" placeholder="password" value="${profile.proxy?.password || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Clear Proxy Button -->
                                    <div class="mt-2">
                                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="browserShieldAdmin.clearProxy()">
                                            <i class="fas fa-times"></i> Clear Proxy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="browserShieldAdmin.updateProfile('${profileId}')">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Load proxy pool after modal is shown
        this.loadProxyPool();
        
        // Display current proxy configuration
        this.displayCurrentProxy(profile.proxy);

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    // Format proxy display string
    formatProxyDisplay(proxy) {
        if (!proxy || !proxy.host) {
            return 'No proxy configured';
        }
        let display = `${proxy.host}:${proxy.port} (${proxy.type || 'http'})`;
        if (proxy.username) {
            display += ` - Auth: ${proxy.username}:${'*'.repeat(proxy.password?.length || 4)}`;
        }
        return display;
    }

    // Load proxy pool for dropdown
    /**
     * Load proxy pool for dropdown
     * Fetches proxies from API and filters only active ones
     * Requirements: 2.1, 2.4
     */
    async loadProxyPool() {
        try {
            const response = await fetch(`${this.baseUrl}/api/proxy`);
            const data = await response.json();
            
            const dropdown = document.getElementById('editProxyPool');
            if (!dropdown) return [];
            
            if (data.success && data.data && data.data.length > 0) {
                // Filter only active proxies (API returns 'active' field, not 'isActive')
                const activeProxies = this.filterActiveProxies(data.data);
                
                if (activeProxies.length === 0) {
                    dropdown.innerHTML = '<option value="">No proxies available</option>';
                    return [];
                }
                
                dropdown.innerHTML = '<option value="">-- Select a proxy --</option>' +
                    activeProxies.map(proxy => 
                        `<option value="${proxy.id}" data-proxy='${JSON.stringify(proxy)}'>
                            ${proxy.host}:${proxy.port} (${proxy.type || 'http'})${proxy.country ? ' - ' + proxy.country : ''}
                        </option>`
                    ).join('');
                
                return activeProxies;
            } else {
                dropdown.innerHTML = '<option value="">No proxies available</option>';
                return [];
            }
        } catch (error) {
            console.error('Error loading proxy pool:', error);
            const dropdown = document.getElementById('editProxyPool');
            if (dropdown) {
                dropdown.innerHTML = '<option value="">Error loading proxies</option>';
            }
            return [];
        }
    }

    /**
     * Filter active proxies from proxy list
     * Property 2: Active Proxy Filtering - only show proxies where active is true
     * Validates: Requirements 2.4
     * @param {Array} proxies - Array of proxy objects
     * @returns {Array} - Array of active proxies only
     */
    filterActiveProxies(proxies) {
        if (!Array.isArray(proxies)) return [];
        // API returns 'active' field (boolean), filter only active proxies
        return proxies.filter(p => p.active === true);
    }

    /**
     * Display current proxy configuration for a profile
     * Requirements: 1.1, 1.2, 1.3
     * @param {Object} proxy - Proxy configuration object
     */
    displayCurrentProxy(proxy) {
        const infoDiv = document.getElementById('currentProxyInfo');
        const textSpan = document.getElementById('currentProxyText');
        
        if (!infoDiv || !textSpan) return;
        
        if (!proxy || !proxy.host) {
            // No proxy configured - hide the info div
            infoDiv.style.display = 'none';
            textSpan.textContent = 'No proxy configured';
            return;
        }
        
        // Show proxy info with masked password
        infoDiv.style.display = 'block';
        textSpan.textContent = this.formatProxyDisplay(proxy);
    }

    /**
     * Handle proxy source change
     * Toggle visibility of proxyPoolSection and manualProxySection
     * Clear fields when switching source
     * Requirements: 2.1, 3.1
     */
    handleProxySourceChange() {
        const source = document.getElementById('editProxySource')?.value;
        const poolSection = document.getElementById('proxyPoolSection');
        const manualSection = document.getElementById('manualProxySection');
        
        if (!poolSection || !manualSection) return;
        
        // Clear fields when switching source to ensure clean state
        this.clearProxyFields();
        
        // Hide all sections first
        poolSection.style.display = 'none';
        manualSection.style.display = 'none';
        
        if (source === 'pool') {
            poolSection.style.display = 'block';
            manualSection.style.display = 'block';
        } else if (source === 'manual') {
            manualSection.style.display = 'block';
        }
        // If 'none', both sections stay hidden and fields are cleared
    }

    /**
     * Populate proxy fields from pool selection
     * Fill all form fields with data from selected proxy
     * Property 3: Proxy Selection Population - all form fields SHALL be populated
     * with the corresponding values from the selected proxy
     * Requirements: 2.2
     */
    populateProxyFromPool() {
        const dropdown = document.getElementById('editProxyPool');
        if (!dropdown) return;
        
        const selectedOption = dropdown.options[dropdown.selectedIndex];
        if (!selectedOption || !selectedOption.value) return;
        
        try {
            const proxyData = JSON.parse(selectedOption.dataset.proxy);
            
            // Populate all form fields with proxy data
            document.getElementById('editProxyHost').value = proxyData.host || '';
            document.getElementById('editProxyPort').value = proxyData.port || '';
            document.getElementById('editProxyType').value = proxyData.type || 'http';
            document.getElementById('editProxyUsername').value = proxyData.username || '';
            document.getElementById('editProxyPassword').value = proxyData.password || '';
        } catch (error) {
            console.error('Error parsing proxy data:', error);
        }
    }

    // Clear proxy configuration
    clearProxy() {
        this.clearProxyFields();
        document.getElementById('editProxySource').value = 'none';
        document.getElementById('proxyPoolSection').style.display = 'none';
        document.getElementById('manualProxySection').style.display = 'none';
        document.getElementById('currentProxyInfo').style.display = 'none';
        this.showToast('Proxy configuration cleared', 'info');
    }

    // Clear proxy form fields
    clearProxyFields() {
        const fields = ['editProxyHost', 'editProxyPort', 'editProxyUsername', 'editProxyPassword'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const typeEl = document.getElementById('editProxyType');
        if (typeEl) typeEl.value = 'http';
        const poolEl = document.getElementById('editProxyPool');
        if (poolEl) poolEl.value = '';
    }

    /**
     * Validate proxy configuration
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
    validateProxyConfig(proxy) {
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

    /**
     * Update profile with proxy configuration
     * Property 7: Valid Proxy Save Round-Trip
     * Property 8: Invalid Proxy Rejection
     * 
     * Requirements: 5.1, 6.1, 6.4
     * - Build proxy object from form fields
     * - Validate before sending
     * - Send proxy: null if source is "none"
     * 
     * @param {string} profileId - Profile ID to update
     */
    async updateProfile(profileId) {
        // Build proxy object from form fields
        const proxy = this.buildProxyFromForm();
        
        // Validate proxy configuration before sending
        const validation = this.validateProxyConfig(proxy);
        if (!validation.valid) {
            this.showToast(validation.errors.join(', '), 'error');
            return;
        }

        const formData = {
            name: document.getElementById('editProfileName').value,
            timezone: document.getElementById('editTimezone').value,
            viewport: {
                width: parseInt(document.getElementById('editWidth').value),
                height: parseInt(document.getElementById('editHeight').value)
            },
            userAgent: document.getElementById('editUserAgent').value,
            spoofFingerprint: document.getElementById('editSpoofFingerprint').checked,
            proxy: proxy  // Include proxy in update (null if source is "none")
        };

        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showToast('Profile updated successfully', 'success');
                bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
                await this.loadProfiles();
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            this.showToast('Connection error', 'error');
        }
    }

    /**
     * Build proxy object from form fields
     * Returns null if proxy source is "none"
     * Returns proxy object if source is "pool" or "manual"
     * 
     * Requirements: 5.1, 6.1, 6.4
     * 
     * @returns {Object|null} - Proxy configuration object or null
     */
    buildProxyFromForm() {
        const source = document.getElementById('editProxySource')?.value;
        
        // If source is "none", return null to remove proxy
        // Requirements: 6.4
        if (source === 'none') {
            return null;
        }
        
        // Get values from form fields
        const host = document.getElementById('editProxyHost')?.value?.trim() || '';
        const portValue = document.getElementById('editProxyPort')?.value;
        const type = document.getElementById('editProxyType')?.value || 'http';
        const username = document.getElementById('editProxyUsername')?.value?.trim() || '';
        const password = document.getElementById('editProxyPassword')?.value || '';
        
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

    // Browser control interface
    async openBrowserControl(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) {
            this.showToast('Profile not found', 'error');
            return;
        }

        // Create browser control modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'browserControlModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-desktop"></i> Browser Control - ${profile.name}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-8">
                                <div class="input-group">
                                    <input type="url" class="form-control" id="navigateUrl" 
                                           placeholder="Enter URL to navigate..." 
                                           value="https://bot.sannysoft.com/">
                                    <button class="btn btn-primary" onclick="browserShieldAdmin.navigateTo('${profileId}')">
                                        <i class="fas fa-arrow-right"></i> Navigate
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <button class="btn btn-success w-100" onclick="browserShieldAdmin.takeScreenshot('${profileId}')">
                                    <i class="fas fa-camera"></i> Screenshot
                                </button>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-12">
                                <h6>Execute JavaScript:</h6>
                                <textarea class="form-control mb-2" id="jsCode" rows="4" 
                                          placeholder="Enter JavaScript code to execute...">
// Example: Click first button
document.querySelector('button')?.click();

// Or fill a form
document.querySelector('input[type="text"]').value = 'Hello World';</textarea>
                                <div class="d-flex gap-2">
                                    <button class="btn btn-warning" onclick="browserShieldAdmin.executeJS('${profileId}')">
                                        <i class="fas fa-code"></i> Execute
                                    </button>
                                    <button class="btn btn-info" onclick="browserShieldAdmin.getCurrentInfo('${profileId}')">
                                        <i class="fas fa-info-circle"></i> Get Page Info
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-12">
                                <h6>Results:</h6>
                                <div id="controlResult" class="border rounded p-3 bg-light" style="min-height: 200px;">
                                    <p class="text-muted">Results will appear here...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-danger" onclick="browserShieldAdmin.stopSession('${profileId}'); bootstrap.Modal.getInstance(document.getElementById('browserControlModal')).hide();">
                            <i class="fas fa-stop"></i> Stop Browser
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    // Navigation functionality
    async navigateTo(profileId) {
        const url = document.getElementById('navigateUrl').value;
        if (!url) {
            this.showToast('Please enter URL', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}/navigate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('controlResult').innerHTML = `
                    <div class="alert alert-success">
                        <strong>Success!</strong> Navigated to: ${url}
                        <br><small>Time: ${new Date().toLocaleString()}</small>
                    </div>
                `;
            } else {
                throw new Error(data.message || 'Navigation failed');
            }
        } catch (error) {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error!</strong> ${error.message}
                </div>
            `;
        }
    }

    // JavaScript execution
    async executeJS(profileId) {
        const code = document.getElementById('jsCode').value;
        if (!code.trim()) {
            this.showToast('Please enter JavaScript code', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script: code })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('controlResult').innerHTML = `
                    <div class="alert alert-success">
                        <strong>Success!</strong>
                        <pre class="mt-2 mb-0">${JSON.stringify(data.data.result, null, 2)}</pre>
                    </div>
                `;
            } else {
                throw new Error(data.message || 'Script execution failed');
            }
        } catch (error) {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error!</strong> ${error.message}
                </div>
            `;
        }
    }

    // Get current page information
    async getCurrentInfo(profileId) {
        const infoScript = `
            JSON.stringify({
                url: window.location.href,
                title: document.title,
                userAgent: navigator.userAgent,
                cookiesCount: document.cookie.split(';').length,
                elementsCount: document.querySelectorAll('*').length,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }, null, 2)
        `;

        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/${profileId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script: infoScript })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('controlResult').innerHTML = `
                    <div class="alert alert-info">
                        <strong>Current Page Information:</strong>
                        <pre class="mt-2 mb-0">${data.data.result}</pre>
                    </div>
                `;
            } else {
                throw new Error(data.message || 'Failed to get page info');
            }
        } catch (error) {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error!</strong> ${error.message}
                </div>
            `;
        }
    }

    // Take screenshot
    async takeScreenshot(profileId) {
        try {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-info">
                    <strong>Screenshot captured!</strong>
                    <br>In production mode, screenshot would be saved and displayed here.
                    <br><small>Time: ${new Date().toLocaleString()}</small>
                </div>
            `;
        } catch (error) {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error!</strong> ${error.message}
                </div>
            `;
        }
    }

    // Enhanced navigation and execution methods
    navigateSession(profileId) {
        this.openBrowserControl(profileId);
    }

    executeScript(profileId) {
        this.openBrowserControl(profileId);
    }

    /**
     * Validate add proxy form fields
     * Property 6: Form Validation for Required Fields
     * Requirements: 4.4
     * 
     * Validates:
     * - Host must be a non-empty string (not whitespace-only)
     * - Port must be an integer between 1 and 65535
     * 
     * @returns {Object} - { valid: boolean, errors: { host: string|null, port: string|null } }
     */
    validateAddProxyForm() {
        const hostEl = document.getElementById('proxyHost');
        const portEl = document.getElementById('proxyPort');
        
        const host = hostEl?.value?.trim() || '';
        const portValue = portEl?.value;
        
        const errors = {
            host: null,
            port: null
        };
        
        // Validate host - must be non-empty string (not whitespace-only)
        if (!host || host.length === 0) {
            errors.host = 'Host is required';
        }
        
        // Validate port - must be integer between 1 and 65535
        if (!portValue || portValue === '') {
            errors.port = 'Valid port is required (1-65535)';
        } else {
            const portNum = parseInt(portValue, 10);
            if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                errors.port = 'Valid port is required (1-65535)';
            }
        }
        
        // Update UI with validation feedback
        if (hostEl) {
            if (errors.host) {
                hostEl.classList.add('is-invalid');
                hostEl.classList.remove('is-valid');
            } else {
                hostEl.classList.remove('is-invalid');
                hostEl.classList.add('is-valid');
            }
        }
        
        if (portEl) {
            if (errors.port) {
                portEl.classList.add('is-invalid');
                portEl.classList.remove('is-valid');
            } else {
                portEl.classList.remove('is-invalid');
                portEl.classList.add('is-valid');
            }
        }
        
        return {
            valid: !errors.host && !errors.port,
            errors: errors
        };
    }

    /**
     * Add a single proxy to the pool
     * Requirements: 4.1, 4.2, 4.3
     * 
     * - Validates form fields before submission
     * - POST to /api/proxy endpoint
     * - Shows success/error toast notification
     * - Refreshes proxy list on success
     * 
     * @param {Event} event - Form submit event
     */
    async addProxy(event) {
        if (event) {
            event.preventDefault();
        }
        
        // Validate form - Requirements: 4.4
        const validation = this.validateAddProxyForm();
        if (!validation.valid) {
            // Show first error in toast
            const firstError = validation.errors.host || validation.errors.port;
            this.showToast(firstError, 'error');
            return;
        }
        
        // Build proxy data from form
        const proxyData = {
            host: document.getElementById('proxyHost').value.trim(),
            port: parseInt(document.getElementById('proxyPort').value, 10),
            type: document.getElementById('proxyType')?.value || 'http',
            country: document.getElementById('proxyCountry')?.value?.trim() || null,
            provider: document.getElementById('proxyProvider')?.value?.trim() || null,
            username: document.getElementById('proxyUsername')?.value?.trim() || null,
            password: document.getElementById('proxyPassword')?.value || null
        };
        
        // Remove null values for cleaner request
        Object.keys(proxyData).forEach(key => {
            if (proxyData[key] === null || proxyData[key] === '') {
                delete proxyData[key];
            }
        });
        
        // Get submit button and show loading state - Requirements: 4.3
        const submitBtn = document.querySelector('#addProxyForm button[type="submit"]');
        this.setButtonLoading(submitBtn, true);
        
        try {
            // POST to /api/proxy - Requirements: 4.1
            const response = await fetch(`${this.baseUrl}/api/proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(proxyData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Success - Requirements: 4.2
                this.showToast(`Proxy ${proxyData.host}:${proxyData.port} added successfully`, 'success');
                
                // Clear form
                this.clearAddProxyForm();
                
                // Refresh proxy list
                await this.loadProxies();
                await this.updateStats();
            } else {
                // Error - Requirements: 4.3
                const errorMessage = data.message || data.errors?.[0]?.message || 'Failed to add proxy';
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            // Network/connection error - Requirements: 4.3
            this.handleApiError(error, 'Adding proxy');
        } finally {
            // Reset loading state
            this.setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Clear the add proxy form and reset validation states
     */
    clearAddProxyForm() {
        const form = document.getElementById('addProxyForm');
        if (form) {
            form.reset();
        }
        
        // Clear validation states
        const fields = ['proxyHost', 'proxyPort'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('is-valid', 'is-invalid');
            }
        });
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
    parseProxyLine(line) {
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

    /**
     * Import multiple proxies from bulk text input
     * Requirements: 5.1, 5.2, 5.3
     * 
     * - Parses text lines in format "host:port:user:pass" (one per line)
     * - Adds valid proxies to the pool
     * - Shows summary toast with success/failure counts
     * - Skips lines with invalid format (less than 2 parts)
     */
    async importBulkProxies() {
        const textarea = document.getElementById('bulkProxyInput');
        if (!textarea) {
            this.showToast('Bulk import textarea not found', 'error');
            return;
        }
        
        const text = textarea.value;
        if (!text || !text.trim()) {
            this.showToast('Please enter proxies to import', 'warning');
            return;
        }
        
        // Split by newlines and filter empty lines
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            this.showToast('No valid lines found', 'warning');
            return;
        }
        
        // Get import button and show loading state - Requirements: 4.3
        const importBtn = document.querySelector('#proxies-section .btn-success');
        this.setButtonLoading(importBtn, true);
        
        let successCount = 0;
        let failureCount = 0;
        
        try {
            // Process each line
            for (const line of lines) {
                const proxyData = this.parseProxyLine(line);
                
                if (!proxyData) {
                    // Invalid format - Requirements: 5.3
                    failureCount++;
                    continue;
                }
                
                try {
                    // POST to /api/proxy
                    const response = await fetch(`${this.baseUrl}/api/proxy`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(proxyData)
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                } catch (error) {
                    console.error('Error adding proxy:', error);
                    failureCount++;
                }
            }
            
            // Show summary toast - Requirements: 5.2
            if (successCount > 0 && failureCount === 0) {
                this.showToast(`Successfully imported ${successCount} proxies`, 'success');
            } else if (successCount > 0 && failureCount > 0) {
                this.showToast(`Imported ${successCount} proxies, ${failureCount} failed`, 'warning');
            } else {
                this.showToast(`Import failed: ${failureCount} proxies could not be added`, 'error');
            }
            
            // Clear textarea
            textarea.value = '';
            
            // Refresh proxy list and stats
            await this.loadProxies();
            await this.updateStats();
        } catch (error) {
            this.handleApiError(error, 'Bulk import');
        } finally {
            // Reset loading state
            this.setButtonLoading(importBtn, false);
        }
    }

    /**
     * Test a proxy's connectivity
     * Requirements: 6.1
     * 
     * - POST to /api/proxy/:id/test endpoint
     * - Display test result in toast notification
     * 
     * @param {string} proxyId - ID of the proxy to test
     */
    async testProxy(proxyId) {
        // Find the test button for this proxy and show loading state
        const testBtn = document.querySelector(`tr[data-proxy-id="${proxyId}"] .btn-outline-info`);
        this.setButtonLoading(testBtn, true);
        
        try {
            this.showToast('Testing proxy...', 'info');
            
            const response = await fetch(`${this.baseUrl}/api/proxy/${proxyId}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const result = data.data;
                const latency = result.latency ? `${result.latency}ms` : 'N/A';
                const ip = result.ip || 'Unknown';
                this.showToast(`Proxy test passed! Latency: ${latency}, IP: ${ip}`, 'success');
            } else {
                const errorMessage = data.message || 'Proxy test failed';
                this.showToast(`Proxy test failed: ${errorMessage}`, 'error');
            }
        } catch (error) {
            this.handleApiError(error, 'Testing proxy');
        } finally {
            this.setButtonLoading(testBtn, false);
        }
    }

    /**
     * Toggle a proxy's active status
     * Property 8: Toggle Status Flip
     * Requirements: 6.2
     * 
     * - POST to /api/proxy/:id/toggle endpoint
     * - Update UI to reflect new status
     * - Proxy's active status should flip from true to false or vice versa
     * 
     * @param {string} proxyId - ID of the proxy to toggle
     */
    async toggleProxy(proxyId) {
        // Find the toggle button for this proxy and show loading state
        const toggleBtn = document.querySelector(`tr[data-proxy-id="${proxyId}"] .btn-outline-warning`);
        this.setButtonLoading(toggleBtn, true);
        
        try {
            const response = await fetch(`${this.baseUrl}/api/proxy/${proxyId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const newStatus = data.data.active;
                const statusText = newStatus ? 'activated' : 'deactivated';
                this.showToast(`Proxy ${statusText} successfully`, 'success');
                
                // Update local proxy data
                const proxy = this.proxies.find(p => p.id === proxyId);
                if (proxy) {
                    proxy.active = newStatus;
                }
                
                // Re-render table and update stats
                this.renderProxyTable();
                await this.loadProxyStats();
                await this.updateStats();
            } else {
                const errorMessage = data.message || 'Failed to toggle proxy';
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            this.handleApiError(error, 'Toggling proxy');
        } finally {
            this.setButtonLoading(toggleBtn, false);
        }
    }

    /**
     * Delete a single proxy
     * Requirements: 6.3
     * 
     * - Show confirmation dialog before deletion
     * - DELETE request to /api/proxy/:id endpoint
     * - Refresh proxy list on success
     * 
     * @param {string} proxyId - ID of the proxy to delete
     */
    async deleteProxy(proxyId) {
        // Show confirmation dialog - Requirements: 6.3
        if (!confirm('Are you sure you want to delete this proxy?')) {
            return;
        }
        
        // Find the delete button for this proxy and show loading state
        const deleteBtn = document.querySelector(`tr[data-proxy-id="${proxyId}"] .btn-outline-danger`);
        this.setButtonLoading(deleteBtn, true);
        
        try {
            const response = await fetch(`${this.baseUrl}/api/proxy/${proxyId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showToast('Proxy deleted successfully', 'success');
                
                // Refresh proxy list and stats
                await this.loadProxies();
                await this.updateStats();
            } else {
                const errorMessage = data.message || 'Failed to delete proxy';
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            this.handleApiError(error, 'Deleting proxy');
        } finally {
            this.setButtonLoading(deleteBtn, false);
        }
    }

    /**
     * Delete all proxies from the pool
     * Requirements: 6.4
     * 
     * - Show confirmation dialog before deletion
     * - DELETE all proxies one by one (or use bulk endpoint if available)
     * - Refresh proxy list on completion
     */
    async deleteAllProxies() {
        // Show confirmation dialog - Requirements: 6.4
        if (!confirm('Are you sure you want to delete ALL proxies? This action cannot be undone.')) {
            return;
        }
        
        // Double confirmation for destructive action
        if (!confirm('This will permanently delete all proxies. Are you absolutely sure?')) {
            return;
        }
        
        // Find the delete all button and show loading state
        const deleteAllBtn = document.querySelector('#proxies-section .btn-outline-danger');
        this.setButtonLoading(deleteAllBtn, true);
        
        try {
            // Try bulk delete endpoint first
            const response = await fetch(`${this.baseUrl}/api/proxy/all`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showToast('All proxies deleted successfully', 'success');
                    await this.loadProxies();
                    await this.updateStats();
                    return;
                }
            }
            
            // Fallback: delete proxies one by one
            let deletedCount = 0;
            let failedCount = 0;
            
            for (const proxy of [...this.proxies]) {
                try {
                    const deleteResponse = await fetch(`${this.baseUrl}/api/proxy/${proxy.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (deleteResponse.ok) {
                        deletedCount++;
                    } else {
                        failedCount++;
                    }
                } catch (err) {
                    failedCount++;
                }
            }
            
            if (failedCount === 0) {
                this.showToast(`Deleted ${deletedCount} proxies successfully`, 'success');
            } else {
                this.showToast(`Deleted ${deletedCount} proxies, ${failedCount} failed`, 'warning');
            }
            
            // Refresh proxy list and stats
            await this.loadProxies();
            await this.updateStats();
        } catch (error) {
            this.handleApiError(error, 'Deleting all proxies');
        } finally {
            this.setButtonLoading(deleteAllBtn, false);
        }
    }
}

// Global functions for onclick handlers
window.showSection = (section) => {
    if (window.browserShieldAdmin) {
        window.browserShieldAdmin.showSection(section);
    }
};

window.showCreateProfile = () => {
    if (window.browserShieldAdmin) {
        window.browserShieldAdmin.showCreateProfile();
    }
};

window.hideCreateProfile = () => {
    if (window.browserShieldAdmin) {
        window.browserShieldAdmin.hideCreateProfile();
    }
};

window.refreshProfiles = () => {
    if (window.browserShieldAdmin) {
        window.browserShieldAdmin.refreshProfiles();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.browserShieldAdmin = new BrowserShieldAdmin();
});