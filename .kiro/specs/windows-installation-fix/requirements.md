# Requirements Document

## Introduction

Tài liệu này mô tả các yêu cầu để khắc phục các vấn đề khi cài đặt BrowserShield trên máy Windows 10/11 khác. Sau khi phân tích toàn diện codebase, đã xác định được nhiều vấn đề tiềm ẩn liên quan đến native modules, path handling, browser detection, và portable deployment.

## Glossary

- **BrowserShield**: Ứng dụng quản lý browser profiles anti-detect
- **Portable_Package**: Bản đóng gói có thể chạy trực tiếp không cần cài đặt
- **Native_Module**: Module Node.js cần compile cho từng hệ điều hành (better-sqlite3)
- **Browser_Executable**: File thực thi của Chrome/Firefox
- **User_Data_Directory**: Thư mục lưu trữ profile browser
- **Launcher_Script**: Script khởi động ứng dụng (.bat, .ps1)

## Các Vấn Đề Đã Xác Định

### Vấn đề 1: Native Module Compatibility (better-sqlite3)
- `better-sqlite3` là native module cần compile cho từng OS/architecture
- Khi copy node_modules từ máy này sang máy khác có thể gây lỗi
- Cần rebuild native modules trên máy đích

### Vấn đề 2: Browser Executable Detection
- `config/puppeteer.js` chỉ check paths Linux (`/usr/bin/...`)
- Không có logic detect Chrome/Firefox trên Windows
- `config/mode-switcher.js` dùng `which` command (không có trên Windows)

### Vấn đề 3: Path Handling
- Một số paths dùng forward slash `/` thay vì `path.join()`
- Escape characters trong batch files có thể gây lỗi
- Đường dẫn có dấu tiếng Việt hoặc spaces có thể gây vấn đề

### Vấn đề 4: Launcher Scripts
- Batch file có syntax phức tạp dễ lỗi
- Không handle tốt các edge cases (Node.js version cũ, npm errors)
- PowerShell execution policy có thể block scripts

### Vấn đề 5: First-Run Experience
- Dependencies install có thể fail silently
- Không có validation sau khi install
- Error messages không rõ ràng cho user

## Requirements

### Requirement 1: Native Module Rebuild

**User Story:** As a user, I want the application to automatically rebuild native modules on first run, so that I can use the app on any Windows machine without manual compilation.

#### Acceptance Criteria

1. WHEN the application starts for the first time on a new machine, THE Launcher_Script SHALL check if native modules need rebuilding
2. WHEN native modules are incompatible, THE Launcher_Script SHALL automatically run `npm rebuild` before starting the server
3. IF `npm rebuild` fails, THEN THE Launcher_Script SHALL display a clear error message with troubleshooting steps
4. WHEN rebuild is successful, THE Launcher_Script SHALL create a marker file to skip rebuild on subsequent runs

### Requirement 2: Windows Browser Detection

**User Story:** As a user, I want the application to automatically detect installed browsers on Windows, so that I can use Chrome or Firefox without manual configuration.

#### Acceptance Criteria

1. THE Browser_Detection_Module SHALL check common Windows installation paths for Chrome:
   - `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
   - `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`
2. THE Browser_Detection_Module SHALL check common Windows installation paths for Firefox:
   - `C:\Program Files\Mozilla Firefox\firefox.exe`
   - `C:\Program Files (x86)\Mozilla Firefox\firefox.exe`
3. WHEN no browser is found, THE System SHALL fall back to Puppeteer's bundled Chromium
4. THE Browser_Detection_Module SHALL cache detected browser paths to avoid repeated filesystem checks
5. WHEN a browser path is configured, THE System SHALL validate the path exists before using it

### Requirement 3: Cross-Platform Path Handling

**User Story:** As a developer, I want all file paths to be handled correctly on Windows, so that the application works regardless of installation location.

#### Acceptance Criteria

1. THE System SHALL use `path.join()` for all file path construction
2. THE System SHALL handle paths with spaces correctly
3. THE System SHALL handle paths with Unicode characters (including Vietnamese)
4. WHEN creating User_Data_Directory paths, THE System SHALL sanitize profile IDs to remove invalid characters
5. THE System SHALL use `path.resolve()` for converting relative paths to absolute paths

### Requirement 4: Robust Launcher Scripts

**User Story:** As a user, I want reliable launcher scripts that handle errors gracefully, so that I can start the application without technical knowledge.

#### Acceptance Criteria

1. THE Launcher_Script SHALL verify Node.js version is 18.0.0 or higher
2. IF Node.js is not installed, THEN THE Launcher_Script SHALL provide clear installation instructions
3. THE Launcher_Script SHALL handle paths with spaces by using proper quoting
4. WHEN `npm install` fails, THE Launcher_Script SHALL display the error and suggest solutions
5. THE Launcher_Script SHALL set proper console encoding (UTF-8) for Vietnamese text display
6. IF port 5000 is in use, THEN THE Launcher_Script SHALL suggest alternative ports

### Requirement 5: Dependency Validation

**User Story:** As a user, I want the application to validate all dependencies on startup, so that I know immediately if something is missing.

#### Acceptance Criteria

1. WHEN the server starts, THE System SHALL validate that all required modules are loadable
2. IF a module fails to load, THEN THE System SHALL display a specific error message identifying the module
3. THE System SHALL check for `better-sqlite3` native binding compatibility
4. WHEN validation fails, THE System SHALL provide a command to fix the issue
5. THE System SHALL log validation results for debugging

### Requirement 6: Portable Package Improvements

**User Story:** As a user, I want a portable package that works out-of-the-box on any Windows 10/11 machine, so that I can use the application without complex setup.

#### Acceptance Criteria

1. THE Build_Script SHALL NOT include pre-compiled node_modules in the portable package
2. THE Portable_Package SHALL include embedded Node.js runtime (optional)
3. THE Launcher_Script SHALL install dependencies on first run with progress indication
4. THE Portable_Package SHALL include a `Fix-Dependencies.bat` script for troubleshooting
5. WHEN dependencies are installed successfully, THE System SHALL create a `.installed_ok` marker file
6. THE Portable_Package SHALL include clear README with troubleshooting guide

### Requirement 7: Error Handling and Logging

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can troubleshoot issues or report them effectively.

#### Acceptance Criteria

1. WHEN a startup error occurs, THE System SHALL log the full error stack to a file
2. THE System SHALL display user-friendly error messages in the console
3. IF database initialization fails, THEN THE System SHALL suggest checking file permissions
4. IF browser launch fails, THEN THE System SHALL indicate whether it's a browser or configuration issue
5. THE System SHALL create a `startup.log` file with diagnostic information

### Requirement 8: Mode Switcher Windows Compatibility

**User Story:** As a user, I want the mode switcher to correctly detect available browsers on Windows, so that I can choose between Mock, Chrome, and Firefox modes.

#### Acceptance Criteria

1. THE Mode_Switcher SHALL use Windows-compatible commands for browser detection
2. WHEN checking Chrome availability on Windows, THE Mode_Switcher SHALL check registry and common paths
3. WHEN checking Firefox availability on Windows, THE Mode_Switcher SHALL check registry and common paths
4. THE Mode_Switcher SHALL return accurate availability status for each mode
5. IF a mode is unavailable, THEN THE Mode_Switcher SHALL explain why and how to enable it
