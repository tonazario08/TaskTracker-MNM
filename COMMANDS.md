# Quick Start Commands

## 🚀 Complete Setup (First Time)

Run these commands in order:

### 1. Install Backend Dependencies
```bash
npm install
```

### 2. Setup Database
Make sure PostgreSQL is running, then run the migration:
```bash
node run_migration.js
```

Expected output:
```
schema.sql executed successfully.
migration_auth.sql executed successfully.
```

### 3. Configure Google OAuth (Optional but Recommended)

Edit `.env` file and add your Google OAuth credentials:
```bash
# Get credentials from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

See `GOOGLE_OAUTH_SETUP.md` for detailed instructions.

### 4. Start Backend Server
```bash
npm start
```

Or with auto-reload for development:
```bash
npm run dev
```

Expected output:
```
Server running on port 8080
Ket noi PostgreSQL thanh cong
```

### 5. Start Frontend Server (New Terminal)
```bash
cd frontend
npm install
npm start
```

Frontend will be available at: `http://localhost:3000`

---

## 🧪 Testing Commands

### Test Backend Health
```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{"ok":true}
```

### Test Database Connection
```bash
psql -U postgres -d postgres -c "SELECT * FROM users LIMIT 1;"
```

### Check if Migration Ran Successfully
```bash
psql -U postgres -d postgres -c "\d users"
```

Should show columns including:
- `is_verified` (boolean)
- `google_id` (varchar)
- `avatar_url` (varchar)

---

## 🌐 Access URLs

After starting both servers:

- **Frontend (Login):** http://localhost:3000/src/pages/login.html
- **Frontend (Register):** http://localhost:3000/src/pages/register.html
- **Frontend (Dashboard):** http://localhost:3000/src/pages/dashboard.html
- **Backend API:** http://localhost:8080/api/
- **Backend Health Check:** http://localhost:8080/api/health

---

## 🔧 Troubleshooting Commands

### Check if Backend is Running
```bash
curl http://localhost:8080/api/health
```

### Check if PostgreSQL is Running
```bash
# Windows
pg_ctl status

# Linux/Mac
sudo systemctl status postgresql
```

### Restart PostgreSQL (if needed)
```bash
# Windows
pg_ctl restart

# Linux/Mac
sudo systemctl restart postgresql
```

### View Backend Logs
Backend logs appear in the terminal where you ran `npm start`

### Clear Node Modules and Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Reset Database (CAUTION: Deletes all data)
```bash
psql -U postgres -d postgres -c "DROP TABLE IF EXISTS users CASCADE;"
node run_migration.js
```

---

## 📝 Development Workflow

### Daily Development
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

### After Pulling New Code
```bash
# Update dependencies
npm install

# Run any new migrations
node run_migration.js

# Restart servers
npm run dev
```

### Before Committing
```bash
# Make sure .env is not committed
git status

# .env should be in .gitignore
```

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot connect to PostgreSQL"
```bash
# Check if PostgreSQL is running
pg_ctl status

# Start PostgreSQL
pg_ctl start

# Test connection
psql -U postgres -d postgres
```

### Issue: "Port 8080 already in use"
```bash
# Find process using port 8080
# Windows:
netstat -ano | findstr :8080

# Linux/Mac:
lsof -i :8080

# Kill the process (replace PID with actual process ID)
# Windows:
taskkill /PID <PID> /F

# Linux/Mac:
kill -9 <PID>
```

### Issue: "Module not found"
```bash
# Reinstall dependencies
npm install

# If still failing, clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: Google OAuth not working
```bash
# 1. Verify .env has correct credentials
cat .env | grep GOOGLE

# 2. Restart backend after changing .env
# Stop with Ctrl+C, then:
npm start

# 3. Check Google Cloud Console settings
# See GOOGLE_OAUTH_SETUP.md
```

---

## 📦 Production Deployment

### Build for Production
```bash
# Set production environment variables
export NODE_ENV=production

# Start with PM2 (recommended)
npm install -g pm2
pm2 start index.js --name tasktracker-backend

# Or use node directly
node index.js
```

### Environment Variables for Production
Update `.env` with production values:
```env
DB_HOST=your-production-db-host
DB_NAME=your-production-db-name
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
JWT_SECRET=your-strong-random-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
FRONTEND_URL=https://yourdomain.com
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Update database credentials
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Update Google OAuth redirect URIs to production domain
- [ ] Remove test users from database
- [ ] Enable rate limiting
- [ ] Set up proper logging
- [ ] Configure firewall rules
- [ ] Regular database backups

---

## 📚 Additional Resources

- Setup Guide: `SETUP_AUTH.md`
- Google OAuth Setup: `GOOGLE_OAUTH_SETUP.md`
- Environment Variables: `.env.example`
- Database Schema: `schema.sql`
- Auth Migration: `migration_auth.sql`
