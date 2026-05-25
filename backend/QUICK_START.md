# ⚡ QUICK START GUIDE - ADMIN MODULE

## 🚀 Chạy nhanh trong 5 phút

### Bước 1: Cài đặt (nếu chưa có)
```bash
cd backend
npm install
```

### Bước 2: Khởi động MongoDB
```bash
# Kiểm tra MongoDB đang chạy
mongosh

# Nếu chưa chạy, start MongoDB service
# Windows: net start MongoDB
# Mac/Linux: sudo systemctl start mongod
```

### Bước 3: Seed dữ liệu
```bash
# Seed roles (nếu chưa có)
npm run seed:roles

# Seed dữ liệu test
npm run seed:data
```

**Kết quả:** Bạn sẽ có:
- 5 users (1 admin, 2 staff, 2 customers)
- 6 services
- 16 appointments
- 8 inventory items

### Bước 4: Chạy server
```bash
npm run dev
```

Server chạy tại: `http://localhost:5000`

### Bước 5: Test API

#### 5.1. Login
```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"Admin@123\"}"
```

**Lưu token từ response!**

#### 5.2. Test Dashboard
```bash
curl -X GET http://localhost:5000/api/admin/dashboard/statistics ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 5.3. Test Users
```bash
curl -X GET http://localhost:5000/api/admin/users ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 5.4. Test Appointments
```bash
curl -X GET http://localhost:5000/api/admin/appointments ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 5.5. Test Inventory
```bash
curl -X GET http://localhost:5000/api/admin/inventory ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📱 Test với Postman (Khuyến nghị)

### Setup
1. Mở Postman
2. Tạo Environment mới:
   - `BASE_URL` = `http://localhost:5000/api`
   - `TOKEN` = (để trống, sẽ điền sau khi login)

### Test Flow
1. **Login**
   - POST `{{BASE_URL}}/auth/login`
   - Body: `{"email":"admin@example.com","password":"Admin@123"}`
   - Copy token từ response → Paste vào Environment variable `TOKEN`

2. **Dashboard**
   - GET `{{BASE_URL}}/admin/dashboard/statistics`
   - Header: `Authorization: Bearer {{TOKEN}}`

3. **Users**
   - GET `{{BASE_URL}}/admin/users?page=1&limit=20`
   - Header: `Authorization: Bearer {{TOKEN}}`

4. **Appointments**
   - GET `{{BASE_URL}}/admin/appointments?status=PENDING`
   - Header: `Authorization: Bearer {{TOKEN}}`

5. **Inventory**
   - GET `{{BASE_URL}}/admin/inventory/low-stock`
   - Header: `Authorization: Bearer {{TOKEN}}`

---

## 🎯 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Admin@123 |
| Staff 1 | staff1@example.com | Staff@123 |
| Staff 2 | staff2@example.com | Staff@123 |
| Customer 1 | customer1@example.com | Customer@123 |
| Customer 2 | customer2@example.com | Customer@123 |

---

## 📊 Kiểm tra Database

```bash
mongosh

use motorcycle_repair

# Xem users
db.users.find().pretty()

# Xem appointments
db.appointments.find().pretty()

# Xem inventory
db.inventory_items.find().pretty()

# Đếm records
db.users.countDocuments()
db.appointments.countDocuments()
db.inventory_items.countDocuments()
```

---

## 🔍 Kiểm tra Server Logs

Server logs sẽ hiển thị:
```
🚀 Server running in development mode on port 5000
📡 API available at http://localhost:5000/api
🏥 Health check at http://localhost:5000/health
```

Mỗi request sẽ log:
```
GET /api/admin/users 200 45.123 ms
POST /api/admin/inventory 201 89.456 ms
```

---

## ✅ Checklist

- [ ] MongoDB đang chạy
- [ ] Dependencies đã cài (`npm install`)
- [ ] Roles đã seed (`npm run seed:roles`)
- [ ] Data đã seed (`npm run seed:data`)
- [ ] Server đang chạy (`npm run dev`)
- [ ] Login thành công và có token
- [ ] Dashboard API hoạt động
- [ ] Users API hoạt động
- [ ] Appointments API hoạt động
- [ ] Inventory API hoạt động

---

## ⚠️ Troubleshooting

### Server không start
```bash
# Kiểm tra MongoDB
mongosh

# Kiểm tra port 5000
netstat -ano | findstr :5000
```

### Lỗi "No token provided"
- Đảm bảo header có: `Authorization: Bearer YOUR_TOKEN`
- Token phải lấy từ login response

### Lỗi "Access denied"
- Đảm bảo login bằng tài khoản admin
- Email: `admin@example.com`

### Database trống
```bash
# Chạy lại seed
npm run seed:data
```

---

## 📚 Tài liệu chi tiết

- [API Documentation](./API_DOCUMENTATION.md) - Tất cả endpoints
- [Admin Module README](./ADMIN_MODULE_README.md) - Hướng dẫn đầy đủ
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Tổng kết triển khai

---

## 🎉 Xong!

Bây giờ bạn có thể:
1. ✅ Test tất cả 28 APIs
2. ✅ Xem dashboard statistics
3. ✅ Quản lý users
4. ✅ Quản lý appointments
5. ✅ Quản lý inventory
6. ✅ Tích hợp với frontend

**Happy Coding! 🚀**
