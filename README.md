# ParkingLot Management System

Hệ thống quản lý bãi đỗ xe tích hợp nhận diện biển số tự động (License Plate Recognition) với giao diện quản lý toàn diện.

## 📋 Tổng quan

ParkingLot là hệ thống quản lý bãi đỗ xe thông minh bao gồm:
- **Frontend (React)**: Giao diện người dùng cho admin, staff, và khách hàng
- **Backend (Node.js/Express)**: API server xử lý business logic
- **LP Recognition Service (Python/Flask)**: Dịch vụ nhận diện biển số xe sử dụng YOLOv5

## 🏗️ Cấu trúc dự án

```
ParkingLot/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # Context providers
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS styles
│   └── package.json
│
├── server/                # Node.js Backend
│   ├── controllers/       # Route controllers
│   ├── models/           # Mongoose models
│   ├── utils/            # Helper functions
│   ├── lp-service/       # Python LP Recognition Service
│   │   ├── api_server.py
│   │   ├── lp_recognition_service.py
│   │   └── requirements.txt
│   └── package.json
│
└── README.md
```

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 19.2.0**: UI framework
- **Vite**: Build tool & dev server
- **Axios**: HTTP client
- **React Router**: Routing

### Backend
- **Node.js 18+**: Runtime environment
- **Express**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM
- **JWT**: Authentication

### LP Recognition Service
- **Python 3.8+**: Programming language
- **Flask**: Web framework
- **YOLOv5**: Object detection
- **OpenCV**: Image processing
- **EasyOCR**: Text recognition

## 📦 Yêu cầu hệ thống

- **Node.js**: 18.x hoặc cao hơn
- **Python**: 3.8+ (khuyến nghị 3.9 hoặc 3.10)
- **npm**: 8.x+ hoặc yarn
- **pip**: Package manager cho Python

## 🚀 Cài đặt và Khởi động

### 1. Clone Repository

```bash
git clone <repository-url>
cd ParkingLot
```

### 2. Backend Server (Node.js)

```bash
# Di chuyển vào thư mục server
cd server

# Cài đặt dependencies
npm install

# Khởi động server
npm run dev

# Server sẽ chạy tại: http://localhost:3001
```

### 3. LP Recognition Service (Python)

```bash
# Di chuyển vào thư mục lp-service
cd server/lp-service

# Tạo virtual environment (khuyến nghị)
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Khởi động service
python api_server.py

# Service sẽ chạy tại: http://localhost:5001
```

**Lưu ý**: 
- Lần đầu chạy sẽ tải model YOLOv5 (có thể mất vài phút)
- Service yêu cầu ~2GB RAM khi chạy

### 4. Frontend Client (React)

```bash
# Mở terminal mới, di chuyển vào thư mục client
cd client

# Cài đặt dependencies
npm install

# Khởi động development server
npm run dev

# Client sẽ chạy tại: http://localhost:5173
```

## 🎯 Truy cập ứng dụng

Sau khi khởi động đầy đủ 3 services:

1. **Frontend**: http://localhost:5173
2. **Backend API**: http://localhost:3001
3. **LP Service**: http://localhost:5001

## 📝 Scripts quan trọng

### Client
```bash
npm run dev          # Chạy dev server
npm run build        # Build production
npm run preview      # Preview production build
npm run lint         # Kiểm tra code style
```

### Server
```bash
npm run dev          # Chạy với nodemon (auto-reload)
npm start            # Chạy production
npm run lint         # Kiểm tra code style
```

### LP Service
```bash
python api_server.py              # Chạy service
python test_service.py            # Test service
```

##  API Documentation

API endpoints được tổ chức theo modules:

- `/api/admin-accounts` - Quản lý tài khoản admin
- `/api/staff-accounts` - Quản lý tài khoản nhân viên
- `/api/customers` - Quản lý khách hàng
- `/api/cards` - Quản lý thẻ xe
- `/api/vehicles` - Quản lý phương tiện
- `/api/entry-sessions` - Quản lý phiên vào/ra
- `/api/entry-sessions/gate/*` - Endpoints cho cổng ra/vào

Chi tiết xem file `INTEGRATION_GUIDE.md` trong thư mục `server/`

## 🐛 Xử lý sự cố

### Frontend không kết nối được Backend
- Đảm bảo backend đang chạy trên port 3001
- Kiểm tra CORS settings trong `server/app.js`

### LP Service lỗi khi nhận diện
- Đảm bảo đã cài đặt đủ dependencies Python
- Kiểm tra model đã được tải về chưa
- Thử chạy `python test_service.py` để debug

### Port đã được sử dụng
```bash
# Tìm và kill process đang sử dụng port
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac:
lsof -i :3001
kill -9 <PID>
```

## 📖 Tài liệu bổ sung

- [Component Architecture](client/COMPONENT_ARCHITECTURE.md) - Kiến trúc component React
- [Project Structure](client/PROJECT_STRUCTURE.md) - Cấu trúc dự án client
- [Integration Guide](server/INTEGRATION_GUIDE.md) - Hướng dẫn tích hợp API

## 👥 Phân quyền người dùng

### Admin
- Toàn quyền quản lý hệ thống
- Quản lý nhân viên, khách hàng
- Cấu hình giá, quy tắc tính phí
- Xem báo cáo, thống kê

### Staff
- Xử lý vào/ra tại cổng
- Nhận diện biển số tự động
- Xem thông tin khách hàng, thẻ
- Báo cáo ca làm việc

### Customer (Portal)
- Xem thông tin tài khoản
- Lịch sử gửi xe
- Gia hạn subscription
- Thanh toán online (tương lai)

## 🔐 Bảo mật

- JWT token authentication
- Password hashing với bcrypt
- Role-based access control (RBAC)
- HTTPS cho production (khuyến nghị)
- Rate limiting (nên implement)

## 🚧 Roadmap

- [ ] Tích hợp payment gateway
- [ ] Mobile app (React Native)
- [ ] Notification system (Email/SMS)
- [ ] Real-time dashboard với WebSocket
- [ ] Backup & restore database
- [ ] Multi-language support
- [ ] Advanced analytics & reporting

## 📄 License

[Thêm license information]

## 🤝 Contributing

[Thêm contribution guidelines]

## 📞 Liên hệ

[Thêm contact information]

---

**Lưu ý**: Đây là hệ thống đang trong quá trình phát triển. Một số tính năng có thể chưa hoàn thiện.
