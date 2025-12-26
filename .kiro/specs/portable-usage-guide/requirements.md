# BrowserShield Portable Usage Guide - Requirements

## Overview
Hướng dẫn chi tiết cách sử dụng phiên bản BrowserShield Portable (.zip) trên Windows, bao gồm cài đặt, cấu hình và khắc phục sự cố.

## User Stories

### US-001: Giải nén và cài đặt cơ bản
**As a** người dùng Windows  
**I want to** giải nén và chạy BrowserShield từ file ZIP  
**So that** tôi có thể sử dụng ứng dụng mà không cần cài đặt phức tạp

**Acceptance Criteria:**
- [ ] Giải nén file ZIP vào thư mục bất kỳ
- [ ] Chạy được `Start-BrowserShield.bat` hoặc `Start-BrowserShield.ps1`
- [ ] Server khởi động thành công trên port 5000
- [ ] Truy cập được giao diện web tại http://localhost:5000

### US-002: Cài đặt Node.js (nếu chưa có)
**As a** người dùng chưa có Node.js  
**I want to** biết cách cài đặt Node.js  
**So that** tôi có thể chạy BrowserShield

**Acceptance Criteria:**
- [ ] Hướng dẫn tải Node.js từ https://nodejs.org
- [ ] Hướng dẫn cài đặt Node.js LTS (v18+)
- [ ] Kiểm tra Node.js đã cài đặt thành công: `node --version`

### US-003: Thiết lập trình duyệt
**As a** người dùng  
**I want to** thiết lập Chrome/Firefox cho BrowserShield  
**So that** tôi có thể tạo và quản lý browser profiles

**Acceptance Criteria:**
- [ ] Chạy `Download-Browsers.bat` để thiết lập tự động
- [ ] Hoặc sử dụng Chrome/Firefox đã cài sẵn trên hệ thống
- [ ] Xác nhận browser được nhận diện trong ứng dụng

### US-004: Sử dụng giao diện web
**As a** người dùng  
**I want to** sử dụng giao diện web để quản lý profiles  
**So that** tôi có thể tạo, chỉnh sửa và khởi chạy browser profiles

**Acceptance Criteria:**
- [ ] Truy cập Dashboard tại http://localhost:5000
- [ ] Tạo profile mới với fingerprint tùy chỉnh
- [ ] Khởi chạy browser với profile đã tạo
- [ ] Quản lý proxy cho từng profile

### US-005: Khắc phục sự cố thường gặp
**As a** người dùng gặp lỗi  
**I want to** biết cách khắc phục các lỗi phổ biến  
**So that** tôi có thể tự giải quyết vấn đề

**Acceptance Criteria:**
- [ ] Lỗi "Node.js not found" - cách khắc phục
- [ ] Lỗi "Port 5000 in use" - đổi port
- [ ] Lỗi "Browser not found" - thiết lập browser
- [ ] Lỗi dependencies - cài lại node_modules

## Technical Requirements

### Yêu cầu hệ thống
- Windows 10/11 (64-bit)
- Node.js 18+ (LTS recommended)
- RAM: 4GB minimum, 8GB recommended
- Disk: 500MB cho ứng dụng + browsers

### Cấu trúc thư mục Portable
```
BrowserShield-Portable/
├── Start-BrowserShield.bat    # Launcher chính
├── Start-BrowserShield.ps1    # PowerShell launcher
├── Download-Browsers.bat      # Thiết lập browser
├── portable-config.json       # Cấu hình portable
├── browsers/                  # Browser binaries
│   ├── chrome/
│   └── firefox/
├── data/                      # Dữ liệu người dùng
│   ├── browser-profiles/      # Profiles đã tạo
│   ├── logs/                  # Log files
│   └── browsershield.db       # Database
├── config/                    # Cấu hình ứng dụng
├── public/                    # Giao diện web
├── node_modules/              # Dependencies (tự động tạo)
└── README.md                  # Hướng dẫn nhanh
```

## References
- #[[file:scripts/build-portable.js]]
- #[[file:scripts/package-portable.bat]]
- #[[file:INSTALL.md]]
