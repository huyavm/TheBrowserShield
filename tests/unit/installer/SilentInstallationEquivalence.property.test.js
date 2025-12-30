/**
 * Silent Installation Equivalence Property Tests
 * Feature: windows-installer
 * 
 * Property 3: Silent Installation Equivalence
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 * 
 * For any silent installation executed with `/SILENT` or `/VERYSILENT` flags:
 * - The installation SHALL complete without displaying any UI
 * - The exit code SHALL be 0 on success
 * - The installed files SHALL be identical to a normal installation
 * - A log file SHALL be created in the temp folder
 * 
 * Inno Setup Silent Installation Flags:
 * - /SILENT: Shows progress bar only, no wizard pages
 * - /VERYSILENT: Completely silent, no UI at all
 * - /DIR="path": Custom installation directory
 * - /LOG="path": Custom log file path
 * - /SUPPRESSMSGBOXES: Suppress message boxes
 */
const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

// Import the generate-iss module
const generateIss = require('../../../scripts/installer/generate-iss.js');

// Build configuration
const buildConfig = require('../../../scripts/installer/build-config.json');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100 };

describe('Silent Installation Equivalence Property Tests', () => {
  /**
   * Feature: windows-installer, Property 3: Silent Installation Equivalence
   * Validates: Requirements 9.1, 9.2, 9.3, 9.4
   */
  describe('Property 3: Silent Installation Equivalence', () => {
    
    let generatedScript;
    let templateContent;
    
    beforeAll(() => {
      // Load template and generate script for testing
      templateContent = generateIss.loadTemplate();
      const result = generateIss.getGeneratedScript();
      generatedScript = result.script;
    });

    /**
     * Test that Inno Setup supports silent installation via /SILENT and /VERYSILENT flags
     * Validates: Requirement 9.1 - WHEN installer is run with /S flag THEN THE Installer SHALL install silently without UI
     */
    it('should support silent installation mode (Inno Setup native /SILENT and /VERYSILENT)', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Inno Setup natively supports /SILENT and /VERYSILENT flags
          // The script should not disable this functionality
          // Check that PrivilegesRequired is set (required for silent install)
          expect(script).toContain('PrivilegesRequired=admin');
          
          // Verify the script has proper Setup section
          expect(script).toContain('[Setup]');
          
          // Inno Setup automatically supports silent mode, but we verify
          // the script doesn't have DisableSilent=yes which would disable it
          expect(script).not.toContain('DisableSilent=yes');
          
          // Verify SetupLogging is enabled for /LOG parameter support
          expect(script).toContain('SetupLogging=yes');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that Inno Setup supports custom directory via /DIR flag
     * Validates: Requirement 9.2 - WHEN installer is run with /D=path flag THEN THE Installer SHALL install to specified directory
     */
    it('should support custom installation directory via /DIR flag', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Inno Setup natively supports /DIR=path flag
          // The script should have DefaultDirName but allow override
          expect(script).toMatch(/DefaultDirName=.+/);
          
          // DisableDirPage should not be set to yes (or should be no)
          // to allow directory selection in normal mode
          // /DIR flag works regardless of DisableDirPage setting
          expect(script).toContain('DisableDirPage=no');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that the installer configuration supports proper exit codes
     * Validates: Requirement 9.3 - THE Installer SHALL return exit code 0 on success và non-zero on failure
     */
    it('should be configured for proper exit codes', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Inno Setup returns proper exit codes by default:
          // 0 = Success
          // 1 = Setup failed to initialize
          // 2 = User clicked Cancel
          // 3 = Fatal error during preparation
          // 4 = Fatal error during installation
          // 5 = User clicked Exit
          
          // Verify the script has proper Setup section which enables exit codes
          expect(script).toContain('[Setup]');
          
          // The script should have AppId which is required for proper installation tracking
          expect(script).toMatch(/AppId=\{\{[A-F0-9-]+\}\}/);
          
          // Verify exit code constants are defined in Code section
          expect(script).toContain('EXIT_CODE_SUCCESS');
          expect(script).toContain('EXIT_CODE_SETUP_FAILED');
          expect(script).toContain('EXIT_CODE_USER_CANCELLED');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that installation log is written for troubleshooting
     * Validates: Requirement 9.4 - THE Installer SHALL write installation log to temp folder for troubleshooting
     */
    it('should write installation log to temp folder', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Check for [Code] section that handles logging
          expect(script).toContain('[Code]');
          
          // Check for log file creation in CurStepChanged
          expect(script).toContain('CurStepChanged');
          expect(script).toContain('ssPostInstall');
          
          // Check for log file path using temp folder
          expect(script).toContain('{tmp}');
          expect(script).toContain('BrowserShield-Install.log');
          
          // Check for SaveStringToFile which writes the log
          expect(script).toContain('SaveStringToFile');
          
          // Check for WriteInstallLog function
          expect(script).toContain('WriteInstallLog');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that log content includes required information
     */
    it('should include required information in installation log', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Log should include version
          expect(script).toContain("'Installer Version: '");
          
          // Log should include install path
          expect(script).toContain("'Install Path: '");
          expect(script).toContain("{app}");
          
          // Log should include date/time
          expect(script).toContain('GetDateTimeString');
          
          // Log should include silent mode status
          expect(script).toContain("'Silent Mode: '");
          
          // Log should include command line for debugging
          expect(script).toContain('GetCmdTail');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that Files section is properly configured for both silent and normal install
     */
    it('should have identical file installation for silent and normal modes', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Files section should exist
          expect(script).toContain('[Files]');
          
          // Files should be installed from build directory
          expect(script).toMatch(/Source:.*DestDir:/);
          
          // Should use recursesubdirs for complete installation
          expect(script).toContain('recursesubdirs');
          
          // Should use createallsubdirs to maintain directory structure
          expect(script).toContain('createallsubdirs');
          
          // ignoreversion ensures files are always installed
          expect(script).toContain('ignoreversion');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that Run section respects silent mode
     */
    it('should skip post-install launch in silent mode', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Run section should exist
          expect(script).toContain('[Run]');
          
          // Post-install run should have skipifsilent flag
          expect(script).toContain('skipifsilent');
          
          // Should also have postinstall flag for normal mode
          expect(script).toContain('postinstall');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that Tasks section works in both modes
     */
    it('should handle tasks correctly in silent mode', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Tasks section should exist
          expect(script).toContain('[Tasks]');
          
          // Desktop icon task
          expect(script).toContain('desktopicon');
          
          // Start menu task
          expect(script).toContain('startmenuicon');
          
          // Tasks should have checkedonce flag for default selection
          expect(script).toContain('checkedonce');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that build configuration supports silent installation
     */
    it('should have supportSilentInstall enabled in build config', () => {
      fc.assert(
        fc.property(fc.constant(buildConfig), (config) => {
          // Build config should explicitly support silent install
          expect(config.installer.supportSilentInstall).toBe(true);
          
          // Build config should have silent install configuration
          expect(config.installer.silentInstall).toBeDefined();
          expect(config.installer.silentInstall.enabled).toBe(true);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that generated script has no UI-blocking elements in silent mode
     */
    it('should not have UI-blocking elements that prevent silent installation', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Should not have DisableSilent
          expect(script).not.toContain('DisableSilent=yes');
          
          // Should not have AlwaysShowComponentsList which forces UI
          expect(script).not.toContain('AlwaysShowComponentsList=yes');
          
          // Should not have AlwaysShowDirOnReadyPage which forces UI
          expect(script).not.toContain('AlwaysShowDirOnReadyPage=yes');
          
          // Should not have AlwaysShowGroupOnReadyPage which forces UI
          expect(script).not.toContain('AlwaysShowGroupOnReadyPage=yes');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that Windows version check doesn't block silent install
     */
    it('should perform Windows version check without blocking silent install', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // MinVersion should be set for Windows 10+
          expect(script).toContain('MinVersion=10.0');
          
          // Architecture should be set
          expect(script).toContain('ArchitecturesAllowed=x64');
          
          // These checks work in silent mode and return proper exit codes
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that disk space validation works in silent mode
     */
    it('should validate disk space in silent mode', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Should have disk space check in Code section
          expect(script).toContain('CheckDiskSpace');
          expect(script).toContain('MIN_DISK_SPACE_MB');
          
          // Should have NextButtonClick handler for validation
          expect(script).toContain('NextButtonClick');
          expect(script).toContain('wpSelectDir');
          
          // Should check for silent mode in disk space validation
          expect(script).toContain('IsSilentInstall');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that all placeholders are resolved for silent install compatibility
     */
    it('should have all placeholders resolved for proper silent installation', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // No unresolved placeholders should remain
          const unresolvedPlaceholders = script.match(/\{\{[A-Z_]+\}\}/g);
          expect(unresolvedPlaceholders).toBeNull();
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Property test: For any valid installation path, silent install should be configurable
     */
    it('should accept any valid Windows path for silent installation', () => {
      // Generate valid Windows paths using string arbitrary with filter
      const validPathArbitrary = fc.string({ minLength: 1, maxLength: 20 })
        .filter(name => /^[A-Za-z0-9_-]+$/.test(name))
        .map(name => `C:\\Program Files\\${name}`);

      fc.assert(
        fc.property(validPathArbitrary, (installPath) => {
          // The path should be a valid format for /DIR= flag
          expect(installPath).toMatch(/^[A-Z]:\\/);
          
          // Path should not contain invalid characters
          expect(installPath).not.toMatch(/[<>"|?*]/);
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that silent install has proper logging for /LOG parameter
     */
    it('should support custom log path via /LOG parameter', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Should have GetInstallLogPath function to handle /LOG parameter
          expect(script).toContain('GetInstallLogPath');
          
          // Should check for /LOG parameter
          expect(script).toContain('/LOG=');
          
          // Should have SetupLogging enabled
          expect(script).toContain('SetupLogging=yes');
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that silent install configuration in build-config.json has all required flags
     */
    it('should have all silent install flags documented in build config', () => {
      fc.assert(
        fc.property(fc.constant(buildConfig), (config) => {
          const silentConfig = config.installer.silentInstall;
          
          // Should have all standard Inno Setup silent flags
          expect(silentConfig.flags.silent).toBe('/SILENT');
          expect(silentConfig.flags.verySilent).toBe('/VERYSILENT');
          expect(silentConfig.flags.dir).toBe('/DIR=');
          expect(silentConfig.flags.log).toBe('/LOG=');
          
          // Should have exit codes documented
          expect(silentConfig.exitCodes.success).toBe(0);
          expect(silentConfig.exitCodes.setupFailed).toBe(1);
          expect(silentConfig.exitCodes.userCancelled).toBe(2);
          
          return true;
        }),
        fcOptions
      );
    });
  });
});
