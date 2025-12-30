/**
 * Dependency Validator
 * Validates all dependencies on startup and provides fix suggestions
 * 
 * Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 5.5
 */

const path = require('path');
const fs = require('fs');

// Minimum required Node.js version
const MIN_NODE_VERSION = '18.0.0';

// Required native modules that need platform-specific compilation
const NATIVE_MODULES = ['better-sqlite3'];

// All required modules for the application
const REQUIRED_MODULES = [
    'express',
    'cors',
    'better-sqlite3',
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'swagger-jsdoc',
    'swagger-ui-express',
    'uuid',
    'zod'
];

/**
 * Parse a version string into components
 * @param {string} versionStr - Version string (e.g., "v18.17.0" or "18.17.0")
 * @returns {{major: number, minor: number, patch: number}} Version components
 */
function parseVersion(versionStr) {
    if (!versionStr || typeof versionStr !== 'string') {
        throw new Error('Version string must be a non-empty string');
    }
    
    // Remove leading 'v' if present
    const cleanVersion = versionStr.replace(/^v/i, '');
    
    // Split by dots and parse
    const parts = cleanVersion.split('.');
    
    if (parts.length < 1) {
        throw new Error(`Invalid version format: ${versionStr}`);
    }
    
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1] || '0', 10);
    const patch = parseInt(parts[2] || '0', 10);
    
    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
        throw new Error(`Invalid version format: ${versionStr}`);
    }
    
    return { major, minor, patch };
}

/**
 * Compare two version strings
 * @param {string} version1 - First version string
 * @param {string} version2 - Second version string
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(version1, version2) {
    const v1 = parseVersion(version1);
    const v2 = parseVersion(version2);
    
    if (v1.major !== v2.major) {
        return v1.major > v2.major ? 1 : -1;
    }
    if (v1.minor !== v2.minor) {
        return v1.minor > v2.minor ? 1 : -1;
    }
    if (v1.patch !== v2.patch) {
        return v1.patch > v2.patch ? 1 : -1;
    }
    return 0;
}

/**
 * Validate Node.js version meets minimum requirement
 * @param {string} [minVersion] - Minimum required version (default: MIN_NODE_VERSION)
 * @returns {{valid: boolean, currentVersion: string, requiredVersion: string, message: string}}
 * 
 * Requirements: 4.1
 */
function validateNodeVersion(minVersion = MIN_NODE_VERSION) {
    const currentVersion = process.version;
    const comparison = compareVersions(currentVersion, minVersion);
    const valid = comparison >= 0;
    
    return {
        valid,
        currentVersion,
        requiredVersion: minVersion,
        message: valid 
            ? `Node.js ${currentVersion} meets requirement (>= ${minVersion})`
            : `Node.js ${currentVersion} is below minimum required version ${minVersion}`
    };
}


/**
 * Check if a module can be loaded
 * @param {string} moduleName - Name of the module to check
 * @returns {{name: string, loaded: boolean, error: string|null, isNative: boolean}}
 * 
 * Requirements: 5.1, 5.2
 */
function checkModuleLoadable(moduleName) {
    const isNative = NATIVE_MODULES.includes(moduleName);
    
    try {
        require.resolve(moduleName);
        // Try to actually load the module to catch native binding errors
        require(moduleName);
        
        return {
            name: moduleName,
            loaded: true,
            error: null,
            isNative
        };
    } catch (error) {
        return {
            name: moduleName,
            loaded: false,
            error: error.message,
            isNative
        };
    }
}

/**
 * Validate all native modules can be loaded
 * Specifically checks for better-sqlite3 native binding compatibility
 * @returns {Promise<{valid: boolean, modules: Array, nativeErrors: Array}>}
 * 
 * Requirements: 5.3
 */
async function validateNativeModules() {
    const results = [];
    const nativeErrors = [];
    
    for (const moduleName of NATIVE_MODULES) {
        const result = checkModuleLoadable(moduleName);
        results.push(result);
        
        if (!result.loaded) {
            nativeErrors.push({
                module: moduleName,
                error: result.error,
                suggestion: suggestFix(new Error(result.error), moduleName)
            });
        }
    }
    
    return {
        valid: nativeErrors.length === 0,
        modules: results,
        nativeErrors
    };
}

/**
 * Validate all required modules can be loaded
 * @returns {Promise<{valid: boolean, modules: Array, errors: Array}>}
 * 
 * Requirements: 5.1, 5.4
 */
async function validateAllModules() {
    const results = [];
    const errors = [];
    
    for (const moduleName of REQUIRED_MODULES) {
        const result = checkModuleLoadable(moduleName);
        results.push(result);
        
        if (!result.loaded) {
            errors.push({
                module: moduleName,
                error: result.error,
                isNative: result.isNative,
                suggestion: suggestFix(new Error(result.error), moduleName)
            });
        }
    }
    
    return {
        valid: errors.length === 0,
        modules: results,
        errors
    };
}

/**
 * Generate a fix suggestion based on the error type
 * @param {Error} error - The error that occurred
 * @param {string} [moduleName] - The module that caused the error (optional)
 * @returns {string} Suggested fix command or instructions
 * 
 * Requirements: 5.4
 */
function suggestFix(error, moduleName = null) {
    const errorMessage = error.message.toLowerCase();
    const isWindows = process.platform === 'win32';
    
    // Native module binding error
    if (errorMessage.includes('was compiled against a different node.js version') ||
        errorMessage.includes('node_modules') && errorMessage.includes('.node') ||
        errorMessage.includes('cannot find module') && moduleName && NATIVE_MODULES.includes(moduleName)) {
        
        if (isWindows) {
            return 'Chạy Fix-Dependencies.bat để rebuild native modules, hoặc chạy: npm rebuild';
        }
        return 'Run: npm rebuild';
    }
    
    // Module not found
    if (errorMessage.includes('cannot find module') || errorMessage.includes('module not found')) {
        if (isWindows) {
            return `Chạy: npm install ${moduleName || ''} hoặc chạy Fix-Dependencies.bat`;
        }
        return `Run: npm install ${moduleName || ''}`;
    }
    
    // Permission error
    if (errorMessage.includes('eacces') || errorMessage.includes('permission denied')) {
        if (isWindows) {
            return 'Chạy Command Prompt với quyền Administrator';
        }
        return 'Run with elevated permissions: sudo npm install';
    }
    
    // Network error
    if (errorMessage.includes('enotfound') || errorMessage.includes('network')) {
        return 'Kiểm tra kết nối internet và thử lại / Check internet connection and retry';
    }
    
    // Generic suggestion
    if (isWindows) {
        return 'Chạy Fix-Dependencies.bat để sửa lỗi dependencies';
    }
    return 'Try: rm -rf node_modules && npm install';
}


/**
 * Run all validation checks
 * @returns {Promise<{success: boolean, nodeVersion: Object, modules: Object, errors: Array, warnings: Array, suggestions: Array}>}
 * 
 * Requirements: 5.1, 5.5
 */
async function validateAll() {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    // Check Node.js version
    const nodeVersionResult = validateNodeVersion();
    if (!nodeVersionResult.valid) {
        errors.push({
            type: 'NODE_VERSION',
            message: nodeVersionResult.message,
            details: {
                current: nodeVersionResult.currentVersion,
                required: nodeVersionResult.requiredVersion
            }
        });
        suggestions.push(`Cập nhật Node.js lên phiên bản ${MIN_NODE_VERSION} hoặc cao hơn từ https://nodejs.org`);
    }
    
    // Check native modules
    const nativeModulesResult = await validateNativeModules();
    if (!nativeModulesResult.valid) {
        for (const nativeError of nativeModulesResult.nativeErrors) {
            errors.push({
                type: 'NATIVE_MODULE',
                message: `Module native '${nativeError.module}' không thể load: ${nativeError.error}`,
                details: {
                    module: nativeError.module,
                    error: nativeError.error
                }
            });
            suggestions.push(nativeError.suggestion);
        }
    }
    
    // Check all required modules
    const allModulesResult = await validateAllModules();
    if (!allModulesResult.valid) {
        for (const moduleError of allModulesResult.errors) {
            // Skip if already reported as native module error
            if (moduleError.isNative && !nativeModulesResult.valid) {
                continue;
            }
            
            errors.push({
                type: 'MODULE_LOAD',
                message: `Module '${moduleError.module}' không thể load: ${moduleError.error}`,
                details: {
                    module: moduleError.module,
                    error: moduleError.error
                }
            });
            suggestions.push(moduleError.suggestion);
        }
    }
    
    // Add platform-specific warnings
    if (process.platform === 'win32') {
        // Check if running from a path with spaces
        if (__dirname.includes(' ')) {
            warnings.push('Đường dẫn cài đặt chứa dấu cách, có thể gây vấn đề với một số công cụ');
        }
        
        // Check for very long paths
        if (__dirname.length > 200) {
            warnings.push('Đường dẫn cài đặt quá dài, có thể gây vấn đề với Windows MAX_PATH');
        }
    }
    
    // Remove duplicate suggestions
    const uniqueSuggestions = [...new Set(suggestions)];
    
    return {
        success: errors.length === 0,
        nodeVersion: nodeVersionResult,
        modules: {
            native: nativeModulesResult,
            all: allModulesResult
        },
        errors,
        warnings,
        suggestions: uniqueSuggestions
    };
}

/**
 * Get a formatted validation report for logging
 * @param {Object} validationResult - Result from validateAll()
 * @returns {string} Formatted report string
 */
function formatValidationReport(validationResult) {
    const lines = [];
    
    lines.push('=== BrowserShield Dependency Validation ===');
    lines.push(`Platform: ${process.platform} (${process.arch})`);
    lines.push(`Node.js: ${validationResult.nodeVersion.currentVersion}`);
    lines.push(`Status: ${validationResult.success ? 'OK' : 'FAILED'}`);
    lines.push('');
    
    if (validationResult.errors.length > 0) {
        lines.push('ERRORS:');
        for (const error of validationResult.errors) {
            lines.push(`  - [${error.type}] ${error.message}`);
        }
        lines.push('');
    }
    
    if (validationResult.warnings.length > 0) {
        lines.push('WARNINGS:');
        for (const warning of validationResult.warnings) {
            lines.push(`  - ${warning}`);
        }
        lines.push('');
    }
    
    if (validationResult.suggestions.length > 0) {
        lines.push('SUGGESTIONS:');
        for (const suggestion of validationResult.suggestions) {
            lines.push(`  - ${suggestion}`);
        }
        lines.push('');
    }
    
    lines.push('==========================================');
    
    return lines.join('\n');
}

/**
 * Create installation marker file after successful validation
 * @param {string} [markerPath] - Path to marker file (default: node_modules/.installed_ok)
 * @returns {{success: boolean, path: string, error: string|null}}
 */
function createInstallationMarker(markerPath = null) {
    const defaultPath = path.join(__dirname, '..', 'node_modules', '.installed_ok');
    const targetPath = markerPath || defaultPath;
    
    const markerData = {
        installedAt: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        nativeModulesRebuilt: true
    };
    
    try {
        fs.writeFileSync(targetPath, JSON.stringify(markerData, null, 2), 'utf8');
        return {
            success: true,
            path: targetPath,
            error: null
        };
    } catch (error) {
        return {
            success: false,
            path: targetPath,
            error: error.message
        };
    }
}

/**
 * Read installation marker file
 * @param {string} [markerPath] - Path to marker file (default: node_modules/.installed_ok)
 * @returns {{exists: boolean, data: Object|null, error: string|null}}
 */
function readInstallationMarker(markerPath = null) {
    const defaultPath = path.join(__dirname, '..', 'node_modules', '.installed_ok');
    const targetPath = markerPath || defaultPath;
    
    try {
        if (!fs.existsSync(targetPath)) {
            return {
                exists: false,
                data: null,
                error: null
            };
        }
        
        const content = fs.readFileSync(targetPath, 'utf8');
        const data = JSON.parse(content);
        
        return {
            exists: true,
            data,
            error: null
        };
    } catch (error) {
        return {
            exists: false,
            data: null,
            error: error.message
        };
    }
}

/**
 * Check if installation marker is valid for current environment
 * @param {string} [markerPath] - Path to marker file
 * @returns {{valid: boolean, reason: string|null}}
 */
function validateInstallationMarker(markerPath = null) {
    const marker = readInstallationMarker(markerPath);
    
    if (!marker.exists) {
        return {
            valid: false,
            reason: 'Installation marker not found - first run or dependencies need reinstall'
        };
    }
    
    if (marker.error) {
        return {
            valid: false,
            reason: `Failed to read marker: ${marker.error}`
        };
    }
    
    // Check if platform matches
    if (marker.data.platform !== process.platform) {
        return {
            valid: false,
            reason: `Platform mismatch: installed on ${marker.data.platform}, running on ${process.platform}`
        };
    }
    
    // Check if architecture matches
    if (marker.data.arch !== process.arch) {
        return {
            valid: false,
            reason: `Architecture mismatch: installed on ${marker.data.arch}, running on ${process.arch}`
        };
    }
    
    // Check if Node.js major version matches (native modules are version-specific)
    const installedMajor = parseVersion(marker.data.nodeVersion).major;
    const currentMajor = parseVersion(process.version).major;
    
    if (installedMajor !== currentMajor) {
        return {
            valid: false,
            reason: `Node.js major version mismatch: installed with v${installedMajor}.x, running v${currentMajor}.x`
        };
    }
    
    return {
        valid: true,
        reason: null
    };
}

module.exports = {
    // Version utilities
    parseVersion,
    compareVersions,
    validateNodeVersion,
    
    // Module validation
    checkModuleLoadable,
    validateNativeModules,
    validateAllModules,
    
    // Main validation
    validateAll,
    formatValidationReport,
    suggestFix,
    
    // Installation marker
    createInstallationMarker,
    readInstallationMarker,
    validateInstallationMarker,
    
    // Constants (exported for testing)
    MIN_NODE_VERSION,
    NATIVE_MODULES,
    REQUIRED_MODULES
};
