# BrowserShield Portable - Hướng dẫn sử dụng chi tiết

## 🚀 Bước 1: Giải nén và chuẩn bị

### 1.1 Giải nén file ZIP
```
1. Tải file BrowserShield-Portable-v1.3.0.zip
2. Click chuột phải → "Extract All..." hoặc dùng 7-Zip/WinRAR
3. Chọn thư mục đích (ví dụ: D:\BrowserShield)
4. Đảm bảo đường dẫn KHÔNG có dấu tiếng Việt hoặc ký tự đặc biệt
```

### 1.2 Kiểm tra Node.js
Mở Command Prompt (cmd) và chạy:
```cmd
node --version
```

**Nếu hiện phiên bản (v18.x.x trở lên):** ✅ Sẵn sàng

**Nếu báo lỗi "not recognized":** Cần cài Node.js
1. Truy cập https://nodejs.org
2. Tải bản LTS (Long Term Support)
3. Cài đặt với tùy chọn mặc định
4. Khởi động lại Command Prompt và kiểm tra lại

---

## 🖥️ Bước 2: Khởi chạy ứng dụng

### 2.1 Cách 1: Dùng file BAT (Khuyến nghị)
```
1. Mở thư mục BrowserShield-Portable
2. Double-click vào "Start-BrowserShield.bat"
3. Cửa sổ CMD sẽ mở và hiển thị tiến trình
4. Đợi đến khi thấy "Server running on port 5000"
```

### 2.2 Cách 2: Dùng PowerShell
```powershell
1. Click chuột phải vào "Start-BrowserShield.ps1"
2. Chọn "Run with PowerShell"
3. Nếu hỏi về Execution Policy, chọn "Yes" hoặc "Run Once"
```

### 2.3 Cách 3: Chạy thủ công
```cmd
cd D:\BrowserShield-Portable
npm install --production
node server.js
```

---

## 🌐 Bước 3: Sử dụng giao diện web

### 3.1 Truy cập Dashboard
Mở trình duyệt và vào: **http://localhost:5000**

### 3.2 Các trang chính
| URL | Chức năng |
|-----|-----------|
| http://localhost:5000 | Dashboard chính |
| http://localhost:5000/admin.html | Quản trị profiles |
| http://localhost:5000/proxy-manager.html | **Quản lý Proxy Pool** |
| http://localhost:5000/browser-control.html | Điều khiển browser |
| http://localhost:5000/mode-manager.html | Quản lý chế độ |
| http://localhost:5000/api-docs | API Documentation |

### 3.3 Tạo Profile mới
1. Vào trang Admin (http://localhost:5000/admin.html)
2. Click "Create New Profile"
3. Điền thông tin:
   - Profile Name: Tên profile
   - Browser Type: Chrome hoặc Firefox
   - Proxy (tùy chọn): host:port:user:pass
4. Click "Create" để tạo

### 3.4 Khởi chạy Browser với Profile
1. Trong danh sách profiles, tìm profile cần dùng
2. Click "Launch" để mở browser
3. Browser sẽ mở với fingerprint đã cấu hình

---

## 🔧 Bước 4: Thiết lập Browser

### 4.1 Tự động (Khuyến nghị)
```
1. Double-click "Download-Browsers.bat"
2. Nhấn Y để xác nhận
3. Script sẽ tự động phát hiện Chrome/Firefox trên hệ thống
```

### 4.2 Thủ công
Nếu browser không được phát hiện tự động:

**Chrome:**
- Cài đặt từ https://www.google.com/chrome
- Hoặc để Puppeteer tự tải (tự động khi chạy lần đầu)

**Firefox:**
- Cài đặt từ https://www.mozilla.org/firefox
- Đường dẫn mặc định: `C:\Program Files\Mozilla Firefox\firefox.exe`

---

## ⚠️ Khắc phục sự cố

### Lỗi 1: "Node.js not found"
```
Nguyên nhân: Chưa cài Node.js hoặc chưa thêm vào PATH
Giải pháp:
1. Cài Node.js từ https://nodejs.org
2. Khởi động lại máy tính
3. Chạy lại Start-BrowserShield.bat
```

### Lỗi 2: "Port 5000 already in use"
```
Nguyên nhân: Có ứng dụng khác đang dùng port 5000
Giải pháp 1: Đổi port
- Mở cmd trong thư mục BrowserShield
- Chạy: set PORT=3000 && node server.js

Giải pháp 2: Tắt ứng dụng đang dùng port 5000
- Chạy: netstat -ano | findstr :5000
- Tìm PID và tắt process đó
```

### Lỗi 3: "Cannot find module..."
```
Nguyên nhân: Dependencies chưa được cài
Giải pháp:
1. Mở cmd trong thư mục BrowserShield
2. Chạy: npm install --production
3. Chạy lại Start-BrowserShield.bat
```

### Lỗi 4: "Browser not found"
```
Nguyên nhân: Không tìm thấy Chrome/Firefox
Giải pháp:
1. Chạy Download-Browsers.bat
2. Hoặc cài Chrome/Firefox thủ công
3. Kiểm tra file browsers/chrome/browser-info.json
```

### Lỗi 5: PowerShell Execution Policy
```
Nguyên nhân: Windows chặn chạy script PowerShell
Giải pháp:
1. Mở PowerShell với quyền Admin
2. Chạy: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
3. Nhấn Y để xác nhận
```

---

## 📁 Backup và di chuyển

### Backup dữ liệu
Các thư mục/file cần backup:
```
data/browser-profiles/    # Profiles đã tạo
data/browsershield.db     # Database
data/profiles.json        # Cấu hình profiles
portable-config.json      # Cấu hình portable
```

### Di chuyển sang máy khác
1. Copy toàn bộ thư mục BrowserShield-Portable
2. Cài Node.js trên máy mới
3. Chạy `npm install --production` (nếu cần)
4. Chạy Start-BrowserShield.bat

---

## 🔒 Bảo mật

- Không chia sẻ thư mục `data/` vì chứa profiles và fingerprints
- Đổi port mặc định nếu chạy trên server công khai
- Sử dụng proxy riêng cho mỗi profile để tránh bị phát hiện
