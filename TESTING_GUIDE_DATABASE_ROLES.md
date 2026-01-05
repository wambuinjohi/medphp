# Testing Guide for Database & Roles Settings

## Overview
This guide provides step-by-step instructions to test the new Database & Roles Settings page functionality.

## Prerequisites
- ✅ Application is running on localhost:8080
- ✅ Admin user is logged in
- ✅ Remote API at `https://med.wayrus.co.ke/api.php` is accessible
- ✅ All new files are in place

## Test Environment Verification

### 1. Check Configuration Files
```bash
# Verify .env has correct database provider
cat .env | grep VITE_DATABASE_PROVIDER
# Should output: VITE_DATABASE_PROVIDER=external-api

# Verify external API URL
cat .env | grep VITE_EXTERNAL_API_URL
# Should output: VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php
```

### 2. Check File Structure
All new files should exist:
- ✅ src/pages/settings/DatabaseRolesSettings.tsx
- ✅ src/server/lib/setupRoles.ts
- ✅ src/server/routes/adminUsers.ts (modified)
- ✅ src/App.tsx (modified)
- ✅ src/components/layout/Sidebar.tsx (modified)
- ✅ .env (modified)

## Functional Testing

### Test 1: Page Navigation

**Steps:**
1. Log in to the application as an admin user
2. Look at the sidebar on the left
3. Click on **Settings** to expand the menu
4. You should see three options:
   - Company Settings
   - User Management
   - Database & Roles ← **NEW**
5. Click on **Database & Roles**

**Expected Result:**
- Page loads without errors
- URL changes to `/app/settings/database-roles`
- Page displays "System Configuration" header
- Shows overall status cards

**Pass/Fail**: ___________

### Test 2: API Health Check

**Steps:**
1. On the Database & Roles page
2. Look at the overall health status card at the top
3. Check the "API Status" indicator

**Expected Result:**
- API Status shows ✓ (if API is reachable) or ✗ (if not)
- Response time is reasonable (< 5 seconds)
- No console errors

**Pass/Fail**: ___________

### Test 3: Database Tab - View Status

**Steps:**
1. Click on the **"Database Tables"** tab
2. Observe the display

**Expected Result:**
- Shows "Tables Found" count
- Shows "Total Expected" count (should be 33)
- Shows "Missing" count
- Progress bar visible
- Buttons visible: "Refresh Status", "Create Missing Tables", "View Details"

**Pass/Fail**: ___________

### Test 4: Database Tab - Refresh Status

**Steps:**
1. On Database Tables tab
2. Click **"Refresh Status"** button
3. Wait for the status to update

**Expected Result:**
- Button shows loading state
- Status updates
- Toast notification appears
- No errors in console

**Pass/Fail**: ___________

### Test 5: Database Tab - View Details

**Steps:**
1. On Database Tables tab
2. Click **"View Details"** button
3. Modal dialog opens

**Expected Result:**
- Dialog shows "Database Table Details"
- Lists all tables with their status (Exists/Missing)
- Tables are scrollable if list is long
- Can close dialog

**Pass/Fail**: ___________

### Test 6: Database Tab - Create Tables (if missing)

**Steps:**
1. On Database Tables tab
2. If tables are missing, click **"Create Missing Tables"**
3. Wait for operation to complete

**Expected Result:**
- Button shows loading state
- Operation completes
- Toast notification shows success/failure
- Status updates automatically
- Can check details to verify

**Pass/Fail**: ___________

### Test 7: Roles Tab - View Status

**Steps:**
1. Click on the **"Roles & Permissions"** tab
2. Observe the display

**Expected Result:**
- Shows "Roles Configured" count
- Shows "Missing Roles" count
- Progress bar visible
- Buttons visible: "Setup Default Roles" (if needed), "Refresh Status"
- Shows configured roles (if any)
- Shows missing roles list (if any)

**Pass/Fail**: ___________

### Test 8: Roles Tab - Setup Default Roles (if missing)

**Steps:**
1. On Roles & Permissions tab
2. If roles are missing, click **"Setup Default Roles"**
3. Monitor the progress dialog

**Expected Result:**
- Progress dialog appears
- Shows setup progress messages
- Messages appear in real-time
- Operation completes with success message
- Dialog automatically closes
- Toast notification shows result
- Status updates to show all roles configured

**Pass/Fail**: ___________

### Test 9: Overall System Health

**Steps:**
1. After completing database and roles setup
2. Return to the main page
3. Check the overall health status

**Expected Result:**
- API Status: ✓
- Database: 33/33 (all tables present)
- Roles: 5/5 (all roles configured)
- Overall status shows "System Ready" in green
- All three indicators show checkmarks

**Pass/Fail**: ___________

## UI/UX Testing

### Test 10: Responsive Design

**Steps:**
1. Open the page on different screen sizes:
   - Desktop (1920px width)
   - Tablet (768px width)
   - Mobile (375px width)

**Expected Result:**
- Layout adapts to screen size
- All buttons remain clickable
- Text is readable
- Tabs work on all sizes
- Dialogs are properly sized

**Pass/Fail**: ___________

### Test 11: Loading States

**Steps:**
1. Perform any operation (refresh, create tables, setup roles)
2. Observe the button and page behavior

**Expected Result:**
- Buttons show loading spinner
- Buttons are disabled during operation
- Other buttons are disabled during operation
- User cannot double-click or trigger multiple requests

**Pass/Fail**: ___________

### Test 12: Error Handling

**Steps:**
1. Attempt operations when API is unavailable (if possible)
2. Observe error messages

**Expected Result:**
- Clear error messages displayed
- Toast notifications appear
- User can retry operations
- No console JavaScript errors
- Graceful error recovery

**Pass/Fail**: ___________

## API Endpoint Testing

### Test 13: Check Database Status Endpoint

**Steps:**
1. Open browser developer tools (F12)
2. Go to Network tab
3. On Database Tables tab, click "Refresh Status"
4. Look for API calls

**Expected Result:**
- Network tab shows POST request to `/api.php?action=check_tables`
- Status is 200 (OK)
- Response includes table list and status
- Response time is reasonable

**Pass/Fail**: ___________

### Test 14: Check Roles Status Endpoint

**Steps:**
1. Open browser developer tools (F12)
2. Go to Network tab
3. On Roles tab, click "Refresh Status"
4. Look for API calls

**Expected Result:**
- Network tab shows POST request to `/api/admin/roles/check-status`
- Status is 200 (OK)
- Response includes roles status
- Response time is reasonable

**Pass/Fail**: ___________

## Data Persistence Testing

### Test 15: Data Persistence

**Steps:**
1. Complete database and roles setup
2. Close the browser
3. Log back in
4. Navigate to Settings → Database & Roles again

**Expected Result:**
- Page shows all setup is complete
- Tables remain created
- Roles remain configured
- No need to re-run setup

**Pass/Fail**: ___________

## Permission Testing

### Test 16: Non-Admin Access Control

**Steps:**
1. Log in as a non-admin user (accountant, stock_manager, or regular user)
2. Try to navigate to `/app/settings/database-roles` directly

**Expected Result:**
- User is redirected or denied access
- Access control is enforced
- No sensitive settings are exposed
- User sees error message

**Pass/Fail**: ___________

### Test 17: Sidebar Visibility

**Steps:**
1. Log in as non-admin user
2. Check Settings menu in sidebar

**Expected Result:**
- Settings section is not visible (or grayed out)
- Database & Roles option is not visible
- Menu structure is correct

**Pass/Fail**: ___________

## Console & Performance Testing

### Test 18: No Console Errors

**Steps:**
1. Open browser console (F12)
2. Navigate through the page
3. Perform all operations
4. Check console

**Expected Result:**
- No JavaScript errors
- No warnings about missing components
- No TypeScript errors
- Clean console output

**Pass/Fail**: ___________

### Test 19: Performance

**Steps:**
1. Use Chrome DevTools Performance tab
2. Measure page load time
3. Measure operation completion time

**Expected Result:**
- Page loads in < 3 seconds
- Database operations < 10 seconds
- Role setup < 15 seconds
- No performance warnings

**Pass/Fail**: ___________

## Integration Testing

### Test 20: Sidebar Integration

**Steps:**
1. From any other settings page
2. Click Settings → Database & Roles
3. Then click Settings → User Management
4. Back to Settings → Database & Roles

**Expected Result:**
- Navigation works smoothly
- Page state is preserved
- No data is lost
- Smooth transitions

**Pass/Fail**: ___________

### Test 21: Layout Integration

**Steps:**
1. Open the Database & Roles page
2. Scroll down to see all content
3. Check sidebar behavior
4. Check header/footer visibility

**Expected Result:**
- Layout maintains structure
- Sidebar works correctly
- All content is accessible
- Responsive behavior is correct

**Pass/Fail**: ___________

## Accessibility Testing

### Test 22: Keyboard Navigation

**Steps:**
1. Use Tab key to navigate through the page
2. Try using Tab to access all buttons
3. Use Enter to activate buttons
4. Use Escape to close dialogs

**Expected Result:**
- All interactive elements are accessible
- Tab order is logical
- Buttons can be activated with Enter
- Dialogs close with Escape
- Focus is visible

**Pass/Fail**: ___________

### Test 23: Screen Reader Compatibility

**Steps:**
1. Use a screen reader (NVDA, JAWS, or built-in accessibility tools)
2. Navigate the page
3. Read labels and descriptions

**Expected Result:**
- Page structure is clear
- Labels are properly associated
- Descriptions are readable
- Icons have alt text
- Status changes are announced

**Pass/Fail**: ___________

## Summary

### Tests Passed: ___ / 23
### Tests Failed: ___ / 23

### Issues Found:
```
[List any issues discovered during testing]
```

### Recommendations:
```
[Any improvements or changes recommended]
```

### Sign-off:
- **Tested By**: _______________
- **Date**: _______________
- **Status**: ☐ Ready for Production
           ☐ Ready with Minor Issues
           ☐ Needs More Work

## Quick Test Checklist

- [ ] Page loads without errors
- [ ] Navigation works from sidebar
- [ ] API health shows correct status
- [ ] Database tab displays correctly
- [ ] Roles tab displays correctly
- [ ] Can refresh statuses
- [ ] Can create missing tables
- [ ] Can setup default roles
- [ ] Dialogs open and close correctly
- [ ] Toast notifications appear
- [ ] No console errors
- [ ] Non-admin users cannot access
- [ ] Responsive on mobile/tablet
- [ ] All buttons work correctly
- [ ] Loading states display properly

---

**Testing Environment**: Development
**API Endpoint**: https://med.wayrus.co.ke/api.php
**Version**: 1.0
