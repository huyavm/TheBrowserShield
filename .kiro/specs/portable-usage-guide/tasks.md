# BrowserShield Portable - Implementation Tasks

## Task 1: Chuẩn bị môi trường
- [x] Giải nén file ZIP vào thư mục
- [x] Kiểm tra Node.js đã cài đặt (`node --version`)
- [ ] Cài Node.js nếu chưa có (https://nodejs.org)

## Task 2: Khởi chạy ứng dụng
- [ ] Chạy `Start-BrowserShield.bat`
- [ ] Đợi dependencies được cài đặt tự động (lần đầu)
- [ ] Xác nhận server chạy trên port 5000
- [ ] Mở http://localhost:5000 trong trình duyệt

## Task 3: Thiết lập Browser
- [ ] Chạy `Download-Browsers.bat`
- [ ] Xác nhận Chrome/Firefox được phát hiện
- [ ] Kiểm tra file `browsers/*/browser-info.json`

## Task 4: Tạo Profile đầu tiên
- [ ] Truy cập http://localhost:5000/admin.html
- [ ] Click "Create New Profile"
- [ ] Điền tên profile và chọn browser type
- [ ] Cấu hình proxy (tùy chọn)
- [ ] Click "Create" và xác nhận profile được tạo

## Task 5: Khởi chạy Browser
- [ ] Tìm profile trong danh sách
- [ ] Click "Launch" để mở browser
- [ ] Xác nhận browser mở với fingerprint đã cấu hình
- [ ] Test truy cập website để kiểm tra

## Task 6: Khắc phục sự cố (nếu có)
- [ ] Xem log trong `data/logs/` nếu có lỗi
- [ ] Kiểm tra port 5000 có bị chiếm không
- [ ] Chạy `npm install --production` nếu thiếu dependencies
- [ ] Restart server nếu cần

## Quick Commands Reference

```cmd
# Kiểm tra Node.js
node --version

# Cài dependencies thủ công
cd BrowserShield-Portable
npm install --production

# Chạy server thủ công
node server.js

# Chạy với port khác
set PORT=3000 && node server.js

# Kiểm tra port đang dùng
netstat -ano | findstr :5000
```
