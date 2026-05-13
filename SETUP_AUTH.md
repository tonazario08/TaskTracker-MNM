# TaskTracker Authentication Setup Guide

## ✅ FIXED ISSUES

### 1. Normal Account Registration - FIXED ✓
- Register form now submits to correct backend endpoint
- Validation working for all fields
- Password confirmation working
- Users saved to database successfully
- Redirects to login after successful registration

### 2. Google OAuth Login - FIXED ✓
- Google OAuth strategy configured correctly
- Callback URL fixed
- Redirect URIs updated
- CORS enabled for cross-origin requests
- Session/JWT handling working

---

## 📋 SETUP INSTRUCTIONS

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure PostgreSQL Database

Make sure PostgreSQL is running and accessible with the credentials in `.env`:

```bash
# Default credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
```

### Step 3: Run Database Migration

Run the authentication migration to add required columns:

```bash
node run_migration.js
```

Or manually run the SQL:

```bash
psql -U postgres -d postgres -f migration_auth.sql
```

The migration adds:
- `is_verified` column (BOOLEAN)
- `google_id` column (VARCHAR)
- `avatar_url` column (if not exists)
- Makes `password_hash` nullable (for Google OAuth users)

### Step 4: Configure Google OAuth Credentials

#### A. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if prompted
6. Select **Web application** as application type
7. Add these URIs:

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:8080/api/auth/google/callback
```

8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

#### B. Update .env File

Open `.env` and replace the placeholder values:

```env
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET
```

**IMPORTANT:** The redirect URI in Google Cloud Console MUST EXACTLY match:
```
http://localhost:8080/api/auth/google/callback
```

### Step 5: Start the Backend Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

Backend will run on: **http://localhost:8080**

### Step 6: Start the Frontend Server

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm start
```

Frontend will run on: **http://localhost:3000**

---

## 🧪 TESTING THE AUTHENTICATION

### Test Normal Registration

1. Open browser: `http://localhost:3000/src/pages/register.html`
2. Fill in the form:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
   - Confirm Password: password123
3. Click **Đăng ký**
4. Should see success message and redirect to login

### Test Normal Login

1. Open browser: `http://localhost:3000/src/pages/login.html`
2. Enter credentials:
   - Email: test@example.com
   - Password: password123
3. Click **Đăng nhập**
4. Should redirect to dashboard: `http://localhost:3000/src/pages/dashboard.html`

### Test Google OAuth Login

1. Open browser: `http://localhost:3000/src/pages/login.html`
2. Click **Đăng nhập bằng Google** button
3. Should redirect to Google consent screen
4. Select your Google account
5. Grant permissions
6. Should redirect back to: `http://localhost:3000/src/pages/dashboard.html`
7. User should be logged in with Google account

---

## 🔧 TROUBLESHOOTING

### Error: "The OAuth client was not found" (401: invalid_client)

**Cause:** Google OAuth credentials are incorrect or not configured

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
2. Make sure they match the credentials in Google Cloud Console
3. Restart the backend server after changing `.env`

### Error: "redirect_uri_mismatch"

**Cause:** The callback URL doesn't match Google Cloud Console settings

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add this EXACT URL to "Authorized redirect URIs":
   ```
   http://localhost:8080/api/auth/google/callback
   ```
4. Save and wait a few minutes for changes to propagate

### Error: "Cannot POST /api/auth/register"

**Cause:** Backend server not running or CORS issue

**Solution:**
1. Make sure backend is running on port 8080
2. Check backend console for errors
3. Verify CORS is enabled in `backend/app.js`

### Error: "Không thể kết nối máy chủ"

**Cause:** Frontend cannot reach backend

**Solution:**
1. Verify backend is running: `http://localhost:8080/api/health`
2. Check if CORS is properly configured
3. Make sure frontend is using correct backend URL: `http://localhost:8080`

### Database Connection Error

**Cause:** PostgreSQL not running or wrong credentials

**Solution:**
1. Start PostgreSQL service
2. Verify credentials in `.env` match your PostgreSQL setup
3. Test connection: `psql -U postgres -d postgres`

---

## 📁 FILE STRUCTURE

```
TaskTracker-MNM/
├── backend/
│   ├── app.js                    # Express app with CORS
│   ├── server.js                 # Server startup
│   ├── config/
│   │   ├── db.js                 # PostgreSQL connection
│   │   └── passport.js           # Passport Google OAuth strategy
│   ├── routes/
│   │   └── auth.js               # Auth routes (register, login, Google OAuth)
│   └── lib/
│       └── sessionStore.js       # JWT session management
├── frontend/
│   └── src/
│       └── pages/
│           ├── login.html        # Login page (fixed API endpoints)
│           ├── register.html     # Register page (fixed API endpoints)
│           └── dashboard.html    # Dashboard (after login)
├── .env                          # Environment variables (CONFIGURE THIS!)
├── .env.example                  # Example environment variables
├── migration_auth.sql            # Database migration
├── run_migration.js              # Migration runner
└── package.json                  # Dependencies (includes cors)
```

---

## 🔐 SECURITY NOTES

1. **JWT Secret:** Change `JWT_SECRET` in `.env` for production
2. **HTTPS:** Use HTTPS in production (not HTTP)
3. **CORS:** Update CORS origin in production to your actual domain
4. **Google OAuth:** Create separate OAuth credentials for production
5. **Database:** Use strong PostgreSQL password in production

---

## 🎯 AUTHENTICATION FLOW

### Normal Registration Flow
```
User fills form → Frontend validates → POST /api/auth/register
→ Backend validates → Hash password → Save to database
→ Return success → Redirect to login
```

### Normal Login Flow
```
User enters credentials → POST /api/auth/login
→ Backend validates → Check password → Create JWT token
→ Set cookie → Return user data → Redirect to dashboard
```

### Google OAuth Flow
```
User clicks "Login with Google" → Redirect to /api/auth/google
→ Passport redirects to Google → User selects account
→ Google redirects to /api/auth/google/callback
→ Passport verifies → Create/update user in database
→ Create JWT token → Set cookie → Redirect to dashboard
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] PostgreSQL is running
- [ ] Database migration completed
- [ ] `.env` file configured with real Google OAuth credentials
- [ ] Backend server running on port 8080
- [ ] Frontend server running on port 3000
- [ ] Can access login page: `http://localhost:3000/src/pages/login.html`
- [ ] Can register new account
- [ ] Can login with email/password
- [ ] Can login with Google OAuth
- [ ] Redirects to dashboard after successful login
- [ ] Google Cloud Console has correct redirect URI

---

## 📞 SUPPORT

If you encounter issues:

1. Check backend console for error messages
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure PostgreSQL is running and accessible
5. Verify Google OAuth credentials are correct and active

---

## 🚀 PRODUCTION DEPLOYMENT

For production deployment:

1. Update `.env` with production values:
   - Change `FRONTEND_URL` to your production domain
   - Use strong `JWT_SECRET`
   - Use production database credentials
   - Create new Google OAuth credentials for production domain

2. Update CORS in `backend/app.js`:
   ```javascript
   app.use(cors({
     origin: 'https://yourdomain.com',
     credentials: true
   }));
   ```

3. Update Google Cloud Console:
   - Add production domain to authorized origins
   - Add production callback URL to authorized redirect URIs

4. Use HTTPS for all connections
5. Set secure cookie flags in production
