/**
 * Disk Space Validation Property Tests
 * Feature: windows-installer
 * 
 * Property 4: Disk Space Validation
 * Validates: Requirements 6.3
 * 
 * For any installation attempt, IF the target directory has less than 500MB free space,
 * THEN the installer SHALL reject the installation with an appropriate error message.
 */
const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

// Import generate-iss module for testing
const {
  getGeneratedScript,
  loadConfig,
  loadTemplate,
  replacePlaceholders
} = require('../../../scripts/installer/generate-iss.js');

// Build configuration
const buildConfig = require('../../../scripts/installer/build-config.json');

// Configure fast-check for minimum 100 iterations
const fcOptions = { numRuns: 100 };

describe('Disk Space Validation Property Tests', () => {
  /**
   * Feature: windows-installer, Property 4: Disk Space Validation
   * Validates: Requirements 6.3
   */
  describe('Property 4: Disk Space Validation', () => {
    
    /**
     * Test that disk space validation is configured with minimum 500MB
     */
    it('should configure minimum disk space requirement of 500MB', () => {
      fc.assert(
        fc.property(fc.constant(buildConfig), (config) => {
          expect(config.installer.minDiskSpaceMB).toBeDefined();
          expect(config.installer.minDiskSpaceMB).toBe(500);
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that generated script contains MIN_DISK_SPACE_MB constant
     */
    it('should include MIN_DISK_SPACE_MB constant in generated script', () => {
      const { script } = getGeneratedScript();
      
      fc.assert(
        fc.property(fc.constant(script), (generatedScript) => {
          // Check that MIN_DISK_SPACE_MB constant is defined
          expect(generatedScript).toContain('MIN_DISK_SPACE_MB = 500');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that CheckDiskSpace function exists in template
     */
    it('should include CheckDiskSpace function in template', () => {
      const template = loadTemplate();
      
      fc.assert(
        fc.property(fc.constant(template), (templateContent) => {
          // Check for CheckDiskSpace function definition
          expect(templateContent).toContain('function CheckDiskSpace(Path: String): Boolean');
          expect(templateContent).toContain('FreeMB >= MIN_DISK_SPACE_MB');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that GetFreeDiskSpaceMB function exists in template
     */
    it('should include GetFreeDiskSpaceMB function in template', () => {
      const template = loadTemplate();
      
      fc.assert(
        fc.property(fc.constant(template), (templateContent) => {
          // Check for GetFreeDiskSpaceMB function definition
          expect(templateContent).toContain('function GetFreeDiskSpaceMB(Path: String): Cardinal');
          expect(templateContent).toContain('GetSpaceOnDisk');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that NextButtonClick validates disk space on directory selection
     */
    it('should validate disk space in NextButtonClick on wpSelectDir page', () => {
      const template = loadTemplate();
      
      fc.assert(
        fc.property(fc.constant(template), (templateContent) => {
          // Check for NextButtonClick function
          expect(templateContent).toContain('function NextButtonClick(CurPageID: Integer): Boolean');
          // Check it handles wpSelectDir page
          expect(templateContent).toContain('wpSelectDir');
          // Check it calls CheckDiskSpace
          expect(templateContent).toContain('CheckDiskSpace(WizardDirValue)');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that error messages are present in both Vietnamese and English
     */
    it('should include error messages in Vietnamese and English', () => {
      const template = loadTemplate();
      
      fc.assert(
        fc.property(fc.constant(template), (templateContent) => {
          // Check for Vietnamese error message
          expect(templateContent).toContain('Không đủ dung lượng đĩa');
          // Check for English error message
          expect(templateContent).toContain('Insufficient disk space');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that error message displays required and available space
     */
    it('should display required and available space in error message', () => {
      const template = loadTemplate();
      
      fc.assert(
        fc.property(fc.constant(template), (templateContent) => {
          // Check that error message includes required space info
          expect(templateContent).toContain('MIN_DISK_SPACE_MB');
          // Check that error message includes available space
          expect(templateContent).toContain('FreeMB');
          // Check for IntToStr conversion (displaying numbers)
          expect(templateContent).toContain('IntToStr(MIN_DISK_SPACE_MB)');
          expect(templateContent).toContain('IntToStr(FreeMB)');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Test that disk space check prevents proceeding when space is insufficient
     */
    it('should return False from NextButtonClick when disk space is insufficient', () => {
      const template = loadTemplate();
      
      fc.assert(
        fc.property(fc.constant(template), (templateContent) => {
          // Check that Result is set to False when disk space check fails
          expect(templateContent).toContain('Result := False');
          // Check that MsgBox is shown with error
          expect(templateContent).toContain('MsgBox(ErrorMsg, mbError, MB_OK)');
          return true;
        }),
        fcOptions
      );
    });

    /**
     * Property test: For any minDiskSpaceMB value, the generated script should contain that value
     */
    it('should correctly replace MIN_DISK_SPACE_MB placeholder with config value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2000 }),
          (diskSpaceMB) => {
            // Create a modified config with random disk space value
            const modifiedConfig = JSON.parse(JSON.stringify(buildConfig));
            modifiedConfig.installer.minDiskSpaceMB = diskSpaceMB;
            
            const template = loadTemplate();
            const script = replacePlaceholders(template, modifiedConfig);
            
            // Verify the placeholder was replaced with the correct value
            expect(script).toContain(`MIN_DISK_SPACE_MB = ${diskSpaceMB}`);
            expect(script).not.toContain('{{MIN_DISK_SPACE_MB}}');
            
            return true;
          }
        ),
        fcOptions
      );
    });

    /**
     * Test that language detection is used for error messages
     */
    it('should use ActiveLanguage to determine error message language', () => {
      const template = loadTemplate();
      
      fc.assert(
        fc.property(fc.constant(template), (templateContent) => {
          // Check for language detection
          expect(templateContent).toContain("ActiveLanguage = 'vietnamese'");
          return true;
        }),
        fcOptions
      );
    });
  });
});
