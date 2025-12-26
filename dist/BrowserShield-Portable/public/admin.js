// BrowserShield Admin Interface JavaScript
class BrowserShieldAdmin {
    constructor() {
        this.baseUrl = window.location.origin;
        this.profiles = [];
        this.sessions = [];
        this.logs = [];
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

        // Navigation clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });

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

            // Safely update proxy count
            const totalProxiesEl = document.getElementById('totalProxies');
            if (totalProxiesEl) {
                totalProxiesEl.textContent = '5';
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
        const formData = {
            name: document.getElementById('profileName').value,
            userAgent: document.getElementById('userAgent').value,
            timezone: document.getElementById('timezone').value,
            viewport: {
                width: parseInt(document.getElementById('viewportWidth').value),
                height: parseInt(document.getElementById('viewportHeight').value)
            },
            autoNavigateUrl: document.getElementById('autoNavigateUrl').value || null
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

                // Add to logs
                this.logs.unshift({
                    timestamp: new Date().toISOString(),
                    action: 'Profile Created',
                    details: `New profile "${formData.name}" created`,
                    profileId: data.profile.id
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
                        <tr><td><strong>Proxy:</strong></td><td>${profile.proxy ? 'Enabled' : 'Disabled'}</td></tr>
                        <tr><td><strong>Auto Navigate:</strong></td><td>${profile.autoNavigateUrl || 'None'}</td></tr>
                    </table>
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

    formatUptime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
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
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="editSpoofFingerprint" ${profile.spoofFingerprint ? 'checked' : ''}>
                                <label class="form-check-label" for="editSpoofFingerprint">
                                    Enable Anti-Detection (Stealth Mode)
                                </label>
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

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    async updateProfile(profileId) {
        const formData = {
            name: document.getElementById('editProfileName').value,
            timezone: document.getElementById('editTimezone').value,
            viewport: {
                width: parseInt(document.getElementById('editWidth').value),
                height: parseInt(document.getElementById('editHeight').value)
            },
            userAgent: document.getElementById('editUserAgent').value,
            spoofFingerprint: document.getElementById('editSpoofFingerprint').checked
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