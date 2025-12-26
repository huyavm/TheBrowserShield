/**
 * Download Node.js Portable for Windows
 * Tải Node.js portable để đóng gói cùng ứng dụng
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Node.js version to download
const NODE_VERSION = '20.10.0';
const NODE_ARCH = 'win-x64';
const NODE_FILENAME = `node-v${NODE_VERSION}-${NODE_ARCH}`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_FILENAME}.zip`;

const RUNTIME_DIR = path.join(__dirname, '..', 'dist', 'BrowserShield-Portable', 'runtime');

async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading: ${url}`);
        console.log(`To: ${destPath}`);
        
        const file = fs.createWriteStream(destPath);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Follow redirect
                https.get(response.headers.location, (redirectResponse) => {
                    const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
                    let downloadedSize = 0;
                    
                    redirectResponse.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
                        process.stdout.write(`\rProgress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB)`);
                    });
                    
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log('\nDownload complete!');
                        resolve();
                    });
                }).on('error', reject);
            } else {
                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;
                
                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
                    process.stdout.write(`\rProgress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB)`);
                });
                
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('\nDownload complete!');
                    resolve();
                });
            }
        }).on('error', reject);
    });
}

async function main() {
    console.log('='.repeat(50));
    console.log('Node.js Portable Downloader');
    console.log('='.repeat(50));
    console.log(`Version: ${NODE_VERSION}`);
    console.log(`Architecture: ${NODE_ARCH}`);
    console.log('');
    
    // Ensure runtime directory exists
    if (!fs.existsSync(RUNTIME_DIR)) {
        fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    }
    
    const zipPath = path.join(RUNTIME_DIR, `${NODE_FILENAME}.zip`);
    
    // Download Node.js
    if (!fs.existsSync(zipPath)) {
        await downloadFile(NODE_URL, zipPath);
    } else {
        console.log('Node.js zip already exists, skipping download...');
    }
    
    // Extract using PowerShell
    console.log('\nExtracting Node.js...');
    try {
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${RUNTIME_DIR}' -Force"`, {
            stdio: 'inherit'
        });
        
        // Rename folder to 'nodejs'
        const extractedFolder = path.join(RUNTIME_DIR, NODE_FILENAME);
        const targetFolder = path.join(RUNTIME_DIR, 'nodejs');
        
        if (fs.existsSync(targetFolder)) {
            fs.rmSync(targetFolder, { recursive: true });
        }
        
        if (fs.existsSync(extractedFolder)) {
            fs.renameSync(extractedFolder, targetFolder);
        }
        
        // Clean up zip file
        fs.unlinkSync(zipPath);
        
        console.log('Node.js extracted successfully!');
        console.log(`Location: ${targetFolder}`);
        
    } catch (error) {
        console.error('Error extracting:', error.message);
    }
}

main().catch(console.error);
