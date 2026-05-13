#!/usr/bin/env node

/**
 * Authentication System Verification Script
 * Run this to verify all authentication components are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TaskTracker Authentication Verification\n');
console.log('=' .repeat(60));

let allChecksPass = true;

// Check 1: .env file exists
console.log('\n📄 Checking .env file...');
if (fs.existsSync('.env')) {
  console.log('✅ .env file exists');

  const envContent = fs.readFileSync('.env', 'utf-8');

  // Check required variables
  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'PORT',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'FRONTEND_URL'
  ];

  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`)) {
      const value = envContent.match(new RegExp(`${varName}=(.+)`))?.[1]?.trim();
      if (value && !value.startsWith('YOUR_') && value !== 'your_email@gmail.com') {
        console.log(`✅ ${varName} is set`);
      } else {
        console.log(`⚠️  ${varName} needs to be configured (currently placeholder)`);
        if (varName.includes('GOOGLE')) {
          console.log(`   → See GOOGLE_OAUTH_SETUP.md for instructions`);
        }
      }
    } else {
      console.log(`❌ ${varName} is missing`);
      allChecksPass = false;
    }
  });
} else {
  console.log('❌ .env file not found');
  console.log('   → Copy .env.example to .env and configure it');
  allChecksPass = false;
}

// Check 2: Dependencies installed
console.log('\n📦 Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules exists');

  const requiredPackages = [
    'express',
    'cors',
    'passport',
    'passport-google-oauth20',
    'bcrypt',
    'jsonwebtoken',
    'pg',
    'dotenv',
    'cookie-parser',
    'express-session'
  ];

  requiredPackages.forEach(pkg => {
    if (fs.existsSync(`node_modules/${pkg}`)) {
      console.log(`✅ ${pkg} installed`);
    } else {
      console.log(`❌ ${pkg} not installed`);
      allChecksPass = false;
    }
  });
} else {
  console.log('❌ node_modules not found');
  console.log('   → Run: npm install');
  allChecksPass = false;
}

// Check 3: Backend files
console.log('\n🔧 Checking backend files...');
const backendFiles = [
  'backend/app.js',
  'backend/server.js',
  'backend/config/db.js',
  'backend/config/passport.js',
  'backend/routes/auth.js',
  'backend/lib/sessionStore.js'
];

backendFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);

    // Check for CORS in app.js
    if (file === 'backend/app.js') {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('cors')) {
        console.log('   ✅ CORS middleware configured');
      } else {
        console.log('   ❌ CORS middleware missing');
        allChecksPass = false;
      }
    }
  } else {
    console.log(`❌ ${file} not found`);
    allChecksPass = false;
  }
});

// Check 4: Frontend files
console.log('\n🎨 Checking frontend files...');
const frontendFiles = [
  'frontend/src/pages/login.html',
  'frontend/src/pages/register.html',
  'frontend/src/pages/dashboard.html'
];

frontendFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);

    // Check if using correct API endpoint
    if (file.includes('login.html') || file.includes('register.html')) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('http://localhost:8080/api/auth/')) {
        console.log('   ✅ Using correct backend API endpoint');
      } else if (content.includes('/api/auth/')) {
        console.log('   ⚠️  Using relative API endpoint (may cause CORS issues)');
      } else {
        console.log('   ❌ API endpoint not found');
        allChecksPass = false;
      }
    }
  } else {
    console.log(`❌ ${file} not found`);
    allChecksPass = false;
  }
});

// Check 5: Database migration files
console.log('\n🗄️  Checking database files...');
const dbFiles = [
  'schema.sql',
  'migration_auth.sql',
  'run_migration.js'
];

dbFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} not found`);
    allChecksPass = false;
  }
});

// Check 6: Documentation files
console.log('\n📚 Checking documentation...');
const docFiles = [
  'SETUP_AUTH.md',
  'GOOGLE_OAUTH_SETUP.md',
  'COMMANDS.md',
  'AUTH_FIX_SUMMARY.md'
];

docFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`⚠️  ${file} not found (optional)`);
  }
});

// Final summary
console.log('\n' + '='.repeat(60));
if (allChecksPass) {
  console.log('\n✅ All critical checks passed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Configure Google OAuth credentials in .env');
  console.log('   2. Run database migration: node run_migration.js');
  console.log('   3. Start backend: npm start');
  console.log('   4. Start frontend: cd frontend && npm start');
  console.log('\n📖 See SETUP_AUTH.md for detailed instructions');
} else {
  console.log('\n❌ Some checks failed. Please fix the issues above.');
  console.log('\n📖 See SETUP_AUTH.md for setup instructions');
}

console.log('\n' + '='.repeat(60));
