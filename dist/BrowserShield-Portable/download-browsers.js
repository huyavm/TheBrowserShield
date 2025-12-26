/**
 * Download Chrome and Firefox for portable use
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BROWSERS_DIR = path.join(__dirname, 'browsers');

async function downloadChrome() {
    console.log('\n📥 Setting up Chrome...');
    
    try {
        // Use puppeteer's built-in browser
        const puppeteer = require('puppeteer');
        const browserPath = puppeteer.executablePath();
        
        if (fs.existsSync(browserPath)) {
            console.log('  ✓ Chrome already available via Puppeteer');
            console.log('  Path:', browserPath);
            
            // Create symlink or copy info
            const chromeInfo = {
                type: 'puppeteer-managed',
                path: browserPath,
                version: 'bundled'
            };
            
            fs.writeFileSync(
                path.join(BROWSERS_DIR, 'chrome', 'browser-info.json'),
                JSON.stringify(chromeInfo, null, 2)
            );
            return true;
        }
    } catch (error) {
        console.log('  ⚠ Puppeteer Chrome not found, will use system Chrome');
    }
    
    return false;
}

async function downloadFirefox() {
    console.log('\n📥 Setting up Firefox...');
    
    // Check for system Firefox
    const possiblePaths = [
        'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
        'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
        process.env.LOCALAPPDATA + '\\Mozilla Firefox\\firefox.exe'
    ];
    
    for (const firefoxPath of possiblePaths) {
        if (fs.existsSync(firefoxPath)) {
            console.log('  ✓ Firefox found at:', firefoxPath);
            
            const firefoxInfo = {
                type: 'system',
                path: firefoxPath,
                version: 'system-installed'
            };
            
            fs.writeFileSync(
                path.join(BROWSERS_DIR, 'firefox', 'browser-info.json'),
                JSON.stringify(firefoxInfo, null, 2)
            );
            return true;
        }
    }
    
    console.log('  ⚠ Firefox not found. Please install Firefox manually.');
    console.log('  Download from: https://www.mozilla.org/firefox/');
    return false;
}

async function main() {
    console.log('🌐 BrowserShield Browser Setup');
    console.log('==============================');
    
    // Ensure directories exist
    if (!fs.existsSync(path.join(BROWSERS_DIR, 'chrome'))) {
        fs.mkdirSync(path.join(BROWSERS_DIR, 'chrome'), { recursive: true });
    }
    if (!fs.existsSync(path.join(BROWSERS_DIR, 'firefox'))) {
        fs.mkdirSync(path.join(BROWSERS_DIR, 'firefox'), { recursive: true });
    }
    
    const chromeOk = await downloadChrome();
    const firefoxOk = await downloadFirefox();
    
    console.log('\n==============================');
    console.log('Setup Summary:');
    console.log('  Chrome:', chromeOk ? '✓ Ready' : '⚠ Manual setup needed');
    console.log('  Firefox:', firefoxOk ? '✓ Ready' : '⚠ Manual setup needed');
    console.log('==============================\n');
}

main().catch(console.error);
