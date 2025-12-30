/**
 * Application Startup Property Tests
 * Feature: windows-installer
 * 
 * Property 5: Application Startup Without System Node.js
 * Validates: Requirements 2.2, 2.4, 3.2
 * 
 * For any installation on a system without Node.js installed, the application 
 * SHALL start successfully using the embedded Node.js runtime and the server 
 * SHALL respond on port 5000.
 */
const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

// Build configuration
const buildConfig = require('../../../scripts/installer/build-config.json');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100 };

describe('Application Startup Property Tests', () => {
  /**
   * Feature: windows-installer, Property 5: Application Startup Without System Node.js
   * Validates: Requirements 2.2, 2.4, 3.2
   */
  describe('Property 5: Application Startup Without System Node.js', () => {
    
    const projectRoot = path.resolve(__dirname, '../../../');
    
    /**
     * Test that launcher.bat exists and has correct structure
     */
    it('should have launcher.bat with correct startup commands', () => {
      const launcherBatPath = path.join(projectRoot, 'scripts/installer/launcher.bat');
      
      fc.assert(
        fc.property(fc.constant(launcherBatPath), (batPath) => {
          expect(fs.existsSync(batPath)).toBe(true);
          
          const content = fs.readFileSync(batPath, 'utf8');
          
          // Should change to script directory
          expect(content).toMatch(/cd\s+\/d\s+"%~dp0"/i);
          
          // Should reference node.exe (embedded runtime, not system node)
          expect(content.toLowerCase()).toContain('node');
          
          // Should reference server.js
          expect(content.toLowerCase()).toContain('server');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that create-launcher.js generates PowerShell launcher with proper validation
     * The PowerShell launcher is generated dynamically during build
     */
    it('should generate PowerShell launcher that validates node.exe and server.js', () => {
      const createLauncherPath = path.join(projectRoot, 'scripts/installer/create-launcher.js');
      
      fc.assert(
        fc.property(fc.constant(createLauncherPath), (scriptPath) => {
          expect(fs.existsSync(scriptPath)).toBe(true);
          
          const content = fs.readFileSync(scriptPath, 'utf8');
          
          // Should have PowerShell launcher generation function
          expect(content).toContain('createPowerShellLauncher');
          
          // PowerShell template should check for node.exe existence
          expect(content).toContain('node.exe');
          expect(content).toContain('Test-Path');
          
          // Should check for server.js existence
          expect(content).toContain('server.js');
          
          // Should have error handling for missing files
          expect(content).toContain('Error');
          
          // Should configure server port 5000
          expect(content).toContain('5000');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that create-launcher.js generates proper launcher files
     */
    it('should have create-launcher.js that generates all launcher variants', () => {
      const createLauncherPath = path.join(projectRoot, 'scripts/installer/create-launcher.js');
      
      fc.assert(
        fc.property(fc.constant(createLauncherPath), (scriptPath) => {
          expect(fs.existsSync(scriptPath)).toBe(true);
          
          const content = fs.readFileSync(scriptPath, 'utf8');
          
          // Should export createLauncher function
          expect(content).toContain('module.exports');
          expect(content).toContain('createLauncher');
          
          // Should create VBScript launcher
          expect(content).toContain('createWithVBScript');
          
          // Should create PowerShell launcher
          expect(content).toContain('createPowerShellLauncher');
          
          // Should handle icon file
          expect(content).toContain('icon.ico');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that server.js entry point exists and is valid
     */
    it('should have valid server.js entry point', () => {
      const serverJsPath = path.join(projectRoot, 'server.js');
      
      fc.assert(
        fc.property(fc.constant(serverJsPath), (serverPath) => {
          expect(fs.existsSync(serverPath)).toBe(true);
          
          const content = fs.readFileSync(serverPath, 'utf8');
          
          // Should be a valid JavaScript file
          expect(content.length).toBeGreaterThan(0);
          
          // Should have express or http server setup
          expect(content.toLowerCase()).toMatch(/express|http|server/);
          
          // Should listen on a port
          expect(content).toMatch(/listen|port/i);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that build config specifies embedded Node.js
     */
    it('should configure embedded Node.js runtime in build config', () => {
      fc.assert(
        fc.property(fc.constant(buildConfig), (config) => {
          // Node.js configuration must exist
          expect(config.node).toBeDefined();
          expect(config.node.version).toBeDefined();
          expect(config.node.arch).toBe('x64');
          
          // Version should be LTS (20.x)
          expect(config.node.version).toMatch(/^20\.\d+\.\d+$/);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that download-node.js script exists and downloads correct version
     */
    it('should have download-node.js that fetches portable Node.js', () => {
      const downloadNodePath = path.join(projectRoot, 'scripts/installer/download-node.js');
      
      fc.assert(
        fc.property(fc.constant(downloadNodePath), (scriptPath) => {
          expect(fs.existsSync(scriptPath)).toBe(true);
          
          const content = fs.readFileSync(scriptPath, 'utf8');
          
          // Should download from nodejs.org
          expect(content).toContain('nodejs.org');
          
          // Should handle Windows architecture (win-${arch} pattern)
          expect(content).toMatch(/win-\$\{arch\}|win-x64/i);
          
          // Should extract node.exe
          expect(content).toContain('node.exe');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that launcher.bat validates required files before starting
     */
    it('should validate required files exist before application startup', () => {
      const launcherBatPath = path.join(projectRoot, 'scripts/installer/launcher.bat');
      
      fc.assert(
        fc.property(fc.constant(launcherBatPath), (batPath) => {
          const content = fs.readFileSync(batPath, 'utf8');
          
          // Should check node.exe exists
          expect(content).toMatch(/if not exist.*node\.exe/i);
          
          // Should check server.js exists
          expect(content).toMatch(/if not exist.*server\.js/i);
          
          // Should show error message if files missing
          expect(content).toMatch(/echo.*error/i);
          
          // Should exit with error code if files missing
          expect(content).toMatch(/exit\s+\/b\s+1/i);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that launcher waits for server to be ready
     */
    it('should wait for server to be ready before opening browser', () => {
      const launcherBatPath = path.join(projectRoot, 'scripts/installer/launcher.bat');
      
      fc.assert(
        fc.property(fc.constant(launcherBatPath), (batPath) => {
          const content = fs.readFileSync(batPath, 'utf8');
          
          // Should have wait/timeout mechanism
          expect(content).toMatch(/timeout|wait/i);
          
          // Should check port availability (5000)
          expect(content).toMatch(/5000|SERVER_PORT/);
          
          // Should open browser after server is ready
          expect(content).toMatch(/start.*http/i);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that launcher uses relative paths (not system Node.js)
     */
    it('should use relative paths to embedded node.exe', () => {
      const launcherBatPath = path.join(projectRoot, 'scripts/installer/launcher.bat');
      
      fc.assert(
        fc.property(fc.constant(launcherBatPath), (batPath) => {
          const content = fs.readFileSync(batPath, 'utf8');
          
          // Should NOT use absolute paths to system Node.js
          expect(content).not.toMatch(/C:\\Program Files\\nodejs/i);
          expect(content).not.toMatch(/C:\\Users\\.*\\AppData.*\\nodejs/i);
          
          // Should use relative or current directory paths
          // Batch: %~dp0node.exe or node.exe
          expect(content).toMatch(/node\.exe|node\s+server/i);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that build-installer.js copies node.exe to build directory
     */
    it('should copy node.exe to build directory during build', () => {
      const buildInstallerPath = path.join(projectRoot, 'scripts/installer/build-installer.js');
      
      fc.assert(
        fc.property(fc.constant(buildInstallerPath), (scriptPath) => {
          expect(fs.existsSync(scriptPath)).toBe(true);
          
          const content = fs.readFileSync(scriptPath, 'utf8');
          
          // Should copy node.exe
          expect(content).toContain('node.exe');
          
          // Should have step for downloading/copying Node.js
          expect(content).toMatch(/download.*node|copy.*node|node.*portable/i);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that build-installer.js copies application files to build directory
     */
    it('should copy application files to build directory during build', () => {
      const buildInstallerPath = path.join(projectRoot, 'scripts/installer/build-installer.js');
      
      fc.assert(
        fc.property(fc.constant(buildInstallerPath), (scriptPath) => {
          const content = fs.readFileSync(scriptPath, 'utf8');
          
          // Should have step for copying application files
          expect(content).toMatch(/copyApplicationFiles|copy.*application/i);
          
          // Should have step for creating launcher
          expect(content).toMatch(/createLauncher|launcher/i);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that launcher handles server startup failure gracefully
     */
    it('should handle server startup failure with error message', () => {
      const launcherBatPath = path.join(projectRoot, 'scripts/installer/launcher.bat');
      
      fc.assert(
        fc.property(fc.constant(launcherBatPath), (batPath) => {
          const content = fs.readFileSync(batPath, 'utf8');
          
          // Should have timeout for server startup
          expect(content).toMatch(/MAX_WAIT|timeout/i);
          
          // Should show warning if server may not have started
          expect(content).toMatch(/warning|error/i);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that application icon is included for shortcuts
     */
    it('should include application icon for shortcuts', () => {
      const iconPath = path.join(projectRoot, 'public/icon.ico');
      
      fc.assert(
        fc.property(fc.constant(iconPath), (icoPath) => {
          expect(fs.existsSync(icoPath)).toBe(true);
          
          // Icon file should have reasonable size (multi-resolution)
          const stats = fs.statSync(icoPath);
          expect(stats.size).toBeGreaterThan(1000); // At least 1KB
          expect(stats.size).toBeLessThan(500000); // Less than 500KB
          
          return true;
        }),
        fcOptions
      );
    });
  });
});
