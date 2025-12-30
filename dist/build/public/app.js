// Anti-Detect Browser Profile Manager - Frontend
class ProfileManager {
    constructor() {
        this.profiles = [];
        this.activeSessions = [];
        this.proxyPool = [];
        this.init();
    }

    async init() {
        await this.loadCurrentMode();
        this.setupEventListeners();
        this.loadProfiles();
        this.loadActiveSessions();
        
        // Auto refresh every 30 seconds
        setInterval(() => {
            this.loadActiveSessions();
        }, 30000);
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
                
                // Update mode display if element exists
                const modeIndicator = document.querySelector('.mode-indicator');
                if (modeIndicator) {
                    modeIndicator.textContent = modeDisplay;
                    modeIndicator.className = `mode-indicator badge bg-${mode === 'mock' ? 'warning' : mode === 'firefox' ? 'success' : 'primary'}`;
                }
            }
        } catch (error) {
            console.warn('Failed to load current mode:', error);
        }
    }

    setupEventListeners() {
        // Create profile form
        document.getElementById('createProfileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProfile();
        });

        // Proxy settings toggle
        document.getElementById('enableProxy').addEventListener('change', (e) => {
            document.getElementById('proxySettings').style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) {
                this.loadProxyPool();
            }
        });

        // Proxy source change
        document.getElementById('proxySource').addEventListener('change', (e) => {
            const manual = document.getElementById('manualProxySettings');
            const pool = document.getElementById('poolProxySettings');
            
            if (e.target.value === 'manual') {
                manual.style.display = 'block';
                pool.style.display = 'none';
            } else {
                manual.style.display = 'none';
                pool.style.display = 'block';
            }
        });
    }

    async loadProfiles() {
        try {
            const response = await fetch('/api/profiles');
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
        } catch (error) {
            console.error('Error loading profiles:', error);
            this.showError('Không thể tải danh sách profiles');
        }
    }

    async loadActiveSessions() {
        try {
            const response = await fetch('/api/profiles/sessions/active');
            const data = await response.json();
            
            // Handle different response formats
            if (data.success && data.data) {
                this.activeSessions = data.data;
            } else if (data.sessions) {
                this.activeSessions = data.sessions;
            } else if (Array.isArray(data)) {
                this.activeSessions = data;
            } else {
                this.activeSessions = [];
            }
            
            this.updateActiveSessionsDisplay();
        } catch (error) {
            console.error('Error loading active sessions:', error);
        }
    }

    async createProfile() {
        const formData = this.getFormData();
        
        try {
            const response = await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showSuccess('Profile đã được tạo thành công!');
                this.resetForm();
                this.loadProfiles();
            } else {
                const error = await response.json();
                this.showError(error.message || 'Không thể tạo profile');
            }
        } catch (error) {
            this.showError('Lỗi kết nối server');
        }
    }

    getFormData() {
        const userAgentMap = {
            'chrome-windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'chrome-mac': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'firefox-windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'safari-mac': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'mobile-ios': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'mobile-android': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        };

        const data = {
            name: document.getElementById('profileName').value,
            timezone: document.getElementById('timezoneSelect').value,
            viewport: {
                width: parseInt(document.getElementById('viewportWidth').value),
                height: parseInt(document.getElementById('viewportHeight').value)
            },
            spoofFingerprint: document.getElementById('spoofFingerprint').checked,
            defaultHeadless: document.getElementById('defaultHeadless').checked
        };

        const userAgentSelect = document.getElementById('userAgentSelect').value;
        if (userAgentSelect && userAgentMap[userAgentSelect]) {
            data.userAgent = userAgentMap[userAgentSelect];
        }

        if (document.getElementById('enableProxy').checked) {
            const proxySource = document.getElementById('proxySource').value;
            
            if (proxySource === 'manual') {
                data.proxy = {
                    host: document.getElementById('proxyHost').value,
                    port: parseInt(document.getElementById('proxyPort').value),
                    type: document.getElementById('proxyType').value
                };

                const username = document.getElementById('proxyUsername').value;
                const password = document.getElementById('proxyPassword').value;
                if (username) {
                    data.proxy.username = username;
                }
                if (password) {
                    data.proxy.password = password;
                }
            } else if (proxySource === 'pool') {
                const selectedProxyId = document.getElementById('proxyPoolSelect').value;
                const selectedProxy = this.proxyPool.find(p => p.id === selectedProxyId);
                if (selectedProxy) {
                    data.proxy = {
                        host: selectedProxy.host,
                        port: selectedProxy.port,
                        type: selectedProxy.type,
                        username: selectedProxy.username,
                        password: selectedProxy.password
                    };
                }
            } else if (proxySource === 'random') {
                data.useRandomProxy = true;
            }
        }

        // Auto navigate URL
        const autoNavUrl = document.getElementById('autoNavigateUrl').value;
        if (autoNavUrl) {
            data.autoNavigateUrl = autoNavUrl;
        }

        return data;
    }

    renderProfiles() {
        const profilesList = document.getElementById('profilesList');
        
        if (this.profiles.length === 0) {
            profilesList.innerHTML = `
                <div class="col-12">
                    <div class="text-center text-muted">
                        <i class="bi bi-inbox" style="font-size: 3rem;"></i>
                        <p>Chưa có profile nào. Tạo profile đầu tiên!</p>
                    </div>
                </div>
            `;
            return;
        }

        profilesList.innerHTML = this.profiles.map(profile => {
            const isRunning = this.activeSessions.some(session => session.profileId === profile.id);
            const statusClass = isRunning ? 'status-running' : 'status-stopped';
            const statusIcon = isRunning ? 'bi-play-circle-fill' : 'bi-stop-circle';
            const statusText = isRunning ? 'Đang chạy' : 'Đã dừng';
            const defaultModeText = profile.defaultHeadless ? 'Headless' : 'Visible';
            const defaultModeBadge = profile.defaultHeadless ? 'bg-secondary' : 'bg-info';

            return `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card profile-card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${profile.name}</h6>
                            <div>
                                <span class="badge ${defaultModeBadge} me-1" title="Default browser mode">
                                    <i class="bi bi-${profile.defaultHeadless ? 'eye-slash' : 'eye'}"></i> ${defaultModeText}
                                </span>
                                <span class="badge ${profile.spoofFingerprint ? 'bg-success' : 'bg-secondary'} fingerprint-badge">
                                    ${profile.spoofFingerprint ? 'Stealth' : 'Normal'}
                                </span>
                            </div>
                        </div>
                        <div class="card-body">
                            <p class="card-text">
                                <small class="text-muted">
                                    <i class="bi bi-globe"></i> ${profile.timezone}<br>
                                    <i class="bi bi-display"></i> ${profile.viewport.width}x${profile.viewport.height}
                                </small>
                            </p>
                            ${profile.proxy ? `
                                <p class="proxy-info">
                                    <i class="bi bi-shield"></i> Proxy: ${profile.proxy.host}:${profile.proxy.port} (${profile.proxy.type.toUpperCase()})
                                </p>
                            ` : ''}
                            <div class="d-flex align-items-center justify-content-between">
                                <span class="${statusClass}">
                                    <i class="bi ${statusIcon}"></i> ${statusText}
                                </span>
                                <div class="btn-group" role="group">
                                    ${!isRunning ? `
                                        <button class="btn btn-success btn-sm" onclick="profileManager.startBrowser('${profile.id}', ${profile.defaultHeadless || false})" title="Khởi chạy trình duyệt ${profile.defaultHeadless ? '(Headless)' : '(Visible)'}">
                                            <i class="bi bi-play-fill"></i>
                                        </button>
                                    ` : `
                                        <button class="btn btn-danger btn-sm" onclick="profileManager.stopBrowser('${profile.id}')" title="Dừng trình duyệt">
                                            <i class="bi bi-stop-fill"></i>
                                        </button>
                                        <button class="btn btn-primary btn-sm" onclick="profileManager.openBrowserControl('${profile.id}')" title="Điều khiển trình duyệt">
                                            <i class="bi bi-window-desktop"></i>
                                        </button>
                                    `}
                                    <button class="btn btn-info btn-sm" onclick="profileManager.showProfileDetails('${profile.id}')" title="Xem chi tiết">
                                        <i class="bi bi-info-circle"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="profileManager.editProfile('${profile.id}')" title="Chỉnh sửa">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" onclick="profileManager.deleteProfile('${profile.id}')" title="Xóa">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateActiveSessionsDisplay() {
        const count = this.activeSessions.length;
        document.getElementById('activeSessionsCount').innerHTML = `
            Active Sessions: <span class="badge bg-${count > 0 ? 'success' : 'secondary'}">${count}</span>
        `;

        const activeSessionsDiv = document.getElementById('activeSessions');
        if (count === 0) {
            activeSessionsDiv.innerHTML = '<p class="text-muted">Không có session nào đang chạy</p>';
        } else {
            activeSessionsDiv.innerHTML = this.activeSessions.map(session => {
                const profile = this.profiles.find(p => p.id === session.profileId);
                const profileName = profile ? profile.name : (session.profileName || 'Unknown Profile');
                
                return `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <strong>${profileName}</strong><br>
                        <small class="text-muted">Uptime: ${session.uptime ? this.formatUptime(session.uptime) : 'N/A'}</small>
                    </div>
                    <div class="btn-group" role="group">
                        <button class="btn btn-outline-primary btn-sm" onclick="profileManager.openBrowserControl('${session.profileId}')" title="Điều khiển trình duyệt">
                            <i class="bi bi-display"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="profileManager.stopBrowser('${session.profileId}')" title="Dừng session">
                            <i class="bi bi-stop"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    async startBrowser(profileId, headless = false) {
        const autoNavUrl = prompt('Nhập URL để auto navigate (để trống nếu không cần):', 'https://bot.sannysoft.com/');
        
        const requestBody = {
            headless: headless  // Default to visible mode (headless: false)
        };
        if (autoNavUrl && autoNavUrl.trim()) {
            requestBody.autoNavigateUrl = autoNavUrl.trim();
        }

        try {
            const modeText = headless ? 'headless' : 'visible';
            this.showToast(`Đang khởi động trình duyệt ở chế độ ${modeText}...`, 'info');
            
            const response = await fetch(`/api/profiles/${profileId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                const data = await response.json();
                const browserMode = data.data.headless ? 'headless' : 'visible';
                let successMsg = `Browser đã được khởi chạy ở chế độ ${browserMode}!`;
                if (data.data.mockFeatures?.autoNavigated) {
                    successMsg += ` Auto navigated: ${requestBody.autoNavigateUrl || 'default page'}`;
                }
                if (!data.data.headless) {
                    successMsg += ' Bạn có thể tương tác trực tiếp với cửa sổ trình duyệt.';
                }
                this.showSuccess(successMsg);
                this.loadActiveSessions();
                this.renderProfiles();
            } else {
                const error = await response.json();
                this.showError(error.message || 'Không thể khởi chạy browser');
            }
        } catch (error) {
            this.showError('Lỗi kết nối server');
        }
    }

    async stopBrowser(profileId) {
        try {
            const response = await fetch(`/api/profiles/${profileId}/stop`, {
                method: 'POST'
            });

            if (response.ok) {
                this.showSuccess('Browser đã được dừng!');
                this.loadActiveSessions();
                this.renderProfiles();
            } else {
                this.showError('Không thể dừng browser');
            }
        } catch (error) {
            console.error('Error stopping browser:', error);
            this.showError('Lỗi kết nối server');
        }
    }

    // Open browser control interface (GoLogin-style)
    async openBrowserControl(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) {
            this.showError('Không tìm thấy profile');
            return;
        }

        // Check if browser is running
        const session = this.activeSessions.find(s => s.profileId === profileId);
        if (!session) {
            // Offer to start browser first
            const shouldStart = confirm(`Profile "${profile.name}" chưa chạy. Bạn có muốn khởi động trình duyệt trước không?`);
            if (shouldStart) {
                await this.startBrowser(profileId);
                // Wait a moment for session to start
                setTimeout(() => this.openBrowserControl(profileId), 2000);
                return;
            }
        }

        // Open browser control in new window/tab
        const controlUrl = `/browser-control?profile=${profileId}&name=${encodeURIComponent(profile.name)}`;
        window.open(controlUrl, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
        
        this.showToast('Giao diện điều khiển trình duyệt đã mở trong tab mới', 'success');
    }

    // Navigate to URL
    async navigateTo(profileId) {
        const url = document.getElementById('navigateUrl').value;
        if (!url) {
            this.showError('Vui lòng nhập URL');
            return;
        }

        try {
            const response = await fetch(`/api/profiles/${profileId}/navigate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('controlResult').innerHTML = `
                    <div class="alert alert-success">
                        <strong>Thành công!</strong> Đã điều hướng tới: ${url}
                        <br><small>Thời gian: ${new Date().toLocaleString()}</small>
                    </div>
                `;
            } else {
                throw new Error(data.message || 'Navigation failed');
            }
        } catch (error) {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Lỗi!</strong> ${error.message}
                </div>
            `;
        }
    }

    // Execute JavaScript
    async executeJS(profileId) {
        const code = document.getElementById('jsCode').value;
        if (!code.trim()) {
            this.showError('Vui lòng nhập mã JavaScript');
            return;
        }

        try {
            const response = await fetch(`/api/profiles/${profileId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script: code })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('controlResult').innerHTML = `
                    <div class="alert alert-success">
                        <strong>Thành công!</strong>
                        <pre class="mt-2 mb-0">${JSON.stringify(data.data.result, null, 2)}</pre>
                    </div>
                `;
            } else {
                throw new Error(data.message || 'Script execution failed');
            }
        } catch (error) {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Lỗi!</strong> ${error.message}
                </div>
            `;
        }
    }

    // Get current page info
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
            const response = await fetch(`/api/profiles/${profileId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script: infoScript })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('controlResult').innerHTML = `
                    <div class="alert alert-info">
                        <strong>Thông tin trang hiện tại:</strong>
                        <pre class="mt-2 mb-0">${data.data.result}</pre>
                    </div>
                `;
            } else {
                throw new Error(data.message || 'Failed to get page info');
            }
        } catch (error) {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Lỗi!</strong> ${error.message}
                </div>
            `;
        }
    }

    // Take screenshot (mock implementation)
    async takeScreenshot(profileId) {
        try {
            // This would be a real screenshot in production mode
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-info">
                    <strong>Chụp màn hình thành công!</strong>
                    <br>Trong mode thực tế, ảnh chụp sẽ được lưu và hiển thị ở đây.
                    <br><small>Thời gian: ${new Date().toLocaleString()}</small>
                </div>
            `;
        } catch (error) {
            document.getElementById('controlResult').innerHTML = `
                <div class="alert alert-danger">
                    <strong>Lỗi!</strong> ${error.message}
                </div>
            `;
        }
    }

    async deleteProfile(profileId) {
        if (!confirm('Bạn có chắc muốn xóa profile này?')) {
            return;
        }

        try {
            const response = await fetch(`/api/profiles/${profileId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showSuccess('Profile đã được xóa!');
                this.loadProfiles();
                this.loadActiveSessions();
            } else {
                this.showError('Không thể xóa profile');
            }
        } catch (error) {
            this.showError('Lỗi kết nối server');
        }
    }

    async showProfileDetails(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) return;

        const isRunning = this.activeSessions.some(session => session.profileId === profileId);
        
        let statusInfo = '';
        if (isRunning) {
            try {
                const response = await fetch(`/api/profiles/${profileId}/status`);
                const data = await response.json();
                if (data.success && data.data) {
                    statusInfo = `
                        <div class="alert alert-success">
                            <h6>Browser Status</h6>
                            <p><strong>Uptime:</strong> ${this.formatUptime(data.data.uptime)}</p>
                            <p><strong>Current URL:</strong> ${data.data.currentUrl || 'N/A'}</p>
                            ${data.data.note ? `<p><small class="text-muted">${data.data.note}</small></p>` : ''}
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading status:', error);
            }
        }

        document.getElementById('modalTitle').textContent = profile.name;
        document.getElementById('modalContent').innerHTML = `
            <div class="mb-3">
                <strong>ID:</strong> ${profile.id}
            </div>
            <div class="mb-3">
                <strong>User Agent:</strong><br>
                <small class="text-muted">${profile.userAgent}</small>
            </div>
            <div class="mb-3">
                <strong>Timezone:</strong> ${profile.timezone}
            </div>
            <div class="mb-3">
                <strong>Viewport:</strong> ${profile.viewport.width}x${profile.viewport.height}
            </div>
            <div class="mb-3">
                <strong>Anti-Detection:</strong> 
                <span class="badge bg-${profile.spoofFingerprint ? 'success' : 'secondary'}">
                    ${profile.spoofFingerprint ? 'Enabled' : 'Disabled'}
                </span>
            </div>
            ${profile.proxy ? `
                <div class="mb-3">
                    <strong>Proxy:</strong> ${profile.proxy.host}:${profile.proxy.port} (${profile.proxy.type.toUpperCase()})
                </div>
            ` : '<div class="mb-3"><strong>Proxy:</strong> <span class="text-muted">Not configured</span></div>'}
            <div class="mb-3">
                <strong>Created:</strong> ${new Date(profile.createdAt).toLocaleString('vi-VN')}
            </div>
            ${statusInfo}
            ${isRunning ? `
                <div class="d-grid gap-2">
                    <button class="btn btn-primary" onclick="profileManager.navigateToUrl('${profileId}')">
                        <i class="bi bi-globe"></i> Navigate to URL
                    </button>
                    <button class="btn btn-secondary" onclick="profileManager.executeScript('${profileId}')">
                        <i class="bi bi-code"></i> Execute Script
                    </button>
                </div>
            ` : ''}
        `;

        new bootstrap.Modal(document.getElementById('profileModal')).show();
    }

    async navigateToUrl(profileId) {
        const url = prompt('Nhập URL để navigate:');
        if (!url) return;

        try {
            const response = await fetch(`/api/profiles/${profileId}/navigate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                this.showSuccess(`Navigated to: ${data.data.url}`);
            } else {
                this.showError('Navigation failed');
            }
        } catch (error) {
            this.showError('Lỗi kết nối server');
        }
    }

    async executeScript(profileId) {
        const script = prompt('Nhập JavaScript code để execute:', 'navigator.userAgent');
        if (!script) return;

        try {
            const response = await fetch(`/api/profiles/${profileId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ script })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`Result: ${JSON.stringify(data.data, null, 2)}`);
            } else {
                this.showError('Script execution failed');
            }
        } catch (error) {
            this.showError('Lỗi kết nối server');
        }
    }

    async editProfile(profileId) {
        try {
            const profile = this.profiles.find(p => p.id === profileId);
            if (!profile) {
                this.showError('Profile not found');
                return;
            }

            // Show edit modal with pre-filled data
            const modalTitle = document.getElementById('modalTitle');
            const modalContent = document.getElementById('modalContent');
            
            modalTitle.innerHTML = '<i class="bi bi-pencil"></i> Edit Profile';
            modalContent.innerHTML = `
                <form id="editProfileForm">
                    <div class="mb-3">
                        <label class="form-label">Profile Name</label>
                        <input type="text" class="form-control" id="editProfileName" value="${profile.name}" required>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">User Agent</label>
                        <textarea class="form-control" id="editUserAgent" rows="3">${profile.userAgent}</textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Timezone</label>
                        <select class="form-select" id="editTimezone">
                            <option value="Asia/Ho_Chi_Minh" ${profile.timezone === 'Asia/Ho_Chi_Minh' ? 'selected' : ''}>Vietnam (GMT+7)</option>
                            <option value="America/New_York" ${profile.timezone === 'America/New_York' ? 'selected' : ''}>New York (GMT-5)</option>
                            <option value="Europe/London" ${profile.timezone === 'Europe/London' ? 'selected' : ''}>London (GMT+0)</option>
                            <option value="Asia/Tokyo" ${profile.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Tokyo (GMT+9)</option>
                            <option value="Australia/Sydney" ${profile.timezone === 'Australia/Sydney' ? 'selected' : ''}>Sydney (GMT+10)</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Viewport</label>
                        <div class="row">
                            <div class="col-6">
                                <input type="number" class="form-control" id="editViewportWidth" value="${profile.viewport.width}" placeholder="Width">
                            </div>
                            <div class="col-6">
                                <input type="number" class="form-control" id="editViewportHeight" value="${profile.viewport.height}" placeholder="Height">
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="editSpoofFingerprint" ${profile.spoofFingerprint ? 'checked' : ''}>
                            <label class="form-check-label">
                                Anti-Detection (Stealth Mode)
                            </label>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="editDefaultHeadless" ${profile.defaultHeadless ? 'checked' : ''}>
                            <label class="form-check-label">
                                Default Headless Mode
                            </label>
                        </div>
                        <small class="text-muted">Bỏ chọn để mặc định mở browser ở chế độ hiển thị (visible)</small>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Auto Navigate URL</label>
                        <input type="url" class="form-control" id="editAutoNavigateUrl" value="${profile.autoNavigateUrl || ''}" placeholder="https://bot.sannysoft.com/">
                    </div>
                    
                    <hr>
                    <h6><i class="bi bi-globe"></i> Proxy Settings</h6>
                    
                    <div class="mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="editEnableProxy" ${profile.proxy ? 'checked' : ''}>
                            <label class="form-check-label">Sử dụng Proxy</label>
                        </div>
                    </div>
                    
                    <div id="editProxySettings" style="display: ${profile.proxy ? 'block' : 'none'};">
                        <div class="row mb-2">
                            <div class="col-8">
                                <input type="text" class="form-control form-control-sm" id="editProxyHost" 
                                    placeholder="Proxy Host" value="${profile.proxy?.host || ''}">
                            </div>
                            <div class="col-4">
                                <input type="number" class="form-control form-control-sm" id="editProxyPort" 
                                    placeholder="Port" value="${profile.proxy?.port || ''}">
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-12">
                                <select class="form-select form-select-sm" id="editProxyType">
                                    <option value="http" ${profile.proxy?.type === 'http' ? 'selected' : ''}>HTTP</option>
                                    <option value="https" ${profile.proxy?.type === 'https' ? 'selected' : ''}>HTTPS</option>
                                    <option value="socks4" ${profile.proxy?.type === 'socks4' ? 'selected' : ''}>SOCKS4</option>
                                    <option value="socks5" ${profile.proxy?.type === 'socks5' ? 'selected' : ''}>SOCKS5</option>
                                </select>
                            </div>
                        </div>
                        <div class="row mb-2">
                            <div class="col-6">
                                <input type="text" class="form-control form-control-sm" id="editProxyUsername" 
                                    placeholder="Username (tùy chọn)" value="${profile.proxy?.username || ''}">
                            </div>
                            <div class="col-6">
                                <input type="password" class="form-control form-control-sm" id="editProxyPassword" 
                                    placeholder="Password (tùy chọn)" value="${profile.proxy?.password || ''}">
                            </div>
                        </div>
                        <div class="mb-2">
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="profileManager.loadProxyPoolForEdit()">
                                <i class="bi bi-arrow-down-circle"></i> Chọn từ Pool
                            </button>
                            <select class="form-select form-select-sm mt-2" id="editProxyPoolSelect" style="display: none;">
                                <option value="">Chọn proxy từ pool...</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-3">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `;

            // Toggle proxy settings visibility
            document.getElementById('editEnableProxy').addEventListener('change', (e) => {
                document.getElementById('editProxySettings').style.display = e.target.checked ? 'block' : 'none';
            });

            // Handle proxy pool selection
            document.getElementById('editProxyPoolSelect').addEventListener('change', (e) => {
                const selectedProxy = this.proxyPool.find(p => p.id === e.target.value);
                if (selectedProxy) {
                    document.getElementById('editProxyHost').value = selectedProxy.host;
                    document.getElementById('editProxyPort').value = selectedProxy.port;
                    document.getElementById('editProxyType').value = selectedProxy.type;
                    document.getElementById('editProxyUsername').value = selectedProxy.username || '';
                    document.getElementById('editProxyPassword').value = selectedProxy.password || '';
                }
            });
            `;

            // Handle form submission
            document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateProfile(profileId);
            });

            new bootstrap.Modal(document.getElementById('profileModal')).show();
        } catch (error) {
            console.error('Error editing profile:', error);
            this.showError('Failed to load profile for editing');
        }
    }

    async updateProfile(profileId) {
        const enableProxy = document.getElementById('editEnableProxy').checked;
        
        const updateData = {
            name: document.getElementById('editProfileName').value,
            userAgent: document.getElementById('editUserAgent').value,
            timezone: document.getElementById('editTimezone').value,
            viewport: {
                width: parseInt(document.getElementById('editViewportWidth').value),
                height: parseInt(document.getElementById('editViewportHeight').value)
            },
            spoofFingerprint: document.getElementById('editSpoofFingerprint').checked,
            defaultHeadless: document.getElementById('editDefaultHeadless').checked,
            autoNavigateUrl: document.getElementById('editAutoNavigateUrl').value
        };

        // Handle proxy settings
        if (enableProxy) {
            const proxyHost = document.getElementById('editProxyHost').value;
            const proxyPort = document.getElementById('editProxyPort').value;
            
            if (proxyHost && proxyPort) {
                updateData.proxy = {
                    host: proxyHost,
                    port: parseInt(proxyPort),
                    type: document.getElementById('editProxyType').value,
                    username: document.getElementById('editProxyUsername').value || undefined,
                    password: document.getElementById('editProxyPassword').value || undefined
                };
            }
        } else {
            updateData.proxy = null; // Remove proxy
        }

        try {
            const response = await fetch(`/api/profiles/${profileId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.showSuccess('Profile updated successfully!');
                bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
                this.loadProfiles();
            } else {
                const error = await response.json();
                this.showError(error.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showError('Connection error while updating profile');
        }
    }

    async loadProxyPool() {
        try {
            const response = await fetch('/api/proxy');
            const data = await response.json();
            this.proxyPool = data.data;
            this.updateProxyPoolSelect();
        } catch (error) {
            console.error('Error loading proxy pool:', error);
        }
    }

    updateProxyPoolSelect() {
        const select = document.getElementById('proxyPoolSelect');
        if (this.proxyPool.length === 0) {
            select.innerHTML = '<option value="">Không có proxy nào trong pool</option>';
        } else {
            select.innerHTML = '<option value="">Chọn proxy...</option>' +
                this.proxyPool
                    .filter(p => p.active)
                    .map(proxy => `
                        <option value="${proxy.id}">
                            ${proxy.host}:${proxy.port} (${proxy.type.toUpperCase()}) - ${proxy.country || 'Unknown'}
                        </option>
                    `).join('');
        }
    }

    async loadProxyPoolForEdit() {
        await this.loadProxyPool();
        const select = document.getElementById('editProxyPoolSelect');
        if (this.proxyPool.length === 0) {
            select.innerHTML = '<option value="">Không có proxy nào trong pool</option>';
        } else {
            select.innerHTML = '<option value="">Chọn proxy từ pool...</option>' +
                this.proxyPool
                    .filter(p => p.active)
                    .map(proxy => `
                        <option value="${proxy.id}">
                            ${proxy.host}:${proxy.port} (${proxy.type.toUpperCase()}) - ${proxy.country || 'Unknown'}
                        </option>
                    `).join('');
        }
        select.style.display = 'block';
    }

    resetForm() {
        document.getElementById('createProfileForm').reset();
        document.getElementById('proxySettings').style.display = 'none';
        document.getElementById('manualProxySettings').style.display = 'block';
        document.getElementById('poolProxySettings').style.display = 'none';
        document.getElementById('enableProxy').checked = false;
        document.getElementById('spoofFingerprint').checked = true;
        document.getElementById('defaultHeadless').checked = false;  // Default to visible mode
        document.getElementById('viewportWidth').value = '1366';
        document.getElementById('viewportHeight').value = '768';
        document.getElementById('proxySource').value = 'manual';
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }
}

// Global functions
function refreshProfiles() {
    profileManager.loadProfiles();
    profileManager.loadActiveSessions();
}

// Initialize the application
const profileManager = new ProfileManager();