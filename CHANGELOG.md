# BrowserShield Changelog

## Version 1.4.0 - Profile Proxy Editor (2025-12-26)

### 🎯 New Features
- **NEW**: Profile Proxy Editor trong Edit Profile Modal
- **NEW**: Proxy source selection (none/pool/manual)
- **NEW**: Proxy pool dropdown với active proxy filtering
- **NEW**: Manual proxy input với đầy đủ fields (host, port, type, username, password)
- **NEW**: Current proxy display với password masking
- **NEW**: Clear proxy functionality

### 🔧 Proxy Validation
- **IMPROVED**: Host validation (không empty)
- **IMPROVED**: Port validation (range 1-65535)
- **IMPROVED**: Type validation (http/https/socks4/socks5)
- **IMPROVED**: Authentication consistency (username/password pair)

### 🧪 Testing
- **NEW**: 40 property-based tests cho Profile Proxy Editor
- **NEW**: Comprehensive test coverage cho proxy validation
- **NEW**: Round-trip tests cho proxy save/load

### 📋 API Integration
- **UPDATED**: Profile update API hỗ trợ proxy configuration
- **UPDATED**: Profile details hiển thị proxy info

---

## Version 1.3.0 - Firefox Mode Compatibility Update (2025-06-26)

### 🔧 Firefox Mode Fixes
- **FIXED**: Replaced deprecated `puppeteer-firefox` with Chrome engine + Firefox fingerprinting
- **FIXED**: Server now uses actual browser services instead of mock implementations
- **FIXED**: FirefoxBrowserService profileService dependency error
- **IMPROVED**: Firefox Mode compatibility for VPS environments

### 🚀 New Features
- **NEW**: Created `firefox-puppeteer-simple.js` for VPS compatibility
- **NEW**: Added Firefox-specific user agent and fingerprinting spoofing
- **NEW**: VPS update script `update-firefox-mode.sh` for seamless deployment

### 🔄 Server Improvements
- **UPDATED**: All browser endpoints (start/stop/navigate/execute) use real browser services
- **UPDATED**: Server initialization with proper Firefox Mode detection
- **UPDATED**: Mode synchronization across all UI components

### 📋 API Changes
- Browser session start/stop now use actual Firefox service
- Navigation and script execution work with real browser instances
- Error handling improved for Firefox Mode operations

### 🔗 VPS Deployment
- Script update URL remains: `https://raw.githubusercontent.com/huynd94/TheBrowserShield/main/scripts/update-system.sh`
- New Firefox-specific update: `update-firefox-mode.sh`
- Compatible with Oracle Linux 9 and other VPS environments

### 🐛 Bug Fixes
- Fixed "Cannot read properties of null (reading 'getProfile')" error
- Fixed mode display synchronization issues
- Fixed browser control interface compatibility

---

## Version 1.2.0 - GoLogin-Style Browser Control (2025-06-25)

### 🎯 GoLogin-Style Features
- **NEW**: Remote browser control interface (`/browser-control`)
- **NEW**: Real-time browser automation and control
- **NEW**: JavaScript console with live execution
- **NEW**: Screenshot capture and page information retrieval

### 🔧 Mode Management
- **NEW**: Three-mode system (Mock/Production/Firefox)
- **NEW**: Mode Manager UI (`/mode-manager`)
- **NEW**: Real-time mode switching with server restart

### 📱 Enhanced Admin Interface
- **NEW**: Modern Bootstrap-based admin panel
- **NEW**: Real-time dashboard with statistics
- **NEW**: Edit profile functionality with modal interface
- **NEW**: Browser control integration

---

## Version 1.1.0 - VPS Deployment & Features (2025-06-24)

### 🚀 VPS Deployment
- **NEW**: Complete Oracle Linux 9 VPS deployment automation
- **NEW**: SystemD service configuration
- **NEW**: Auto-installer with GitHub integration
- **NEW**: Production-ready service monitoring

### 🔐 Security & Performance
- **NEW**: API token authentication
- **NEW**: Rate limiting middleware
- **NEW**: Input validation and error handling
- **NEW**: Memory-optimized browser configurations

### 📊 Monitoring & Logging
- **NEW**: Activity logging system with rotation
- **NEW**: Profile-specific and system-wide logs
- **NEW**: System health monitoring
- **NEW**: Performance statistics

---

## Version 1.0.0 - Initial Release (2025-06-23)

### 🎉 Core Features
- **NEW**: Anti-detect browser profile management
- **NEW**: Puppeteer integration with stealth capabilities
- **NEW**: Proxy pool management
- **NEW**: RESTful API for profile operations
- **NEW**: Web UI for profile management

### 🏗️ Architecture
- **NEW**: Express.js backend with modular design
- **NEW**: File-based profile storage
- **NEW**: Service layer architecture
- **NEW**: Middleware for authentication and logging

### 📖 Documentation
- **NEW**: Complete installation guides
- **NEW**: API documentation
- **NEW**: Deployment instructions
- **NEW**: User guides in multiple languages