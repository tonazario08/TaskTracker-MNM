# 🚀 TaskTracker - Quick Start Guide

## ✅ CONNECTION ISSUES FIXED

### Problems That Were Fixed:

1. **"Không thể kết nối máy chủ" (Cannot connect to server)** - FIXED ✓
   - Frontend now uses proxy server
   - API requests use relative URLs (`/api`) instead of absolute URLs
   - CORS properly configured

2. **"ERR_CONNECTION_REFUSED" on Google OAuth** - FIXED ✓
   - Google OAuth route now uses proxy
   - Callback redirects properly configured
   - Frontend/backend communication working

3. **Register function broken** - FIXED ✓
   - API endpoint corrected
   - Fetch requests working
   - Error handling improved
   - Loading states working

---

## 🎯 HOW IT WORKS NOW

### Architecture:
```
Browser (http://localhost:3000)
    ↓
Frontend Server (Express + Proxy)
    ↓ /api/* requests proxied to →
Backend Server (http://localhost:8080)
    ↓
PostgreSQL Database
```

### Key Changes:
- Frontend uses **relative URLs** (`/api/auth/register`) instead of absolute URLs
- Frontend proxy server forwards all `/api/*` requests to backend
- No CORS issues because requests appear to come from same origin
- Google OAuth works through proxy

---

## 🚀 QUICK START (3 Steps)

### Option 1: Use Startup Scripts (Easiest)

**Windows:**
```cmd
start-all.bat
```

**Linux/Mac:**
```bash
./start-all.sh
```

This starts both servers automatically!

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

---

## 📋 FIRST TIME SETUP

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Setup Database

Make sure PostgreSQL is running, then:

```bash
node run_migration.js
```

### 3. Configure Environment

Edit `.env` file (optional for Google OAuth):

```env
# Required
PORT=8080
FRONTEND_URL=http://localhost:3000

# Optional - for Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
```

### 4. Start Servers

**Windows:**
```cmd
start-all.bat
```

**Linux/Mac:**
```bash
./start-all.sh
```

---

## 🌐 ACCESS THE APPLICATION

After starting both servers:

| Page | URL |
|------|-----|
| **Login** | http://localhost:3000/login |
| **Register** | http://localhost:3000/register |
| **Dashboard** | http://localhost:3000/dashboard |
| **Landing** | http://localhost:3000/ |

---

## 🧪 TEST THE FIXES

### Test 1: Register New User

1. Go to: http://localhost:3000/register
2. Fill in the form:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
   - Confirm Password: password123
3. Click **Đăng ký**
4. ✅ Should see success message
5. ✅ Should redirect to login page
6. ✅ NO "Không thể kết nối máy chủ" error

### Test 2: Login

1. Go to: http://localhost:3000/login
2. Enter credentials:
   - Email: test@example.com
   - Password: password123
3. Click **Đăng nhập**
4. ✅ Should redirect to dashboard
5. ✅ NO connection errors

### Test 3: Google OAuth

1. Go to: http://localhost:3000/login
2. Click **Đăng nhập bằng Google**
3. ✅ Should redirect to Google consent screen (NOT ERR_CONNECTION_REFUSED)
4. Select Google account
5. ✅ Should redirect back to dashboard

---

## 🔧 TROUBLESHOOTING

### Issue: "Cannot connect to server"

**Check if servers are running:**

```bash
# Check backend
curl http://localhost:8080/api/health
# Should return: {"ok":true}

# Check frontend
curl http://localhost:3000
# Should return HTML
```

**Solution:**
```bash
# Start backend
npm start

# Start frontend (new terminal)
cd frontend
npm start
```

### Issue: Port already in use

**Windows:**
```cmd
# Find process on port 8080
netstat -ano | findstr :8080

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Issue: Google OAuth still shows "invalid_client"

**Solution:**

1. Make sure `.env` has correct credentials:
```bash
cat .env | grep GOOGLE
```

2. Verify Google Cloud Console settings:
   - Authorized redirect URI: `http://localhost:8080/api/auth/google/callback`
   - Authorized JavaScript origin: `http://localhost:3000`

3. Restart backend:
```bash
# Stop with Ctrl+C, then:
npm start
```

### Issue: Database connection error

**Solution:**

```bash
# Check PostgreSQL is running
pg_ctl status

# Run migration
node run_migration.js

# Test connection
psql -U postgres -d postgres -c "SELECT 1;"
```

---

## 📁 PROJECT STRUCTURE

```
TaskTracker-MNM/
│
├── backend/
│   ├── app.js                    # Express app with CORS
│   ├── server.js                 # Server startup
│   ├── config/
│   │   ├── db.js                 # PostgreSQL connection
│   │   └── passport.js           # Google OAuth strategy
│   ├── routes/
│   │   └── auth.js               # Auth routes (FIXED redirects)
│   └── lib/
│       └── sessionStore.js       # JWT session management
│
├── frontend/
│   ├── server.js                 # Frontend proxy server
│   ├── src/
│   │   └── pages/
│   │       ├── login.html        # FIXED: Uses /api instead of http://localhost:8080
│   │       ├── register.html     # FIXED: Uses /api instead of http://localhost:8080
│   │       └── dashboard.html
│   └── package.json
│
├── .env                          # Environment variables
├── package.json                  # Backend dependencies
├── index.js                      # Backend entry point
│
├── start-all.bat                 # Windows: Start both servers
├── start-all.sh                  # Linux/Mac: Start both servers
├── start-backend.bat             # Windows: Start backend only
├── start-backend.sh              # Linux/Mac: Start backend only
├── start-frontend.bat            # Windows: Start frontend only
├── start-frontend.sh             # Linux/Mac: Start frontend only
│
└── QUICKSTART.md                 # This file
```

---

## 🔑 KEY CHANGES MADE

### 1. Frontend API Requests (FIXED)

**Before (BROKEN):**
```javascript
fetch('http://localhost:8080/api/auth/register', ...)
```

**After (WORKING):**
```javascript
fetch('/api/auth/register', ...)
```

The frontend proxy server forwards `/api/*` to backend automatically.

### 2. Google OAuth Links (FIXED)

**Before (BROKEN):**
```html
<a href="http://localhost:8080/api/auth/google">
```

**After (WORKING):**
```html
<a href="/api/auth/google">
```

### 3. OAuth Callback Redirects (FIXED)

**Before:**
```javascript
res.redirect('http://localhost:3000/src/pages/dashboard.html');
```

**After:**
```javascript
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
res.redirect(`${frontendUrl}/dashboard`);
```

### 4. Frontend Proxy Configuration (ALREADY CORRECT)

```javascript
// frontend/server.js
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:8080',
    changeOrigin: true,
}));
```

This forwards all `/api/*` requests to the backend.

---

## 📊 REQUEST FLOW

### Register Request Flow:

```
1. User fills form on http://localhost:3000/register
2. JavaScript: fetch('/api/auth/register', ...)
3. Frontend proxy: Forwards to http://localhost:8080/api/auth/register
4. Backend: Processes registration
5. Backend: Returns success/error
6. Frontend: Shows message and redirects
```

### Google OAuth Flow:

```
1. User clicks "Login with Google" on http://localhost:3000/login
2. Browser: GET /api/auth/google
3. Frontend proxy: Forwards to http://localhost:8080/api/auth/google
4. Backend: Redirects to Google consent screen
5. User: Selects Google account
6. Google: Redirects to http://localhost:8080/api/auth/google/callback
7. Backend: Processes OAuth, creates session
8. Backend: Redirects to http://localhost:3000/dashboard
9. User: Logged in successfully
```

---

## ✅ VERIFICATION CHECKLIST

Before testing, verify:

- [ ] Backend server running on port 8080
- [ ] Frontend server running on port 3000
- [ ] PostgreSQL database running
- [ ] Database migration completed
- [ ] `.env` file configured
- [ ] Both servers show no errors in console

**Quick verification:**

```bash
# Test backend
curl http://localhost:8080/api/health
# Should return: {"ok":true}

# Test frontend
curl http://localhost:3000
# Should return HTML

# Test proxy
curl http://localhost:3000/api/health
# Should return: {"ok":true} (proxied to backend)
```

---

## 🎉 YOU'RE ALL SET!

The connection issues are now fixed. Both registration and Google OAuth work correctly.

**Start the application:**

```bash
# Windows
start-all.bat

# Linux/Mac
./start-all.sh
```

**Then visit:** http://localhost:3000/login

---

## 📚 Additional Documentation

- **Complete Setup:** `SETUP_AUTH.md`
- **Google OAuth Setup:** `GOOGLE_OAUTH_SETUP.md`
- **All Commands:** `COMMANDS.md`
- **Detailed Changes:** `AUTH_FIX_SUMMARY.md`
- **Verification Script:** `node verify-auth.js`
