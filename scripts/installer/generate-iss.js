/**
 * Inno Setup Script Generator
 * 
 * Reads build-config.json and template.iss to generate a complete
 * Inno Setup script with all placeholders replaced.
 * 
 * Requirements: 1.1, 6.1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Paths
const SCRIPT_DIR = __dirname;
const CONFIG_PATH = path.join(SCRIPT_DIR, 'build-config.json');
const TEMPLATE_PATH = path.join(SCRIPT_DIR, 'template.iss');
const DEFAULT_OUTPUT_PATH = path.join(SCRIPT_DIR, 'BrowserShield.iss');

/**
 * Generate a deterministic GUID from app name
 * This ensures the same app always gets the same GUID
 */
function generateAppGuid(appName) {
  const hash = crypto.createHash('md5').update(appName + '-installer').digest('hex');
  // Format as GUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`.toUpperCase();
}

/**
 * Load and parse the build configuration
 */
function loadConfig(configPath = CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(configContent);
}

/**
 * Load the template file
 */
function loadTemplate(templatePath = TEMPLATE_PATH) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  
  return fs.readFileSync(templatePath, 'utf8');
}

/**
 * Replace all placeholders in the template with config values
 */
function replacePlaceholders(template, config) {
  const replacements = {
    '{{APP_NAME}}': config.app.name,
    '{{APP_VERSION}}': config.app.version,
    '{{APP_PUBLISHER}}': config.app.publisher,
    '{{APP_URL}}': config.app.url,
    '{{APP_DESCRIPTION}}': config.app.description,
    '{{APP_GUID}}': generateAppGuid(config.app.name),
    '{{DEFAULT_INSTALL_DIR}}': config.installer.defaultInstallDir,
    '{{OUTPUT_DIR}}': path.resolve(config.installer.outputDir).replace(/\//g, '\\'),
    '{{BUILD_DIR}}': path.resolve(config.installer.buildDir).replace(/\//g, '\\'),
    '{{MIN_DISK_SPACE_MB}}': String(config.installer.minDiskSpaceMB || 500),
    '{{ICON_FILE}}': path.resolve(config.app.iconPath || 'public/icon.ico').replace(/\//g, '\\'),
  };

  let result = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.split(placeholder).join(value);
  }

  return result;
}

/**
 * Validate the generated script has no remaining placeholders
 */
function validateScript(script) {
  const remainingPlaceholders = script.match(/\{\{[A-Z_]+\}\}/g);
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    throw new Error(`Unresolved placeholders found: ${remainingPlaceholders.join(', ')}`);
  }
  return true;
}

/**
 * Generate the Inno Setup script
 */
function generateInnoScript(options = {}) {
  const configPath = options.configPath || CONFIG_PATH;
  const templatePath = options.templatePath || TEMPLATE_PATH;
  const outputPath = options.outputPath || DEFAULT_OUTPUT_PATH;

  console.log('Loading configuration from:', configPath);
  const config = loadConfig(configPath);

  console.log('Loading template from:', templatePath);
  const template = loadTemplate(templatePath);

  console.log('Replacing placeholders...');
  const script = replacePlaceholders(template, config);

  console.log('Validating generated script...');
  validateScript(script);

  console.log('Writing output to:', outputPath);
  fs.writeFileSync(outputPath, script, 'utf8');

  console.log('Inno Setup script generated successfully!');
  
  return {
    outputPath,
    config,
    appGuid: generateAppGuid(config.app.name)
  };
}


/**
 * Get the generated script content without writing to file
 * Useful for testing
 */
function getGeneratedScript(options = {}) {
  const configPath = options.configPath || CONFIG_PATH;
  const templatePath = options.templatePath || TEMPLATE_PATH;

  const config = loadConfig(configPath);
  const template = loadTemplate(templatePath);
  const script = replacePlaceholders(template, config);
  
  validateScript(script);
  
  return {
    script,
    config,
    appGuid: generateAppGuid(config.app.name)
  };
}

// Export functions for use as module
module.exports = {
  generateInnoScript,
  getGeneratedScript,
  loadConfig,
  loadTemplate,
  replacePlaceholders,
  validateScript,
  generateAppGuid,
  CONFIG_PATH,
  TEMPLATE_PATH,
  DEFAULT_OUTPUT_PATH
};

// Run as CLI if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      options.configPath = args[++i];
    } else if (args[i] === '--template' && args[i + 1]) {
      options.templatePath = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputPath = args[++i];
    } else if (args[i] === '--help') {
      console.log(`
Usage: node generate-iss.js [options]

Options:
  --config <path>    Path to build-config.json (default: ./build-config.json)
  --template <path>  Path to template.iss (default: ./template.iss)
  --output <path>    Output path for generated .iss file (default: ./BrowserShield.iss)
  --help             Show this help message
`);
      process.exit(0);
    }
  }

  try {
    const result = generateInnoScript(options);
    console.log('\nGenerated installer script:');
    console.log('  App Name:', result.config.app.name);
    console.log('  Version:', result.config.app.version);
    console.log('  App GUID:', result.appGuid);
    console.log('  Output:', result.outputPath);
  } catch (error) {
    console.error('Error generating Inno Setup script:', error.message);
    process.exit(1);
  }
}
