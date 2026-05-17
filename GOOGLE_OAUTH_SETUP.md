# Hướng dẫn thiết lập Google OAuth 2.0 / Google OAuth 2.0 Setup Guide

## Các bước thực hiện / Step-by-Step Instructions

### Bước 1: Truy cập Google Cloud Console / Step 1: Access Google Cloud Console

Truy cập: https://console.cloud.google.com/

Đăng nhập bằng tài khoản Google của bạn.

---

### Bước 2: Tạo Project mới / Step 2: Create New Project

1. Nhấn vào dropdown "Select a project" ở góc trên bên trái
2. Nhấn **"NEW PROJECT"**
3. Điền thông tin:
   - **Project name**: `TaskTracker` (hoặc tên bạn muốn)
   - **Organization**: Để mặc định (No organization)
4. Nhấn **"CREATE"**
5. Đợi vài giây để project được tạo

---

### Bước 3: Kích hoạt Google+ API (Tùy chọn) / Step 3: Enable Google+ API (Optional)

**Lưu ý**: Google+ API đã deprecated. Bạn có thể bỏ qua bước này hoặc enable **Google People API** thay thế.

1. Trong Google Cloud Console, đảm bảo project "TaskTracker" đang được chọn
2. Vào menu bên trái: **APIs & Services** → **Library**
3. Tìm kiếm "Google People API"
4. Nhấn vào "Google People API"
5. Nhấn nút **"ENABLE"**
   
---

### Bước 4: Cấu hình OAuth Consent Screen / Step 4: Configure OAuth Consent Screen

1. Vào **APIs & Services** → **OAuth consent screen**
2. Chọn **"External"** (cho phép bất kỳ ai có Google account đăng nhập)
3. Nhấn **"CREATE"**

#### Trang 1: App information
- **App name**: `TaskTracker`
- **User support email**: Chọn email của bạn từ dropdown
- **App logo**: (Tùy chọn, có thể bỏ qua)
- **Application home page**: `http://localhost:8080`
- **Application privacy policy link**: Để trống (hoặc điền nếu có)
- **Application terms of service link**: Để trống (hoặc điền nếu có)
- **Authorized domains**: **BỎ TRỐNG** (vì đang dùng localhost)
- **Developer contact information**: Nhập email của bạn

Nhấn **"SAVE AND CONTINUE"**

#### Trang 2: Scopes
1. Nhấn **"ADD OR REMOVE SCOPES"**
2. Tìm và chọn các scope sau:
   - `.../auth/userinfo.email` - View your email address
   - `.../auth/userinfo.profile` - See your personal info
   - `openid` - Associate you with your personal info on Google
3. Nhấn **"UPDATE"**
4. Nhấn **"SAVE AND CONTINUE"**

#### Trang 3: Test users
1. Nhấn **"ADD USERS"**
2. Nhập email của bạn (để test)
3. Nhấn **"ADD"**
4. Nhấn **"SAVE AND CONTINUE"**

#### Trang 4: Summary
- Xem lại thông tin
- Nhấn **"BACK TO DASHBOARD"**

---

### Bước 5: Tạo OAuth 2.0 Credentials / Step 5: Create OAuth 2.0 Credentials

1. Vào **APIs & Services** → **Credentials**
2. Nhấn **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Chọn **Application type**: **"Web application"**
4. Điền thông tin:
   - **Name**: `TaskTracker Web Client`

#### Authorized JavaScript origins:
Nhấn **"ADD URI"** và nhập:
```
http://localhost:8080
```

#### Authorized redirect URIs:
Nhấn **"ADD URI"** và nhập:
```
http://localhost:8080/api/auth/google/callback
```

⚠️ **QUAN TRỌNG**: URL phải chính xác 100%, không có dấu `/` ở cuối!

5. Nhấn **"CREATE"**

---

### Bước 6: Lấy Credentials / Step 6: Get Your Credentials

Một popup sẽ hiện ra với:
- **Your Client ID**: Chuỗi dài kiểu `123456789-abc...xyz.apps.googleusercontent.com`
- **Your Client Secret**: Chuỗi ngắn hơn kiểu `GOCSPX-...`

**QUAN TRỌNG**: 
- Copy cả 2 giá trị này
- Nhấn **"DOWNLOAD JSON"** để backup (tùy chọn)
- Nhấn **"OK"**

---

### Bước 7: Cấu hình Backend / Step 7: Update .env File

1. Mở file `.env` trong thư mục `to-do-webapp/`
2. Tìm phần Google OAuth (đang bị comment)
3. Bỏ comment (`#`) và điền thông tin:

```env
# Google OAuth
GOOGLE_CLIENT_ID=paste-your-client-id-here
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
```

**Ví dụ thực tế**:
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-1234567890abcdefghij
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
```

3. **Lưu file** (Ctrl+S)

---

### Bước 8: Khởi động lại Server / Step 8: Restart Backend Server

```bash
cd to-do-webapp
npm run dev
```

**Kiểm tra log**:
- ✅ Thành công: `✓ Google OAuth configured`
- ❌ Thất bại: `⚠ Google OAuth not configured (missing credentials in .env)`

Nếu thấy thông báo thất bại, kiểm tra lại:
- Client ID và Secret có đúng không?
- Có khoảng trắng thừa không?
- Đã lưu file `.env` chưa?

---

### Bước 9: Test Google Login / Step 9: Test Google Login

1. Mở trình duyệt
2. Truy cập: `http://localhost:8080/login`
3. Nhấn nút **"Continue with Google"**
4. Chọn tài khoản Google của bạn
5. Cho phép ứng dụng truy cập thông tin cơ bản
6. Bạn sẽ được redirect về trang TaskTracker và đăng nhập thành công

---

## ✅ Checklist kiểm tra / Verification Checklist

Trước khi test, đảm bảo:

- [ ] Project đã được tạo trong Google Cloud Console
- [ ] OAuth consent screen đã được cấu hình đầy đủ
- [ ] OAuth 2.0 Client ID đã được tạo
- [ ] Authorized JavaScript origins: `http://localhost:8080`
- [ ] Authorized redirect URIs: `http://localhost:8080/api/auth/google/callback`
- [ ] Client ID đã được copy vào `.env`
- [ ] Client Secret đã được copy vào `.env`
- [ ] File `.env` đã được lưu
- [ ] Backend server đã được khởi động lại
- [ ] Log hiển thị: `✓ Google OAuth configured`

---

## 🔧 Xử lý lỗi thường gặp / Common Issues

### Lỗi 1: "redirect_uri_mismatch"

**Nguyên nhân**:
- URL callback không khớp với cấu hình trong Google Console

**Giải pháp**:
1. Vào Google Cloud Console → Credentials
2. Nhấn vào OAuth 2.0 Client ID của bạn
3. Kiểm tra "Authorized redirect URIs"
4. Đảm bảo có chính xác: `http://localhost:8080/api/auth/google/callback`
5. **Không có dấu `/` ở cuối**
6. Nhấn **"SAVE"**
7. Đợi 5 phút để thay đổi có hiệu lực

### Lỗi 2: "Access blocked: This app's request is invalid"

**Nguyên nhân**:
- OAuth consent screen chưa được cấu hình đúng
- Thiếu scopes

**Giải pháp**:
1. Quay lại **OAuth consent screen**
2. Kiểm tra lại các scopes đã thêm
3. Đảm bảo có: `userinfo.email`, `userinfo.profile`, `openid`
4. Nhấn **"SAVE"**

### Lỗi 3: "This app isn't verified"

**Nguyên nhân**:
- App đang ở chế độ testing
- Bạn chưa được thêm vào test users

**Giải pháp**:
- **Cách 1**: Nhấn **"Advanced"** → **"Go to TaskTracker (unsafe)"**
- **Cách 2**: Thêm email của bạn vào Test users trong OAuth consent screen

### Lỗi 4: "⚠ Google OAuth not configured"

**Nguyên nhân**:
- Thiếu hoặc sai credentials trong `.env`
- File `.env` chưa được lưu
- Server chưa được khởi động lại

**Giải pháp**:
1. Mở file `.env`
2. Kiểm tra `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`
3. Đảm bảo không có khoảng trắng thừa
4. Đảm bảo không có dấu ngoặc kép `"` bao quanh giá trị
5. Lưu file (Ctrl+S)
6. Khởi động lại server: `npm run dev`

### Lỗi 5: "The OAuth client was not found" (Error 401: invalid_client)

**Nguyên nhân**:
- Client ID hoặc Client Secret sai
- Copy thiếu hoặc thừa ký tự

**Giải pháp**:
1. Vào Google Cloud Console → Credentials
2. Nhấn vào OAuth 2.0 Client ID
3. Copy lại Client ID và Client Secret
4. Paste vào `.env` (cẩn thận không copy thừa khoảng trắng)
5. Lưu và khởi động lại server

---

## 🔒 Lưu ý bảo mật / Security Notes

### 1. KHÔNG commit file `.env` lên Git

File `.env` chứa thông tin nhạy cảm. Đảm bảo:
- File `.env` đã có trong `.gitignore`
- Kiểm tra: `git status` không hiển thị `.env`

### 2. Giữ bí mật Client Secret

- **KHÔNG** share Client Secret với ai
- **KHÔNG** đăng lên public repository
- **KHÔNG** commit vào code

### 3. Khi deploy production

Tạo OAuth credentials mới cho production:

1. **Tạo OAuth Client ID mới**:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`

2. **Cập nhật .env production**:
   ```env
   GOOGLE_CLIENT_ID=<production-client-id>
   GOOGLE_CLIENT_SECRET=<production-client-secret>
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Publish OAuth consent screen**:
   - Vào OAuth consent screen
   - Nhấn **"PUBLISH APP"**
   - Hoặc submit for verification nếu cần

---

## 📚 Tài liệu tham khảo / Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Passport.js Google OAuth Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)

---

## 💡 Tips

1. **Bookmark Google Cloud Console**: Bạn sẽ cần quay lại nhiều lần
2. **Lưu credentials**: Download JSON backup khi tạo credentials
3. **Test với nhiều tài khoản**: Thêm nhiều test users để test đầy đủ
4. **Đọc error messages**: Google OAuth error messages rất chi tiết và hữu ích
5. **Đợi 5 phút**: Sau khi thay đổi settings, đợi 5 phút để có hiệu lực

---

**Chúc bạn thiết lập thành công! 🎉**
