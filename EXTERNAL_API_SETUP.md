# External API Setup and Testing Guide

This guide provides complete instructions for setting up and testing the external MySQL API backend integration.

## Quick Start

### 1. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_DATABASE_PROVIDER=external-api
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php
JWT_SECRET=wayrus-secret-key-2024
```

### 2. Start Development Server

```bash
npm install  # If not already done
npm run dev
```

Check the browser console for initialization messages:
```
✅ Database manager initialized with external-api adapter
ℹ️  External API adapter initialized for: https://med.wayrus.co.ke/api.php
```

### 3. Test API Connectivity

Open the browser DevTools console and run:

```javascript
// Test API connectivity
import { testExternalAPI } from '/src/integrations/database/api-test-utility.js';
await testExternalAPI();
```

Expected output:
```
🧪 Starting API Test Suite...

✅ Health Check                    [PASS] (245ms)
   📝 API is healthy (200)

✅ Auth Status                     [PASS] (156ms)
   📝 Not authenticated (expected if not logged in)

📈 Summary: 2 passed, 0 failed out of 2 tests
```

## Detailed Testing

### Test Health Check
```javascript
// Verify API is responsive
const response = await fetch('https://med.wayrus.co.ke/api.php?action=health');
console.log('Health:', response.ok ? 'Healthy' : 'Unhealthy');
```

### Test Authentication Flow

#### 1. Login
```javascript
import { externalApiAuth } from '/src/integrations/auth/external-api-auth.js';

const { token, user, error } = await externalApiAuth.login('admin@example.com', 'password');

if (token) {
  console.log('Login successful!');
  console.log('User:', user);
  console.log('Token:', token.substring(0, 20) + '...');
} else {
  console.log('Login failed:', error?.message);
}
```

#### 2. Verify Token
```javascript
const { valid, user } = await externalApiAuth.verifyToken();
console.log('Token valid:', valid);
console.log('Current user:', user);
```

#### 3. Logout
```javascript
await externalApiAuth.logout();
console.log('Logged out');
```

### Test Database Operations

#### 1. Read Records
```javascript
import { ExternalAPIAdapter } from '/src/integrations/database/external-api-adapter.js';

const adapter = new ExternalAPIAdapter();
const { data, error } = await adapter.select('contacts');

if (error) {
  console.error('Read failed:', error.message);
} else {
  console.log('Records:', data);
  console.log('Count:', data.length);
}
```

#### 2. Create Record
```javascript
const { id, error } = await adapter.insert('contacts', {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '1234567890',
  subject: 'Test',
  message: 'Test message'
});

if (error) {
  console.error('Create failed:', error.message);
} else {
  console.log('Record created with ID:', id);
}
```

#### 3. Update Record
```javascript
const { error } = await adapter.update('contacts', '1', {
  status: 'responded'
});

if (error) {
  console.error('Update failed:', error.message);
} else {
  console.log('Record updated');
}
```

#### 4. Delete Record
```javascript
const { error } = await adapter.delete('contacts', '1');

if (error) {
  console.error('Delete failed:', error.message);
} else {
  console.log('Record deleted');
}
```

### Run Full Test Suite
```javascript
import { APITestSuite } from '/src/integrations/database/api-test-utility.js';

const suite = new APITestSuite();

// Test health and auth
await suite.runAllTests();

// Test individual operations (after logging in)
await suite.testReadOperation('contacts');
await suite.testCreateOperation('contacts', {
  name: 'Test',
  email: 'test@example.com',
  phone: '1234567890',
  subject: 'Test',
  message: 'Test'
});
```

## API Endpoints Reference

### Authentication

**Login**
```
POST https://med.wayrus.co.ke/api.php?action=login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "status": "success",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Check Auth**
```
POST https://med.wayrus.co.ke/api.php?action=check_auth
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "<token>"
}

Response:
{
  "status": "success",
  "id": 1,
  "email": "user@example.com",
  "role": "admin"
}
```

**Logout**
```
POST https://med.wayrus.co.ke/api.php?action=logout
Content-Type: application/json

Response:
{
  "status": "success",
  "message": "Logout successful"
}
```

### CRUD Operations

**Create**
```
POST https://med.wayrus.co.ke/api.php?action=create&table=contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John",
  "email": "john@example.com",
  "phone": "1234567890",
  "subject": "Subject",
  "message": "Message"
}

Response:
{
  "status": "success",
  "id": 123,
  "data": { ... }
}
```

**Read**
```
POST https://med.wayrus.co.ke/api.php?action=read&table=contacts
Content-Type: application/json

Response:
{
  "status": "success",
  "data": [ ... ],
  "count": 10
}
```

**Update**
```
PUT https://med.wayrus.co.ke/api.php?action=update&table=contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "where": { "id": 1 },
  "data": { "status": "resolved" }
}

Response:
{
  "status": "success",
  "message": "Record updated"
}
```

**Delete**
```
DELETE https://med.wayrus.co.ke/api.php?action=delete&table=contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "where": { "id": 1 }
}

Response:
{
  "status": "success",
  "message": "Record deleted"
}
```

## Troubleshooting

### Issue: "Cannot read properties of undefined (reading 'select')"

**Cause**: Supabase client is being used instead of external API adapter

**Solution**: 
1. Verify `VITE_DATABASE_PROVIDER=external-api` in `.env.local`
2. Restart development server
3. Check browser console for correct initialization message

### Issue: CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```

**Cause**: External API doesn't have correct CORS headers

**Solution**:
1. Verify med.wayrus.co.ke returns proper CORS headers:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Accept, Authorization
   ```
2. Check that preflight OPTIONS requests are handled

### Issue: 401 Unauthorized
```
{
  "status": "error",
  "message": "Invalid email or password"
}
```

**Cause**: Wrong credentials or token expired

**Solution**:
1. Verify credentials are correct for med.wayrus.co.ke
2. Check that initial admin user is set up
3. To set up initial admin:
   ```javascript
   const { user, error } = await externalApiAuth.setupAdmin('admin@example.com', 'password123');
   ```

### Issue: 500 Server Error
```
{
  "status": "error",
  "message": "Connection failed"
}
```

**Cause**: Database connection issue on server

**Solution**:
1. Verify MySQL database is running on med.wayrus.co.ke
2. Check database credentials in api.php configuration
3. Verify .env file on server has correct DB_HOST, DB_USER, DB_PASS, DB_NAME

### Issue: Token Expired

**Symptoms**: Getting "Not authenticated" errors after extended use

**Solution**: Token expires after 24 hours
1. Implement token refresh: `await externalApiAuth.verifyToken()`
2. Or log in again: `await externalApiAuth.login(email, password)`

## Browser DevTools Tips

### View Stored Token
```javascript
// In console:
console.log(JSON.parse(localStorage.getItem('med_api_auth_token')));
```

### View Network Requests
1. Open DevTools → Network tab
2. Perform an operation
3. Look for requests to `med.wayrus.co.ke/api.php`
4. Check response headers and body

### Enable Debug Logging
```javascript
// Store extended logs
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('API Call:', args[0], args[1]);
  return originalFetch.apply(this, args).then(response => {
    console.log('API Response:', response.status);
    return response;
  });
};
```

## Performance Testing

### Measure API Response Time
```javascript
const start = performance.now();
const { data } = await adapter.select('contacts');
const duration = performance.now() - start;
console.log(`Query took ${duration.toFixed(2)}ms`);
```

### Load Test
```javascript
async function loadTest(table, count = 100) {
  const adapter = new ExternalAPIAdapter();
  const times = [];

  for (let i = 0; i < count; i++) {
    const start = performance.now();
    await adapter.select(table);
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`
    Requests: ${count}
    Average: ${avg.toFixed(2)}ms
    Min: ${min.toFixed(2)}ms
    Max: ${max.toFixed(2)}ms
  `);
}

await loadTest('contacts', 100);
```

## Next Steps

1. ✅ Environment variables configured
2. ✅ API connectivity verified
3. ✅ Authentication tested
4. 📋 Migrate existing application code to use external API
5. 📋 Test all application features
6. 📋 Deploy to production

## Support

For issues:
1. Check this guide's troubleshooting section
2. Review `EXTERNAL_API_MIGRATION.md` for overview
3. Check `backend/api.php` implementation
4. Review browser DevTools console and network tabs
5. Check server logs at med.wayrus.co.ke

## Additional Resources

- [API Reference](#api-endpoints-reference)
- [Migration Guide](EXTERNAL_API_MIGRATION.md)
- [Database Schema](#tables-and-schema)
