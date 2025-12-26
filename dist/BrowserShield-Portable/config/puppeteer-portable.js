/**
 * Puppeteer configuration for portable mode
 */
const path = require('path');
const fs = require('fs');

function getPortableConfig() {
    const configFile = path.join(__dirname, '..', 'portable-config.json');
    
    if (fs.existsSync(configFile)) {
        return JSON.parse(fs.readFileSync(configFile, 'utf8'));
    }
    
    return null;
}

function getChromePath() {
    const portableConfig = getPortableConfig();
    
    if (portableConfig?.portable) {
        // Check for browser-info.json
        const chromeInfoPath = path.join(__dirname, '..', 'browsers', 'chrome', 'browser-info.json');
        if (fs.existsSync(chromeInfoPath)) {
            const info = JSON.parse(fs.readFileSync(chromeInfoPath, 'utf8'));
            if (info.path && fs.existsSync(info.path)) {
                return info.path;
            }
        }
    }
    
    // Fallback to puppeteer default
    try {
        const puppeteer = require('puppeteer');
        return puppeteer.executablePath();
    } catch {
        return null;
    }
}

function getFirefoxPath() {
    const portableConfig = getPortableConfig();
    
    if (portableConfig?.portable) {
        const firefoxInfoPath = path.join(__dirname, '..', 'browsers', 'firefox', 'browser-info.json');
        if (fs.existsSync(firefoxInfoPath)) {
            const info = JSON.parse(fs.readFileSync(firefoxInfoPath, 'utf8'));
            if (info.path && fs.existsSync(info.path)) {
                return info.path;
            }
        }
    }
    
    // Check common Windows paths
    const possiblePaths = [
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }
    
    return null;
}

module.exports = {
    getPortableConfig,
    getChromePath,
    getFirefoxPath
};
