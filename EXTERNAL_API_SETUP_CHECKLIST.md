# External API Setup Checklist

Use this checklist to track your progress through the setup and migration process.

## Phase 1: Development Setup

### Environment Configuration
- [ ] Copy `.env.example` to `.env.local`
- [ ] Set `VITE_DATABASE_PROVIDER=external-api`
- [ ] Set `VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php`
- [ ] Set `JWT_SECRET` to a secure value
- [ ] Verify `.env.local` is in `.gitignore` (DO NOT COMMIT)

### Development Server
- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Check browser console for: `✅ Database manager initialized with external-api adapter`
- [ ] Check for any errors or warnings

### API Connectivity Verification
- [ ] Open browser DevTools console
- [ ] Run: `await testExternalAPI()`
- [ ] Verify health check passes
- [ ] Verify auth check runs (may show "not authenticated" - that's OK)
- [ ] Check performance metrics are reasonable (<1s per request)

## Phase 2: Backend Deployment

### Backend Setup
- [ ] Deploy `backend/api.php` to med.wayrus.co.ke
- [ ] Create `.env` file on server with database credentials:
  - [ ] `DB_HOST`
  - [ ] `DB_USER`
  - [ ] `DB_PASS`
  - [ ] `DB_NAME`
  - [ ] `JWT_SECRET` (same value as development)
- [ ] Verify file permissions are correct
- [ ] Test endpoint: `curl https://med.wayrus.co.ke/api.php?action=health`
- [ ] Verify CORS headers are present in response

### Database Setup
- [ ] Verify MySQL is running on the server
- [ ] Create database if not exists
- [ ] Verify all tables are auto-created on first API call:
  - [ ] users
  - [ ] contacts
  - [ ] newsletter
  - [ ] leads
  - [ ] quotations
  - [ ] portfolios
  - [ ] opportunities
  - [ ] discovery_leads
  - [ ] logs

### Initial Admin User
- [ ] Run in browser console (in development):
  ```javascript
  const result = await externalApiAuth.setupAdmin('admin@example.com', 'password123');
  console.log(result);
  ```
- [ ] Verify success message
- [ ] Note the email and password for testing

## Phase 3: Authentication Testing

### Login Functionality
- [ ] Test login in browser console:
  ```javascript
  const result = await externalApiAuth.login('admin@example.com', 'password123');
  console.log(result);
  ```
- [ ] Verify token is returned
- [ ] Verify user object contains id, email, role
- [ ] Check localStorage for stored token:
  ```javascript
  console.log(JSON.parse(localStorage.getItem('med_api_auth_token')));
  ```

### Token Verification
- [ ] Test token verification:
  ```javascript
  const {valid, user} = await externalApiAuth.verifyToken();
  console.log('Valid:', valid, 'User:', user);
  ```
- [ ] Verify token is valid
- [ ] Verify user information matches

### Logout Functionality
- [ ] Test logout:
  ```javascript
  await externalApiAuth.logout();
  ```
- [ ] Verify token is cleared from localStorage
- [ ] Verify subsequent API calls return 401

## Phase 4: Database Operations Testing

### Read Operations
- [ ] Test read users:
  ```javascript
  const adapter = new ExternalAPIAdapter();
  const {data, error} = await adapter.select('users');
  console.log('Users:', data, 'Error:', error);
  ```
- [ ] Verify data is returned
- [ ] Test read other tables (contacts, leads, etc.)

### Create Operations
- [ ] Test create contact:
  ```javascript
  const {id, error} = await adapter.insert('contacts', {
    name: 'Test Contact',
    email: 'test@example.com',
    phone: '1234567890',
    subject: 'Test',
    message: 'Test message'
  });
  console.log('Created ID:', id, 'Error:', error);
  ```
- [ ] Verify record is created with ID
- [ ] Verify data is in database

### Update Operations
- [ ] Test update contact:
  ```javascript
  const {error} = await adapter.update('contacts', id, {
    status: 'responded'
  });
  console.log('Update error:', error);
  ```
- [ ] Verify record is updated in database

### Delete Operations
- [ ] Test delete contact:
  ```javascript
  const {error} = await adapter.delete('contacts', id);
  console.log('Delete error:', error);
  ```
- [ ] Verify record is deleted from database

### Bulk Operations
- [ ] Test insert multiple:
  ```javascript
  const {id, error} = await adapter.insertMany('contacts', [
    {name: 'User 1', email: 'u1@example.com', phone: '111'},
    {name: 'User 2', email: 'u2@example.com', phone: '222'}
  ]);
  ```
- [ ] Verify all records are created

## Phase 5: Application Integration

### Update Login Page
- [ ] Import externalApiAuth
- [ ] Update login form to call `externalApiAuth.login(email, password)`
- [ ] Store returned token
- [ ] Update database manager to use external-api provider

### Update Dashboard/Home
- [ ] Test that data loads from external API
- [ ] Verify CRUD operations work
- [ ] Check that auth state is preserved on page reload
- [ ] Verify token is used in Authorization header

### Update All API Calls
- [ ] Replace Supabase calls with external API adapter calls
- [ ] Update database initialization
- [ ] Verify all tables work correctly
- [ ] Test all CRUD operations

### Update Admin Features
- [ ] Test user creation
- [ ] Test password reset
- [ ] Test user role management
- [ ] Test admin-only features

## Phase 6: Testing & QA

### Manual Testing
- [ ] Login/logout flow
- [ ] View all tables
- [ ] Create new records
- [ ] Edit existing records
- [ ] Delete records
- [ ] Search/filter operations
- [ ] Bulk operations
- [ ] Admin features

### Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on mobile browsers

### Performance Testing
- [ ] Measure API response times
- [ ] Check for slow queries
- [ ] Monitor memory usage
- [ ] Load test with multiple concurrent requests

### Security Testing
- [ ] Test with expired token
- [ ] Test with invalid token
- [ ] Test unauthorized access
- [ ] Test SQL injection attempts
- [ ] Test CORS restrictions

## Phase 7: Production Deployment

### Pre-Deployment
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] Performance is acceptable
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Backup strategy in place

### Deployment
- [ ] Update production environment variables
- [ ] Deploy backend to production
- [ ] Verify production API is accessible
- [ ] Deploy frontend code
- [ ] Monitor for errors in production
- [ ] Verify all features work

### Post-Deployment
- [ ] Monitor API logs
- [ ] Check error rates
- [ ] Verify data integrity
- [ ] Monitor performance metrics
- [ ] Set up alerts for issues
- [ ] Plan maintenance schedule

### Rollback Plan (If Needed)
- [ ] Have backup of old system
- [ ] Document rollback steps
- [ ] Test rollback procedure
- [ ] Be ready to revert quickly if issues occur

## Phase 8: Cleanup & Optimization

### Code Cleanup
- [ ] Remove Supabase initialization if not needed
- [ ] Clean up unused imports
- [ ] Remove debug logging
- [ ] Update TypeScript types

### Optimization
- [ ] Implement caching where appropriate
- [ ] Optimize database queries
- [ ] Add pagination for large datasets
- [ ] Implement lazy loading

### Documentation
- [ ] Update README with new setup instructions
- [ ] Document any custom configuration
- [ ] Create runbook for common issues
- [ ] Archive old documentation

### Monitoring
- [ ] Set up application logging
- [ ] Set up performance monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Set up uptime monitoring

## Troubleshooting Quick Reference

### Issue: API not responding
**Steps**:
1. Verify `VITE_EXTERNAL_API_URL` is correct
2. Check internet connection
3. Verify med.wayrus.co.ke is accessible
4. Test: `curl https://med.wayrus.co.ke/api.php?action=health`

### Issue: Authentication failing
**Steps**:
1. Verify admin user exists (run setupAdmin)
2. Check email/password are correct
3. Verify JWT_SECRET is same on client and server
4. Check server logs for errors

### Issue: Data not loading
**Steps**:
1. Verify authentication token is valid
2. Check table exists in database
3. Verify data exists in table
4. Check Authorization header in network tab

### Issue: CORS errors
**Steps**:
1. Verify api.php has CORS headers
2. Check Origin header in request
3. Verify allowed origins on server
4. Test with different origin if needed

### Issue: Token expired
**Steps**:
1. Log out: `await externalApiAuth.logout()`
2. Log in again: `await externalApiAuth.login(email, password)`
3. Or implement token refresh

## Support Resources

- 📖 **EXTERNAL_API_MIGRATION.md** - Detailed migration guide
- 📖 **EXTERNAL_API_SETUP.md** - Complete setup and testing guide
- 📖 **EXTERNAL_API_IMPLEMENTATION_SUMMARY.md** - Technical overview
- 💻 **backend/api.php** - API implementation reference
- 🔧 **src/integrations/** - Source code for adapters

## Sign-Off

Once complete, you can mark this as done:

**Completed by**: _________________________  
**Date**: _________________________  
**Status**: ☐ Development Ready  ☐ QA Testing  ☐ Production Ready  

**Notes**:  
_______________________________________________________  
_______________________________________________________  
_______________________________________________________  

---

**Last Updated**: January 2026  
**Version**: 1.0
