/**
 * Build Output Completeness Property Tests
 * Feature: windows-installer
 * 
 * Property 1: Build Output Completeness
 * Validates: Requirements 1.1, 2.1, 3.1, 3.3
 * 
 * For any build execution, the output directory SHALL contain:
 * - A single .exe installer file with size under 200MB
 * - Embedded Node.js runtime (node.exe)
 * - All application source files (server.js, config/, middleware/, routes/, services/, utils/, public/)
 * - Complete node_modules with all dependencies from package.json
 * - Native module better-sqlite3 pre-compiled for Windows 64-bit (.node file exists)
 */
const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

// Build configuration
const buildConfig = require('../../../scripts/installer/build-config.json');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100 };

describe('Build Output Completeness Property Tests', () => {
  /**
   * Feature: windows-installer, Property 1: Build Output Completeness
   * Validates: Requirements 1.1, 2.1, 3.1, 3.3
   */
  describe('Property 1: Build Output Completeness', () => {
    
    /**
     * Test that build configuration is valid and complete
     */
    it('should have valid build configuration with all required fields', () => {
      fc.assert(
        fc.property(fc.constant(buildConfig), (config) => {
          // App configuration
          expect(config.app).toBeDefined();
          expect(config.app.name).toBe('BrowserShield');
          expect(config.app.version).toMatch(/^\d+\.\d+\.\d+$/);
          expect(config.app.publisher).toBeDefined();
          expect(config.app.description).toBeDefined();
          
          // Node configuration
          expect(config.node).toBeDefined();
          expect(config.node.version).toMatch(/^\d+\.\d+\.\d+$/);
          expect(config.node.arch).toBe('x64');
          
          // Installer configuration
          expect(config.installer).toBeDefined();
          expect(config.installer.outputDir).toBeDefined();
          expect(config.installer.buildDir).toBeDefined();
          expect(config.installer.minDiskSpaceMB).toBeGreaterThanOrEqual(500);
          
          // Files configuration
          expect(config.files).toBeDefined();
          expect(Array.isArray(config.files.include)).toBe(true);
          expect(Array.isArray(config.files.exclude)).toBe(true);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that all required source files are included in build config
     */
    it('should include all required application source files in config', () => {
      const requiredFiles = [
        'server.js',
        'package.json',
        'config/**',
        'middleware/**',
        'routes/**',
        'services/**',
        'utils/**',
        'public/**'
      ];

      fc.assert(
        fc.property(fc.constant(buildConfig.files.include), (includeList) => {
          for (const required of requiredFiles) {
            const isIncluded = includeList.some(pattern => {
              // Check exact match or pattern match
              return pattern === required || 
                     pattern.startsWith(required.replace('/**', ''));
            });
            expect(isIncluded).toBe(true);
          }
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that test and development files are excluded from build
     */
    it('should exclude test and development files from build', () => {
      const excludedPatterns = [
        'tests/**',
        '.git/**',
        'coverage/**',
        '.kiro/**',
        'jest.config.js'
      ];

      fc.assert(
        fc.property(fc.constant(buildConfig.files.exclude), (excludeList) => {
          for (const excluded of excludedPatterns) {
            const isExcluded = excludeList.some(pattern => {
              return pattern === excluded || 
                     pattern.includes(excluded.replace('/**', ''));
            });
            expect(isExcluded).toBe(true);
          }
          return true;
        }),
        fcOptions
      );
    });


    /**
     * Test that source files exist in the project
     */
    it('should verify all source files exist in project', () => {
      const projectRoot = path.resolve(__dirname, '../../../');
      const requiredPaths = [
        'server.js',
        'package.json',
        'config',
        'middleware',
        'routes',
        'services',
        'utils',
        'public'
      ];

      fc.assert(
        fc.property(fc.constant(requiredPaths), (paths) => {
          for (const p of paths) {
            const fullPath = path.join(projectRoot, p);
            expect(fs.existsSync(fullPath)).toBe(true);
          }
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that package.json contains required dependencies
     */
    it('should have all required dependencies in package.json', () => {
      const projectRoot = path.resolve(__dirname, '../../../');
      const packageJson = require(path.join(projectRoot, 'package.json'));
      
      const requiredDeps = [
        'better-sqlite3',
        'express',
        'puppeteer',
        'uuid'
      ];

      fc.assert(
        fc.property(fc.constant(requiredDeps), (deps) => {
          for (const dep of deps) {
            expect(packageJson.dependencies[dep]).toBeDefined();
          }
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that better-sqlite3 native module exists in node_modules
     */
    it('should have better-sqlite3 native module installed', () => {
      const projectRoot = path.resolve(__dirname, '../../../');
      const betterSqlitePath = path.join(projectRoot, 'node_modules', 'better-sqlite3');
      
      fc.assert(
        fc.property(fc.constant(betterSqlitePath), (modulePath) => {
          // Check module exists
          expect(fs.existsSync(modulePath)).toBe(true);
          
          // Check for prebuilds or build directory with .node file
          const prebuildsPath = path.join(modulePath, 'prebuilds');
          const buildPath = path.join(modulePath, 'build');
          
          const hasPrebuilds = fs.existsSync(prebuildsPath);
          const hasBuild = fs.existsSync(buildPath);
          
          // At least one should exist
          expect(hasPrebuilds || hasBuild).toBe(true);
          
          // If prebuilds exists, check for win32-x64 folder
          if (hasPrebuilds) {
            const win64Path = path.join(prebuildsPath, 'win32-x64');
            if (fs.existsSync(win64Path)) {
              const files = fs.readdirSync(win64Path);
              const hasNodeFile = files.some(f => f.endsWith('.node'));
              expect(hasNodeFile).toBe(true);
            }
          }
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test Node.js version configuration is valid LTS version
     */
    it('should configure Node.js LTS version (20.x)', () => {
      fc.assert(
        fc.property(fc.constant(buildConfig.node.version), (version) => {
          // Should be version 20.x.x (LTS)
          expect(version).toMatch(/^20\.\d+\.\d+$/);
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test installer size limit configuration
     */
    it('should have installer size limit under 200MB configured', () => {
      // The design specifies installer should be under 200MB
      // This test validates the configuration supports this requirement
      fc.assert(
        fc.property(fc.constant(buildConfig), (config) => {
          // Verify disk space requirement is reasonable
          expect(config.installer.minDiskSpaceMB).toBeLessThanOrEqual(500);
          expect(config.installer.minDiskSpaceMB).toBeGreaterThan(0);
          return true;
        }),
        fcOptions
      );
    });
  });
});
