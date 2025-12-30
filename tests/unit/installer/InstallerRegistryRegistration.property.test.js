/**
 * Installer Registry Registration Property Tests
 * Feature: windows-installer
 * 
 * Property 2: Installer Registry Registration
 * Validates: Requirements 5.1
 * 
 * For any completed installation, the Windows registry SHALL contain an uninstall entry
 * at `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\BrowserShield_is1`
 * with correct DisplayName, DisplayVersion, InstallLocation, and UninstallString values.
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

describe('Installer Registry Registration Property Tests', () => {
  /**
   * Feature: windows-installer, Property 2: Installer Registry Registration
   * Validates: Requirements 5.1
   */
  describe('Property 2: Installer Registry Registration', () => {
    
    let generatedScript;
    let templateContent;
    
    beforeAll(() => {
      // Load template and generate script for testing
      templateContent = generateIss.loadTemplate();
      const result = generateIss.getGeneratedScript();
      generatedScript = result.script;
    });

    /**
     * Test that Inno Setup script configures registry uninstall entry
     */
    it('should configure CreateUninstallRegKey in Setup section', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // Inno Setup creates registry entry when CreateUninstallRegKey=yes
          expect(script).toContain('CreateUninstallRegKey=yes');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that AppId is properly configured for registry identification
     */
    it('should have valid AppId for registry identification', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // AppId should be present and formatted as GUID
          expect(script).toMatch(/AppId=\{\{[A-F0-9-]+\}\}/);
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that DisplayName (AppName) is correctly configured
     */
    it('should configure correct DisplayName via AppName', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // AppName defines DisplayName in registry
          expect(script).toContain(`AppName={#MyAppName}`);
          expect(script).toContain(`#define MyAppName "${buildConfig.app.name}"`);
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that DisplayVersion (AppVersion) is correctly configured
     */
    it('should configure correct DisplayVersion via AppVersion', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // AppVersion defines DisplayVersion in registry
          expect(script).toContain(`AppVersion={#MyAppVersion}`);
          expect(script).toContain(`#define MyAppVersion "${buildConfig.app.version}"`);
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that InstallLocation is configured via DefaultDirName
     */
    it('should configure InstallLocation via DefaultDirName', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // DefaultDirName sets InstallLocation in registry
          expect(script).toMatch(/DefaultDirName=.+BrowserShield/);
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that UninstallDisplayName is configured
     */
    it('should configure UninstallDisplayName', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // UninstallDisplayName should be set
          expect(script).toContain('UninstallDisplayName={#MyAppName}');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that UninstallDisplayIcon is configured
     */
    it('should configure UninstallDisplayIcon', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // UninstallDisplayIcon should point to app executable
          expect(script).toContain('UninstallDisplayIcon={app}');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that publisher information is configured for registry
     */
    it('should configure publisher information', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // AppPublisher sets Publisher in registry
          expect(script).toContain(`AppPublisher={#MyAppPublisher}`);
          expect(script).toContain(`#define MyAppPublisher "${buildConfig.app.publisher}"`);
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that generated GUID is deterministic for same app name
     */
    it('should generate deterministic GUID for same app name', () => {
      fc.assert(
        fc.property(
          fc.constant(buildConfig.app.name),
          (appName) => {
            const guid1 = generateIss.generateAppGuid(appName);
            const guid2 = generateIss.generateAppGuid(appName);
            
            // Same app name should produce same GUID
            expect(guid1).toBe(guid2);
            
            // GUID should be properly formatted
            expect(guid1).toMatch(/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/);
            
            return true;
          }
        ),
        fcOptions
      );
    });

    /**
     * Test that different app names produce different GUIDs
     */
    it('should generate different GUIDs for different app names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (name1, name2) => {
            fc.pre(name1 !== name2);
            
            const guid1 = generateIss.generateAppGuid(name1);
            const guid2 = generateIss.generateAppGuid(name2);
            
            // Different names should produce different GUIDs
            expect(guid1).not.toBe(guid2);
            
            return true;
          }
        ),
        fcOptions
      );
    });

    /**
     * Test that all required Setup section fields are present
     */
    it('should have all required Setup section fields for registry', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          const requiredFields = [
            'AppId=',
            'AppName=',
            'AppVersion=',
            'AppPublisher=',
            'DefaultDirName=',
            'UninstallDisplayName=',
            'CreateUninstallRegKey='
          ];
          
          for (const field of requiredFields) {
            expect(script).toContain(field);
          }
          
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that template placeholders are properly replaced
     */
    it('should replace all template placeholders', () => {
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
     * Test that script validates successfully
     */
    it('should pass validation after generation', () => {
      fc.assert(
        fc.property(fc.constant(generatedScript), (script) => {
          // validateScript should not throw
          expect(() => generateIss.validateScript(script)).not.toThrow();
          
          return true;
        }),
        fcOptions
      );
    });
  });
});
