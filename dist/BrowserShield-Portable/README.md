# BrowserShield Portable Edition v1.4.0

## Khoi Dong Nhanh

1. **Lan Dau Chay:**
   - Chay `Start-BrowserShield.bat` (se tu dong cai dat dependencies)
   - Hoac chay `Download-Browsers.bat` de cai dat browsers truoc

2. **Khoi Dong Ung Dung:**
   - Nhan doi `Start-BrowserShield.bat`
   - Mo http://localhost:5000 trong trinh duyet

3. **Yeu Cau:**
   - Node.js 18+ (https://nodejs.org)
   - Windows 10/11

## Cau Truc Thu Muc

```
BrowserShield-Portable/
├── Start-BrowserShield.bat    # Launcher chinh
├── Start-BrowserShield.ps1    # PowerShell launcher
├── Fix-Dependencies.bat       # Sua loi dependencies (QUAN TRONG!)
├── Download-Browsers.bat      # Cai dat browsers
├── browsers/                  # Browser binaries
│   ├── chrome/
│   └── firefox/
├── data/                      # Du lieu nguoi dung
│   ├── browser-profiles/
│   └── logs/
├── public/                    # Giao dien web
├── config/                    # Cau hinh
└── ...
```

## Tinh Nang

- 🎭 Anti-detect browser profiles
- 🌐 Ho tro Chrome & Firefox
- 🔒 Fingerprint spoofing
- 🌍 Ho tro Proxy
- 📊 Quan ly session
- 🖥️ Che do Visible & Headless

## ⚠️ Xu Ly Loi (Troubleshooting)

### Loi "Khong tim thay Node.js"
**Nguyen nhan:** Node.js chua duoc cai dat hoac khong co trong PATH.
**Cach sua:**
1. Tai Node.js tu https://nodejs.org (chon ban LTS)
2. Cai dat va khoi dong lai may tinh
3. Chay lai Start-BrowserShield.bat

### Loi "NODE_MODULE_VERSION" hoac "Module not found"
**Nguyen nhan:** Native modules (better-sqlite3) can duoc rebuild cho may nay.
**Cach sua:**
1. Chay `Fix-Dependencies.bat` (QUAN TRONG!)
2. Doi cho qua trinh hoan tat (2-5 phut)
3. Chay lai Start-BrowserShield.bat

### Loi "Khong tim thay Browser"
**Nguyen nhan:** Chrome/Firefox chua duoc cai dat.
**Cach sua:**
1. Chay Download-Browsers.bat
2. Hoac cai dat Chrome/Firefox thu cong tu:
   - Chrome: https://www.google.com/chrome/
   - Firefox: https://www.mozilla.org/firefox/

### Loi "Cong 5000 dang duoc su dung"
**Nguyen nhan:** Port 5000 dang bi ung dung khac chiem.
**Cach sua:**
1. Dong ung dung khac dang dung port 5000
2. Hoac doi port: `set PORT=3000 && node server.js`

### Loi "Cannot find module..." khi khoi dong
**Nguyen nhan:** Dependencies chua duoc cai dat hoac bi loi.
**Cach sua:**
1. Chay `Fix-Dependencies.bat`
2. Neu van loi, xoa thu muc node_modules va chay lai

### Loi PowerShell Execution Policy
**Nguyen nhan:** Windows chan chay PowerShell scripts.
**Cach sua:**
1. Mo PowerShell voi quyen Administrator
2. Chay: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
3. Chay lai Start-BrowserShield.ps1

### Loi "npm install" that bai
**Nguyen nhan:** Ket noi internet hoac thieu build tools.
**Cach sua:**
1. Kiem tra ket noi internet
2. Thu chay voi quyen Administrator
3. Cai dat Visual Studio Build Tools neu duoc yeu cau:
   https://visualstudio.microsoft.com/visual-cpp-build-tools/

### Loi Database (SQLite)
**Nguyen nhan:** File database bi khoa hoac loi.
**Cach sua:**
1. Dong tat ca cua so BrowserShield
2. Xoa file `data/browsershield.db` (se duoc tao lai)
3. Chay lai Start-BrowserShield.bat

## Di Chuyen/Backup

Backup cac thu muc/file sau:
- `data/browser-profiles/`    # Profiles da tao
- `data/browsershield.db`     # Database
- `data/profiles.json`        # Cau hinh profiles
- `data/proxy-pool.json`      # Proxy pool
- `portable-config.json`      # Cau hinh portable

## Lien He Ho Tro

- GitHub: https://github.com/huynd94/TheBrowserShield
- Issues: https://github.com/huynd94/TheBrowserShield/issues

## Phien Ban

Version: 1.4.0
Build Date: 2025-12-26
