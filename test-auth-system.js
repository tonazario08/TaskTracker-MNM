#!/usr/bin/env node

/**
 * Complete Authentication System Test
 * Tests all authentication endpoints and flows
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:8080';
const FRONTEND_URL = 'http://localhost:3000';

console.log('🧪 TaskTracker Authentication System Test\n');
console.log('=' .repeat(60));

let allTestsPass = true;
const testEmail = `test${Date.now()}@test.com`;

async function test(name, fn) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        return true;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        allTestsPass = false;
        return false;
    }
}

async function runTests() {
    console.log('\n📡 Testing Backend Direct Connection\n');

    await test('Backend health check', async () => {
        const res = await axios.get(`${BACKEND_URL}/api/health`);
        if (!res.data.ok) throw new Error('Health check failed');
    });

    await test('Backend register endpoint', async () => {
        const res = await axios.post(`${BACKEND_URL}/api/auth/register`, {
            name: 'Test User Backend',
            email: `backend${testEmail}`,
            password: 'password123',
            confirm_password: 'password123'
        });
        if (!res.data.success) throw new Error('Registration failed');
    });

    await test('Backend login endpoint', async () => {
        const res = await axios.post(`${BACKEND_URL}/api/auth/login`, {
            email: `backend${testEmail}`,
            password: 'password123'
        });
        if (!res.data.id) throw new Error('Login failed');
    });

    console.log('\n🌐 Testing Frontend Proxy\n');

    await test('Frontend health check through proxy', async () => {
        const res = await axios.get(`${FRONTEND_URL}/api/health`);
        if (!res.data.ok) throw new Error('Health check failed');
    });

    await test('Frontend register through proxy', async () => {
        const res = await axios.post(`${FRONTEND_URL}/api/auth/register`, {
            name: 'Test User Frontend',
            email: `frontend${testEmail}`,
            password: 'password123',
            confirm_password: 'password123'
        });
        if (!res.data.success) throw new Error('Registration failed');
    });

    await test('Frontend login through proxy', async () => {
        const res = await axios.post(`${FRONTEND_URL}/api/auth/login`, {
            email: `frontend${testEmail}`,
            password: 'password123'
        });
        if (!res.data.id) throw new Error('Login failed');
    });

    console.log('\n🔒 Testing Validation\n');

    await test('Reject empty fields', async () => {
        try {
            await axios.post(`${FRONTEND_URL}/api/auth/register`, {
                name: '',
                email: '',
                password: '',
                confirm_password: ''
            });
            throw new Error('Should have rejected empty fields');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                return; // Expected error
            }
            throw error;
        }
    });

    await test('Reject password mismatch', async () => {
        try {
            await axios.post(`${FRONTEND_URL}/api/auth/register`, {
                name: 'Test',
                email: `mismatch${testEmail}`,
                password: 'password123',
                confirm_password: 'different'
            });
            throw new Error('Should have rejected mismatched passwords');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                return; // Expected error
            }
            throw error;
        }
    });

    await test('Reject short password', async () => {
        try {
            await axios.post(`${FRONTEND_URL}/api/auth/register`, {
                name: 'Test',
                email: `short${testEmail}`,
                password: '123',
                confirm_password: '123'
            });
            throw new Error('Should have rejected short password');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                return; // Expected error
            }
            throw error;
        }
    });

    await test('Reject duplicate email', async () => {
        try {
            await axios.post(`${FRONTEND_URL}/api/auth/register`, {
                name: 'Test User Duplicate',
                email: `frontend${testEmail}`, // Already registered
                password: 'password123',
                confirm_password: 'password123'
            });
            throw new Error('Should have rejected duplicate email');
        } catch (error) {
            if (error.response && error.response.status === 409) {
                return; // Expected error
            }
            throw error;
        }
    });

    await test('Reject wrong password on login', async () => {
        try {
            await axios.post(`${FRONTEND_URL}/api/auth/login`, {
                email: `frontend${testEmail}`,
                password: 'wrongpassword'
            });
            throw new Error('Should have rejected wrong password');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                return; // Expected error
            }
            throw error;
        }
    });

    console.log('\n' + '='.repeat(60));

    if (allTestsPass) {
        console.log('\n✅ ALL TESTS PASSED!\n');
        console.log('🎉 Authentication system is fully functional!\n');
        console.log('Next steps:');
        console.log('  1. Open http://localhost:3000/register');
        console.log('  2. Create a new account');
        console.log('  3. Login and start using TaskTracker\n');
    } else {
        console.log('\n❌ SOME TESTS FAILED\n');
        console.log('Please check the errors above and ensure:');
        console.log('  1. Backend is running on port 8080');
        console.log('  2. Frontend is running on port 3000');
        console.log('  3. PostgreSQL database is running');
        console.log('  4. Database migration has been run\n');
        process.exit(1);
    }
}

// Check if servers are running
async function checkServers() {
    console.log('\n🔍 Checking if servers are running...\n');

    try {
        await axios.get(`${BACKEND_URL}/api/health`, { timeout: 2000 });
        console.log('✅ Backend is running on port 8080');
    } catch (error) {
        console.log('❌ Backend is NOT running on port 8080');
        console.log('   Start it with: npm start\n');
        process.exit(1);
    }

    try {
        await axios.get(`${FRONTEND_URL}/api/health`, { timeout: 2000 });
        console.log('✅ Frontend is running on port 3000');
    } catch (error) {
        console.log('❌ Frontend is NOT running on port 3000');
        console.log('   Start it with: cd frontend && npm start\n');
        process.exit(1);
    }
}

// Run tests
checkServers().then(runTests).catch(error => {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
});
