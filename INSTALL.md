# 🚀 BrowserShield - Hướng Dẫn Cài Đặt & Cập Nhật

## 📦 Phiên Bản Portable (Windows) - KHUYẾN NGHỊ CHO NGƯỜI DÙNG MỚI

### Bước 1: Tải và giải nén
```
1. Tải file BrowserShield-Portable-v1.3.0.zip
2. Click chuột phải → "Extract All..." hoặc dùng 7-Zip/WinRAR
3. Giải nén vào thư mục bất kỳ (VD: D:\BrowserShield)
   ⚠️ Tránh đường dẫn có dấu tiếng Việt hoặc ký tự đặc biệt
```

### Bước 2: Kiểm tra Node.js
Mở Command Prompt (cmd) và chạy:
```cmd
node --version
```
- ✅ Nếu hiện `v18.x.x` trở lên → Sẵn sàng
- ❌ Nếu báo lỗi → Cài Node.js từ https://nodejs.org (chọn bản LTS)

### Bước 3: Khởi chạy
```
1. Mở thư mục BrowserShield-Portable
2. Double-click "Start-BrowserShield.bat"
3. Đợi đến khi thấy "Server running on port 5000"
4. Mở trình duyệt: http://localhost:5000
```

### Bước 4: Thiết lập Browser (Tùy chọn)
```
Double-click "Download-Browsers.bat" để tự động phát hiện Chrome/Firefox
```

### Cấu trúc thư mục Portable
```
BrowserShield-Portable/
├── Start-BrowserShield.bat    # 🚀 Launcher chính
├── Start-BrowserShield.ps1    # PowerShell launcher
├── Download-Browsers.bat      # Thiết lập browser
├── portable-config.json       # Cấu hình portable
├── browsers/                  # Browser binaries
├── data/                      # Dữ liệu (profiles, logs, database)
├── config/                    # Cấu hình ứng dụng
├── public/                    # Giao diện web
└── node_modules/              # Dependencies (tự động tạo)
```

### Các trang web chính
| URL | Chức năng |
|-----|-----------|
| http://localhost:5000 | Dashboard chính |
| http://localhost:5000/admin.html | Quản trị profiles |
| http://localhost:5000/proxy-manager.html | **Quản lý Proxy Pool** |
| http://localhost:5000/browser-control.html | Điều khiển browser |
| http://localhost:5000/mode-manager.html | Quản lý chế độ |

### Khắc phục sự cố Portable

**Lỗi "Node.js not found":**
```
→ Cài Node.js từ https://nodejs.org
→ Khởi động lại máy tính
→ Chạy lại Start-BrowserShield.bat
```

**Lỗi "Port 5000 already in use":**
```cmd
# Đổi port khác
set PORT=3000 && node server.js
```

**Lỗi "Cannot find module...":**
```cmd
cd BrowserShield-Portable
npm install --production
```

**Lỗi PowerShell Execution Policy:**
```powershell
# Mở PowerShell với quyền Admin
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Di chuyển/Backup Portable
```
Backup các thư mục/file sau:
- data/browser-profiles/    # Profiles đã tạo
- data/browsershield.db     # Database
- data/profiles.json        # Cấu hình profiles
- portable-config.json      # Cấu hình portable
```

---

## Cài Đặt Mới (Oracle Linux 9)

### Cách 1: Cài đặt tự động (Khuyến nghị)
```bash
curl -sSL https://raw.githubusercontent.com/huynd94/TheBrowserShield/main/scripts/install-browsershield-fixed-robust.sh | bash
```

### Cách 2: Cài đặt thủ công
```bash
wget https://raw.githubusercontent.com/huynd94/TheBrowserShield/main/scripts/install-browsershield-fixed-robust.sh
chmod +x install-browsershield-fixed-robust.sh
./install-browsershield-fixed-robust.sh
```

## 🔄 Cập Nhật Hệ Thống

### Cập nhật nhanh
```bash
curl -sSL https://raw.githubusercontent.com/huynd94/TheBrowserShield/main/scripts/update-system.sh | bash
```

### Dọn dẹp scripts cũ
```bash
cd /home/opc/browsershield/scripts
./cleanup-unused-scripts.sh
```

### Giám sát hệ thống
```bash
cd /home/opc/browsershield/scripts
./monitor.sh
```

## 📋 Sau Khi Cài Đặt

### Truy cập ứng dụng:
- **Trang chủ**: http://your-server:5000
- **Admin Panel**: http://your-server:5000/admin
- **Mode Manager**: http://your-server:5000/mode-manager

### Kiểm tra service:
```bash
sudo systemctl status browsershield.service
```

### Xem logs:
```bash
sudo journalctl -u browsershield.service -f
```

## 🛠️ Quản Lý Service

```bash
# Khởi động
sudo systemctl start browsershield.service

# Dừng
sudo systemctl stop browsershield.service

# Khởi động lại
sudo systemctl restart browsershield.service

# Kiểm tra trạng thái
sudo systemctl status browsershield.service
```

## ⚙️ Chế Độ Hoạt Động

### Mock Mode (Mặc định)
- Dùng cho demo và testing
- Không cần cài đặt trình duyệt thật
- An toàn và nhanh chóng

### Production Mode (Chrome)
- Trình duyệt automation thật
- Cần cài đặt Chromium:
```bash
sudo dnf install -y epel-release chromium
```

### Firefox Mode
- Automation với Firefox
- Cần cài đặt Firefox:
```bash
sudo dnf install -y firefox
```

## 🔧 Xử Lý Sự Cố

### Service không khởi động:
```bash
# Kiểm tra logs
sudo journalctl -u browsershield.service -n 20

# Kiểm tra syntax
cd /home/opc/browsershield
node -c server.js
```

### Port bị chiếm:
```bash
# Kill process cũ
sudo pkill -f "node server.js"
sudo systemctl restart browsershield.service
```

### Khôi phục từ backup:
```bash
cd /home/opc
sudo systemctl stop browsershield.service
rm -rf browsershield
cp -r browsershield-backup-YYYYMMDD-HHMMSS browsershield
sudo systemctl start browsershield.service
```

## 📞 Hỗ Trợ

- **GitHub**: https://github.com/huynd94/TheBrowserShield
- **Issues**: https://github.com/huynd94/TheBrowserShield/issues
- **Documentation**: Xem các file MD trong project

## 📅 Bảo Trì Định Kỳ

### Hàng tuần:
- Chạy script cập nhật
- Kiểm tra logs hệ thống
- Dọn dẹp backup cũ

### Hàng tháng:
- Backup toàn bộ hệ thống
- Đánh giá hiệu suất
- Cập nhật documentation