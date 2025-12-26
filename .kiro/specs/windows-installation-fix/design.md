# Design Document: Windows Installation Fix

## Overview

Tài liệu này mô tả thiết kế giải pháp để khắc phục các vấn đề khi cài đặt BrowserShield trên Windows 10/11. Giải pháp tập trung vào việc tạo một trải nghiệm cài đặt mượt mà, tự động xử lý các vấn đề tương thích và cung cấp thông báo lỗi rõ ràng.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BrowserShield Portable                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Launcher       │  │  Dependency     │  │  Browser        │ │
│  │  Scripts        │  │  Validator      │  │  Detector       │ │
│  │  (.bat/.ps1)    │  │  (startup.js)   │  │  (Windows)      │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Application Core                          ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ ││
│  │  │ server.js   │  │ Mode        │  │ Browser Service     │ ││
│  │  │             │  │ Switcher    │  │ (Chrome/Firefox)    │ ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Data Layer                                ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ ││
│  │  │ SQLite DB   │  │ Profiles    │  │ Browser Profiles    │ ││
│  │  │ (better-    │  │ JSON        │  │ (User Data Dir)     │ ││
│  │  │  sqlite3)   │  │             │  │                     │ ││
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Windows Browser Detector (`utils/browser-detector.js`)

Module mới để detect browsers trên Windows:

```javascript
/**
 * Detect browser executables on Windows
 * @returns {Object} Browser paths and availability
 */
interface BrowserDetector {
  detectChrome(): string | null;
  detectFirefox(): string | null;
  detectEdge(): string | null;
  getCachedPaths(): BrowserPaths;
  validatePath(path: string): boolean;
}

interface BrowserPaths {
  chrome: string | null;
  firefox: string | null;
  edge: string | null;
  puppeteerChrome: string | null;
}
```

### 2. Dependency Validator (`utils/dependency-validator.js`)

Module kiểm tra dependencies khi startup:

```javascript
/**
 * Validate all dependencies on startup
 * @returns {ValidationResult}
 */
interface DependencyValidator {
  validateAll(): Promise<ValidationResult>;
  validateNativeModules(): Promise<ModuleStatus[]>;
  validateNodeVersion(): VersionCheck;
  suggestFix(error: Error): string;
}

interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: string[];
  suggestions: string[];
}
```

### 3. Enhanced Mode Switcher

Cập nhật `config/mode-switcher.js` để hỗ trợ Windows:

```javascript
/**
 * Check browser availability on Windows
 * Uses registry and common paths instead of 'which' command
 */
checkChromeAvailability(): boolean {
  if (process.platform === 'win32') {
    return this.checkWindowsChrome();
  }
  return this.checkLinuxChrome();
}
```

### 4. Improved Launcher Scripts

#### Start-BrowserShield.bat (Enhanced)

```batch
@echo off
REM Key improvements:
REM 1. Check Node.js version >= 18
REM 2. Handle paths with spaces using quotes
REM 3. Rebuild native modules if needed
REM 4. Clear error messages in Vietnamese
REM 5. UTF-8 encoding support
```

#### Fix-Dependencies.bat (New)

```batch
@echo off
REM Troubleshooting script:
REM 1. Remove node_modules
REM 2. Clear npm cache
REM 3. Reinstall dependencies
REM 4. Rebuild native modules
```

## Data Models

### Browser Configuration Cache

```javascript
// data/browser-config.json
{
  "detectedAt": "2025-12-25T10:00:00Z",
  "platform": "win32",
  "browsers": {
    "chrome": {
      "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "version": "120.0.0.0",
      "available": true
    },
    "firefox": {
      "path": "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      "version": "121.0",
      "available": true
    },
    "puppeteerChrome": {
      "path": "node_modules\\puppeteer\\.local-chromium\\...",
      "available": true
    }
  }
}
```

### Installation Status

```javascript
// node_modules/.installed_ok
{
  "installedAt": "2025-12-25T10:00:00Z",
  "nodeVersion": "v20.11.0",
  "platform": "win32",
  "arch": "x64",
  "nativeModulesRebuilt": true
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Browser Path Detection Correctness

*For any* valid browser installation path on Windows, the Browser_Detection_Module SHALL correctly identify and return the executable path if it exists, or null if it doesn't exist.

**Validates: Requirements 2.1, 2.2, 2.5**

### Property 2: Path Special Character Handling

*For any* file path containing spaces, Unicode characters (including Vietnamese), or other special characters, the System SHALL correctly construct and resolve the path without errors.

**Validates: Requirements 3.2, 3.3**

### Property 3: Profile ID Sanitization

*For any* profile ID string, the sanitization function SHALL remove or replace all characters that are invalid for Windows file paths while preserving the uniqueness of the ID.

**Validates: Requirements 3.4**

### Property 4: Node.js Version Comparison

*For any* Node.js version string, the version check function SHALL correctly determine if it meets the minimum requirement (18.0.0) by comparing major, minor, and patch versions.

**Validates: Requirements 4.1**

### Property 5: Module Validation Completeness

*For any* set of required modules, the validation function SHALL check each module's loadability and return accurate status for all modules.

**Validates: Requirements 5.1, 5.4, 5.5**

### Property 6: Installation Marker Round-Trip

*For any* successful installation, writing and then reading the marker file SHALL produce equivalent installation status information.

**Validates: Requirements 1.4, 6.5**

### Property 7: Error Logging Completeness

*For any* startup error, the error handling system SHALL log the full error stack to file, display a user-friendly message, and create diagnostic information in the startup log.

**Validates: Requirements 7.1, 7.2, 7.5**

### Property 8: Browser Error Categorization

*For any* browser launch failure, the error handling system SHALL correctly categorize the error as either a browser issue (executable not found) or a configuration issue (invalid settings).

**Validates: Requirements 7.4**

### Property 9: Windows Browser Detection Compatibility

*For any* Windows platform, the Mode_Switcher SHALL use Windows-compatible methods (file path checks instead of 'which' command) to detect browser availability.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 10: Browser Cache Consistency

*For any* sequence of browser detection calls, the cached paths SHALL remain consistent and subsequent calls SHALL return cached values without additional filesystem access.

**Validates: Requirements 2.4**

## Error Handling

### Startup Errors

| Error Type | User Message | Log Message | Suggested Fix |
|------------|--------------|-------------|---------------|
| Node.js not found | "Node.js chưa được cài đặt" | Full error stack | Link to nodejs.org |
| Node.js version too old | "Cần Node.js 18.0.0 trở lên" | Current version | Upgrade instructions |
| Native module error | "Lỗi module native, đang rebuild..." | Module name + error | Run Fix-Dependencies.bat |
| Database error | "Không thể khởi tạo database" | SQLite error | Check file permissions |
| Browser not found | "Không tìm thấy Chrome/Firefox" | Searched paths | Install browser or use Mock mode |
| Port in use | "Port 5000 đang được sử dụng" | Port number | Use alternative port |

### Error Response Format

```javascript
{
  "success": false,
  "error": {
    "code": "NATIVE_MODULE_ERROR",
    "message": "Lỗi module native: better-sqlite3",
    "userMessage": "Module database cần được rebuild cho máy này",
    "suggestion": "Chạy Fix-Dependencies.bat để sửa lỗi",
    "details": {
      "module": "better-sqlite3",
      "platform": "win32",
      "arch": "x64"
    }
  }
}
```

## Testing Strategy

### Unit Tests

Unit tests sẽ được viết cho các module mới:

1. **browser-detector.js**
   - Test path validation logic
   - Test caching mechanism
   - Test fallback behavior

2. **dependency-validator.js**
   - Test module loading checks
   - Test version comparison
   - Test error message generation

3. **Enhanced mode-switcher.js**
   - Test Windows browser detection
   - Test platform-specific logic

### Property-Based Tests

Property-based tests sử dụng `fast-check` library (đã có trong devDependencies):

1. **Path handling properties**
   - Generate random paths with special characters
   - Verify path construction works correctly

2. **Version comparison properties**
   - Generate random version strings
   - Verify comparison logic is correct

3. **Sanitization properties**
   - Generate random profile IDs
   - Verify sanitization preserves uniqueness

### Integration Tests

1. **First-run simulation**
   - Test dependency installation flow
   - Test marker file creation

2. **Browser detection integration**
   - Test actual browser detection on Windows
   - Test mode switching

### Test Configuration

```javascript
// jest.config.js additions
{
  testMatch: [
    "**/*.test.js",
    "**/*.property.test.js"  // Property-based tests
  ],
  testTimeout: 30000  // Longer timeout for property tests
}
```

Property tests should run minimum 100 iterations to ensure coverage.

## Implementation Notes

### File Changes Required

1. **New Files:**
   - `utils/browser-detector.js` - Windows browser detection
   - `utils/dependency-validator.js` - Startup validation
   - `utils/path-utils.js` - Cross-platform path utilities
   - `scripts/Fix-Dependencies.bat` - Troubleshooting script

2. **Modified Files:**
   - `config/mode-switcher.js` - Add Windows support
   - `config/puppeteer.js` - Use browser-detector
   - `scripts/build-portable.js` - Improve portable build
   - `Start-BrowserShield.bat` - Enhanced launcher
   - `server.js` - Add startup validation

### Backward Compatibility

- Existing profiles and data will be preserved
- Linux/Mac functionality unchanged
- Mock mode continues to work without browsers
