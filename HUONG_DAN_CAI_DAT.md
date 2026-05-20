# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY PROJECT TASKTRACKER-MNM

> **Định dạng khuyến nghị khi in/xuất PDF:**  
> Font chính: Times New Roman 12pt · Tiêu đề: Times New Roman 14pt Bold · Code: Courier New 11pt

---

## 1. Giới Thiệu Project

**TaskTracker-MNM** là ứng dụng web quản lý công việc và dự án theo nhóm, được xây dựng bằng Node.js (Express) ở phía back-end và HTML/CSS/JavaScript thuần ở phía front-end, sử dụng PostgreSQL làm cơ sở dữ liệu. Ứng dụng hỗ trợ đăng ký/đăng nhập bằng email-password lẫn Google OAuth, cho phép người dùng tạo dự án, quản lý task, phân công thành viên và theo dõi tiến độ trực quan.

---

## 2. Yêu Cầu Trước Khi Bắt Đầu

Trước khi cài đặt, bạn cần chắc chắn máy mình đã có đủ những thứ sau:

| Công cụ | Phiên bản tối thiểu | Tải về |
|---|---|---|
| **Node.js** | v18 trở lên | https://nodejs.org |
| **npm** | v8 trở lên (đi kèm Node.js) | — |
| **PostgreSQL** | v14 trở lên | https://www.postgresql.org/download |
| **Git** | Bất kỳ | https://git-scm.com |

> 💡 **Kiểm tra nhanh:** Mở terminal và chạy lần lượt các lệnh sau để xem đã cài chưa:
>
> ```
> node -v
> npm -v
> psql --version
> ```

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: Kết quả kiểm tra phiên bản Node, npm,      │
│   PostgreSQL trong terminal                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

---

## 3. Cài Đặt Môi Trường

### Bước 3.1 — Tải source code về máy

Nếu bạn có file nén `.zip`, giải nén ra thư mục mong muốn. Nếu dùng Git, clone repo về:

```bash
git clone <URL_REPOSITORY>
cd TaskTracker-MNM
```

### Bước 3.2 — Cài dependencies cho Back-end

Ở thư mục gốc của project, chạy:

```bash
npm install
```

Lệnh này sẽ tải về toàn bộ thư viện back-end (Express, bcrypt, jsonwebtoken, passport, pg, nodemailer…).

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: Terminal đang chạy npm install ở thư mục   │
│   gốc project, hiển thị các gói được tải về                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

### Bước 3.3 — Cài dependencies cho Front-end

```bash
cd frontend
npm install
cd ..
```

Sau bước này, bạn sẽ thấy hai thư mục `node_modules` — một ở thư mục gốc, một trong `frontend/`. Đây là bình thường, mỗi phần chạy server riêng.

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: Terminal sau khi npm install frontend       │
│   hoàn tất, không có lỗi đỏ nào xuất hiện                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

---

## 4. Cấu Hình

### Bước 4.1 — Tạo file `.env`

Project sử dụng file `.env` để lưu các thông tin nhạy cảm (mật khẩu database, API key…). File này **không được** đưa lên Git để bảo mật.

Sao chép file mẫu rồi chỉnh sửa:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Mở file `.env` vừa tạo bằng bất kỳ text editor nào (Notepad, VS Code…):

```
# === KẾT NỐI POSTGRESQL ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here   # ← Điền mật khẩu PostgreSQL của bạn

# === SERVER ===
PORT=8080
FRONTEND_URL=http://localhost:3000

# === XÁC THỰC JWT ===
JWT_SECRET=mot_chuoi_bi_mat_nao_do_ban_tu_dat   # ← Đặt một chuỗi bất kỳ, càng dài càng tốt

# === GOOGLE OAUTH (Bỏ qua nếu không dùng) ===
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback

# === GỬI EMAIL (Bỏ qua nếu không dùng) ===
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

> ⚠️ **Lưu ý quan trọng:** Giá trị bắt buộc phải điền là `DB_PASSWORD` và `JWT_SECRET`. Các mục Google OAuth và SMTP có thể bỏ qua nếu chỉ chạy thử với đăng nhập email-password thông thường.

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: File .env đang mở trong VS Code với các    │
│   biến môi trường đã được điền đầy đủ                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

### Bước 4.2 — Chuẩn bị Database PostgreSQL

#### 4.2.a Tạo database (nếu chưa có)

Mở **pgAdmin** hoặc **psql** rồi chạy:

```sql
CREATE DATABASE postgres;
```

> 💡 Nếu database `postgres` mặc định đã tồn tại thì bỏ qua bước này.

#### 4.2.b Import schema và dữ liệu mẫu

Project có sẵn file `schema.sql` chứa toàn bộ cấu trúc bảng và dữ liệu seed. Chạy lệnh sau để import:

```bash
# Thay YOUR_PASSWORD bằng mật khẩu PostgreSQL của bạn
psql -U postgres -d postgres -f schema.sql
```

Hoặc dùng pgAdmin: **Query Tool** → mở file `schema.sql` → nhấn **Execute (F5)**.

Sau bước này, database sẽ có đầy đủ các bảng (`users`, `projects`, `tasks`…) và một tài khoản demo sẵn:

| Email | Mật khẩu |
|---|---|
| `admin@tasktracker.local` | `Admin@123` |

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: pgAdmin hoặc psql sau khi chạy schema.sql  │
│   thành công, hiển thị danh sách bảng đã tạo               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

### Bước 4.3 — Cấu hình Google OAuth *(Tùy chọn)*

Nếu muốn dùng tính năng "Đăng nhập bằng Google", bạn cần có Google OAuth credentials. Bỏ qua bước này nếu chỉ dùng đăng nhập email-password.

1. Truy cập: https://console.cloud.google.com/apis/credentials
2. Tạo **OAuth 2.0 Client ID**
3. Thêm **Authorized JavaScript origins**: `http://localhost:3000`
4. Thêm **Authorized redirect URIs**: `http://localhost:8080/api/auth/google/callback`
5. Sao chép **Client ID** và **Client Secret** vào file `.env`

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: Google Cloud Console — trang tạo OAuth      │
│   credentials với các URI đã được cấu hình                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

---

## 5. Cách Chạy Project

### Cách 1 — Chạy cả hai server cùng lúc (Khuyến nghị)

**Trên Windows**, chỉ cần double-click file `start-all.bat` trong thư mục gốc, hoặc chạy từ terminal:

```bash
start-all.bat
```

**Trên Linux/Mac:**

```bash
chmod +x start-all.sh
./start-all.sh
```

Script này sẽ tự động mở hai cửa sổ terminal — một cho back-end, một cho front-end.

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: Hai cửa sổ terminal đang chạy song song    │
│   — Backend trên port 8080, Frontend trên port 3000         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

### Cách 2 — Chạy thủ công từng server

Mở **hai terminal riêng biệt**:

**Terminal 1 — Back-end:**
```bash
node index.js
```
> Thấy thông báo `Server running on port 8080` là OK.

**Terminal 2 — Front-end:**
```bash
cd frontend
node server.js
```
> Thấy thông báo `Frontend server running on port 3000` là OK.

---

## 6. Kiểm Tra Chạy Thành Công

Sau khi khởi động, mở trình duyệt và kiểm tra lần lượt các địa chỉ:

### Kiểm tra nhanh qua URL

| Địa chỉ | Kỳ vọng |
|---|---|
| http://localhost:3000 | Trang chủ / giao diện ứng dụng |
| http://localhost:3000/login | Trang đăng nhập |
| http://localhost:3000/register | Trang đăng ký |
| http://localhost:8080/api/health | Trả về `{"ok":true}` |

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: Trình duyệt mở http://localhost:3000/login  │
│   hiển thị giao diện đăng nhập bình thường                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

### Thử đăng nhập với tài khoản demo

1. Vào http://localhost:3000/login
2. Nhập **Email:** `admin@tasktracker.local`
3. Nhập **Mật khẩu:** `Admin@123`
4. Nhấn **Đăng nhập**
5. ✅ Nếu chuyển sang trang Dashboard → Project đã chạy thành công!

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: Dashboard sau khi đăng nhập thành công,    │
│   hiển thị danh sách project và task                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

---

## 7. Một Số Lỗi Thường Gặp và Cách Xử Lý

### Lỗi 1: "Cannot connect to server" / "Không thể kết nối máy chủ"

**Nguyên nhân:** Một trong hai server (hoặc cả hai) chưa được khởi động.

**Cách xử lý:**

```bash
# Kiểm tra back-end có đang chạy không
curl http://localhost:8080/api/health
# Kết quả mong đợi: {"ok":true}

# Kiểm tra front-end có đang chạy không
curl http://localhost:3000/api/health
# Kết quả mong đợi: {"ok":true}
```

Nếu một trong hai lệnh trên báo lỗi, hãy khởi động lại server tương ứng.

---

### Lỗi 2: "Port 8080 (hoặc 3000) already in use"

**Nguyên nhân:** Có ứng dụng khác đang chiếm port đó.

**Cách xử lý trên Windows:**

```bash
# Tìm tiến trình đang dùng port 8080
netstat -ano | findstr :8080

# Tắt tiến trình theo PID tìm được (thay <PID> bằng số thực)
taskkill /PID <PID> /F
```

**Cách xử lý trên Linux/Mac:**

```bash
lsof -ti:8080 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

---

### Lỗi 3: "Database connection error" / Không kết nối được PostgreSQL

**Nguyên nhân:** Thông tin kết nối trong `.env` chưa đúng, hoặc PostgreSQL chưa được khởi động.

**Cách xử lý:**

1. Kiểm tra PostgreSQL đang chạy chưa (mở **Services** trên Windows hoặc chạy `sudo service postgresql start` trên Linux)
2. Mở lại file `.env`, kiểm tra `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` có khớp với cài đặt PostgreSQL không
3. Thử kết nối thủ công:

```bash
psql -U postgres -d postgres -h localhost
```

Nếu vào được psql mà vẫn lỗi app → kiểm tra lại giá trị `DB_PASSWORD` trong `.env`.

<!--
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Chèn ảnh chụp bước này vào đây]                         │
│   Ảnh minh họa: Terminal kết nối psql thành công,          │
│   hiển thị dấu nhắc postgres=#                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
-->

---

### Lỗi 4: Trang trắng hoặc lỗi 404 sau khi đăng nhập

**Nguyên nhân:** Database chưa có dữ liệu hoặc schema chưa được import.

**Cách xử lý:** Chạy lại lệnh import schema:

```bash
psql -U postgres -d postgres -f schema.sql
```

> ⚠️ Lưu ý: Lệnh này sẽ **xóa toàn bộ dữ liệu cũ** và tạo lại từ đầu. Chỉ dùng khi muốn reset sạch về trạng thái ban đầu.

---

### Lỗi 5: Lỗi liên quan đến `npm install` (EACCES, EPERM…)

**Nguyên nhân:** Thiếu quyền ghi vào thư mục.

**Cách xử lý trên Windows:** Mở terminal với quyền **Run as Administrator** rồi chạy lại `npm install`.

**Cách xử lý trên Linux/Mac:**

```bash
sudo npm install
```

---

## 8. Tóm Tắt Nhanh

Nếu chỉ muốn xem qua các bước chính mà không đọc chi tiết:

```
1. Cài Node.js (v18+) và PostgreSQL (v14+)
2. Sao chép .env.example → .env, điền DB_PASSWORD và JWT_SECRET
3. Import database: psql -U postgres -d postgres -f schema.sql
4. Cài thư viện: npm install (gốc) → cd frontend → npm install
5. Chạy: start-all.bat (Windows) hoặc ./start-all.sh (Linux/Mac)
6. Mở trình duyệt: http://localhost:3000
```

---

*Tài liệu này được tạo kèm theo báo cáo đồ án môn học. Mọi thắc mắc vui lòng liên hệ nhóm phát triển.*
