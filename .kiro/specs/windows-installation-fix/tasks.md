# Implementation Plan: Windows Installation Fix

## Overview

Kế hoạch triển khai để khắc phục các vấn đề cài đặt BrowserShield trên Windows 10/11. Các tasks được sắp xếp theo thứ tự ưu tiên, bắt đầu từ các utilities cơ bản, sau đó đến integration và cuối cùng là launcher scripts.

## Tasks

- [-] 1. Create cross-platform path utilities
  - [x] 1.1 Create `utils/path-utils.js` with path sanitization functions
    - Implement `sanitizeProfileId()` to remove invalid Windows path characters
    - Implement `ensureValidPath()` to handle spaces and Unicode
    - Implement `resolveDataPath()` for consistent data directory resolution
    - _Requirements: 3.2, 3.3, 3.4_
  - [ ]* 1.2 Write property tests for path utilities
    - **Property 2: Path Special Character Handling**
    - **Property 3: Profile ID Sanitization**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 2. Create Windows browser detector
  - [x] 2.1 Create `utils/browser-detector.js`
    - Implement `detectChrome()` with Windows paths
    - Implement `detectFirefox()` with Windows paths
    - Implement `detectEdge()` for Microsoft Edge
    - Implement path caching mechanism
    - Implement `validatePath()` to check executable exists
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 2.2 Write property tests for browser detector
    - **Property 1: Browser Path Detection Correctness**
    - **Property 10: Browser Cache Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

- [x] 3. Create dependency validator
  - [x] 3.1 Create `utils/dependency-validator.js`
    - Implement `validateNodeVersion()` with semver comparison
    - Implement `validateNativeModules()` to check better-sqlite3
    - Implement `validateAll()` to run all checks
    - Implement `suggestFix()` to generate fix commands
    - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 3.2 Write property tests for dependency validator
    - **Property 4: Node.js Version Comparison**
    - **Property 5: Module Validation Completeness**
    - **Validates: Requirements 4.1, 5.1, 5.4, 5.5**

- [x] 4. Checkpoint - Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Update mode-switcher for Windows compatibility
  - [x] 5.1 Modify `config/mode-switcher.js` ✅
    - Replace `which` command with browser-detector for Windows
    - Add platform detection logic
    - Update `checkChromeAvailability()` for Windows
    - Update `checkFirefoxAvailability()` for Windows
    - Add detailed unavailability messages
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]* 5.2 Write property tests for mode-switcher Windows support
    - **Property 9: Windows Browser Detection Compatibility**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 6. Update puppeteer config for Windows
  - [x] 6.1 Modify `config/puppeteer.js`
    - Import and use browser-detector
    - Add Windows path detection in `getBrowserExecutablePath()`
    - Add fallback to Puppeteer bundled Chromium
    - _Requirements: 2.3, 2.5_

- [-] 7. Enhance error handling and logging
  - [x] 7.1 Create `utils/startup-logger.js`
    - Implement startup log file creation
    - Implement diagnostic information collection
    - Implement user-friendly error message formatting
    - _Requirements: 7.1, 7.2, 7.5_
  - [x] 7.2 Update `server.js` with startup validation
    - Add dependency validation on startup
    - Add browser detection logging
    - Add error categorization for browser launch failures
    - _Requirements: 5.1, 7.3, 7.4_
  - [ ]* 7.3 Write property tests for error handling
    - **Property 7: Error Logging Completeness**
    - **Property 8: Browser Error Categorization**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

- [x] 8. Checkpoint - Ensure all core functionality tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create installation marker system
  - [x] 9.1 Implement marker file creation in dependency-validator
    - Create `.installed_ok` marker after successful install
    - Include platform, Node version, and timestamp
    - Implement marker file reading and validation
    - _Requirements: 1.4, 6.5_
  - [ ]* 9.2 Write property tests for marker system
    - **Property 6: Installation Marker Round-Trip**
    - **Validates: Requirements 1.4, 6.5**

- [x] 10. Update launcher scripts
  - [x] 10.1 Rewrite `Start-BrowserShield.bat`
    - Add Node.js version check (>= 18.0.0)
    - Add proper path quoting for spaces
    - Add UTF-8 encoding setup
    - Add native module rebuild check
    - Add clear Vietnamese error messages
    - Add port-in-use detection
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.5, 4.6_
  - [x] 10.2 Create `Fix-Dependencies.bat`
    - Remove node_modules directory
    - Clear npm cache
    - Reinstall dependencies
    - Rebuild native modules
    - _Requirements: 6.4_
  - [x] 10.3 Update `Start-BrowserShield.ps1`
    - Add same improvements as batch file
    - Add execution policy handling
    - _Requirements: 4.1, 4.2_

- [x] 11. Update build scripts
  - [x] 11.1 Modify `scripts/build-portable.js`
    - Ensure node_modules is NOT included
    - Add Fix-Dependencies.bat to package
    - Update README with troubleshooting
    - _Requirements: 6.1, 6.4, 6.6_
  - [x] 11.2 Update `scripts/build-portable-with-nodejs.bat`
    - Ensure proper version in output filename
    - Add validation step after build
    - _Requirements: 6.2, 6.3_

- [-] 12. Final checkpoint - Full integration test
  - Ensure all tests pass, ask the user if questions arise.
  - Test portable package creation
  - Test first-run experience simulation

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
