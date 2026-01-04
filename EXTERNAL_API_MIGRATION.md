# Migration Guide: Supabase to External API Backend

This guide explains how to migrate from Supabase to the external MySQL API backend at `med.wayrus.co.ke/api.php`.

## Overview

The application has been configured to support three database providers:
- **supabase**: Original PostgreSQL backend (default)
- **mysql**: Local MySQL backend via API
- **external-api**: Remote MySQL backend at med.wayrus.co.ke/api.php

## Migration Steps

### Step 1: Set Environment Variables

Create or update your `.env.local` file with the following configuration:

```env
# Switch to external API provider
VITE_DATABASE_PROVIDER=external-api

# Set the external API URL
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php

# Keep Supabase variables if needed for reference, but they won't be used
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# JWT Secret for token generation
JWT_SECRET=wayrus-secret-key-2024
```

### Step 2: Restart Development Server

After updating environment variables, restart your development server:

```bash
npm run dev
```

The application will now use the external API backend instead of Supabase.

### Step 3: Verify API Connectivity

Check the browser console to confirm the database manager initialized with the correct provider:

```
✅ Database manager initialized with external-api adapter
```

### Step 4: Test Authentication

1. Navigate to the login page
2. Enter credentials for the external API
3. Verify that the token is received and stored

The external API handler will:
- Store JWT tokens in localStorage
- Include tokens in Authorization headers for all requests
- Auto-renew tokens when expired (if token refresh is supported)

### Step 5: Database Data

The external API will use the MySQL database at med.wayrus.co.ke. Your existing Supabase data will remain intact in the Supabase database, but it won't be accessed by this application anymore.

To preserve your data:
1. Export your Supabase data before switching (optional)
2. The MySQL database at med.wayrus.co.ke should already have the necessary tables

## Architecture

### Client-Side (Browser)
- `src/integrations/database/external-api-adapter.ts` - REST API client
- `src/integrations/auth/external-api-auth.ts` - JWT token management
- Requests are sent to `https://med.wayrus.co.ke/api.php`

### Server-Side (Development)
- `vite.config.ts` - API proxy configuration for local development
- Routes are mapped from `/api/db/*` to external API endpoints

### Remote Backend
- `backend/api.php` - Reference implementation of the PHP API
- Handles authentication, CRUD operations, and authorization

## API Endpoints

The external API at `med.wayrus.co.ke/api.php` supports:

### Authentication
- `POST ?action=login` - Login with email and password
  - Request: `{ email: string, password: string }`
  - Response: `{ status, token, user: { id, email, role } }`

- `POST ?action=logout` - Logout (clears session)
  - Response: `{ status, message }`

- `POST ?action=check_auth` - Verify current session
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ status, id, email, role }`

### CRUD Operations
- `POST ?action=create&table=<table_name>` - Create record
- `POST ?action=read&table=<table_name>` - Read records
- `PUT ?action=update&table=<table_name>` - Update record
- `DELETE ?action=delete&table=<table_name>` - Delete record

### Admin Operations
- `POST ?action=setup` - Create initial admin user
  - Request: `{ email: string, password: string }`

### Health Check
- `GET ?action=health` - Health check endpoint

## Tables and Schema

The MySQL database includes the following tables:

- **users** - User accounts and authentication
  - id, email, password, role, created_at

- **contacts** - Contact form submissions
  - id, name, email, phone, subject, message, status, reply_notes, created_at, updated_at

- **newsletter** - Newsletter subscriptions
  - id, email, created_at

- **leads** - Sales leads
  - id, business_name, contact_person, phone, email, business_category, location, website_url, website_status, lead_source, expressed_need, notes, status, created_at, updated_at

- **quotations** - Project quotations
  - id, portfolio_id, customer_name, customer_email, customer_phone, project_description, budget_range, timeline, status, notes, created_at, updated_at

- **portfolios** - Project portfolios
  - id, admin_id, title, description, website_url, screenshot_url, status, created_at, updated_at

- **opportunities** - Business opportunities
  - id, source, snippet, url, created_at

- **discovery_leads** - Discovered leads
  - id, business_name, location, phone, email, website_url, website_status, notes, status, created_at, updated_at

- **logs** - Activity logs
  - id, message, level, source, created_at

## Troubleshooting

### "Cannot initialize Supabase: Missing VITE_SUPABASE_URL"
This is expected when using external-api. The warning can be ignored as Supabase is not used.

### "API error" or connection timeout
1. Verify the `VITE_EXTERNAL_API_URL` is correct
2. Check that med.wayrus.co.ke is accessible from your network
3. Verify the API endpoint `/api.php` is live

### "Not authenticated" errors
1. Ensure you've logged in successfully
2. Check that the token is stored in localStorage (DevTools > Application > LocalStorage)
3. Verify the token hasn't expired (24 hour expiration)

### Data not found
1. Verify the data exists in the external MySQL database
2. Check database credentials in med.wayrus.co.ke configuration
3. Confirm all required tables are created

## Reverting to Supabase

To switch back to Supabase:

```env
VITE_DATABASE_PROVIDER=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then restart the development server. The application will revert to using Supabase.

## Additional Notes

- JWT tokens expire after 24 hours
- The external API uses CORS headers to allow cross-origin requests
- All database operations go through the REST API (no direct MySQL connections)
- Authorization is handled per-endpoint on the server side

## Support

For issues with the external API:
1. Check the `backend/api.php` implementation
2. Review the environment variables are set correctly
3. Enable browser DevTools Network tab to inspect API calls
4. Check server logs at med.wayrus.co.ke for errors
