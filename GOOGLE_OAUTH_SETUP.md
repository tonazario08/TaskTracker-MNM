# Google OAuth 2.0 Setup Guide

## Step-by-Step Instructions

### 1. Access Google Cloud Console

Go to: https://console.cloud.google.com/

### 2. Create or Select a Project

- Click on the project dropdown at the top
- Click **New Project** or select an existing project
- If creating new: Enter project name (e.g., "TaskTracker")
- Click **Create**

### 3. Enable Google+ API (if required)

- Go to **APIs & Services** → **Library**
- Search for "Google+ API"
- Click **Enable** (if not already enabled)

### 4. Configure OAuth Consent Screen

- Go to **APIs & Services** → **OAuth consent screen**
- Select **External** (for testing) or **Internal** (for organization)
- Click **Create**
- Fill in required fields:
  - App name: `TaskTracker`
  - User support email: Your email
  - Developer contact email: Your email
- Click **Save and Continue**
- Skip Scopes (click **Save and Continue**)
- Add test users if using External (your email)
- Click **Save and Continue**

### 5. Create OAuth 2.0 Credentials

- Go to **APIs & Services** → **Credentials**
- Click **+ Create Credentials** → **OAuth 2.0 Client ID**
- Select **Application type**: **Web application**
- Enter **Name**: `TaskTracker Web Client`

### 6. Configure Authorized URIs

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:8080/api/auth/google/callback
```

⚠️ **CRITICAL:** The redirect URI must EXACTLY match the one in your `.env` file!

### 7. Get Your Credentials

- Click **Create**
- A modal will appear with your credentials
- Copy the **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
- Copy the **Client Secret** (looks like: `GOCSPX-abc123xyz`)

### 8. Update Your .env File

Open `TaskTracker-MNM/.env` and update:

```env
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
```

### 9. Restart Your Backend Server

```bash
# Stop the server (Ctrl+C)
# Start it again
npm start
```

---

## ✅ Verification Checklist

Before testing, verify:

- [ ] OAuth consent screen is configured
- [ ] OAuth 2.0 Client ID is created
- [ ] Authorized JavaScript origins includes: `http://localhost:3000`
- [ ] Authorized redirect URIs includes: `http://localhost:8080/api/auth/google/callback`
- [ ] Client ID is copied to `.env` file
- [ ] Client Secret is copied to `.env` file
- [ ] Backend server is restarted after updating `.env`

---

## 🧪 Test Google OAuth

1. Open: `http://localhost:3000/src/pages/login.html`
2. Click **Đăng nhập bằng Google**
3. You should see Google's consent screen
4. Select your Google account
5. Grant permissions
6. You should be redirected to: `http://localhost:3000/src/pages/dashboard.html`

---

## 🔧 Common Issues

### Issue: "The OAuth client was not found" (Error 401: invalid_client)

**Causes:**
- Client ID or Client Secret is incorrect
- Credentials not saved in `.env` file
- Backend server not restarted after updating `.env`

**Solutions:**
1. Double-check Client ID and Secret in Google Cloud Console
2. Copy them exactly to `.env` (no extra spaces)
3. Restart backend: `npm start`

### Issue: "redirect_uri_mismatch"

**Causes:**
- Redirect URI in Google Cloud Console doesn't match the one in code
- Typo in the redirect URI

**Solutions:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Verify "Authorized redirect URIs" contains EXACTLY:
   ```
   http://localhost:8080/api/auth/google/callback
   ```
4. Save and wait 5 minutes for changes to propagate

### Issue: "Access blocked: This app's request is invalid"

**Causes:**
- OAuth consent screen not configured
- Missing required scopes

**Solutions:**
1. Complete OAuth consent screen configuration
2. Add your email as a test user (if using External)
3. Make sure app is not in "Testing" mode with no test users

### Issue: Google login works but user not created in database

**Causes:**
- Database migration not run
- PostgreSQL connection issue

**Solutions:**
1. Run migration: `node run_migration.js`
2. Check backend console for database errors
3. Verify PostgreSQL is running

---

## 📝 Production Deployment Notes

When deploying to production:

1. **Update Authorized URIs:**
   - Add your production domain to Authorized JavaScript origins
   - Add your production callback URL to Authorized redirect URIs
   - Example: `https://yourdomain.com/api/auth/google/callback`

2. **Update .env:**
   ```env
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
   FRONTEND_URL=https://yourdomain.com
   ```

3. **OAuth Consent Screen:**
   - Submit for verification if using External
   - Or switch to Internal if within an organization

4. **Security:**
   - Use strong JWT_SECRET
   - Enable HTTPS
   - Set secure cookie flags in production

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Passport.js Google OAuth Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
